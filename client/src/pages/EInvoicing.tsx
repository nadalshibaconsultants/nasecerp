/**
 * UAE E-Invoicing System
 * Compliant with: MD 243/2025, MD 244/2025, MD 64/2025, CD 106/2025
 * Implements: PINT-AE, 5-Corner Peppol Model, 51 mandatory fields (Tax Invoice)
 * 
 * Design: Architectural Blueprint — Navy/Amber palette, JetBrains Mono for data
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { apiFetch } from "@/lib/backend/api";
import {
  FileText, Shield, Building2, Users, Send, CheckCircle2, XCircle,
  Clock, AlertTriangle, Download, Eye, Plus, ArrowRight, ArrowLeft,
  Globe, Lock, Archive, RefreshCw, Zap, FileCode, Receipt,
  ChevronDown, ChevronRight, Info, Calendar, Timer, Landmark
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================
type InvoiceCategory = "tax-invoice" | "self-billed-tax" | "tax-credit-note" | "self-billed-credit" | "commercial-invoice" | "commercial-credit-note";
type InvoiceStatus = "draft" | "received" | "pending-approval" | "submitted" | "validated" | "transmitted" | "confirmed" | "approved" | "posted" | "rejected" | "failed" | "cancelled";
type Scenario = "free-zone" | "deemed-supply" | "margin-scheme" | "summary" | "continuous-supply" | "agent-billing" | "e-commerce" | "exports";

interface CompanyConfig {
  tin: string;
  trn: string;
  participantId: string;
  legalName: string;
  tradeLicenseAuthority: string;
  registrationType: string;
  registrationId: string;
  address: { line1: string; city: string; subdivision: string; country: string };
  asp: { name: string; endpoint: string; authToken: string; certificate: string; mode?: string; status?: string };
  vatRegistered: boolean;
  taxGroupMember: boolean;
  taxGroupTin: string;
  annualRevenue: string;
  aspAppointmentDeadline?: string;
  goLiveDate?: string;
  voluntaryOnboardingDate?: string;
  retentionYears?: number;
}

interface ClientEInvoiceData {
  id: string;
  name: string;
  tin: string;
  trn: string;
  legalRegId: string;
  legalRegType: "TL" | "EID" | "PAS" | "CD";
  electronicAddress: string;
  electronicIdentifier: string;
  address: { line1: string; city: string; subdivision: string; country: string };
  freeZone: boolean;
  freeZoneEntity: string;
  beneficiaryName: string;
  beneficiaryAddress: string;
  onEInvoicingSystem: boolean;
}

interface InvoiceLine {
  id: string;
  description: string;
  itemName: string;
  quantity: number;
  unitOfMeasure: string;
  netPrice: number;
  grossPrice: number;
  baseQuantity: number;
  netAmount: number;
  taxCategoryCode: string;
  taxRate: number;
  vatAmountAED: number;
  lineAmountAED: number;
  itemType: "G" | "S" | "B";
}

interface EInvoice {
  id: string;
  uuid: string;
  invoiceNumber: string;
  invoiceDate: string;
  category: InvoiceCategory;
  status: InvoiceStatus;
  currencyCode: string;
  transactionTypeCode: string; // 8-flag binary
  paymentDueDate: string;
  paymentMeansCode: string;
  scenario: Scenario;
  seller: { name: string; tin: string; trn: string };
  buyer: { name: string; tin: string; trn: string };
  lines: InvoiceLine[];
  totalNetAmount: number;
  totalTaxAmount: number;
  totalWithTax: number;
  amountDue: number;
  taxBreakdown: { categoryCode: string; taxableAmount: number; taxAmount: number; rate: number }[];
  precedingInvoiceRef?: string;
  precedingInvoiceUuid?: string;
  statusHistory: { status: InvoiceStatus; timestamp: string; message: string }[];
  retentionExpiry: string;
  xmlGenerated: boolean;
  pdfGenerated: boolean;
  project?: string;
  milestone?: string;
}

interface ReceivedEInvoice {
  id: string;
  supplierName: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  vat: number;
  total: number;
  currency: string;
  status: string;
  poRef: string;
  grnRef: string;
  project: string;
  description: string;
  matchStatus: string;
  apBillId?: string | null;
}

interface EInvoiceSummary {
  counts: { issued: number; received: number; confirmed: number; pending: number; failed: number; pendingApApproval: number };
  totalValue: number;
  readiness: { item: string; done: boolean }[];
  company: CompanyConfig;
}

// ============================================================
// Empty fallback until the backend company profile loads.
// ============================================================
const companyConfig: CompanyConfig = {
  tin: "",
  trn: "",
  participantId: "",
  legalName: "",
  tradeLicenseAuthority: "",
  registrationType: "",
  registrationId: "",
  address: { line1: "", city: "", subdivision: "", country: "AE" },
  asp: { name: "", endpoint: "", authToken: "Not configured", certificate: "" },
  vatRegistered: true,
  taxGroupMember: false,
  taxGroupTin: "",
  annualRevenue: "",
  aspAppointmentDeadline: "",
  goLiveDate: "",
  voluntaryOnboardingDate: "",
  retentionYears: 5,
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================
const statusConfig: Record<InvoiceStatus, { color: string; icon: typeof Clock; label: string; bg: string }> = {
  draft: { color: "text-yellow-600", icon: Clock, label: "Draft", bg: "bg-yellow-50 border-yellow-200" },
  received: { color: "text-blue-600", icon: Receipt, label: "Received", bg: "bg-blue-50 border-blue-200" },
  "pending-approval": { color: "text-amber-600", icon: Clock, label: "Pending Approval", bg: "bg-amber-50 border-amber-200" },
  submitted: { color: "text-orange-600", icon: Send, label: "Submitted to ASP", bg: "bg-orange-50 border-orange-200" },
  validated: { color: "text-blue-600", icon: Shield, label: "Validated (PINT-AE)", bg: "bg-blue-50 border-blue-200" },
  transmitted: { color: "text-purple-600", icon: Globe, label: "Transmitted", bg: "bg-purple-50 border-purple-200" },
  confirmed: { color: "text-green-600", icon: CheckCircle2, label: "Confirmed", bg: "bg-green-50 border-green-200" },
  approved: { color: "text-green-600", icon: CheckCircle2, label: "Approved", bg: "bg-green-50 border-green-200" },
  posted: { color: "text-green-700", icon: CheckCircle2, label: "Posted", bg: "bg-green-50 border-green-200" },
  rejected: { color: "text-red-600", icon: XCircle, label: "Rejected", bg: "bg-red-50 border-red-200" },
  failed: { color: "text-red-600", icon: XCircle, label: "Failed", bg: "bg-red-50 border-red-200" },
  cancelled: { color: "text-gray-600", icon: Archive, label: "Cancelled", bg: "bg-gray-50 border-gray-200" },
};

const categoryLabels: Record<InvoiceCategory, string> = {
  "tax-invoice": "Electronic Tax Invoice",
  "self-billed-tax": "Self-billed Tax Invoice",
  "tax-credit-note": "Tax Credit Note",
  "self-billed-credit": "Self-billed Tax Credit Note",
  "commercial-invoice": "Commercial Invoice",
  "commercial-credit-note": "Commercial Credit Note",
};

const scenarioLabels: Record<Scenario, string> = {
  "free-zone": "Free Trade Zone",
  "deemed-supply": "Deemed Supply",
  "margin-scheme": "Margin Scheme",
  "summary": "Summary Invoice",
  "continuous-supply": "Continuous Supply",
  "agent-billing": "Agent Billing",
  "e-commerce": "E-Commerce",
  "exports": "Exports",
};

function generateXmlPreview(inv: EInvoice, config: CompanyConfig): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:peppol:pint:billing-1@ae-1</cbc:CustomizationID>
  <cbc:ProfileID>urn:peppol:bis:billing</cbc:ProfileID>
  <cbc:ID>${inv.invoiceNumber}</cbc:ID>
  <cbc:IssueDate>${inv.invoiceDate}</cbc:IssueDate>
  <cbc:DueDate>${inv.paymentDueDate}</cbc:DueDate>
  <cbc:InvoiceTypeCode>${inv.category === "tax-credit-note" ? "381" : "380"}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${inv.currencyCode}</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>AED</cbc:TaxCurrencyCode>
  <cbc:UUID>${inv.uuid}</cbc:UUID>
  <cbc:Note>${inv.transactionTypeCode}</cbc:Note>
  ${inv.precedingInvoiceRef ? `<cac:BillingReference>
    <cac:InvoiceDocumentReference>
      <cbc:ID>${inv.precedingInvoiceRef}</cbc:ID>
      <cbc:UUID>${inv.precedingInvoiceUuid}</cbc:UUID>
    </cac:InvoiceDocumentReference>
  </cac:BillingReference>` : ""}
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cbc:EndpointID schemeID="0235">${inv.seller.tin}</cbc:EndpointID>
      <cac:PartyIdentification><cbc:ID schemeID="0235">${inv.seller.tin}</cbc:ID></cac:PartyIdentification>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${inv.seller.name}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="TL">${config.registrationId}</cbc:CompanyID>
      </cac:PartyLegalEntity>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${inv.seller.trn}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PostalAddress>
        <cbc:StreetName>${config.address.line1}</cbc:StreetName>
        <cbc:CityName>${config.address.city}</cbc:CityName>
        <cbc:CountrySubentity>${config.address.subdivision}</cbc:CountrySubentity>
        <cac:Country><cbc:IdentificationCode>${config.address.country}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cbc:EndpointID schemeID="0235">${inv.buyer.tin || "9900000099"}</cbc:EndpointID>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${inv.buyer.name}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      ${inv.buyer.trn ? `<cac:PartyTaxScheme>
        <cbc:CompanyID>${inv.buyer.trn}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>` : ""}
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>${inv.paymentMeansCode}</cbc:PaymentMeansCode>
  </cac:PaymentMeans>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${inv.currencyCode}">${inv.totalTaxAmount.toFixed(2)}</cbc:TaxAmount>
    ${inv.taxBreakdown.map(tb => `<cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${inv.currencyCode}">${tb.taxableAmount.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${inv.currencyCode}">${tb.taxAmount.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>${tb.categoryCode}</cbc:ID>
        <cbc:Percent>${tb.rate}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`).join("\n    ")}
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${inv.currencyCode}">${inv.totalNetAmount.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${inv.currencyCode}">${inv.totalNetAmount.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${inv.currencyCode}">${inv.totalWithTax.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${inv.currencyCode}">${inv.amountDue.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${inv.lines.map(line => `<cac:InvoiceLine>
    <cbc:ID>${line.id}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${line.unitOfMeasure}">${line.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${inv.currencyCode}">${line.netAmount.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${line.itemName}</cbc:Name>
      <cbc:Description>${line.description}</cbc:Description>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>${line.taxCategoryCode}</cbc:ID>
        <cbc:Percent>${line.taxRate}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
      <cac:AdditionalItemProperty>
        <cbc:Name>ItemType</cbc:Name>
        <cbc:Value>${line.itemType}</cbc:Value>
      </cac:AdditionalItemProperty>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${inv.currencyCode}">${line.netPrice.toFixed(2)}</cbc:PriceAmount>
      <cbc:BaseQuantity unitCode="${line.unitOfMeasure}">${line.baseQuantity}</cbc:BaseQuantity>
      <cac:AllowanceCharge>
        <cbc:ChargeIndicator>false</cbc:ChargeIndicator>
        <cbc:Amount currencyID="${inv.currencyCode}">${(line.grossPrice - line.netPrice).toFixed(2)}</cbc:Amount>
        <cbc:BaseAmount currencyID="${inv.currencyCode}">${line.grossPrice.toFixed(2)}</cbc:BaseAmount>
      </cac:AllowanceCharge>
    </cac:Price>
    ${inv.currencyCode !== "AED" ? `<cbc:Note>VAT_AED=${line.vatAmountAED.toFixed(2)};LINE_AED=${line.lineAmountAED.toFixed(2)}</cbc:Note>` : ""}
  </cac:InvoiceLine>`).join("\n  ")}
</Invoice>`;
}

function formatCurrency(amount: number, currency = "AED"): string {
  return `${currency} ${amount.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function daysUntil(date: string): number {
  if (!date) return 0;
  const target = new Date(date).getTime();
  if (Number.isNaN(target)) return 0;
  return Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
}

function readinessScore(items: { done: boolean }[]): number {
  if (items.length === 0) return 0;
  return Math.round((items.filter(item => item.done).length / items.length) * 100);
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function EInvoicing() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "invoices" | "create" | "ap-inbox" | "clients" | "setup" | "compliance">("dashboard");
  const [selectedInvoice, setSelectedInvoice] = useState<EInvoice | null>(null);
  const [showXml, setShowXml] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [companyProfile, setCompanyProfile] = useState<CompanyConfig>(companyConfig);
  const [summary, setSummary] = useState<EInvoiceSummary | null>(null);
  const [invoices, setInvoices] = useState<EInvoice[]>([]);
  const [clients, setClients] = useState<ClientEInvoiceData[]>([]);
  const [receivedInvoices, setReceivedInvoices] = useState<ReceivedEInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEInvoicing = async () => {
    setLoading(true);
    try {
      const [profile, summaryData, issued, clientRows, apRows] = await Promise.all([
        apiFetch<CompanyConfig>("/e-invoicing/company-profile"),
        apiFetch<EInvoiceSummary>("/e-invoicing/summary"),
        apiFetch<EInvoice[]>("/e-invoicing/invoices"),
        apiFetch<ClientEInvoiceData[]>("/e-invoicing/clients"),
        apiFetch<ReceivedEInvoice[]>("/e-invoicing/ap-inbox"),
      ]);
      setCompanyProfile(profile);
      setSummary(summaryData);
      setInvoices(issued);
      setClients(clientRows);
      setReceivedInvoices(apRows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to load e-invoicing data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEInvoicing();
  }, []);

  const submitNewInvoice = async (payload: unknown) => {
    const created = await apiFetch<EInvoice>("/e-invoicing/invoices", { method: "POST", body: payload });
    const submitted = await apiFetch<EInvoice>(`/e-invoicing/invoices/${created.id}/submit`, { method: "POST" });
    toast.success(`E-invoice ${submitted.invoiceNumber} submitted`);
    setSelectedInvoice(submitted);
    setActiveTab("invoices");
    await loadEInvoicing();
  };

  const approveApInvoice = async (id: string) => {
    const posted = await apiFetch<ReceivedEInvoice>(`/e-invoicing/ap-inbox/${id}/approve`, { method: "POST" });
    toast.success(`${posted.invoiceNumber} approved and posted to AP`);
    await loadEInvoicing();
  };

  const syncFinanceCustomers = async () => {
    const result = await apiFetch<{ created: number }>("/e-invoicing/clients/sync-finance", { method: "POST" });
    toast.success(`Finance customer sync complete (${result.created} added)`);
    await loadEInvoicing();
  };

  // Phase countdown
  const goLiveDate = companyProfile.goLiveDate ?? "";
  const aspDeadline = companyProfile.aspAppointmentDeadline ?? "";
  const daysToGoLive = daysUntil(goLiveDate);
  const daysToAsp = daysUntil(aspDeadline);

  const tabs = [
    { id: "dashboard" as const, label: "Dashboard", icon: Zap },
    { id: "invoices" as const, label: "Issued Invoices", icon: FileText },
    { id: "create" as const, label: "New Invoice", icon: Plus },
    { id: "ap-inbox" as const, label: "AP Inbox", icon: Receipt },
    { id: "clients" as const, label: "Client Master", icon: Users },
    { id: "setup" as const, label: "Company Setup", icon: Building2 },
    { id: "compliance" as const, label: "Compliance", icon: Shield },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Tab Navigation */}
      <div className="w-56 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <FileCode className="w-4 h-4 text-amber-600" />
            E-Invoicing
          </h2>
          <p className="text-xs text-muted-foreground mt-1">UAE PINT-AE Compliant</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedInvoice(null); setShowXml(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
        {/* Phase Countdown */}
        <div className="p-3 border-t border-border">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-2">
            <p className="text-xs font-medium text-amber-800">Mandatory Go-Live</p>
            <p className="text-lg font-mono font-bold text-amber-900">{daysToGoLive} days</p>
            <p className="text-xs text-amber-700">{goLiveDate}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading && (
          <div className="mb-4 rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            Loading e-invoicing data...
          </div>
        )}
        {activeTab === "dashboard" && <DashboardView invoices={invoices} config={companyProfile} daysToGoLive={daysToGoLive} daysToAsp={daysToAsp} goLiveDate={goLiveDate} aspDeadline={aspDeadline} onViewInvoice={(inv) => { setSelectedInvoice(inv); setActiveTab("invoices"); }} />}
        {activeTab === "invoices" && !selectedInvoice && <InvoiceListView invoices={invoices} onSelect={setSelectedInvoice} />}
        {activeTab === "invoices" && selectedInvoice && <InvoiceDetailView invoice={selectedInvoice} config={companyProfile} showXml={showXml} setShowXml={setShowXml} onBack={() => setSelectedInvoice(null)} />}
        {activeTab === "create" && <InvoiceCreateView step={createStep} setStep={setCreateStep} clients={clients} config={companyProfile} onSubmit={submitNewInvoice} />}
        {activeTab === "ap-inbox" && <APInboxView invoices={receivedInvoices} onApprove={approveApInvoice} />}
        {activeTab === "clients" && <ClientMasterView clients={clients} onSyncFinance={syncFinanceCustomers} />}
        {activeTab === "setup" && <CompanySetupView config={companyProfile} />}
        {activeTab === "compliance" && <ComplianceDashboardView invoices={invoices} goLiveDate={goLiveDate} aspDeadline={aspDeadline} readiness={summary?.readiness ?? []} />}
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD VIEW
// ============================================================
function DashboardView({ invoices, config, daysToGoLive, daysToAsp, goLiveDate, aspDeadline, onViewInvoice }: { invoices: EInvoice[]; config: CompanyConfig; daysToGoLive: number; daysToAsp: number; goLiveDate: string; aspDeadline: string; onViewInvoice: (inv: EInvoice) => void }) {
  const confirmed = invoices.filter(i => i.status === "confirmed").length;
  const pending = invoices.filter(i => ["submitted", "validated", "transmitted"].includes(i.status)).length;
  const failed = invoices.filter(i => i.status === "failed").length;
  const totalValue = invoices.reduce((s, i) => s + i.totalWithTax, 0);

  return (
    <div className="space-y-5">
      {/* Phase Banner */}
      <div className="rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              UAE E-Invoicing — Mandatory Compliance Phase
            </h3>
            <p className="text-sm text-amber-800 mt-1">
              ASP appointment by {aspDeadline || "not configured"} | Go-live {goLiveDate || "not configured"} | {daysToAsp} days to ASP deadline
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-amber-900">{daysToGoLive}</div>
            <div className="text-xs text-amber-700">days to go-live</div>
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="flex min-w-0 items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
            <span className="truncate text-sm text-amber-800">ASP: {config.asp.name || "Not configured"}</span>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
            <span className="truncate text-sm text-amber-800">Peppol ID: {config.participantId || "Not configured"}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="min-h-[104px] rounded-lg py-0">
          <CardContent className="flex h-full items-center p-5">
            <div className="flex w-full items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Confirmed</p>
                <p className="mt-1 text-2xl font-mono font-bold leading-none text-green-600">{confirmed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 shrink-0 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="min-h-[104px] rounded-lg py-0">
          <CardContent className="flex h-full items-center p-5">
            <div className="flex w-full items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">In Transit</p>
                <p className="mt-1 text-2xl font-mono font-bold leading-none text-purple-600">{pending}</p>
              </div>
              <Globe className="h-8 w-8 shrink-0 text-purple-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="min-h-[104px] rounded-lg py-0">
          <CardContent className="flex h-full items-center p-5">
            <div className="flex w-full items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Failed</p>
                <p className="mt-1 text-2xl font-mono font-bold leading-none text-red-600">{failed}</p>
              </div>
              <XCircle className="h-8 w-8 shrink-0 text-red-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="min-h-[104px] rounded-lg py-0">
          <CardContent className="flex h-full items-center p-5">
            <div className="flex w-full items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Total Value</p>
                <p className="mt-1 truncate font-mono text-xl font-bold leading-tight xl:text-[1.35rem]">{formatCurrency(totalValue)}</p>
              </div>
              <Receipt className="h-8 w-8 shrink-0 text-blue-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5-Corner Model Visualization */}
      <Card className="gap-4 rounded-lg py-0">
        <CardHeader className="px-5 pt-5">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            5-Corner Peppol Model — Live Status
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white px-6 py-8">
            <div className="mx-auto w-fit">
              {/* Exchange flow: Supplier → Supplier ASP → Buyer ASP → Buyer */}
              <div className="flex items-start justify-center gap-3 sm:gap-5">
                <PeppolNode corner={1} label="NASEC Supplier" icon={Building2} ring="border-slate-400" bg="bg-white" iconColor="text-slate-700" />
                <PeppolArrow />
                <PeppolNode corner={2} label={config.asp.name || "Configured ASP"} icon={Shield} ring="border-orange-400" bg="bg-orange-50" iconColor="text-orange-600" />
                <PeppolArrow />
                <PeppolNode corner={3} label="Buyer ASP" icon={Shield} ring="border-purple-400" bg="bg-purple-50" iconColor="text-purple-600" />
                <PeppolArrow />
                <PeppolNode corner={4} label="Buyer" icon={Users} ring="border-green-400" bg="bg-green-50" iconColor="text-green-600" />
              </div>
              {/* Both ASPs report the cleared invoice to the tax authority (Corner 5) */}
              <div className="flex flex-col items-center">
                <div className="h-5 w-px bg-slate-300" />
                <span className="mb-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">reported to</span>
                <PeppolNode corner={5} label="FTA" icon={Landmark} ring="border-red-400" bg="bg-red-50" iconColor="text-red-600" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent E-Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {invoices.slice(0, 5).map(inv => {
              const sc = statusConfig[inv.status];
              return (
                <div key={inv.id} onClick={() => onViewInvoice(inv)} className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-accent/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${sc.bg}`}>
                      <sc.icon className={`w-4 h-4 ${sc.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium font-mono">{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">{inv.buyer.name} • {inv.project}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-medium">{formatCurrency(inv.totalWithTax, inv.currencyCode)}</p>
                    <Badge variant="outline" className={`text-xs ${sc.color}`}>{sc.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// One node in the 5-Corner Peppol diagram — kept visually identical for all 5.
function PeppolNode({ corner, label, icon: Icon, ring, bg, iconColor }: {
  corner: number; label: string; icon: React.ComponentType<{ className?: string }>;
  ring: string; bg: string; iconColor: string;
}) {
  return (
    <div className="flex w-24 flex-col items-center text-center">
      <div className={`flex h-14 w-14 items-center justify-center rounded-full border-2 shadow-sm ${ring} ${bg}`}>
        <Icon className={`h-6 w-6 ${iconColor}`} />
      </div>
      <span className="mt-2 text-xs font-semibold">Corner {corner}</span>
      <span className="max-w-24 truncate text-[11px] text-muted-foreground" title={label}>{label}</span>
    </div>
  );
}

// Connector arrow between two nodes — aligned to the circle row, not the labels.
function PeppolArrow() {
  return <ArrowRight className="mt-[18px] h-5 w-5 shrink-0 text-slate-300" />;
}

// ============================================================
// INVOICE LIST VIEW
// ============================================================
function InvoiceListView({ invoices, onSelect }: { invoices: EInvoice[]; onSelect: (inv: EInvoice) => void }) {
  const [filter, setFilter] = useState<"all" | InvoiceStatus>("all");
  const filtered = filter === "all" ? invoices : invoices.filter(i => i.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Issued E-Invoices</h2>
        <div className="flex gap-2">
          {(["all", "confirmed", "transmitted", "draft", "failed"] as const).map(f => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="text-xs capitalize">
              {f === "all" ? "All" : statusConfig[f]?.label || f}
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {filtered.map(inv => {
          const sc = statusConfig[inv.status];
          return (
            <div key={inv.id} onClick={() => onSelect(inv)} className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-accent/30 cursor-pointer transition-all">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${sc.bg}`}>
                  <sc.icon className={`w-5 h-5 ${sc.color}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-medium text-sm">{inv.invoiceNumber}</p>
                    <Badge variant="outline" className="text-xs">{categoryLabels[inv.category]}</Badge>
                    {inv.scenario && <Badge variant="secondary" className="text-xs">{scenarioLabels[inv.scenario]}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{inv.buyer.name} • {inv.project} • {inv.invoiceDate}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono font-semibold">{formatCurrency(inv.totalWithTax, inv.currencyCode)}</p>
                <p className="text-xs text-muted-foreground">UUID: {inv.uuid.slice(0, 8)}...</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// INVOICE DETAIL VIEW (with 5-Corner tracker + XML)
// ============================================================
function InvoiceDetailView({ invoice, config, showXml, setShowXml, onBack }: { invoice: EInvoice; config: CompanyConfig; showXml: boolean; setShowXml: (v: boolean) => void; onBack: () => void }) {
  const sc = statusConfig[invoice.status];
  const retentionDays = daysUntil(invoice.retentionExpiry);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
          <div>
            <h2 className="text-lg font-mono font-bold">{invoice.invoiceNumber}</h2>
            <p className="text-xs text-muted-foreground">UUID: {invoice.uuid}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowXml(!showXml)}>
            <FileCode className="w-4 h-4 mr-1" /> {showXml ? "Hide XML" : "View XML"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.info("PDF download simulated")}>
            <Download className="w-4 h-4 mr-1" /> PDF
          </Button>
          {invoice.status === "confirmed" && (
            <Button variant="outline" size="sm" className="text-red-600 border-red-200" onClick={() => toast.error("Cannot delete confirmed invoice. Issue a Credit Note instead.")}>
              <Lock className="w-4 h-4 mr-1" /> Cannot Delete
            </Button>
          )}
        </div>
      </div>

      {/* Status Badge + Category */}
      <div className="flex items-center gap-3">
        <Badge className={`${sc.bg} ${sc.color} border`}><sc.icon className="w-3 h-3 mr-1" />{sc.label}</Badge>
        <Badge variant="outline">{categoryLabels[invoice.category]}</Badge>
        <Badge variant="secondary">{scenarioLabels[invoice.scenario]}</Badge>
        <Badge variant="outline" className="font-mono text-xs">Flags: {invoice.transactionTypeCode}</Badge>
      </div>

      {/* 5-Corner Status Tracker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="w-4 h-4" /> 5-Corner Transmission Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {invoice.statusHistory.map((sh, idx) => {
              const shc = statusConfig[sh.status];
              return (
                <div key={idx} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${shc.bg} border`}>
                      <shc.icon className={`w-4 h-4 ${shc.color}`} />
                    </div>
                    {idx < invoice.statusHistory.length - 1 && <div className="w-px h-6 bg-border mt-1" />}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{shc.label}</p>
                      <span className="text-xs font-mono text-muted-foreground">{new Date(sh.timestamp).toLocaleString("en-AE")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{sh.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Credit Note Reference */}
      {invoice.precedingInvoiceRef && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">Preceding Invoice Reference</span>
            </div>
            <p className="text-sm mt-1 font-mono">{invoice.precedingInvoiceRef}</p>
            <p className="text-xs text-muted-foreground">UUID: {invoice.precedingInvoiceUuid}</p>
          </CardContent>
        </Card>
      )}

      {/* Invoice Details Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">SELLER (Corner 1)</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm font-medium">{invoice.seller.name}</p>
            <p className="text-xs font-mono">TIN: {invoice.seller.tin}</p>
            <p className="text-xs font-mono">TRN: {invoice.seller.trn}</p>
            <p className="text-xs font-mono">Peppol: 0235:{invoice.seller.tin}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">BUYER (Corner 4)</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm font-medium">{invoice.buyer.name}</p>
            <p className="text-xs font-mono">TIN: {invoice.buyer.tin || "N/A (Export)"}</p>
            <p className="text-xs font-mono">TRN: {invoice.buyer.trn || "N/A"}</p>
            <p className="text-xs font-mono">Endpoint: 0235:{invoice.buyer.tin || "9900000099"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Invoice Lines</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium">ID</th>
                <th className="text-left py-2 font-medium">Item</th>
                <th className="text-right py-2 font-medium">Qty</th>
                <th className="text-right py-2 font-medium">Net Price</th>
                <th className="text-right py-2 font-medium">Net Amount</th>
                <th className="text-right py-2 font-medium">VAT %</th>
                <th className="text-right py-2 font-medium">VAT (AED)</th>
                <th className="text-right py-2 font-medium">Line (AED)</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map(line => (
                <tr key={line.id} className="border-b border-border/50">
                  <td className="py-2 font-mono">{line.id}</td>
                  <td className="py-2">{line.itemName}<br /><span className="text-muted-foreground">{line.description}</span></td>
                  <td className="py-2 text-right font-mono">{line.quantity} {line.unitOfMeasure}</td>
                  <td className="py-2 text-right font-mono">{formatCurrency(line.netPrice, invoice.currencyCode)}</td>
                  <td className="py-2 text-right font-mono">{formatCurrency(line.netAmount, invoice.currencyCode)}</td>
                  <td className="py-2 text-right font-mono">{line.taxRate}% ({line.taxCategoryCode})</td>
                  <td className="py-2 text-right font-mono">{formatCurrency(line.vatAmountAED)}</td>
                  <td className="py-2 text-right font-mono">{formatCurrency(line.lineAmountAED)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-medium">
                <td colSpan={4} className="py-2 text-right">Totals:</td>
                <td className="py-2 text-right font-mono">{formatCurrency(invoice.totalNetAmount, invoice.currencyCode)}</td>
                <td></td>
                <td className="py-2 text-right font-mono">{formatCurrency(invoice.totalTaxAmount, invoice.currencyCode)}</td>
                <td className="py-2 text-right font-mono font-bold">{formatCurrency(invoice.totalWithTax, invoice.currencyCode)}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {/* Retention */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Records Retention</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-mono">{retentionDays.toLocaleString()} days remaining</span>
            <p className="text-xs text-muted-foreground">Expires: {invoice.retentionExpiry} (5 years — Taxable Person)</p>
          </div>
        </CardContent>
      </Card>

      {/* XML Preview */}
      {showXml && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <FileCode className="w-4 h-4" /> PINT-AE XML — Specification Identifier: urn:peppol:pint:billing-1@ae-1
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-slate-900 text-green-300 p-4 rounded-md text-xs overflow-auto max-h-96 font-mono leading-relaxed">
              {generateXmlPreview(invoice, config)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// INVOICE CREATE VIEW (51 fields)
// ============================================================
function InvoiceCreateView({ step, setStep, clients, config, onSubmit }: { step: number; setStep: (s: number) => void; clients: ClientEInvoiceData[]; config: CompanyConfig; onSubmit: (payload: unknown) => Promise<void> }) {
  const [category, setCategory] = useState<InvoiceCategory>("tax-invoice");
  const [scenario, setScenario] = useState<Scenario>("continuous-supply");
  const [flags, setFlags] = useState(["0","0","0","0","1","0","0","0"]); // Default: Continuous Supply
  const [selectedClient, setSelectedClient] = useState<ClientEInvoiceData | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationPassed, setValidationPassed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedClient && clients.length > 0) setSelectedClient(clients[0]);
  }, [clients, selectedClient]);

  const flagLabels = ["Free Trade Zone", "Deemed Supply", "Margin Scheme", "Summary Invoice", "Continuous Supply", "Disclosed Agent", "E-Commerce", "Exports"];

  const collectValidationErrors = () => {
    const errors: string[] = [];
    if (!selectedClient) errors.push("Buyer not selected");
    if (category === "tax-invoice" && !selectedClient?.trn) errors.push("Buyer TRN required for Tax Invoice");
    if (!config.tin) errors.push("Seller TIN not configured");
    if (!config.trn) errors.push("Seller TRN not configured");
    if (flags[0] === "1" && !selectedClient?.freeZone) errors.push("Free Zone flag set but client not in Free Zone");
    if (flags[0] === "1" && !selectedClient?.beneficiaryName) errors.push("Beneficiary required for Free Zone transactions");
    return errors;
  };

  const runValidation = () => {
    const errors = collectValidationErrors();
    setValidationErrors(errors);
    setValidationPassed(errors.length === 0);
    if (errors.length === 0) toast.success("All 51 mandatory fields validated ✓");
  };

  const submitInvoice = async () => {
    const errors = collectValidationErrors();
    setValidationErrors(errors);
    setValidationPassed(errors.length === 0);
    if (errors.length > 0) {
      toast.error(`${errors.length} validation issue(s) found`);
      return;
    }
    if (!selectedClient) return;
    setSubmitting(true);
    try {
      await onSubmit({
        category,
        scenario,
        clientId: selectedClient.id,
        transactionTypeCode: flags.join(""),
        currencyCode: "AED",
        projectName: "Design Services",
        milestone: "Current stage billing",
        lines: [
          { description: "Architectural Design - Stage Billing", itemName: "Architectural Design Services", quantity: 1, unitOfMeasure: "EA", netPrice: 350000, taxCategoryCode: "S", taxRate: 5, itemType: "S" },
          { description: "Structural Engineering - Stage Billing", itemName: "Structural Engineering Services", quantity: 1, unitOfMeasure: "EA", netPrice: 140000, taxCategoryCode: "S", taxRate: 5, itemType: "S" },
        ],
      });
      setStep(1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to submit e-invoice");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Create E-Invoice</h2>
        <div className="flex items-center gap-2">
          {[1,2,3,4,5].map(s => (
            <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
              s === step ? "bg-primary text-primary-foreground" : s < step ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
            }`}>{s}</div>
          ))}
        </div>
      </div>

      {/* Step 1: Category & Scenario */}
      {step === 1 && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Invoice Category</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {(Object.entries(categoryLabels) as [InvoiceCategory, string][]).map(([key, label]) => (
                  <button key={key} onClick={() => setCategory(key)} className={`p-3 rounded-lg border text-left text-sm transition-all ${
                    category === key ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/30"
                  }`}>
                    <p className="font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {key.includes("credit") ? "Reduces/cancels prior invoice" : key.includes("commercial") ? "Non-VAT transactions" : "Standard billing"}
                    </p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Transaction Scenario</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {(Object.entries(scenarioLabels) as [Scenario, string][]).map(([key, label]) => (
                  <button key={key} onClick={() => {
                    setScenario(key);
                    const newFlags = ["0","0","0","0","0","0","0","0"];
                    const idx = ["free-zone","deemed-supply","margin-scheme","summary","continuous-supply","agent-billing","e-commerce","exports"].indexOf(key);
                    if (idx >= 0) newFlags[idx] = "1";
                    if (key !== "summary") newFlags[4] = "1"; // AEC always continuous supply
                    setFlags(newFlags);
                  }} className={`p-2 rounded-md border text-xs text-center transition-all ${
                    scenario === key ? "border-primary bg-primary/5 ring-1 ring-primary font-medium" : "border-border hover:border-primary/30"
                  }`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-4 p-3 bg-muted/50 rounded-md">
                <p className="text-xs font-medium mb-2">Transaction Type Code (8-flag binary)</p>
                <div className="flex gap-1">
                  {flags.map((f, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <button onClick={() => { const nf = [...flags]; nf[i] = nf[i] === "1" ? "0" : "1"; setFlags(nf); }}
                        className={`w-8 h-8 rounded border text-sm font-mono font-bold ${f === "1" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"}`}>
                        {f}
                      </button>
                      <span className="text-[9px] text-muted-foreground mt-1 text-center leading-tight w-12">{flagLabels[i]}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs font-mono mt-2 text-muted-foreground">Code: {flags.join("")}</p>
              </div>
            </CardContent>
          </Card>
          <Button onClick={() => setStep(2)} className="w-full">Next: Buyer Details <ArrowRight className="w-4 h-4 ml-1" /></Button>
        </div>
      )}

      {/* Step 2: Buyer Selection */}
      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Select Buyer</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {clients.map(client => (
                  <div key={client.id} onClick={() => setSelectedClient(client)} className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedClient?.id === client.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/30"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{client.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">TIN: {client.tin || "N/A"} | TRN: {client.trn || "N/A"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {client.freeZone && <Badge variant="secondary" className="text-xs">Free Zone</Badge>}
                        {!client.onEInvoicingSystem && <Badge variant="outline" className="text-xs text-amber-600">Not on E-Invoicing</Badge>}
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <span>Endpoint: {client.electronicAddress}</span>
                      <span>Reg: {client.legalRegType}-{client.legalRegId.slice(-8)}</span>
                      <span>{client.address.city}, {client.address.country}</span>
                    </div>
                  </div>
                ))}
              </div>
              {clients.length === 0 && (
                <div className="p-4 rounded-md border border-amber-200 bg-amber-50 text-sm text-amber-800">
                  No e-invoicing clients found. Sync finance customers from Client Master first.
                </div>
              )}
              {selectedClient?.freeZone && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-xs font-medium text-amber-800 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Free Zone — Beneficiary Required</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-amber-700">Beneficiary Name</label>
                      <input className="w-full mt-1 px-2 py-1 border border-amber-300 rounded text-xs bg-white" defaultValue={selectedClient.beneficiaryName} />
                    </div>
                    <div>
                      <label className="text-xs text-amber-700">Beneficiary Address</label>
                      <input className="w-full mt-1 px-2 py-1 border border-amber-300 rounded text-xs bg-white" defaultValue={selectedClient.beneficiaryAddress} />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            <Button onClick={() => setStep(3)} className="flex-1">Next: Line Items <ArrowRight className="w-4 h-4 ml-1" /></Button>
          </div>
        </div>
      )}

      {/* Step 3: Line Items */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Invoice Lines</CardTitle>
                <Button size="sm" variant="outline" onClick={() => toast.info("Add line item")}><Plus className="w-3 h-3 mr-1" /> Add Line</Button>
              </div>
            </CardHeader>
            <CardContent>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">ID</th>
                    <th className="text-left py-2">Item Name</th>
                    <th className="text-right py-2">Qty</th>
                    <th className="text-right py-2">UoM</th>
                    <th className="text-right py-2">Net Price</th>
                    <th className="text-right py-2">Gross Price</th>
                    <th className="text-right py-2">Tax Cat</th>
                    <th className="text-right py-2">Rate %</th>
                    <th className="text-right py-2">Net Amount</th>
                    <th className="text-right py-2">Type</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-2 font-mono">L1</td>
                    <td className="py-2">Architectural Design — Stage 4 DD</td>
                    <td className="py-2 text-right">1</td>
                    <td className="py-2 text-right">EA</td>
                    <td className="py-2 text-right font-mono">350,000</td>
                    <td className="py-2 text-right font-mono">367,500</td>
                    <td className="py-2 text-right">S</td>
                    <td className="py-2 text-right">5%</td>
                    <td className="py-2 text-right font-mono">350,000</td>
                    <td className="py-2 text-right">S</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 font-mono">L2</td>
                    <td className="py-2">Structural Engineering — Stage 4 DD</td>
                    <td className="py-2 text-right">1</td>
                    <td className="py-2 text-right">EA</td>
                    <td className="py-2 text-right font-mono">140,000</td>
                    <td className="py-2 text-right font-mono">147,000</td>
                    <td className="py-2 text-right">S</td>
                    <td className="py-2 text-right">5%</td>
                    <td className="py-2 text-right font-mono">140,000</td>
                    <td className="py-2 text-right">S</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="font-medium">
                    <td colSpan={8} className="py-2 text-right">Subtotal:</td>
                    <td className="py-2 text-right font-mono">490,000</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-xs text-blue-800 flex items-center gap-1"><Info className="w-3 h-3" /> AED amounts (fields 48 & 49) auto-calculated for each line regardless of invoice currency</p>
              </div>
              {scenario === "continuous-supply" && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-xs text-green-800 flex items-center gap-1"><Info className="w-3 h-3" /> Continuous Supply: Retention amounts must NOT appear on this e-invoice. Issue a separate commercial document for milestone calculation and retention deduction.</p>
                </div>
              )}
            </CardContent>
          </Card>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            <Button onClick={() => setStep(4)} className="flex-1">Next: Tax & Totals <ArrowRight className="w-4 h-4 ml-1" /></Button>
          </div>
        </div>
      )}

      {/* Step 4: Tax Breakdown & Totals */}
      {step === 4 && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Tax Breakdown</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Tax Category</th>
                    <th className="text-right py-2">Taxable Amount</th>
                    <th className="text-right py-2">Rate</th>
                    <th className="text-right py-2">Tax Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-2">Standard Rate (S)</td>
                    <td className="py-2 text-right font-mono">AED 490,000.00</td>
                    <td className="py-2 text-right font-mono">5%</td>
                    <td className="py-2 text-right font-mono">AED 24,500.00</td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-4 space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm"><span>Sum of line net amounts:</span><span className="font-mono">AED 490,000.00</span></div>
                <div className="flex justify-between text-sm"><span>Invoice total without tax:</span><span className="font-mono">AED 490,000.00</span></div>
                <div className="flex justify-between text-sm"><span>Invoice total tax amount:</span><span className="font-mono">AED 24,500.00</span></div>
                <div className="flex justify-between text-sm font-bold border-t pt-2"><span>Invoice total with tax:</span><span className="font-mono">AED 514,500.00</span></div>
                <div className="flex justify-between text-sm font-bold"><span>Amount due for payment:</span><span className="font-mono">AED 514,500.00</span></div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1"><Info className="w-3 h-3" /> Rounding applied only at invoice total level, max 2 decimal places. No QR codes or barcodes on Electronic Invoices.</p>
            </CardContent>
          </Card>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(3)} className="flex-1"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            <Button onClick={() => { runValidation(); setStep(5); }} className="flex-1">Next: Validate & Submit <ArrowRight className="w-4 h-4 ml-1" /></Button>
          </div>
        </div>
      )}

      {/* Step 5: Validation & Submit */}
      {step === 5 && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4" /> PINT-AE Validation</CardTitle></CardHeader>
            <CardContent>
              {/* Inline Validator Panel */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 rounded bg-green-50 border border-green-200">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-800">Specification Identifier: urn:peppol:pint:billing-1@ae-1</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-green-50 border border-green-200">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-800">Seller electronic identifier: 0235 (UAE business)</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-green-50 border border-green-200">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-800">All 51 mandatory fields populated</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-green-50 border border-green-200">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-800">TRN format valid (15 digits)</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-green-50 border border-green-200">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-800">AED amounts present on all lines (fields 48, 49)</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-green-50 border border-green-200">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-800">No QR code / barcode (compliant)</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-green-50 border border-green-200">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-800">Transaction type code: {flags.join("")} — {scenarioLabels[scenario]}</span>
                </div>
                {validationErrors.length > 0 && validationErrors.map((err, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded bg-red-50 border border-red-200">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-xs text-red-800">{err}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between p-3 bg-muted/50 rounded-md">
                <div>
                  <p className="text-sm font-medium">Validation Status</p>
                  <p className="text-xs text-muted-foreground">
                    {validationPassed ? "All checks passed — ready to submit" : validationErrors.length > 0 ? `${validationErrors.length} error(s) found` : "Click Validate to check"}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={runValidation}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Re-validate
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Penalty Warning */}
          <Card className="border-red-200 bg-red-50/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-red-800">CD 106/2025 — Penalty Warning</p>
                  <p className="text-xs text-red-700 mt-1">Non-compliance with e-invoicing requirements after mandatory go-live date may result in administrative penalties as prescribed by Cabinet Decision No. 106 of 2025.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(4)} className="flex-1"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            <Button disabled={submitting || (!validationPassed && validationErrors.length > 0)} onClick={submitInvoice} className="flex-1">
              <Send className="w-4 h-4 mr-1" /> {submitting ? "Submitting..." : "Submit to ASP"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// AP INBOX VIEW
// ============================================================
function APInboxView({ invoices, onApprove }: { invoices: ReceivedEInvoice[]; onApprove: (id: string) => Promise<void> }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">AP Inbox — Received Supplier E-Invoices</h2>
        <Badge variant="outline">{invoices.filter(inv => inv.status === "pending-approval").length} pending approval</Badge>
      </div>
      <Card>
        <CardContent className="p-0">
          {invoices.map(inv => (
            <div key={inv.id} className="p-4 border-b border-border last:border-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{inv.supplierName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{inv.invoiceNumber} • {inv.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono font-semibold">{formatCurrency(inv.total)}</p>
                  <Badge variant="secondary" className="text-xs">{statusConfig[(inv.status as InvoiceStatus)]?.label ?? inv.status}</Badge>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-3 text-xs">
                <div><span className="text-muted-foreground">Project:</span> {inv.project}</div>
                <div><span className="text-muted-foreground">PO:</span> <span className="font-mono">{inv.poRef}</span></div>
                <div><span className="text-muted-foreground">GRN:</span> <span className="font-mono">{inv.grnRef}</span></div>
                <div>
                  <span className="text-muted-foreground">Match:</span>{" "}
                  <Badge variant="outline" className="text-xs text-green-600">{inv.matchStatus}</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{inv.description}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" disabled={inv.status === "posted"} onClick={() => void onApprove(inv.id)}>
                  {inv.status === "posted" ? "Posted" : "Approve & Post"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => toast.info("XML preview opened")}>View XML</Button>
                <Button size="sm" variant="outline" onClick={() => toast.info("Rejection workflow opened")}>Reject</Button>
              </div>
            </div>
          ))}
          {invoices.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">No supplier e-invoices are waiting in AP inbox.</div>
          )}
        </CardContent>
      </Card>
      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="p-4">
          <p className="text-xs text-blue-800 flex items-center gap-1"><Info className="w-3 h-3" /> Inbound flow: Supplier ASP (Corner 2) → Our ASP (Corner 3) → Our ERP (Corner 4). Auto-PDF rendering of received XML for human review. 3-way matching against PO + GRN + budget line.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// CLIENT MASTER VIEW
// ============================================================
function ClientMasterView({ clients, onSyncFinance }: { clients: ClientEInvoiceData[]; onSyncFinance: () => Promise<void> }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const sync = async () => {
    setSyncing(true);
    try {
      await onSyncFinance();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Client Master — E-Invoicing Data</h2>
        <Button size="sm" onClick={() => void sync()} disabled={syncing}>
          <RefreshCw className="w-4 h-4 mr-1" /> {syncing ? "Syncing..." : "Sync Finance Customers"}
        </Button>
      </div>
      <div className="space-y-3">
        {clients.map(client => (
          <Card key={client.id} className={`transition-all ${expanded === client.id ? "ring-1 ring-primary" : ""}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(expanded === client.id ? null : client.id)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{client.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">TIN: {client.tin || "N/A"} | TRN: {client.trn || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {client.freeZone && <Badge variant="secondary" className="text-xs">Free Zone ({client.freeZoneEntity})</Badge>}
                  {!client.onEInvoicingSystem && <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Not on E-Invoicing System</Badge>}
                  {client.onEInvoicingSystem && <Badge variant="outline" className="text-xs text-green-600 border-green-300">Active on E-Invoicing</Badge>}
                  {expanded === client.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </div>
              {expanded === client.id && (
                <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <h4 className="font-medium text-muted-foreground uppercase tracking-wider">Identification</h4>
                    <div className="grid grid-cols-2 gap-1">
                      <span className="text-muted-foreground">TIN:</span><span className="font-mono">{client.tin || "—"}</span>
                      <span className="text-muted-foreground">TRN:</span><span className="font-mono">{client.trn || "—"}</span>
                      <span className="text-muted-foreground">Legal Reg ID:</span><span className="font-mono">{client.legalRegId}</span>
                      <span className="text-muted-foreground">Reg Type:</span><span>{client.legalRegType}</span>
                      <span className="text-muted-foreground">Electronic Address:</span><span className="font-mono">{client.electronicAddress}</span>
                      <span className="text-muted-foreground">Identifier Scheme:</span><span className="font-mono">{client.electronicIdentifier}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-muted-foreground uppercase tracking-wider">Address</h4>
                    <div className="grid grid-cols-2 gap-1">
                      <span className="text-muted-foreground">Line 1:</span><span>{client.address.line1}</span>
                      <span className="text-muted-foreground">City:</span><span>{client.address.city}</span>
                      <span className="text-muted-foreground">Subdivision:</span><span>{client.address.subdivision}</span>
                      <span className="text-muted-foreground">Country:</span><span>{client.address.country}</span>
                    </div>
                    {client.freeZone && (
                      <>
                        <h4 className="font-medium text-muted-foreground uppercase tracking-wider mt-3">Beneficiary</h4>
                        <div className="grid grid-cols-2 gap-1">
                          <span className="text-muted-foreground">Name:</span><span>{client.beneficiaryName}</span>
                          <span className="text-muted-foreground">Address:</span><span>{client.beneficiaryAddress}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {clients.length === 0 && (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No e-invoicing clients found. Sync Finance Customers to build the client master.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ============================================================
// COMPANY SETUP VIEW
// ============================================================
function CompanySetupView({ config }: { config: CompanyConfig }) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Company E-Invoicing Setup</h2>

      {/* Company Identity */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Building2 className="w-4 h-4" /> Company Identity</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Legal Name</label>
                <p className="text-sm font-medium">{config.legalName}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tax Identification Number (TIN) — 10 digits</label>
                <p className="text-lg font-mono font-bold text-primary">{config.tin}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tax Registration Number (TRN) — 15 digits</label>
                <p className="text-lg font-mono font-bold">{config.trn}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Peppol Participant Identifier</label>
                <p className="text-lg font-mono font-bold text-green-700">{config.participantId}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Trade License Authority</label>
                <p className="text-sm">{config.tradeLicenseAuthority}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Registration Type</label>
                <p className="text-sm font-mono">{config.registrationType} — Trade License</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Registration ID</label>
                <p className="text-sm font-mono">{config.registrationId}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Address</label>
                <p className="text-sm">{config.address.line1}, {config.address.city}, {config.address.subdivision}, {config.address.country}</p>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">VAT Registered</label>
                  <p className="text-sm">{config.vatRegistered ? "Yes" : "No"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Tax Group Member</label>
                  <p className="text-sm">{config.taxGroupMember ? `Yes (TIN: ${config.taxGroupTin})` : "No"}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ASP Configuration */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4" /> Accredited Service Provider (ASP)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Selected ASP (MoF Central Register)</label>
                <p className="text-sm font-medium">{config.asp.name}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">API Endpoint</label>
                <p className="text-xs font-mono bg-muted/50 p-2 rounded">{config.asp.endpoint}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Auth Token</label>
                <p className="text-xs font-mono bg-muted/50 p-2 rounded">{config.asp.authToken}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Certificate</label>
                <p className="text-xs font-mono bg-muted/50 p-2 rounded">{config.asp.certificate}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-xs text-blue-800 flex items-center gap-1"><Info className="w-3 h-3" /> Per MD 64/2025: Only one ASP per company for both AR and AP. ASP must be listed on the MoF Central Register.</p>
          </div>
        </CardContent>
      </Card>

      {/* Implementation Phase */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4" /> Implementation Phase</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700 font-medium">Annual Revenue Category</p>
              <p className="text-lg font-bold text-amber-900">{config.annualRevenue === "above50m" ? "≥ AED 50 Million" : "< AED 50 Million"}</p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-800">ASP Appointment Deadline:</span>
                  <span className="font-mono font-bold">{config.aspAppointmentDeadline || "Not configured"}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-800">Mandatory Go-Live:</span>
                  <span className="font-mono font-bold">{config.goLiveDate || "Not configured"}</span>
                </div>
              </div>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-700 font-medium">Voluntary Onboarding</p>
              <p className="text-sm text-green-800 mt-1">Available from {config.voluntaryOnboardingDate || "not configured"} — penalty-free testing period</p>
              <div className="mt-3 p-2 bg-green-100 rounded">
                <p className="text-xs text-green-900 font-medium">✓ You can voluntarily onboard now without penalty risk</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exclusions */}
      <Card>
        <CardHeader><CardTitle className="text-sm">E-Invoicing Exclusions (Auto-Detected)</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
              <XCircle className="w-3 h-3 text-muted-foreground" />
              <span>Sovereign government activities (buyer acting in sovereign capacity)</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
              <XCircle className="w-3 h-3 text-muted-foreground" />
              <span>Supplies to natural persons not in business (B2C, G2C)</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
              <XCircle className="w-3 h-3 text-muted-foreground" />
              <span>Exempt financial services</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              <span className="text-amber-800">Intra-VAT-Group transactions are flagged for finance review and not auto-blocked.</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// COMPLIANCE DASHBOARD VIEW
// ============================================================
function ComplianceDashboardView({ invoices, goLiveDate, aspDeadline, readiness }: { invoices: EInvoice[]; goLiveDate: string; aspDeadline: string; readiness: { item: string; done: boolean }[] }) {
  const confirmed = invoices.filter(i => i.status === "confirmed").length;
  const total = invoices.length;
  const complianceRate = total > 0 ? Math.round((confirmed / total) * 100) : 0;
  const checklist = readiness;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Compliance Dashboard</h2>

      {/* Readiness Score */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Readiness Score</p>
            <p className="text-3xl font-mono font-bold text-green-600">{readinessScore(checklist)}%</p>
            <Progress value={readinessScore(checklist)} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">FTA Reporting Rate</p>
            <p className="text-3xl font-mono font-bold">{complianceRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">{confirmed}/{total} confirmed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Days to Go-Live</p>
            <p className="text-3xl font-mono font-bold text-amber-600">{daysUntil(goLiveDate)}</p>
            <p className="text-xs text-muted-foreground mt-1">{goLiveDate}</p>
          </CardContent>
        </Card>
      </div>

      {/* Onboarding Readiness Checklist */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Onboarding Readiness Checklist (Appendix 2)</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {checklist.map((item, i) => (
              <div key={i} className={`flex items-center gap-2 p-2 rounded text-sm ${item.done ? "bg-green-50" : "bg-amber-50"}`}>
                {item.done ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Clock className="w-4 h-4 text-amber-600" />}
                <span className={item.done ? "text-green-800" : "text-amber-800"}>{item.item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Records Retention */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Archive className="w-4 h-4" /> Records Retention (Article 11, MD 243)</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs">
            {invoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-2 rounded border border-border">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono">{inv.invoiceNumber}</span>
                  <span className="text-muted-foreground">• {inv.buyer.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs">5 years (Taxable Person)</Badge>
                  <span className="font-mono text-muted-foreground">Expires: {inv.retentionExpiry}</span>
                  <Timer className="w-3 h-3 text-green-600" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-muted/50 rounded-md text-xs space-y-1">
            <p className="font-medium">Retention Rules:</p>
            <p>• 5 years from end of Tax Period (Taxable Persons)</p>
            <p>• 5 years from end of calendar year (non-Taxable Persons)</p>
            <p>• 7 years for real-estate-related records</p>
            <p>• +4 years if dispute/audit/voluntary disclosure</p>
            <p>• Auto-delete blocked during retention period</p>
          </div>
        </CardContent>
      </Card>

      {/* Penalty Warnings */}
      <Card className="border-red-200">
        <CardHeader><CardTitle className="text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> CD 106/2025 — Penalty Framework</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs">
            <div className="p-2 rounded bg-red-50 border border-red-200">
              <p className="font-medium text-red-800">Penalties apply ONLY after mandatory go-live date</p>
              <p className="text-red-700 mt-1">Current status: Voluntary phase — penalty-free</p>
            </div>
            <p className="text-muted-foreground mt-2">Potential violations after go-live:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
              <li>Failure to issue Electronic Invoice when required</li>
              <li>Issuing non-compliant Electronic Invoice (missing mandatory fields)</li>
              <li>Failure to appoint an ASP by deadline</li>
              <li>Failure to retain records for the prescribed period</li>
              <li>Failure to provide records to FTA on request</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
