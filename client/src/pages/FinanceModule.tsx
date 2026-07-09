/**
 * Finance & Accounting — comprehensive Dubai-AEC accountancy module
 *
 * Tabs:
 *  Overview          - KPI dashboard, cashflow snapshot, monthly P&L chart
 *  Chart of Accounts - GL setup (assets/liabilities/equity/income/expense)
 *  Journals          - Manual journal entries + posted GL
 *  Customers / AR    - Customer master + AR invoices + receipts + aging
 *  Suppliers / AP    - Supplier master + AP bills + payments + aging
 *  Banking           - Bank accounts, transactions, reconciliation, cheque register
 *  Petty Cash        - Per-office floats + vouchers
 *  Office Expenses   - Recurring bills (DEWA, Etisalat, Tabreed, Ejari, etc.)
 *  Insurance         - Medical / PI / Project CAR / Vehicle / D&O register + claims
 *  Fixed Assets      - Asset register + monthly depreciation
 *  Subscriptions     - Software, memberships
 *  Trade & Govt      - DED, MOHRE, GDRFA, FTA, DM fees
 *  VAT               - UAE FTA 5% quarterly returns
 *  WPS               - Wage Protection System runs
 *  Budget vs Actual  - Annual budget variance
 *  Reports           - P&L, Balance Sheet, Trial Balance, Aging
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  FileText,
  Receipt,
  Building2,
  Wallet,
  ShieldCheck,
  Box,
  Cloud,
  Calculator,
  Banknote,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Search,
  PiggyBank,
  ScrollText,
  FileDown,
  Building,
  BarChart3,
  BookOpen,
  LandmarkIcon,
  LineChart,
  Scale,
  Users,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
} from "lucide-react";
import {
  glAccountsStore,
  journalEntriesStore,
  vatReturnsStore,
  customersStore,
  arInvoicesStore,
  arReceiptsStore,
  suppliersStore,
  apBillsStore,
  supplierPaymentsStore,
  bankAccountsStore,
  bankTransactionsStore,
  chequesStore,
  pettyCashFloatsStore,
  pettyCashVouchersStore,
  recurringExpensesStore,
  utilityBillsStore,
  insurancePoliciesStore,
  insuranceClaimsStore,
  fixedAssetsStore,
  subscriptionsStore,
  governmentFeesStore,
  budgetsStore,
  wpsRunsStore,
  payrollRunsStore,
  corporateTaxReturnsStore,
  bankReconciliationsStore,
  retentionReleasesStore,
} from "@/lib/stores";
import { newId, useCollection } from "@/lib/store";
import { useLocation } from "wouter";
import { useActiveOffice } from "@/components/office/OfficeSwitcher";
import FinanceRenewalCalendar from "@/components/calendars/FinanceRenewalCalendar";
import FinancialStatements from "@/components/finance/FinancialStatements";
import NewJournalDialog from "@/components/finance/NewJournalDialog";
import {
  aging,
  agingBucket,
  computeMonthlyDepreciation,
  INSURANCE_LABELS,
} from "@/lib/finance/types";
import { synthesiseJournals } from "@/lib/finance/auto-post";

const officeCurrency: Record<string, string> = { dubai: "AED", cairo: "EGP" };

const FINANCE_TABS = [
  { value: "overview", label: "Overview", icon: LineChart },
  { value: "coa", label: "Chart of Accounts", icon: BookOpen },
  { value: "journals", label: "Journal Entries", icon: ScrollText },
  { value: "ledger", label: "General Ledger", icon: FileSpreadsheet },
  { value: "ar", label: "Customers / AR", icon: Users },
  { value: "ap", label: "Suppliers / AP", icon: Receipt },
  { value: "bank", label: "Banking", icon: LandmarkIcon },
  { value: "petty", label: "Petty Cash", icon: PiggyBank },
  { value: "expenses", label: "Office Expenses", icon: Building2 },
  { value: "insurance", label: "Insurance", icon: ShieldCheck },
  { value: "assets", label: "Fixed Assets", icon: Box },
  { value: "subs", label: "Subscriptions", icon: Cloud },
  { value: "govt", label: "Trade & Govt", icon: Scale },
  { value: "vat", label: "VAT", icon: Calculator },
  { value: "wps", label: "WPS", icon: Banknote },
  { value: "payroll", label: "Payroll", icon: Users },
  { value: "corptax", label: "Corporate Tax", icon: Building },
  { value: "cashflow", label: "Cash Flow", icon: TrendingUp },
  { value: "budget", label: "Budget vs Actual", icon: BarChart3 },
  { value: "reports", label: "Reports", icon: FileText },
] as const;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function makeRef(prefix: string, count: number): string {
  return `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
}

export default function FinanceModule() {
  const [, navigate] = useLocation();
  const [officeFilter, setOfficeFilter] = useActiveOffice("all");

  // Pull all stores
  const accounts = useCollection(glAccountsStore);
  const journals = useCollection(journalEntriesStore);
  const vatReturns = useCollection(vatReturnsStore);
  const customers = useCollection(customersStore);
  const arInvoices = useCollection(arInvoicesStore);
  const arReceipts = useCollection(arReceiptsStore);
  const suppliers = useCollection(suppliersStore);
  const apBills = useCollection(apBillsStore);
  const supplierPayments = useCollection(supplierPaymentsStore);
  const banks = useCollection(bankAccountsStore);
  const bankTxs = useCollection(bankTransactionsStore);
  const cheques = useCollection(chequesStore);
  const floats = useCollection(pettyCashFloatsStore);
  const vouchers = useCollection(pettyCashVouchersStore);
  const recurringExpenses = useCollection(recurringExpensesStore);
  const utilityBills = useCollection(utilityBillsStore);
  const insurancePolicies = useCollection(insurancePoliciesStore);
  const insuranceClaims = useCollection(insuranceClaimsStore);
  const fixedAssets = useCollection(fixedAssetsStore);
  const subscriptions = useCollection(subscriptionsStore);
  const governmentFees = useCollection(governmentFeesStore);
  const budgets = useCollection(budgetsStore);
  const wpsRuns = useCollection(wpsRunsStore);
  const payrollRuns = useCollection(payrollRunsStore);
  const corpTaxReturns = useCollection(corporateTaxReturnsStore);
  const bankRecons = useCollection(bankReconciliationsStore);
  const retentionRels = useCollection(retentionReleasesStore);

  // Office-filtered datasets
  const inOffice = <T extends { office?: string }>(arr: T[]): T[] =>
    officeFilter === "all" ? arr : arr.filter(x => x.office === officeFilter);

  const arInv = useMemo(() => inOffice(arInvoices), [arInvoices, officeFilter]);
  const apB = useMemo(() => inOffice(apBills), [apBills, officeFilter]);
  const bks = useMemo(() => inOffice(banks), [banks, officeFilter]);
  const ins = useMemo(
    () => inOffice(insurancePolicies),
    [insurancePolicies, officeFilter]
  );
  const fa = useMemo(() => inOffice(fixedAssets), [fixedAssets, officeFilter]);
  const flts = useMemo(() => inOffice(floats), [floats, officeFilter]);
  const recExp = useMemo(
    () => inOffice(recurringExpenses),
    [recurringExpenses, officeFilter]
  );
  const wps = useMemo(() => inOffice(wpsRuns), [wpsRuns, officeFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const bkIds = new Set(bks.map(b => b.id));
    const bkTx = bankTxs.filter(t => bkIds.has(t.bankAccountId));
    const outstandingAR = arInv
      .filter(i => i.status !== "paid" && i.status !== "cancelled")
      .reduce((s, i) => s + i.balance, 0);
    const outstandingAP = apB
      .filter(b => b.status !== "paid" && b.status !== "rejected")
      .reduce((s, b) => s + b.balance, 0);
    const overdueAR = arInv
      .filter(i => i.status === "overdue")
      .reduce((s, i) => s + i.balance, 0);
    const cashOnHand =
      bks.reduce((s, b) => s + b.openingBalance, 0) +
      bkTx.reduce((s, t) => s + (t.debit - t.credit), 0);
    const pettyCash = flts.reduce((s, f) => s + f.currentBalance, 0);
    const monthlyDep = fa
      .filter(a => a.status === "active")
      .reduce((s, a) => s + computeMonthlyDepreciation(a), 0);
    const annualSubs = subscriptions
      .filter(s2 => s2.isActive)
      .reduce(
        (s, sub) =>
          s +
          (sub.frequency === "annual"
            ? sub.costAED
            : sub.frequency === "monthly"
              ? sub.costAED * 12
              : sub.frequency === "quarterly"
                ? sub.costAED * 4
                : sub.costAED * 2),
        0
      );
    const insurancePremium = ins
      .filter(p => p.status === "active")
      .reduce((s, p) => s + Number(p.premiumAED ?? p.premium ?? p.annualPremium ?? 0), 0);
    const currentVat = vatReturns.find(v => v.status === "draft");
    const upcomingRenewals =
      ins.filter(p => {
        const days =
          (new Date(p.expiryDate).getTime() - Date.now()) / 86_400_000;
        return days > 0 && days < 60;
      }).length +
      governmentFees.filter(
        g =>
          g.expiryDate &&
          (new Date(g.expiryDate).getTime() - Date.now()) / 86_400_000 < 60
      ).length;

    // Cash flow KPIs
    const clientCollections = arReceipts.reduce(
      (s, r) => s + Number(r.amount || 0), 0
    );
    // Most recent payroll net as proxy for upcoming salary obligation
    const lastPayroll = payrollRuns.slice().sort((a: any, b: any) =>
      String(b.createdAt || b.periodEnd || "").localeCompare(String(a.createdAt || a.periodEnd || ""))
    )[0];
    const upcomingSalaries = lastPayroll
      ? Number((lastPayroll as any).totalNet ?? (lastPayroll as any).totals?.net ?? 0)
      : 0;
    // AP bills due in next 30 days
    const cutoff30 = new Date();
    cutoff30.setDate(cutoff30.getDate() + 30);
    const upcomingSupplierPayments = apB
      .filter(b => {
        if (b.status === "paid" || b.status === "rejected") return false;
        if (!b.dueDate) return false;
        return new Date(b.dueDate) <= cutoff30;
      })
      .reduce((s, b) => s + b.balance, 0);
    // Available Cash = current bank balance + petty cash (actual cash position)
    const availableCash = cashOnHand + pettyCash;

    return {
      outstandingAR,
      outstandingAP,
      overdueAR,
      cashOnHand,
      pettyCash,
      monthlyDep,
      annualSubs,
      insurancePremium,
      vatPayable: currentVat?.netVatPayable || 0,
      upcomingRenewals,
      clientCollections,
      upcomingSalaries,
      upcomingSupplierPayments,
      availableCash,
    };
  }, [
    arInv,
    apB,
    bks,
    bankTxs,
    flts,
    fa,
    subscriptions,
    ins,
    vatReturns,
    governmentFees,
    arReceipts,
    payrollRuns,
  ]);

  function exportSnapshot() {
    const rows = [
      ["Metric", "Value"],
      ["Cash & Bank", String(Math.round(kpis.cashOnHand))],
      ["AR Outstanding", String(Math.round(kpis.outstandingAR))],
      ["AR Overdue", String(Math.round(kpis.overdueAR))],
      ["AP Outstanding", String(Math.round(kpis.outstandingAP))],
      ["VAT Payable", String(Math.round(kpis.vatPayable))],
      ["Petty Cash", String(Math.round(kpis.pettyCash))],
      ["Monthly Depreciation", String(Math.round(kpis.monthlyDep))],
      ["Subscriptions Annualised", String(Math.round(kpis.annualSubs))],
    ];
    const csv = rows
      .map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance-snapshot-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Finance snapshot exported");
  }

  return (
    <div className="space-y-5">
      <Tabs defaultValue="overview" className="space-y-5">
        <div className="overflow-x-auto rounded-lg bg-muted/60 p-1">
          <TabsList className="grid h-auto min-w-[1100px] grid-cols-2 gap-1 bg-transparent p-0 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 2xl:grid-cols-10">
            {FINANCE_TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="h-11 justify-start gap-2 rounded-md px-2.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Finance &amp; Accounting · UAE FTA Compliant
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Finance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Full chart of accounts · AR · AP · Banking · Petty Cash · Insurance
            · Fixed Assets · VAT · Corporate Tax · Budgets · Reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={exportSnapshot}
          >
            <FileDown className="w-4 h-4" /> Export
          </Button>
          <Button
            size="sm"
            className="gap-1"
            onClick={() => navigate("/finance/invoice/new")}
          >
            <Plus className="w-4 h-4" /> New invoice
          </Button>
        </div>
      </div>

      <FinanceRenewalCalendar />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
        <KpiCard
          label="Cash & Bank"
          value={fmt(kpis.cashOnHand)}
          sub={`Across ${bks.length} accounts`}
          icon={<Wallet className="w-4 h-4" />}
          tone="primary"
        />
        <KpiCard
          label="AR Outstanding"
          value={fmt(kpis.outstandingAR)}
          sub={`${arInv.filter(i => i.status !== "paid").length} open invoices`}
          icon={<FileText className="w-4 h-4" />}
          tone="blue"
        />
        <KpiCard
          label="AR Overdue"
          value={fmt(kpis.overdueAR)}
          sub="Action required"
          icon={<AlertTriangle className="w-4 h-4" />}
          tone={kpis.overdueAR > 0 ? "red" : "neutral"}
        />
        <KpiCard
          label="AP Outstanding"
          value={fmt(kpis.outstandingAP)}
          sub={`${apB.filter(b => b.status !== "paid").length} bills`}
          icon={<Receipt className="w-4 h-4" />}
          tone="amber"
        />
        <KpiCard
          label="VAT Payable"
          value={fmt(kpis.vatPayable)}
          sub={vatReturns.find(v => v.status === "draft")?.periodLabel || "—"}
          icon={<Calculator className="w-4 h-4" />}
          tone="emerald"
        />
        <KpiCard
          label="Petty Cash"
          value={fmt(kpis.pettyCash)}
          sub={`${flts.length} offices`}
          icon={<PiggyBank className="w-4 h-4" />}
        />
        <KpiCard
          label="Monthly Depreciation"
          value={fmt(kpis.monthlyDep)}
          sub={`${fa.length} assets`}
          icon={<Box className="w-4 h-4" />}
        />
        <KpiCard
          label="Insurance Premium"
          value={fmt(kpis.insurancePremium)}
          sub={`${ins.length} policies/yr`}
          icon={<ShieldCheck className="w-4 h-4" />}
        />
        <KpiCard
          label="Subscriptions"
          value={fmt(kpis.annualSubs)}
          sub={`${subscriptions.length} active`}
          icon={<Cloud className="w-4 h-4" />}
        />
        <KpiCard
          label="Upcoming Renewals"
          value={String(kpis.upcomingRenewals)}
          sub="Insurance + licenses"
          icon={
            <AlertTriangle
              className={`w-4 h-4 ${kpis.upcomingRenewals > 0 ? "text-amber-600" : ""}`}
            />
          }
          tone={kpis.upcomingRenewals > 0 ? "amber" : "neutral"}
        />
        <KpiCard
          label="Client Collections"
          value={fmt(kpis.clientCollections)}
          sub={`${arReceipts.length} receipts total`}
          icon={<ArrowDownLeft className="w-4 h-4" />}
          tone="emerald"
        />
        <KpiCard
          label="Upcoming Salaries"
          value={fmt(kpis.upcomingSalaries)}
          sub="Based on last payroll run"
          icon={<Users className="w-4 h-4" />}
          tone="amber"
        />
        <KpiCard
          label="AP Due (30 days)"
          value={fmt(kpis.upcomingSupplierPayments)}
          sub={`${apB.filter(b => b.status !== "paid" && b.dueDate && new Date(b.dueDate) <= new Date(Date.now() + 30*86400000)).length} bills`}
          icon={<ArrowUpRight className="w-4 h-4" />}
          tone={kpis.upcomingSupplierPayments > 0 ? "red" : "neutral"}
        />
        <KpiCard
          label="Available Cash"
          value={fmt(kpis.availableCash)}
          sub="Bank + petty cash"
          icon={<Landmark className="w-4 h-4" />}
          tone="primary"
        />
      </div>

        <TabsContent value="overview">
          <OverviewTab
            kpis={kpis}
            arInvoices={arInv}
            apBills={apB}
            insurancePolicies={ins}
            subscriptions={subscriptions}
            fixedAssets={fa}
          />
        </TabsContent>
        <TabsContent value="coa">
          <CoATab accounts={accounts} />
        </TabsContent>
        <TabsContent value="journals">
          <JournalsTab journals={journals} />
        </TabsContent>
        <TabsContent value="ledger">
          <GeneralLedgerTab
            accounts={accounts}
            journals={journals}
            arInvoices={arInvoices}
            apBills={apBills}
            arReceipts={arReceipts}
            supplierPayments={supplierPayments}
            banks={banks}
          />
        </TabsContent>
        <TabsContent value="ar">
          <ARTab customers={customers} invoices={arInv} receipts={arReceipts} retentionReleases={retentionRels} accounts={accounts} banks={banks} />
        </TabsContent>
        <TabsContent value="ap">
          <APTab
            suppliers={suppliers}
            bills={apB}
            payments={supplierPayments}
          />
        </TabsContent>
        <TabsContent value="bank">
          <BankTab banks={bks} txs={bankTxs} cheques={cheques} reconciliations={bankRecons} />
        </TabsContent>
        <TabsContent value="petty">
          <PettyCashTab floats={flts} vouchers={vouchers} />
        </TabsContent>
        <TabsContent value="expenses">
          <ExpensesTab recurring={recExp} bills={utilityBills} />
        </TabsContent>
        <TabsContent value="insurance">
          <InsuranceTab policies={ins} claims={insuranceClaims} />
        </TabsContent>
        <TabsContent value="assets">
          <FixedAssetsTab assets={fa} />
        </TabsContent>
        <TabsContent value="subs">
          <SubscriptionsTab subs={subscriptions} />
        </TabsContent>
        <TabsContent value="govt">
          <GovtTab fees={governmentFees} />
        </TabsContent>
        <TabsContent value="vat">
          <VatTab returns={vatReturns} />
        </TabsContent>
        <TabsContent value="wps">
          <WpsTab runs={wps} />
        </TabsContent>
        <TabsContent value="payroll">
          <PayrollTab runs={payrollRuns} />
        </TabsContent>
        <TabsContent value="corptax">
          <CorpTaxTab returns={corpTaxReturns} />
        </TabsContent>
        <TabsContent value="cashflow">
          <CashFlowTab
            banks={bks}
            bankTxs={bankTxs}
            arReceipts={arReceipts}
            supplierPayments={supplierPayments}
            payrollRuns={payrollRuns}
            wpsRuns={wpsRuns}
            arInvoices={arInv}
            apBills={apB}
            customers={customers}
            suppliers={suppliers}
            pettyCash={kpis.pettyCash}
          />
        </TabsContent>
        <TabsContent value="budget">
          <BudgetTab
            budgets={budgets}
            journals={journals}
            accounts={accounts}
          />
        </TabsContent>
        <TabsContent value="reports">
          <FinancialStatements />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ===== KPI Card =====
function KpiCard({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  tone?: "primary" | "blue" | "amber" | "red" | "emerald" | "neutral";
}) {
  const toneClass =
    tone === "red"
      ? "border-red-300 bg-red-50/30"
      : tone === "amber"
        ? "border-amber-300 bg-amber-50/30"
        : tone === "emerald"
          ? "border-emerald-300 bg-emerald-50/30"
          : tone === "blue"
            ? "border-blue-300 bg-blue-50/30"
            : tone === "primary"
              ? "border-primary/40 bg-primary/5"
              : "border-border";
  return (
    <Card className={`border ${toneClass}`}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="text-base font-bold font-mono mt-1">{value}</p>
            {sub && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
            )}
          </div>
          <div className="text-muted-foreground">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function fmt(n: number, currency = "AED"): string {
  return `${currency} ${Math.round(n).toLocaleString()}`;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function FinanceDialog({
  open,
  title,
  children,
  onClose,
  onSave,
  saveLabel = "Create",
  wide = false,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSave: () => void;
  saveLabel?: string;
  wide?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className={wide ? "max-w-4xl max-h-[90vh] overflow-y-auto" : "max-w-2xl"}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave}>{saveLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CurrencySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: any) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {["AED", "EGP", "USD", "EUR", "GBP"].map(c => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function OfficeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: any) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="dubai">Dubai</SelectItem>
        <SelectItem value="cairo">Cairo</SelectItem>
      </SelectContent>
    </Select>
  );
}

// ===== OVERVIEW TAB =====
function OverviewTab({
  kpis,
  arInvoices,
  apBills,
  insurancePolicies,
  subscriptions,
  fixedAssets,
}: any) {
  const upcomingRenewalsList = insurancePolicies
    .map((p: any) => ({
      ...p,
      daysToExpiry: Math.floor(
        (new Date(p.expiryDate).getTime() - Date.now()) / 86_400_000
      ),
    }))
    .filter((p: any) => p.daysToExpiry > 0 && p.daysToExpiry < 90)
    .sort((a: any, b: any) => a.daysToExpiry - b.daysToExpiry);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">AR Aging Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <ArAgingMini invoices={arInvoices} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">AP Aging Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <ApAgingMini bills={apBills} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Upcoming Renewals (next 90 days)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {upcomingRenewalsList.length === 0 && (
            <p className="text-xs text-muted-foreground">
              All policies current.
            </p>
          )}
          {upcomingRenewalsList.map((p: any) => (
            <div
              key={p.id}
              className="flex items-center justify-between text-xs p-2 border border-slate-200 rounded"
            >
              <div>
                <p className="font-medium">
                  {INSURANCE_LABELS[p.type as keyof typeof INSURANCE_LABELS]}
                </p>
                <p className="text-muted-foreground text-[10px]">
                  {p.insurerName} · {p.policyNumber}
                </p>
              </div>
              <Badge
                variant="outline"
                className={
                  p.daysToExpiry < 30
                    ? "border-red-300 text-red-700"
                    : "border-amber-300 text-amber-700"
                }
              >
                {p.daysToExpiry}d
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Monthly Cost Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-b">
                <td className="py-1.5">Depreciation expense (monthly)</td>
                <td className="text-right font-mono">{fmt(kpis.monthlyDep)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5">Insurance premium (annualised)</td>
                <td className="text-right font-mono">
                  {fmt(kpis.insurancePremium / 12)}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5">Subscriptions (annualised /12)</td>
                <td className="text-right font-mono">
                  {fmt(kpis.annualSubs / 12)}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 font-semibold">
                  Total non-staff fixed cost / month
                </td>
                <td className="text-right font-mono font-bold">
                  {fmt(
                    kpis.monthlyDep +
                      kpis.insurancePremium / 12 +
                      kpis.annualSubs / 12
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function ArAgingFull({ invoices, customers }: any) {
  const open = invoices.filter((i: any) => i.status !== "paid" && i.status !== "cancelled");
  const buckets: Record<string, number> = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  for (const inv of open) {
    const days = aging(inv.dueDate);
    buckets[agingBucket(days)] += Number(inv.balance);
  }
  const totalOutstanding = Object.values(buckets).reduce((s, n) => s + n, 0);
  const totalOverdue = totalOutstanding - buckets.current;
  const critical = (buckets["61-90"] || 0) + (buckets["90+"] || 0);

  // Per-customer breakdown
  const custMap: Record<string, Record<string, number>> = {};
  for (const inv of open) {
    const cid = inv.customerId;
    if (!custMap[cid]) custMap[cid] = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
    custMap[cid][agingBucket(aging(inv.dueDate))] += Number(inv.balance);
  }
  const custRows = Object.entries(custMap).map(([cid, bs]) => {
    const cust = customers.find((c: any) => c.id === cid);
    return { name: cust?.name || cid, ...bs, total: Object.values(bs).reduce((s, n) => s + n, 0) };
  }).sort((a, b) => b.total - a.total);

  // Overdue list
  const overdueList = open
    .filter((i: any) => aging(i.dueDate) > 0)
    .map((i: any) => ({ ...i, daysOverdue: aging(i.dueDate) }))
    .sort((a: any, b: any) => b.daysOverdue - a.daysOverdue);

  const bucketColors: Record<string, string> = {
    current: "bg-emerald-500", "1-30": "bg-blue-500",
    "31-60": "bg-amber-500", "61-90": "bg-orange-500", "90+": "bg-red-500",
  };
  const bucketTextColors: Record<string, string> = {
    current: "text-emerald-700", "1-30": "text-blue-700",
    "31-60": "text-amber-700", "61-90": "text-orange-700", "90+": "text-red-700",
  };
  const total4Chart = totalOutstanding || 1;

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Outstanding</p>
          <p className="text-lg font-bold mt-1">{fmt(totalOutstanding)}</p>
          <p className="text-[10px] text-muted-foreground">{open.length} open invoice{open.length !== 1 ? "s" : ""}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Current (not due)</p>
          <p className="text-lg font-bold mt-1 text-emerald-700">{fmt(buckets.current)}</p>
          <p className="text-[10px] text-muted-foreground">Within payment terms</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Overdue</p>
          <p className="text-lg font-bold mt-1 text-amber-700">{fmt(totalOverdue)}</p>
          <p className="text-[10px] text-muted-foreground">{overdueList.length} invoice{overdueList.length !== 1 ? "s" : ""} past due</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Critical (60+ days)</p>
          <p className="text-lg font-bold mt-1 text-red-700">{fmt(critical)}</p>
          <p className="text-[10px] text-muted-foreground">Requires immediate action</p>
        </CardContent></Card>
      </div>

      {/* Aging bar chart */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Aged Receivables — Bucket Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(buckets).map(([k, v]) => (
              <div key={k} className="flex items-center gap-3 text-xs">
                <div className={`w-20 font-medium capitalize ${bucketTextColors[k]}`}>{k === "current" ? "Current" : `${k} days`}</div>
                <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
                  <div className={`h-full ${bucketColors[k]} transition-all`} style={{ width: `${(v / total4Chart) * 100}%` }} />
                </div>
                <div className="w-32 text-right font-mono font-medium">{fmt(v)}</div>
                <div className="w-10 text-right text-muted-foreground">{totalOutstanding > 0 ? `${Math.round((v / totalOutstanding) * 100)}%` : "0%"}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Customer aging breakdown */}
      {custRows.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Aging by Customer</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="text-left px-3 py-2">Customer</th>
                  <th className="text-right px-2 py-2 text-emerald-700">Current</th>
                  <th className="text-right px-2 py-2 text-blue-700">1–30 days</th>
                  <th className="text-right px-2 py-2 text-amber-700">31–60 days</th>
                  <th className="text-right px-2 py-2 text-orange-700">61–90 days</th>
                  <th className="text-right px-2 py-2 text-red-700">90+ days</th>
                  <th className="text-right px-3 py-2 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {custRows.map((row, i) => (
                  <tr key={i} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-3 py-1.5 font-medium">{row.name}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-emerald-700">{row.current > 0 ? fmt(row.current) : "—"}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-blue-700">{row["1-30"] > 0 ? fmt(row["1-30"]) : "—"}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-amber-700">{row["31-60"] > 0 ? fmt(row["31-60"]) : "—"}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-orange-700">{row["61-90"] > 0 ? fmt(row["61-90"]) : "—"}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-red-700">{row["90+"] > 0 ? fmt(row["90+"]) : "—"}</td>
                    <td className="px-3 py-1.5 text-right font-mono font-semibold">{fmt(row.total)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                  <td className="px-3 py-1.5">Total</td>
                  <td className="px-2 py-1.5 text-right font-mono">{fmt(buckets.current)}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{fmt(buckets["1-30"])}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{fmt(buckets["31-60"])}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{fmt(buckets["61-90"])}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{fmt(buckets["90+"])}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{fmt(totalOutstanding)}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Overdue invoice list */}
      {overdueList.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Overdue Invoices</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="text-left px-3 py-2">Invoice</th>
                  <th className="text-left px-2 py-2">Customer</th>
                  <th className="text-left px-2 py-2">Due Date</th>
                  <th className="text-center px-2 py-2">Days Overdue</th>
                  <th className="text-right px-3 py-2">Balance</th>
                </tr>
              </thead>
              <tbody>
                {overdueList.map((inv: any) => {
                  const cust = customers.find((c: any) => c.id === inv.customerId);
                  const bucket = agingBucket(inv.daysOverdue);
                  return (
                    <tr key={inv.id} className="border-t border-slate-100">
                      <td className="px-3 py-1.5 font-mono">{inv.number}</td>
                      <td className="px-2 py-1.5">{cust?.name || "—"}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{inv.dueDate}</td>
                      <td className="px-2 py-1.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full font-semibold ${bucketTextColors[bucket]} bg-slate-100`}>
                          {inv.daysOverdue}d
                        </span>
                      </td>
                      <td className={`px-3 py-1.5 text-right font-mono font-medium ${bucketTextColors[bucket]}`}>{fmt(Number(inv.balance))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {open.length === 0 && (
        <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No open receivables</CardContent></Card>
      )}
    </div>
  );
}

function ArAgingMini({ invoices }: any) {
  const buckets = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  for (const inv of invoices.filter((i: any) => i.status !== "paid")) {
    const days = aging(inv.dueDate);
    buckets[agingBucket(days)] += inv.balance;
  }
  const total = Object.values(buckets).reduce((s, n) => s + n, 0) || 1;
  return (
    <div className="space-y-1">
      {Object.entries(buckets).map(([k, v]) => (
        <div key={k} className="flex items-center gap-2 text-xs">
          <div className="w-20 capitalize">{k}</div>
          <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
            <div
              className={`h-full ${k === "current" ? "bg-emerald-500" : k === "1-30" ? "bg-blue-500" : k === "31-60" ? "bg-amber-500" : k === "61-90" ? "bg-orange-500" : "bg-red-500"}`}
              style={{ width: `${(v / total) * 100}%` }}
            />
          </div>
          <div className="w-28 text-right font-mono">{fmt(v)}</div>
        </div>
      ))}
    </div>
  );
}

function ApAgingMini({ bills }: any) {
  const buckets = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  for (const b of bills.filter((bb: any) => bb.status !== "paid")) {
    const days = aging(b.dueDate);
    buckets[agingBucket(days)] += b.balance;
  }
  const total = Object.values(buckets).reduce((s, n) => s + n, 0) || 1;
  return (
    <div className="space-y-1">
      {Object.entries(buckets).map(([k, v]) => (
        <div key={k} className="flex items-center gap-2 text-xs">
          <div className="w-20 capitalize">{k}</div>
          <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
            <div
              className={`h-full ${k === "current" ? "bg-emerald-500" : "bg-amber-500"}`}
              style={{ width: `${(v / total) * 100}%` }}
            />
          </div>
          <div className="w-28 text-right font-mono">{fmt(v)}</div>
        </div>
      ))}
    </div>
  );
}

// ===== Chart of Accounts =====
function CoATab({ accounts }: any) {
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({
    code: "",
    name: "",
    type: "expense",
    subType: "operating-expense",
    currency: "AED",
    vatApplicable: false,
  });
  const filtered = accounts.filter((a: any) => {
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    if (q && !`${a.code} ${a.name}`.toLowerCase().includes(q.toLowerCase()))
      return false;
    return true;
  });
  function saveAccount() {
    if (!draft.code.trim() || !draft.name.trim()) {
      toast.error("Code and account name are required");
      return;
    }
    glAccountsStore.put({
      id: newId("coa"),
      code: draft.code.trim(),
      name: draft.name.trim(),
      type: draft.type,
      subType: draft.subType,
      currency: draft.currency,
      vatApplicable: draft.vatApplicable,
      isControl: false,
      isBank: false,
      isCash: false,
      isActive: true,
      notes: draft.notes,
      createdAt: new Date().toISOString(),
    });
    setOpen(false);
    setDraft({
      code: "",
      name: "",
      type: "expense",
      subType: "operating-expense",
      currency: "AED",
      vatApplicable: false,
    });
    toast.success("Account created");
  }
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="text-sm">
          Chart of Accounts · {accounts.length}
        </CardTitle>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search code or name"
              className="h-8 pl-7 w-56"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="asset">Assets</SelectItem>
              <SelectItem value="liability">Liabilities</SelectItem>
              <SelectItem value="equity">Equity</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expenses</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => setOpen(true)}
          >
            <Plus className="w-3 h-3" /> New account
          </Button>
        </div>
      </CardHeader>
      <FinanceDialog
        open={open}
        title="New chart account"
        onClose={() => setOpen(false)}
        onSave={saveAccount}
      >
        <Field label="Code">
          <Input
            value={draft.code}
            onChange={e => setDraft({ ...draft, code: e.target.value })}
            placeholder="5102011"
          />
        </Field>
        <Field label="Name">
          <Input
            value={draft.name}
            onChange={e => setDraft({ ...draft, name: e.target.value })}
            placeholder="Office supplies"
          />
        </Field>
        <Field label="Type">
          <Select
            value={draft.type}
            onValueChange={v => setDraft({ ...draft, type: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["asset", "liability", "equity", "income", "expense"].map(t => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Sub-type">
          <Input
            value={draft.subType}
            onChange={e => setDraft({ ...draft, subType: e.target.value })}
          />
        </Field>
        <Field label="Currency">
          <CurrencySelect
            value={draft.currency}
            onChange={v => setDraft({ ...draft, currency: v })}
          />
        </Field>
        <Field label="VAT applicable">
          <Select
            value={draft.vatApplicable ? "yes" : "no"}
            onValueChange={v =>
              setDraft({ ...draft, vatApplicable: v === "yes" })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </FinanceDialog>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="text-left px-2 py-2 w-[80px]">Code</th>
              <th className="text-left px-2 py-2">Name</th>
              <th className="text-left px-2 py-2 w-[110px]">Type</th>
              <th className="text-left px-2 py-2 w-[180px]">Sub-type</th>
              <th className="text-center px-2 py-2 w-[80px]">VAT</th>
              <th className="text-center px-2 py-2 w-[80px]">Active</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a: any) => (
              <tr
                key={a.id}
                className="border-t border-slate-100 hover:bg-slate-50/60"
              >
                <td className="px-2 py-1.5 font-mono">{a.code}</td>
                <td className="px-2 py-1.5">{a.name}</td>
                <td className="px-2 py-1.5">
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {a.type}
                  </Badge>
                </td>
                <td className="px-2 py-1.5 text-muted-foreground">
                  {a.subType}
                </td>
                <td className="px-2 py-1.5 text-center">
                  {a.vatApplicable && (
                    <Badge className="bg-blue-100 text-blue-700 text-[9px]">
                      5%
                    </Badge>
                  )}
                </td>
                <td className="px-2 py-1.5 text-center">
                  {a.isActive ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" />
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ===== Journal Entries (data entry) =====
function JournalsTab({ journals }: any) {
  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "draft" | "posted" | "void"
  >("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return journals
      .filter((j: any) =>
        statusFilter === "all" ? true : j.status === statusFilter
      )
      .filter(
        (j: any) =>
          !q ||
          j.reference.toLowerCase().includes(q) ||
          j.narration.toLowerCase().includes(q)
      )
      .sort((a: any, b: any) => b.date.localeCompare(a.date));
  }, [journals, search, statusFilter]);

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between flex-wrap gap-2">
        <div>
          <CardTitle className="text-sm">
            Journal Entries · {journals.length}
          </CardTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Click any row to view or edit the entry lines.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ref or narration…"
            className="h-8 w-48 text-xs"
          />
          <Select
            value={statusFilter}
            onValueChange={v => setStatusFilter(v as any)}
          >
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="posted">Posted</SelectItem>
              <SelectItem value="void">Void</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="gap-1"
            onClick={() => {
              setEditing(null);
              setOpenNew(true);
            }}
          >
            <Plus className="w-3 h-3" /> New journal
          </Button>
        </div>
      </CardHeader>
      <NewJournalDialog
        open={openNew}
        onClose={() => {
          setOpenNew(false);
          setEditing(null);
        }}
        existing={editing || undefined}
      />
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="text-left px-2 py-2">Reference</th>
              <th className="text-left px-2 py-2">Date</th>
              <th className="text-left px-2 py-2">Source</th>
              <th className="text-left px-2 py-2">Narration</th>
              <th className="text-center px-2 py-2">Lines</th>
              <th className="text-right px-2 py-2">Debit</th>
              <th className="text-right px-2 py-2">Credit</th>
              <th className="text-center px-2 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((j: any) => {
              const debit = j.lines.reduce(
                (s: number, l: any) => s + l.debit,
                0
              );
              const credit = j.lines.reduce(
                (s: number, l: any) => s + l.credit,
                0
              );
              return (
                <tr
                  key={j.id}
                  className="border-t border-slate-100 hover:bg-blue-50/40 cursor-pointer"
                  onClick={() => {
                    setEditing(j);
                    setOpenNew(true);
                  }}
                  title="Click to view or edit this journal"
                >
                  <td className="px-2 py-1.5 font-mono text-blue-700 underline-offset-2 hover:underline">
                    {j.reference}
                  </td>
                  <td className="px-2 py-1.5">{j.date}</td>
                  <td className="px-2 py-1.5">
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {j.source}
                    </Badge>
                  </td>
                  <td className="px-2 py-1.5">{j.narration}</td>
                  <td className="px-2 py-1.5 text-center text-muted-foreground">
                    {j.lines.length}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {fmt(debit)}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {fmt(credit)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <Badge
                      className={
                        j.status === "posted"
                          ? "bg-emerald-100 text-emerald-700 text-[10px]"
                          : j.status === "void"
                            ? "bg-red-100 text-red-700 text-[10px]"
                            : "bg-slate-100 text-slate-700 text-[10px]"
                      }
                    >
                      {j.status}
                    </Badge>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="text-center text-muted-foreground py-8"
                >
                  No journal entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ===== General Ledger (report) — drill-down by account =====
function GeneralLedgerTab({
  accounts,
  journals,
  arInvoices,
  apBills,
  arReceipts,
  supplierPayments,
  banks,
}: any) {
  const [accountCode, setAccountCode] = useState<string>(
    accounts[0]?.code || ""
  );
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setMonth(0);
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  const account = accounts.find((a: any) => a.code === accountCode);

  // Build full ledger stream — manual posted journals + auto-derived AR/AP/receipts/payments
  const fullStream = useMemo(() => {
    return synthesiseJournals({
      manual: journals.filter((j: any) => j.status === "posted"),
      arInvoices,
      apBills,
      receipts: arReceipts,
      payments: supplierPayments,
      banks,
    });
  }, [journals, arInvoices, apBills, arReceipts, supplierPayments, banks]);

  // Filter to selected account and date range, with running balance
  const rows = useMemo(() => {
    if (!accountCode) return [];
    const isDebitNatured = ["asset", "expense"].includes(account?.type || "");
    const filtered: {
      date: string;
      reference: string;
      source: string;
      narration: string;
      description?: string;
      debit: number;
      credit: number;
    }[] = [];
    for (const je of fullStream) {
      if (je.date < dateFrom || je.date > dateTo) continue;
      for (const l of je.lines) {
        if (l.accountCode === accountCode) {
          filtered.push({
            date: je.date,
            reference: je.reference,
            source: je.source,
            narration: je.narration,
            description: l.description,
            debit: l.debit,
            credit: l.credit,
          });
        }
      }
    }
    filtered.sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.reference.localeCompare(b.reference)
    );
    let running = 0;
    return filtered.map(r => {
      running += isDebitNatured ? r.debit - r.credit : r.credit - r.debit;
      return { ...r, balance: running };
    });
  }, [fullStream, accountCode, account, dateFrom, dateTo]);

  const totals = useMemo(
    () => ({
      debit: rows.reduce((s, r) => s + r.debit, 0),
      credit: rows.reduce((s, r) => s + r.credit, 0),
    }),
    [rows]
  );

  // Group accounts by type for the picker
  const accountsByType = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const a of accounts.filter((x: any) => x.isActive)) {
      if (!groups[a.type]) groups[a.type] = [];
      groups[a.type].push(a);
    }
    return groups;
  }, [accounts]);

  const TYPE_LABELS: Record<string, string> = {
    asset: "Assets (1xxx)",
    liability: "Liabilities (2xxx)",
    equity: "Equity (3xxx)",
    income: "Income (4xxx)",
    expense: "Expenses (5xxx–7xxx)",
  };

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="text-[11px] text-muted-foreground">
                Account
              </label>
              <Select value={accountCode} onValueChange={setAccountCode}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Pick an account from the Chart of Accounts" />
                </SelectTrigger>
                <SelectContent className="max-h-[70vh]">
                  {Object.entries(accountsByType).map(([type, accts]) => (
                    <div key={type}>
                      <div className="px-2 py-1.5 text-[10px] font-bold uppercase text-slate-500 bg-slate-50 sticky top-0">
                        {TYPE_LABELS[type] || type}
                      </div>
                      {(accts as any[])
                        .sort((a, b) => a.code.localeCompare(b.code))
                        .map(a => (
                          <SelectItem
                            key={a.code}
                            value={a.code}
                            className="text-xs"
                          >
                            <span className="font-mono text-muted-foreground mr-2">
                              {a.code}
                            </span>
                            {a.name}
                          </SelectItem>
                        ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected account header */}
      {account && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm">
                <span className="font-mono text-muted-foreground">
                  {account.code}
                </span>{" "}
                · {account.name}
              </CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">
                {account.type} · {account.subType.replace(/-/g, " ")}
                {account.isControl && " · Control account"}
                {account.isBank && " · Bank"}
                {account.isCash && " · Cash"}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="text-right">
                <p className="text-[10px] uppercase text-muted-foreground">
                  Total Debit
                </p>
                <p className="font-mono font-bold">{fmt(totals.debit)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase text-muted-foreground">
                  Total Credit
                </p>
                <p className="font-mono font-bold">{fmt(totals.credit)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase text-muted-foreground">
                  Closing Balance
                </p>
                <p className="font-mono font-bold text-base">
                  {fmt(rows[rows.length - 1]?.balance || 0)}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="text-left px-2 py-2 w-[100px]">Date</th>
                  <th className="text-left px-2 py-2 w-[160px]">Reference</th>
                  <th className="text-left px-2 py-2 w-[110px]">Source</th>
                  <th className="text-left px-2 py-2">
                    Narration / Line description
                  </th>
                  <th className="text-right px-2 py-2 w-[120px]">Debit</th>
                  <th className="text-right px-2 py-2 w-[120px]">Credit</th>
                  <th className="text-right px-2 py-2 w-[140px]">
                    Running Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center text-muted-foreground py-8"
                    >
                      No transactions in the selected period.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr
                      key={i}
                      className="border-t border-slate-100 hover:bg-slate-50/60"
                    >
                      <td className="px-2 py-1.5">{r.date}</td>
                      <td className="px-2 py-1.5 font-mono text-blue-700">
                        {r.reference}
                      </td>
                      <td className="px-2 py-1.5">
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize"
                        >
                          {r.source}
                        </Badge>
                      </td>
                      <td className="px-2 py-1.5">
                        <div>{r.narration}</div>
                        {r.description && r.description !== r.narration && (
                          <div className="text-[10px] text-muted-foreground">
                            {r.description}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono">
                        {r.debit > 0 ? fmt(r.debit) : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono">
                        {r.credit > 0 ? fmt(r.credit) : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono font-semibold">
                        {fmt(r.balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                  <tr className="font-bold">
                    <td colSpan={4} className="px-2 py-2 text-right">
                      TOTAL ({rows.length} transactions)
                    </td>
                    <td className="px-2 py-2 text-right font-mono">
                      {fmt(totals.debit)}
                    </td>
                    <td className="px-2 py-2 text-right font-mono">
                      {fmt(totals.credit)}
                    </td>
                    <td className="px-2 py-2 text-right font-mono">
                      {fmt(rows[rows.length - 1].balance)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ===== AR =====
const REVENUE_ACCOUNT_CODES = [
  { code: "4101001", label: "Design Revenue" },
  { code: "4101002", label: "Supervision Revenue" },
  { code: "4101003", label: "Project Management Revenue" },
  { code: "4101004", label: "Authority Approval Revenue" },
  { code: "4101005", label: "Variation / Extra Work Revenue" },
  { code: "4101006", label: "MEP Engineering Revenue" },
  { code: "4101007", label: "Structural Engineering Revenue" },
  { code: "4200000", label: "Other Operating Revenue" },
];

const VAT_CODES = [
  { code: "STD-5", label: "Standard 5%" },
  { code: "ZERO-RATED", label: "Zero Rated" },
  { code: "EXEMPT", label: "Exempt" },
  { code: "OUT-OF-SCOPE", label: "Out of Scope" },
  { code: "REVERSE-CHARGE", label: "Reverse Charge" },
];

function emptyInvLine() {
  return {
    id: newId("line"),
    description: "",
    qty: 1,
    unitPrice: 0,
    vatCode: "STD-5" as const,
    accountCode: "4101001",
  };
}

function calcLine(l: any) {
  const exVat = Number(l.qty) * Number(l.unitPrice);
  const vat = l.vatCode === "STD-5" ? exVat * 0.05 : 0;
  return { exVat, vat, incVat: exVat + vat };
}

function ARTab({ customers, invoices, receipts, retentionReleases, accounts: _accounts, banks }: any) {
  const [sub, setSub] = useState("invoices");

  // ── Customer dialog ──
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({
    code: "",
    name: "",
    currency: "AED",
    paymentTermsDays: 30,
  });
  function saveCustomer() {
    if (!draft.code.trim() || !draft.name.trim()) {
      toast.error("Code and name are required");
      return;
    }
    customersStore.put({
      id: newId("cust"),
      code: draft.code.trim(),
      name: draft.name.trim(),
      trnNumber: draft.trnNumber,
      contactName: draft.contactName,
      contactEmail: draft.contactEmail?.includes("@")
        ? draft.contactEmail
        : undefined,
      contactPhone: draft.contactPhone,
      currency: draft.currency || "AED",
      paymentTermsDays: Number(draft.paymentTermsDays) || 30,
    } as any);
    toast.success("Customer added");
    setOpen(false);
    setDraft({ code: "", name: "", currency: "AED", paymentTermsDays: 30 });
  }

  // ── New Invoice dialog ──
  const [invOpen, setInvOpen] = useState(false);
  const [invDraft, setInvDraft] = useState<any>({
    number: makeRef("INV", invoices.length),
    customerId: "",
    invoiceDate: today(),
    dueDate: addDays(30),
    office: "dubai",
    currency: "AED",
    poNumber: "",
    retentionPct: "",
    notes: "",
    status: "draft",
  });
  const [invLines, setInvLines] = useState<any[]>([emptyInvLine()]);

  const invTotals = invLines.reduce(
    (acc, l) => {
      const { exVat, vat } = calcLine(l);
      return { exVat: acc.exVat + exVat, vat: acc.vat + vat };
    },
    { exVat: 0, vat: 0 }
  );
  const invTotal = invTotals.exVat + invTotals.vat;
  const invRetention = invDraft.retentionPct
    ? invTotal * (Number(invDraft.retentionPct) / 100)
    : 0;

  function addInvLine() {
    setInvLines(ls => [...ls, emptyInvLine()]);
  }
  function removeInvLine(idx: number) {
    setInvLines(ls => ls.filter((_, i) => i !== idx));
  }
  function setInvLine(idx: number, patch: any) {
    setInvLines(ls => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function saveInvoice() {
    if (!invDraft.customerId) { toast.error("Select a customer"); return; }
    if (!invDraft.number.trim()) { toast.error("Invoice number is required"); return; }
    if (invLines.some(l => !l.description.trim())) { toast.error("All lines need a description"); return; }

    const customer = customers.find((c: any) => c.id === invDraft.customerId);
    arInvoicesStore.put({
      id: newId("inv"),
      number: invDraft.number.trim(),
      customerId: invDraft.customerId,
      invoiceDate: invDraft.invoiceDate,
      dueDate: invDraft.dueDate,
      office: invDraft.office,
      currency: invDraft.currency || customer?.currency || "AED",
      poNumber: invDraft.poNumber || undefined,
      retentionPct: invDraft.retentionPct ? Number(invDraft.retentionPct) : undefined,
      retentionAmount: invRetention || undefined,
      lines: invLines.map(l => {
        const { exVat, vat, incVat } = calcLine(l);
        return {
          id: l.id,
          description: l.description,
          qty: Number(l.qty),
          unitPrice: Number(l.unitPrice),
          vatCode: l.vatCode,
          accountCode: l.accountCode,
          amountExVat: exVat,
          vatAmount: vat,
          amountIncVat: incVat,
        };
      }),
      notes: invDraft.notes || undefined,
      status: invDraft.status || "draft",
    } as any);

    toast.success(`Invoice ${invDraft.number} saved`);
    setInvOpen(false);
    setInvDraft({
      number: makeRef("INV", invoices.length + 1),
      customerId: "",
      invoiceDate: today(),
      dueDate: addDays(30),
      office: "dubai",
      currency: "AED",
      poNumber: "",
      retentionPct: "",
      notes: "",
      status: "draft",
    });
    setInvLines([emptyInvLine()]);
  }

  // ── Record Receipt dialog ──
  const [rcptOpen, setRcptOpen] = useState(false);
  const emptyRcpt = () => ({
    reference: makeRef("RCP", receipts.length),
    date: today(),
    customerId: "",
    invoiceIds: [] as string[],
    projectId: "",
    advancePayment: false,
    amount: "",
    currency: "AED",
    paymentMethod: "bank-transfer",
    bankAccountId: "",
    chequeNumber: "",
    chequeBank: "",
    notes: "",
    status: "posted",
  });
  const [rcptDraft, setRcptDraft] = useState<any>(emptyRcpt());

  const rcptCustomerInvoices = invoices.filter(
    (inv: any) => inv.customerId === rcptDraft.customerId && inv.status !== "paid" && inv.status !== "cancelled"
  );

  function saveReceipt() {
    if (!rcptDraft.customerId) { toast.error("Select a customer"); return; }
    if (!rcptDraft.amount || Number(rcptDraft.amount) <= 0) { toast.error("Enter a valid amount"); return; }
    if (!rcptDraft.paymentMethod) { toast.error("Select payment method"); return; }

    arReceiptsStore.put({
      id: newId("rcp"),
      reference: rcptDraft.reference.trim(),
      date: rcptDraft.date,
      customerId: rcptDraft.customerId,
      invoiceIds: rcptDraft.invoiceIds,
      projectId: rcptDraft.projectId || undefined,
      advancePayment: !!rcptDraft.advancePayment,
      bankAccountId: rcptDraft.bankAccountId || undefined,
      amount: Number(rcptDraft.amount),
      currency: rcptDraft.currency || "AED",
      paymentMethod: rcptDraft.paymentMethod,
      chequeNumber: rcptDraft.chequeNumber || undefined,
      chequeBank: rcptDraft.chequeBank || undefined,
      notes: rcptDraft.notes || undefined,
      status: "posted",
    } as any);

    toast.success(`Receipt ${rcptDraft.reference} recorded — ${rcptDraft.advancePayment ? "Advance Revenue" : "AR Settlement"}`);
    setRcptOpen(false);
    setRcptDraft(emptyRcpt());
  }
  return (
    <Tabs value={sub} onValueChange={setSub}>
      <FinanceDialog
        open={open}
        title="New customer"
        onClose={() => setOpen(false)}
        onSave={saveCustomer}
      >
        <Field label="Code">
          <Input
            value={draft.code}
            onChange={e => setDraft({ ...draft, code: e.target.value })}
            placeholder="CUST-001"
          />
        </Field>
        <Field label="Name">
          <Input
            value={draft.name}
            onChange={e => setDraft({ ...draft, name: e.target.value })}
            placeholder="Company name"
          />
        </Field>
        <Field label="TRN">
          <Input
            value={draft.trnNumber || ""}
            onChange={e => setDraft({ ...draft, trnNumber: e.target.value })}
          />
        </Field>
        <Field label="Contact name">
          <Input
            value={draft.contactName || ""}
            onChange={e => setDraft({ ...draft, contactName: e.target.value })}
          />
        </Field>
        <Field label="Contact email">
          <Input
            value={draft.contactEmail || ""}
            onChange={e => setDraft({ ...draft, contactEmail: e.target.value })}
          />
        </Field>
        <Field label="Payment terms (days)">
          <Input
            type="number"
            value={draft.paymentTermsDays}
            onChange={e =>
              setDraft({ ...draft, paymentTermsDays: e.target.value })
            }
          />
        </Field>
      </FinanceDialog>

      {/* ── New Invoice Dialog ── */}
      <FinanceDialog open={invOpen} title="New Invoice" onClose={() => setInvOpen(false)} onSave={saveInvoice} wide>
        <div className="col-span-full space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Invoice #">
            <Input value={invDraft.number} onChange={e => setInvDraft({ ...invDraft, number: e.target.value })} placeholder="INV-2026-0001" />
          </Field>
          <Field label="Status">
            <Select value={invDraft.status} onValueChange={v => setInvDraft({ ...invDraft, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Customer">
          <Select value={invDraft.customerId} onValueChange={v => {
            const c = customers.find((x: any) => x.id === v);
            setInvDraft({ ...invDraft, customerId: v, currency: c?.currency || "AED", dueDate: addDays(c?.paymentTermsDays ?? 30) });
          }}>
            <SelectTrigger><SelectValue placeholder="Select customer…" /></SelectTrigger>
            <SelectContent>
              {customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Invoice date">
            <Input type="date" value={invDraft.invoiceDate} onChange={e => setInvDraft({ ...invDraft, invoiceDate: e.target.value })} />
          </Field>
          <Field label="Due date">
            <Input type="date" value={invDraft.dueDate} onChange={e => setInvDraft({ ...invDraft, dueDate: e.target.value })} />
          </Field>
          <Field label="Office">
            <Select value={invDraft.office} onValueChange={v => setInvDraft({ ...invDraft, office: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dubai">Dubai</SelectItem>
                <SelectItem value="cairo">Cairo</SelectItem>
                <SelectItem value="riyadh">Riyadh</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Currency">
            <Select value={invDraft.currency} onValueChange={v => setInvDraft({ ...invDraft, currency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["AED","USD","EUR","GBP","SAR","EGP"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="PO Number">
            <Input value={invDraft.poNumber} onChange={e => setInvDraft({ ...invDraft, poNumber: e.target.value })} placeholder="Client PO ref" />
          </Field>
          <Field label="Retention %">
            <Input type="number" min="0" max="100" step="0.5" value={invDraft.retentionPct} onChange={e => setInvDraft({ ...invDraft, retentionPct: e.target.value })} placeholder="0" />
          </Field>
        </div>

        {/* Line items */}
        <div>
          <p className="text-xs font-semibold text-slate-700 mb-1">Line items</p>
          <div className="border rounded overflow-x-auto">
            <table className="w-full text-xs min-w-[640px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-2 py-1.5">Description</th>
                  <th className="text-right px-2 py-1.5 w-16">Qty</th>
                  <th className="text-right px-2 py-1.5 w-28">Unit Price</th>
                  <th className="text-left px-2 py-1.5 w-36">VAT</th>
                  <th className="text-left px-2 py-1.5 w-44">Account</th>
                  <th className="text-right px-2 py-1.5 w-28">Line Total</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {invLines.map((line, idx) => {
                  const { incVat } = calcLine(line);
                  return (
                    <tr key={line.id} className="border-t border-slate-100">
                      <td className="px-1 py-1">
                        <Input className="h-7 text-xs" value={line.description} onChange={e => setInvLine(idx, { description: e.target.value })} placeholder="Service description" />
                      </td>
                      <td className="px-1 py-1">
                        <Input className="h-7 text-xs text-right" type="number" min="0" step="0.01" value={line.qty} onChange={e => setInvLine(idx, { qty: e.target.value })} />
                      </td>
                      <td className="px-1 py-1">
                        <Input className="h-7 text-xs text-right" type="number" min="0" step="0.01" value={line.unitPrice} onChange={e => setInvLine(idx, { unitPrice: e.target.value })} placeholder="0.00" />
                      </td>
                      <td className="px-1 py-1">
                        <Select value={line.vatCode} onValueChange={v => setInvLine(idx, { vatCode: v })}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {VAT_CODES.map(v => <SelectItem key={v.code} value={v.code}>{v.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-1 py-1">
                        <Select value={line.accountCode} onValueChange={v => setInvLine(idx, { accountCode: v })}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {REVENUE_ACCOUNT_CODES.map(a => <SelectItem key={a.code} value={a.code}>{a.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-1 text-right font-mono font-medium">{incVat.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                      <td className="px-1 py-1 text-center">
                        <button onClick={() => removeInvLine(idx)} className="text-red-400 hover:text-red-600 font-bold">×</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button onClick={addInvLine} className="mt-1 text-xs text-blue-600 hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add line
          </button>
        </div>

        {/* Totals summary */}
        <div className="mt-2 flex justify-end">
          <div className="text-xs space-y-0.5 text-right w-64">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal (ex-VAT)</span><span className="font-mono">{invTotals.exVat.toLocaleString(undefined,{maximumFractionDigits:2})}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">VAT (5%)</span><span className="font-mono text-amber-600">{invTotals.vat.toLocaleString(undefined,{maximumFractionDigits:2})}</span></div>
            {invRetention > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Retention ({invDraft.retentionPct}%)</span><span className="font-mono text-red-500">-{invRetention.toLocaleString(undefined,{maximumFractionDigits:2})}</span></div>}
            <div className="flex justify-between border-t pt-0.5 font-semibold"><span>Invoice Total</span><span className="font-mono">{invDraft.currency} {invTotal.toLocaleString(undefined,{maximumFractionDigits:2})}</span></div>
          </div>
        </div>

        <Field label="Notes">
          <Input value={invDraft.notes} onChange={e => setInvDraft({ ...invDraft, notes: e.target.value })} placeholder="Optional notes / memo" />
        </Field>
        </div>
      </FinanceDialog>

      {/* ── Record Receipt Dialog ── */}
      <FinanceDialog open={rcptOpen} title="Record Receipt" onClose={() => setRcptOpen(false)} onSave={saveReceipt}>
        <div className="col-span-full space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Reference">
            <Input value={rcptDraft.reference} onChange={e => setRcptDraft({ ...rcptDraft, reference: e.target.value })} placeholder="RCP-2026-0001" />
          </Field>
          <Field label="Date">
            <Input type="date" value={rcptDraft.date} onChange={e => setRcptDraft({ ...rcptDraft, date: e.target.value })} />
          </Field>
        </div>
        <Field label="Customer">
          <Select value={rcptDraft.customerId} onValueChange={v => setRcptDraft({ ...rcptDraft, customerId: v, invoiceIds: [] })}>
            <SelectTrigger><SelectValue placeholder="Select customer…" /></SelectTrigger>
            <SelectContent>
              {customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        {/* Payment type: Advance or AR Settlement */}
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-slate-50/60">
          <div className="flex-1">
            <p className="text-xs font-semibold">
              {rcptDraft.advancePayment ? "🔶 Advance Payment / Deposit" : "✅ Invoice Settlement"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {rcptDraft.advancePayment
                ? "CR Advance Revenue (2103000) — client paid before invoice is raised"
                : "CR Accounts Receivable (1103000) — settles an existing invoice"}
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={!!rcptDraft.advancePayment}
              onChange={e => setRcptDraft({ ...rcptDraft, advancePayment: e.target.checked, invoiceIds: [] })}
              className="w-4 h-4"
            />
            Advance
          </label>
        </div>

        {!rcptDraft.advancePayment && rcptCustomerInvoices.length > 0 && (
          <Field label="Apply to invoices">
            <div className="border rounded p-2 space-y-1 max-h-32 overflow-y-auto">
              {rcptCustomerInvoices.map((inv: any) => (
                <label key={inv.id} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rcptDraft.invoiceIds.includes(inv.id)}
                    onChange={e => {
                      const ids = e.target.checked
                        ? [...rcptDraft.invoiceIds, inv.id]
                        : rcptDraft.invoiceIds.filter((id: string) => id !== inv.id);
                      setRcptDraft({ ...rcptDraft, invoiceIds: ids });
                    }}
                  />
                  <span className="font-mono">{inv.number}</span>
                  <span className="text-muted-foreground">Balance: {inv.currency} {Number(inv.balance).toLocaleString()}</span>
                </label>
              ))}
            </div>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Project (optional)">
            <Input value={rcptDraft.projectId} onChange={e => setRcptDraft({ ...rcptDraft, projectId: e.target.value })} placeholder="Project ID or name" />
          </Field>
          <div />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount">
            <Input type="number" min="0" step="0.01" value={rcptDraft.amount} onChange={e => setRcptDraft({ ...rcptDraft, amount: e.target.value })} placeholder="0.00" />
          </Field>
          <Field label="Currency">
            <Select value={rcptDraft.currency} onValueChange={v => setRcptDraft({ ...rcptDraft, currency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["AED","USD","EUR","GBP","SAR","EGP"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Payment method">
            <Select value={rcptDraft.paymentMethod} onValueChange={v => setRcptDraft({ ...rcptDraft, paymentMethod: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Bank account">
            <Select value={rcptDraft.bankAccountId} onValueChange={v => setRcptDraft({ ...rcptDraft, bankAccountId: v })}>
              <SelectTrigger><SelectValue placeholder="Select bank…" /></SelectTrigger>
              <SelectContent>
                {(banks || []).map((b: any) => <SelectItem key={b.id} value={b.id}>{b.bankName} – {b.accountNumber}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        {rcptDraft.paymentMethod === "cheque" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cheque number">
              <Input value={rcptDraft.chequeNumber} onChange={e => setRcptDraft({ ...rcptDraft, chequeNumber: e.target.value })} />
            </Field>
            <Field label="Cheque bank">
              <Input value={rcptDraft.chequeBank} onChange={e => setRcptDraft({ ...rcptDraft, chequeBank: e.target.value })} />
            </Field>
          </div>
        )}
        <Field label="Notes">
          <Input value={rcptDraft.notes} onChange={e => setRcptDraft({ ...rcptDraft, notes: e.target.value })} placeholder="Optional" />
        </Field>
        </div>
      </FinanceDialog>

      <TabsList>
        <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
        <TabsTrigger value="customers">
          Customers ({customers.length})
        </TabsTrigger>
        <TabsTrigger value="receipts">Receipts ({receipts.length})</TabsTrigger>
        <TabsTrigger value="aging">Aging</TabsTrigger>
        <TabsTrigger value="retention">Retention ({(retentionReleases || []).length})</TabsTrigger>
      </TabsList>
      <TabsContent value="invoices" className="mt-3">
        <div className="flex justify-end mb-2">
          <Button size="sm" className="gap-1" onClick={() => { setInvDraft({ ...invDraft, number: makeRef("INV", invoices.length) }); setInvOpen(true); }}>
            <Plus className="w-3 h-3" /> New Invoice
          </Button>
        </div>
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="text-left px-2 py-2">Invoice</th>
                  <th className="text-left px-2 py-2">Customer</th>
                  <th className="text-left px-2 py-2">Project</th>
                  <th className="text-left px-2 py-2">Date</th>
                  <th className="text-left px-2 py-2">Due</th>
                  <th className="text-right px-2 py-2">Total</th>
                  <th className="text-right px-2 py-2">Balance</th>
                  <th className="text-center px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: any) => {
                  const cust = customers.find(
                    (c: any) => c.id === inv.customerId
                  );
                  return (
                    <tr
                      key={inv.id}
                      className="border-t border-slate-100 hover:bg-slate-50/60"
                    >
                      <td className="px-2 py-1.5 font-mono">{inv.number}</td>
                      <td className="px-2 py-1.5">{cust?.name}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">
                        {inv.projectId}
                      </td>
                      <td className="px-2 py-1.5">{inv.invoiceDate}</td>
                      <td className="px-2 py-1.5">{inv.dueDate}</td>
                      <td className="px-2 py-1.5 text-right font-mono">
                        {inv.currency} {inv.total.toLocaleString()}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono">
                        {inv.currency} {inv.balance.toLocaleString()}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <StatusBadge status={inv.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="customers" className="mt-3">
        <div className="flex justify-end mb-2">
          <Button size="sm" className="gap-1" onClick={() => setOpen(true)}>
            <Plus className="w-3 h-3" /> New customer
          </Button>
        </div>
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="text-left px-2 py-2">Code</th>
                  <th className="text-left px-2 py-2">Name</th>
                  <th className="text-left px-2 py-2">TRN</th>
                  <th className="text-left px-2 py-2">Contact</th>
                  <th className="text-center px-2 py-2">Terms</th>
                  <th className="text-center px-2 py-2">Currency</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c: any) => (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="px-2 py-1.5 font-mono">{c.code}</td>
                    <td className="px-2 py-1.5 font-medium">{c.name}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">
                      {c.trnNumber || "—"}
                    </td>
                    <td className="px-2 py-1.5">{c.contactName || "—"}</td>
                    <td className="px-2 py-1.5 text-center">
                      {c.paymentTermsDays}d
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <Badge variant="outline" className="text-[10px]">
                        {c.currency}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="receipts" className="mt-3">
        <div className="flex justify-end mb-2">
          <Button size="sm" className="gap-1" onClick={() => { setRcptDraft({ ...rcptDraft, reference: makeRef("RCP", receipts.length) }); setRcptOpen(true); }}>
            <Plus className="w-3 h-3" /> Record Receipt
          </Button>
        </div>
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="text-left px-2 py-2">Reference</th>
                  <th className="text-left px-2 py-2">Date</th>
                  <th className="text-left px-2 py-2">Customer</th>
                  <th className="text-right px-2 py-2">Amount</th>
                  <th className="text-left px-2 py-2">Method</th>
                  <th className="text-center px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r: any) => {
                  const c = customers.find((c: any) => c.id === r.customerId);
                  return (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="px-2 py-1.5 font-mono">{r.reference}</td>
                      <td className="px-2 py-1.5">{r.date}</td>
                      <td className="px-2 py-1.5">{c?.name}</td>
                      <td className="px-2 py-1.5 text-right font-mono">
                        {r.currency} {r.amount.toLocaleString()}
                      </td>
                      <td className="px-2 py-1.5">{r.paymentMethod}</td>
                      <td className="px-2 py-1.5 text-center">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="aging" className="mt-3">
        <ArAgingFull invoices={invoices} customers={customers} />
      </TabsContent>
      <TabsContent value="retention" className="mt-3">
        <RetentionPanel
          invoices={invoices}
          retentionReleases={retentionReleases || []}
          customers={customers}
          type="receivable"
        />
      </TabsContent>
    </Tabs>
  );
}

function RetentionPanel({ invoices, retentionReleases, customers, type }: any) {
  const [open, setOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [draft, setDraft] = useState<any>({
    type,
    releaseDate: today(),
    releaseAmount: "",
    status: "pending",
    glAccountFrom: type === "receivable" ? "1103000" : "2103000",
    glAccountTo: type === "receivable" ? "1101000" : "2101000",
    counterpartyName: "",
    counterpartyId: "",
    retentionAmountHeld: "",
    notes: "",
  });

  const retInvoices = invoices.filter((i: any) => Number(i.retentionAmount) > 0);
  const totalRetentionHeld = retInvoices.reduce((s: number, i: any) => s + Number(i.retentionAmount), 0);
  const totalReleased = retentionReleases.reduce((s: number, r: any) => s + Number(r.releaseAmount), 0);

  function handleInvoiceSelect(invId: string) {
    setSelectedInvoiceId(invId);
    if (!invId) return;
    const inv = retInvoices.find((i: any) => i.id === invId);
    if (!inv) return;
    const cust = (customers || []).find((c: any) => c.id === inv.customerId);
    setDraft((d: any) => ({
      ...d,
      counterpartyName: cust?.name || "",
      counterpartyId: inv.customerId,
      retentionAmountHeld: Number(inv.retentionAmount),
      releaseAmount: Number(inv.retentionAmount),
    }));
  }

  function saveRelease() {
    if (!draft.counterpartyName.trim() || Number(draft.releaseAmount) <= 0) {
      toast.error("Counterparty and release amount are required");
      return;
    }
    retentionReleasesStore.put({
      id: newId("rr"),
      reference: makeRef("RR", retentionReleases.length),
      type: draft.type,
      counterpartyId: draft.counterpartyId || newId("cp"),
      counterpartyName: draft.counterpartyName.trim(),
      originalInvoiceId: selectedInvoiceId || undefined,
      retentionAmountHeld: Number(draft.retentionAmountHeld),
      releaseAmount: Number(draft.releaseAmount),
      releaseDate: draft.releaseDate,
      glAccountFrom: draft.glAccountFrom,
      glAccountTo: draft.glAccountTo,
      status: draft.status,
      notes: draft.notes,
      createdAt: new Date().toISOString(),
    });
    setOpen(false);
    setSelectedInvoiceId("");
    setDraft({
      type,
      releaseDate: today(),
      releaseAmount: "",
      status: "pending",
      glAccountFrom: type === "receivable" ? "1103000" : "2103000",
      glAccountTo: type === "receivable" ? "1101000" : "2101000",
      counterpartyName: "",
      counterpartyId: "",
      retentionAmountHeld: "",
      notes: "",
    });
    toast.success("Retention release recorded");
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Retention Held</p>
          <p className="text-lg font-bold mt-1">{fmt(totalRetentionHeld)}</p>
          <p className="text-[10px] text-muted-foreground">{retInvoices.length} invoice{retInvoices.length !== 1 ? "s" : ""}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Released</p>
          <p className="text-lg font-bold mt-1 text-emerald-700">{fmt(totalReleased)}</p>
          <p className="text-[10px] text-muted-foreground">{retentionReleases.length} release{retentionReleases.length !== 1 ? "s" : ""}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Unreleased Balance</p>
          <p className="text-lg font-bold mt-1 text-amber-700">{fmt(Math.max(0, totalRetentionHeld - totalReleased))}</p>
          <p className="text-[10px] text-muted-foreground">Pending release</p>
        </CardContent></Card>
      </div>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Retention Receivable — Invoices with Retention</CardTitle>
          <Button size="sm" className="gap-1" onClick={() => setOpen(true)}>
            <Plus className="w-3 h-3" /> Release retention
          </Button>
        </CardHeader>
        <FinanceDialog open={open} title="Record Retention Release" onClose={() => { setOpen(false); setSelectedInvoiceId(""); }} onSave={saveRelease}>
          {retInvoices.length > 0 && (
            <Field label="Link to invoice (optional)">
              <Select value={selectedInvoiceId} onValueChange={handleInvoiceSelect}>
                <SelectTrigger><SelectValue placeholder="Select invoice to pre-fill…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Manual entry —</SelectItem>
                  {retInvoices.map((inv: any) => {
                    const c = (customers || []).find((x: any) => x.id === inv.customerId);
                    return (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.number} · {c?.name || inv.customerId} · {fmt(Number(inv.retentionAmount))}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Counterparty (client)">
            <Input value={draft.counterpartyName} onChange={e => setDraft({ ...draft, counterpartyName: e.target.value })} placeholder="Client name" />
          </Field>
          <Field label="Retention held (AED)">
            <Input type="number" min="0" step="0.01" value={draft.retentionAmountHeld} onChange={e => setDraft({ ...draft, retentionAmountHeld: e.target.value })} placeholder="0.00" />
          </Field>
          <Field label="Release amount (AED)">
            <Input type="number" min="0" step="0.01" value={draft.releaseAmount} onChange={e => setDraft({ ...draft, releaseAmount: e.target.value })} placeholder="0.00" />
          </Field>
          <Field label="Release date">
            <Input type="date" value={draft.releaseDate} onChange={e => setDraft({ ...draft, releaseDate: e.target.value })} />
          </Field>
          <Field label="Status">
            <Select value={draft.status} onValueChange={v => setDraft({ ...draft, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="posted">Posted to GL</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Notes">
            <Input value={draft.notes || ""} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="Optional" />
          </Field>
        </FinanceDialog>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left px-2 py-2">Invoice</th>
                <th className="text-left px-2 py-2">Customer</th>
                <th className="text-right px-2 py-2">Invoice Total</th>
                <th className="text-right px-2 py-2">Retention %</th>
                <th className="text-right px-2 py-2">Retention Held</th>
                <th className="text-left px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {retInvoices.length === 0 && (
                <tr><td colSpan={6} className="px-2 py-4 text-center text-muted-foreground">No invoices with retention</td></tr>
              )}
              {retInvoices.map((i: any) => {
                const cust = (customers || []).find((c: any) => c.id === i.customerId);
                return (
                  <tr key={i.id} className="border-t border-slate-100">
                    <td className="px-2 py-1.5 font-mono">{i.number}</td>
                    <td className="px-2 py-1.5">{cust?.name || "—"}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{fmt(Number(i.total))}</td>
                    <td className="px-2 py-1.5 text-right">{i.retentionPct ? `${Number(i.retentionPct)}%` : "—"}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-amber-700">{fmt(Number(i.retentionAmount))}</td>
                    <td className="px-2 py-1.5"><StatusBadge status={i.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Retention Releases · {retentionReleases.length}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left px-2 py-2">Reference</th>
                <th className="text-left px-2 py-2">Counterparty</th>
                <th className="text-right px-2 py-2">Amount</th>
                <th className="text-left px-2 py-2">Date</th>
                <th className="text-center px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {retentionReleases.length === 0 && (
                <tr><td colSpan={5} className="px-2 py-4 text-center text-muted-foreground">No releases recorded</td></tr>
              )}
              {retentionReleases.map((r: any) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-mono">{r.reference}</td>
                  <td className="px-2 py-1.5">{r.counterpartyName}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{fmt(Number(r.releaseAmount))}</td>
                  <td className="px-2 py-1.5">{r.releaseDate}</td>
                  <td className="px-2 py-1.5 text-center"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== AP =====
function APTab({ suppliers, bills, payments }: any) {
  const [sub, setSub] = useState("bills");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({
    code: "",
    name: "",
    category: "subcontractor",
    currency: "AED",
    paymentTermsDays: 30,
  });
  function saveSupplier() {
    if (!draft.code.trim() || !draft.name.trim()) {
      toast.error("Code and name are required");
      return;
    }
    suppliersStore.put({
      id: newId("sup"),
      code: draft.code.trim(),
      name: draft.name.trim(),
      trnNumber: draft.trnNumber,
      category: draft.category || "other",
      contactName: draft.contactName,
      contactEmail: draft.contactEmail,
      iban: draft.iban,
      bankName: draft.bankName,
      currency: draft.currency || "AED",
      paymentTermsDays: Number(draft.paymentTermsDays) || 30,
    } as any);
    toast.success("Supplier added");
    setOpen(false);
    setDraft({
      code: "",
      name: "",
      category: "subcontractor",
      currency: "AED",
      paymentTermsDays: 30,
    });
  }
  return (
    <Tabs value={sub} onValueChange={setSub}>
      <FinanceDialog
        open={open}
        title="New supplier"
        onClose={() => setOpen(false)}
        onSave={saveSupplier}
      >
        <Field label="Code">
          <Input
            value={draft.code}
            onChange={e => setDraft({ ...draft, code: e.target.value })}
            placeholder="SUP-001"
          />
        </Field>
        <Field label="Name">
          <Input
            value={draft.name}
            onChange={e => setDraft({ ...draft, name: e.target.value })}
            placeholder="Supplier name"
          />
        </Field>
        <Field label="TRN">
          <Input
            value={draft.trnNumber || ""}
            onChange={e => setDraft({ ...draft, trnNumber: e.target.value })}
          />
        </Field>
        <Field label="Contact name">
          <Input
            value={draft.contactName || ""}
            onChange={e => setDraft({ ...draft, contactName: e.target.value })}
          />
        </Field>
        <Field label="IBAN">
          <Input
            value={draft.iban || ""}
            onChange={e => setDraft({ ...draft, iban: e.target.value })}
          />
        </Field>
        <Field label="Payment terms (days)">
          <Input
            type="number"
            value={draft.paymentTermsDays}
            onChange={e =>
              setDraft({ ...draft, paymentTermsDays: e.target.value })
            }
          />
        </Field>
      </FinanceDialog>
      <TabsList>
        <TabsTrigger value="bills">Bills ({bills.length})</TabsTrigger>
        <TabsTrigger value="suppliers">
          Suppliers ({suppliers.length})
        </TabsTrigger>
        <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
        <TabsTrigger value="aging">Aging</TabsTrigger>
      </TabsList>
      <TabsContent value="bills" className="mt-3">
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="text-left px-2 py-2">Internal Ref</th>
                  <th className="text-left px-2 py-2">Supplier Inv</th>
                  <th className="text-left px-2 py-2">Supplier</th>
                  <th className="text-left px-2 py-2">Date</th>
                  <th className="text-left px-2 py-2">Due</th>
                  <th className="text-right px-2 py-2">Total</th>
                  <th className="text-right px-2 py-2">Balance</th>
                  <th className="text-center px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b: any) => {
                  const sup = suppliers.find((s: any) => s.id === b.supplierId);
                  return (
                    <tr key={b.id} className="border-t border-slate-100">
                      <td className="px-2 py-1.5 font-mono">{b.internalRef}</td>
                      <td className="px-2 py-1.5 font-mono">{b.number}</td>
                      <td className="px-2 py-1.5">{sup?.name}</td>
                      <td className="px-2 py-1.5">{b.billDate}</td>
                      <td className="px-2 py-1.5">{b.dueDate}</td>
                      <td className="px-2 py-1.5 text-right font-mono">
                        {b.currency} {b.total.toLocaleString()}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono">
                        {b.currency} {b.balance.toLocaleString()}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <StatusBadge status={b.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="suppliers" className="mt-3">
        <div className="flex justify-end mb-2">
          <Button size="sm" className="gap-1" onClick={() => setOpen(true)}>
            <Plus className="w-3 h-3" /> New supplier
          </Button>
        </div>
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="text-left px-2 py-2">Code</th>
                  <th className="text-left px-2 py-2">Name</th>
                  <th className="text-left px-2 py-2">Category</th>
                  <th className="text-left px-2 py-2">TRN</th>
                  <th className="text-center px-2 py-2">Terms</th>
                  <th className="text-center px-2 py-2">Currency</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s: any) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-2 py-1.5 font-mono">{s.code}</td>
                    <td className="px-2 py-1.5 font-medium">{s.name}</td>
                    <td className="px-2 py-1.5">
                      <Badge
                        variant="outline"
                        className="text-[10px] capitalize"
                      >
                        {s.category}
                      </Badge>
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">
                      {s.trnNumber || "—"}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {s.paymentTermsDays}d
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <Badge variant="outline" className="text-[10px]">
                        {s.currency}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="payments" className="mt-3">
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="text-left px-2 py-2">Reference</th>
                  <th className="text-left px-2 py-2">Date</th>
                  <th className="text-left px-2 py-2">Supplier</th>
                  <th className="text-right px-2 py-2">Amount</th>
                  <th className="text-left px-2 py-2">Method</th>
                  <th className="text-center px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any) => {
                  const s = suppliers.find((s: any) => s.id === p.supplierId);
                  return (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="px-2 py-1.5 font-mono">{p.reference}</td>
                      <td className="px-2 py-1.5">{p.date}</td>
                      <td className="px-2 py-1.5">{s?.name}</td>
                      <td className="px-2 py-1.5 text-right font-mono">
                        {p.currency} {p.amount.toLocaleString()}
                      </td>
                      <td className="px-2 py-1.5">
                        {p.paymentMethod}
                        {p.chequeNumber ? ` #${p.chequeNumber}` : ""}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <StatusBadge status={p.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="aging" className="mt-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Aged Payables</CardTitle>
          </CardHeader>
          <CardContent>
            <ApAgingMini bills={bills} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

// ===== Banking =====
function BankTab({ banks, txs, cheques, reconciliations }: any) {
  const [sub, setSub] = useState("accounts");
  const [acctOpen, setAcctOpen] = useState(false);
  const [chqOpen, setChqOpen] = useState(false);
  const [a, setA] = useState<any>({
    currency: "AED",
    office: "dubai",
    openingBalance: 0,
    openingDate: today(),
  });
  const [c, setC] = useState<any>({ office: "dubai", status: "issued" });
  function saveAccount() {
    if (
      !a.code?.trim() ||
      !a.name?.trim() ||
      !a.bankName?.trim() ||
      !a.iban?.trim() ||
      !a.accountNumber?.trim()
    ) {
      toast.error("Code, name, bank, IBAN and account number are required");
      return;
    }
    bankAccountsStore.put({
      id: newId("bank"),
      code: a.code.trim(),
      name: a.name.trim(),
      bankName: a.bankName.trim(),
      iban: a.iban.trim(),
      accountNumber: a.accountNumber.trim(),
      swift: a.swift,
      currency: a.currency || "AED",
      office: a.office || "dubai",
      openingBalance: Number(a.openingBalance) || 0,
      openingDate: a.openingDate || today(),
      glAccountCode: a.glAccountCode || "1102000",
      isActive: true,
    } as any);
    toast.success("Bank account added");
    setAcctOpen(false);
    setA({
      currency: "AED",
      office: "dubai",
      openingBalance: 0,
      openingDate: today(),
    });
  }
  function saveCheque() {
    if (!c.chequeNumber?.trim() || !c.payee?.trim() || Number(c.amount) <= 0) {
      toast.error("Cheque number, payee and amount are required");
      return;
    }
    chequesStore.put({
      id: newId("chq"),
      chequeNumber: c.chequeNumber.trim(),
      bankAccountId: c.bankAccountId,
      payee: c.payee.trim(),
      amount: Number(c.amount),
      date: c.date || today(),
      office: c.office || "dubai",
      status: c.status || "issued",
      notes: c.notes,
    } as any);
    toast.success("Cheque added");
    setChqOpen(false);
    setC({ office: "dubai", status: "issued" });
  }
  return (
    <Tabs value={sub} onValueChange={setSub}>
      <FinanceDialog
        open={acctOpen}
        title="New bank account"
        onClose={() => setAcctOpen(false)}
        onSave={saveAccount}
      >
        <Field label="Code">
          <Input
            value={a.code || ""}
            onChange={e => setA({ ...a, code: e.target.value })}
            placeholder="BANK-AED-01"
          />
        </Field>
        <Field label="Name">
          <Input
            value={a.name || ""}
            onChange={e => setA({ ...a, name: e.target.value })}
            placeholder="Emirates NBD - AED Current"
          />
        </Field>
        <Field label="Bank">
          <Input
            value={a.bankName || ""}
            onChange={e => setA({ ...a, bankName: e.target.value })}
          />
        </Field>
        <Field label="IBAN">
          <Input
            value={a.iban || ""}
            onChange={e => setA({ ...a, iban: e.target.value })}
          />
        </Field>
        <Field label="Account number">
          <Input
            value={a.accountNumber || ""}
            onChange={e => setA({ ...a, accountNumber: e.target.value })}
          />
        </Field>
        <Field label="Opening balance">
          <Input
            type="number"
            value={a.openingBalance}
            onChange={e => setA({ ...a, openingBalance: e.target.value })}
          />
        </Field>
      </FinanceDialog>
      <FinanceDialog
        open={chqOpen}
        title="New cheque"
        onClose={() => setChqOpen(false)}
        onSave={saveCheque}
      >
        <Field label="Cheque number">
          <Input
            value={c.chequeNumber || ""}
            onChange={e => setC({ ...c, chequeNumber: e.target.value })}
          />
        </Field>
        <Field label="Payee">
          <Input
            value={c.payee || ""}
            onChange={e => setC({ ...c, payee: e.target.value })}
          />
        </Field>
        <Field label="Amount">
          <Input
            type="number"
            value={c.amount || ""}
            onChange={e => setC({ ...c, amount: e.target.value })}
          />
        </Field>
        <Field label="Date">
          <Input
            type="date"
            value={c.date || ""}
            onChange={e => setC({ ...c, date: e.target.value })}
          />
        </Field>
      </FinanceDialog>
      <TabsList>
        <TabsTrigger value="accounts">
          Bank Accounts ({banks.length})
        </TabsTrigger>
        <TabsTrigger value="txs">Transactions ({txs.length})</TabsTrigger>
        <TabsTrigger value="cheques">
          Cheque Register ({cheques.length})
        </TabsTrigger>
        <TabsTrigger value="recon">Reconciliation</TabsTrigger>
      </TabsList>
      <TabsContent value="accounts" className="mt-3">
        <div className="flex justify-end mb-2">
          <Button size="sm" className="gap-1" onClick={() => setAcctOpen(true)}>
            <Plus className="w-3 h-3" /> New account
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {banks.map((b: any) => {
            const bal =
              b.openingBalance +
              txs
                .filter((t: any) => t.bankAccountId === b.id)
                .reduce((s: number, t: any) => s + (t.debit - t.credit), 0);
            return (
              <Card key={b.id} className="border">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold">{b.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {b.bankName} · {b.office}
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        IBAN: {b.iban}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {b.currency}
                    </Badge>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <p className="text-[10px] text-muted-foreground">
                      Current Balance
                    </p>
                    <p className="text-lg font-bold font-mono">
                      {b.currency} {Math.round(bal).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </TabsContent>
      <TabsContent value="txs" className="mt-3">
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="text-left px-2 py-2">Date</th>
                  <th className="text-left px-2 py-2">Bank</th>
                  <th className="text-left px-2 py-2">Description</th>
                  <th className="text-right px-2 py-2">Debit</th>
                  <th className="text-right px-2 py-2">Credit</th>
                  <th className="text-center px-2 py-2">Reconciled</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((t: any) => {
                  const b = banks.find((b: any) => b.id === t.bankAccountId);
                  return (
                    <tr key={t.id} className="border-t border-slate-100">
                      <td className="px-2 py-1.5">{t.date}</td>
                      <td className="px-2 py-1.5">{b?.name}</td>
                      <td className="px-2 py-1.5">{t.description}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-emerald-600">
                        {t.debit > 0 ? t.debit.toLocaleString() : ""}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-red-600">
                        {t.credit > 0 ? t.credit.toLocaleString() : ""}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {t.reconciled ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" />
                        ) : (
                          <Badge className="text-[9px] bg-amber-100 text-amber-700">
                            Unreconciled
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="cheques" className="mt-3">
        <div className="flex justify-end mb-2">
          <Button size="sm" className="gap-1" onClick={() => setChqOpen(true)}>
            <Plus className="w-3 h-3" /> New cheque
          </Button>
        </div>
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="text-left px-2 py-2">Cheque#</th>
                  <th className="text-left px-2 py-2">Date</th>
                  <th className="text-left px-2 py-2">Payee</th>
                  <th className="text-right px-2 py-2">Amount</th>
                  <th className="text-left px-2 py-2">Purpose</th>
                  <th className="text-center px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {cheques.map((c: any) => (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="px-2 py-1.5 font-mono">{c.chequeNumber}</td>
                    <td className="px-2 py-1.5">{c.date}</td>
                    <td className="px-2 py-1.5">{c.payee}</td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      {c.currency} {c.amount.toLocaleString()}
                    </td>
                    <td className="px-2 py-1.5">{c.purpose}</td>
                    <td className="px-2 py-1.5 text-center">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="recon" className="mt-3">
        <BankReconciliationPanel
          banks={banks}
          txs={txs}
          reconciliations={reconciliations}
        />
      </TabsContent>
    </Tabs>
  );
}

function BankReconciliationPanel({ banks, txs, reconciliations }: any) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({
    bankAccountId: banks[0]?.id || "",
    statementDate: today(),
    statementClosingBalance: 0,
    glBookBalance: 0,
    outstandingDeposits: 0,
    outstandingPayments: 0,
    status: "open",
  });
  function saveRecon() {
    if (!draft.bankAccountId || !draft.statementDate) {
      toast.error("Bank account and statement date are required");
      return;
    }
    const adjusted =
      Number(draft.statementClosingBalance) +
      Number(draft.outstandingDeposits) -
      Number(draft.outstandingPayments);
    const diff = adjusted - Number(draft.glBookBalance);
    bankReconciliationsStore.put({
      id: newId("recon"),
      reference: makeRef("REC", reconciliations.length),
      bankAccountId: draft.bankAccountId,
      statementDate: draft.statementDate,
      statementClosingBalance: Number(draft.statementClosingBalance),
      glBookBalance: Number(draft.glBookBalance),
      outstandingDeposits: Number(draft.outstandingDeposits),
      outstandingPayments: Number(draft.outstandingPayments),
      adjustedBankBalance: adjusted,
      difference: diff,
      lines: [],
      status: draft.status || "open",
      createdAt: new Date().toISOString(),
    });
    setOpen(false);
    toast.success("Bank reconciliation saved");
  }
  const unreconciledCount = txs.filter((t: any) => !t.reconciled).length;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {unreconciledCount} unreconciled transaction{unreconciledCount !== 1 ? "s" : ""} across all accounts
        </div>
        <Button size="sm" className="gap-1" onClick={() => setOpen(true)}>
          <Plus className="w-3 h-3" /> New reconciliation
        </Button>
      </div>
      <FinanceDialog open={open} title="New bank reconciliation" onClose={() => setOpen(false)} onSave={saveRecon}>
        <Field label="Bank account">
          <Select value={draft.bankAccountId} onValueChange={v => setDraft({ ...draft, bankAccountId: v })}>
            <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
            <SelectContent>
              {banks.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Statement date">
          <Input type="date" value={draft.statementDate} onChange={e => setDraft({ ...draft, statementDate: e.target.value })} />
        </Field>
        <Field label="Statement closing balance">
          <Input type="number" value={draft.statementClosingBalance} onChange={e => setDraft({ ...draft, statementClosingBalance: e.target.value })} />
        </Field>
        <Field label="GL book balance">
          <Input type="number" value={draft.glBookBalance} onChange={e => setDraft({ ...draft, glBookBalance: e.target.value })} />
        </Field>
        <Field label="Outstanding deposits (in transit)">
          <Input type="number" value={draft.outstandingDeposits} onChange={e => setDraft({ ...draft, outstandingDeposits: e.target.value })} />
        </Field>
        <Field label="Outstanding payments (uncleared)">
          <Input type="number" value={draft.outstandingPayments} onChange={e => setDraft({ ...draft, outstandingPayments: e.target.value })} />
        </Field>
      </FinanceDialog>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Bank Reconciliation Statements · {reconciliations.length}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left px-2 py-2">Reference</th>
                <th className="text-left px-2 py-2">Account</th>
                <th className="text-left px-2 py-2">Statement Date</th>
                <th className="text-right px-2 py-2">Bank Balance</th>
                <th className="text-right px-2 py-2">GL Balance</th>
                <th className="text-right px-2 py-2">Difference</th>
                <th className="text-center px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {reconciliations.length === 0 && (
                <tr><td colSpan={7} className="px-2 py-4 text-center text-muted-foreground">No reconciliations yet</td></tr>
              )}
              {reconciliations.map((r: any) => {
                const bank = banks.find((b: any) => b.id === r.bankAccountId);
                const diff = Number(r.difference);
                return (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-2 py-1.5 font-mono">{r.reference}</td>
                    <td className="px-2 py-1.5">{bank?.name ?? r.bankAccountId}</td>
                    <td className="px-2 py-1.5">{r.statementDate}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{Number(r.statementClosingBalance).toLocaleString()}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{Number(r.glBookBalance).toLocaleString()}</td>
                    <td className={`px-2 py-1.5 text-right font-mono ${Math.abs(diff) < 0.01 ? "text-emerald-700" : "text-red-600"}`}>
                      {Math.abs(diff) < 0.01 ? "✓ Balanced" : diff.toFixed(2)}
                    </td>
                    <td className="px-2 py-1.5 text-center"><StatusBadge status={r.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Unreconciled Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left px-2 py-2">Date</th>
                <th className="text-left px-2 py-2">Description</th>
                <th className="text-right px-2 py-2">Debit</th>
                <th className="text-right px-2 py-2">Credit</th>
                <th className="text-left px-2 py-2">Reference</th>
              </tr>
            </thead>
            <tbody>
              {txs.filter((t: any) => !t.reconciled).slice(0, 20).map((t: any) => (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className="px-2 py-1.5">{t.date}</td>
                  <td className="px-2 py-1.5">{t.description}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-emerald-700">
                    {t.debit > 0 ? t.debit.toLocaleString() : ""}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-red-600">
                    {t.credit > 0 ? t.credit.toLocaleString() : ""}
                  </td>
                  <td className="px-2 py-1.5 text-muted-foreground">{t.reference}</td>
                </tr>
              ))}
              {txs.filter((t: any) => !t.reconciled).length === 0 && (
                <tr><td colSpan={5} className="px-2 py-4 text-center text-muted-foreground">All transactions reconciled</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Petty Cash =====
function PettyCashTab({ floats, vouchers }: any) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({
    floatId: floats[0]?.id || "",
    date: today(),
    type: "expense",
    payee: "",
    amount: 0,
    vatCode: "STD-5",
    description: "",
    expenseAccountCode: "5102008",
    receiptAttached: true,
    status: "submitted",
  });
  function saveVoucher() {
    if (
      !draft.floatId ||
      !draft.payee.trim() ||
      !draft.description.trim() ||
      Number(draft.amount) <= 0
    ) {
      toast.error("Float, payee, description, and amount are required");
      return;
    }
    const amount = Number(draft.amount);
    const vatAmount = draft.vatCode === "STD-5" ? amount * 0.05 : 0;
    pettyCashVouchersStore.put({
      id: newId("pcv"),
      voucherNumber: makeRef("PCV", vouchers.length),
      floatId: draft.floatId,
      date: draft.date,
      type: draft.type,
      payee: draft.payee.trim(),
      amount,
      vatCode: draft.vatCode,
      vatAmount,
      description: draft.description.trim(),
      expenseAccountCode: draft.expenseAccountCode,
      receiptAttached: draft.receiptAttached,
      status: draft.status,
      notes: draft.notes,
    });
    const float = floats.find((f: any) => f.id === draft.floatId);
    if (float && draft.type === "expense") {
      pettyCashFloatsStore.put({
        ...float,
        currentBalance: Math.max(0, float.currentBalance - amount),
      });
    }
    setOpen(false);
    setDraft({
      floatId: floats[0]?.id || "",
      date: today(),
      type: "expense",
      payee: "",
      amount: 0,
      vatCode: "STD-5",
      description: "",
      expenseAccountCode: "5102008",
      receiptAttached: true,
      status: "submitted",
    });
    toast.success("Petty cash voucher created");
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {floats.map((f: any) => (
          <Card key={f.id}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold capitalize">
                    Petty Cash · {f.office}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Custodian: {f.custodianDisplay ?? f.custodian ?? "—"}
                  </p>
                </div>
                <Badge variant="outline">{f.currency ?? "AED"}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t">
                {(() => {
                  const floatAmt = Number(f.floatAmount ?? f.floatLimit ?? f.cap ?? 0);
                  const balance  = Number(f.currentBalance ?? f.balance ?? 0);
                  const spent    = Math.max(0, floatAmt - balance);
                  return (<>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Float limit</p>
                      <p className="font-mono font-bold">{floatAmt.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Balance</p>
                      <p className="font-mono font-bold text-emerald-700">{balance.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Spent</p>
                      <p className="font-mono font-bold text-amber-700">{spent.toLocaleString()}</p>
                    </div>
                  </>);
                })()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">
            Vouchers · {vouchers.length}
          </CardTitle>
          <Button size="sm" className="gap-1" onClick={() => setOpen(true)}>
            <Plus className="w-3 h-3" /> New voucher
          </Button>
        </CardHeader>
        <FinanceDialog
          open={open}
          title="New petty cash voucher"
          onClose={() => setOpen(false)}
          onSave={saveVoucher}
        >
          <Field label="Float">
            <Select
              value={draft.floatId}
              onValueChange={v => setDraft({ ...draft, floatId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select float" />
              </SelectTrigger>
              <SelectContent>
                {floats.map((f: any) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.office} · {f.custodianDisplay}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Date">
            <Input
              type="date"
              value={draft.date}
              onChange={e => setDraft({ ...draft, date: e.target.value })}
            />
          </Field>
          <Field label="Payee">
            <Input
              value={draft.payee}
              onChange={e => setDraft({ ...draft, payee: e.target.value })}
              placeholder="Office supplier"
            />
          </Field>
          <Field label="Amount">
            <Input
              type="number"
              value={draft.amount}
              onChange={e =>
                setDraft({ ...draft, amount: Number(e.target.value || 0) })
              }
            />
          </Field>
          <Field label="Description">
            <Input
              value={draft.description}
              onChange={e =>
                setDraft({ ...draft, description: e.target.value })
              }
              placeholder="Stationery purchase"
            />
          </Field>
          <Field label="Expense account">
            <Input
              value={draft.expenseAccountCode}
              onChange={e =>
                setDraft({ ...draft, expenseAccountCode: e.target.value })
              }
            />
          </Field>
          <Field label="Receipt attached">
            <Select
              value={draft.receiptAttached ? "yes" : "no"}
              onValueChange={v =>
                setDraft({ ...draft, receiptAttached: v === "yes" })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select
              value={draft.status}
              onValueChange={v => setDraft({ ...draft, status: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </FinanceDialog>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left px-2 py-2">Voucher</th>
                <th className="text-left px-2 py-2">Date</th>
                <th className="text-left px-2 py-2">Payee</th>
                <th className="text-left px-2 py-2">Description</th>
                <th className="text-left px-2 py-2">Account</th>
                <th className="text-right px-2 py-2">Amount</th>
                <th className="text-center px-2 py-2">Receipt</th>
                <th className="text-center px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((v: any) => (
                <tr key={v.id} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-mono">{v.voucherNumber ?? v.receiptRef ?? "—"}</td>
                  <td className="px-2 py-1.5">{v.date}</td>
                  <td className="px-2 py-1.5">{v.payee ?? v.description ?? "—"}</td>
                  <td className="px-2 py-1.5">{v.description ?? v.category ?? "—"}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">
                    {v.expenseAccountCode ?? v.glAccountCode ?? "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {Number(v.amount ?? 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {v.receiptAttached ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-amber-600 inline" />
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <StatusBadge status={v.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Office Expenses =====
function ExpensesTab({ recurring, bills }: any) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({
    kind: "dewa-electricity",
    description: "",
    accountNumber: "",
    office: "dubai",
    frequency: "monthly",
    averageAmount: 0,
    currency: "AED",
    glAccountCode: "5102002",
    paymentMethod: "online",
    nextDueDate: addDays(30),
    isActive: true,
  });
  function saveRecurring() {
    if (!draft.description.trim() || Number(draft.averageAmount) <= 0) {
      toast.error("Description and average amount are required");
      return;
    }
    recurringExpensesStore.put({
      id: newId("rec"),
      kind: draft.kind,
      description: draft.description.trim(),
      accountNumber: draft.accountNumber || undefined,
      office: draft.office,
      frequency: draft.frequency,
      averageAmount: Number(draft.averageAmount),
      currency: draft.currency,
      glAccountCode: draft.glAccountCode,
      paymentMethod: draft.paymentMethod,
      nextDueDate: draft.nextDueDate,
      isActive: draft.isActive,
      notes: draft.notes,
    });
    setOpen(false);
    setDraft({
      kind: "dewa-electricity",
      description: "",
      accountNumber: "",
      office: "dubai",
      frequency: "monthly",
      averageAmount: 0,
      currency: "AED",
      glAccountCode: "5102002",
      paymentMethod: "online",
      nextDueDate: addDays(30),
      isActive: true,
    });
    toast.success("Recurring office expense created");
  }
  const [billOpen, setBillOpen] = useState(false);
  const [billDraft, setBillDraft] = useState<any>({
    office: "dubai",
    status: "unpaid",
  });
  function saveBill() {
    if (!billDraft.description?.trim() || Number(billDraft.amount) <= 0) {
      toast.error("Description and amount are required");
      return;
    }
    utilityBillsStore.put({
      id: newId("ub"),
      kind: billDraft.kind || "dewa-electricity",
      description: billDraft.description.trim(),
      office: billDraft.office || "dubai",
      amount: Number(billDraft.amount),
      billDate: billDraft.billDate || today(),
      dueDate: billDraft.dueDate || addDays(15),
      status: billDraft.status || "unpaid",
      accountNumber: billDraft.accountNumber,
      notes: billDraft.notes,
    } as any);
    toast.success("Utility bill added");
    setBillOpen(false);
    setBillDraft({ office: "dubai", status: "unpaid" });
  }
  return (
    <div className="space-y-3">
      <FinanceDialog
        open={billOpen}
        title="New utility bill"
        onClose={() => setBillOpen(false)}
        onSave={saveBill}
      >
        <Field label="Description">
          <Input
            value={billDraft.description || ""}
            onChange={e =>
              setBillDraft({ ...billDraft, description: e.target.value })
            }
            placeholder="DEWA - May 2026"
          />
        </Field>
        <Field label="Amount">
          <Input
            type="number"
            value={billDraft.amount || ""}
            onChange={e =>
              setBillDraft({ ...billDraft, amount: e.target.value })
            }
          />
        </Field>
        <Field label="Bill date">
          <Input
            type="date"
            value={billDraft.billDate || ""}
            onChange={e =>
              setBillDraft({ ...billDraft, billDate: e.target.value })
            }
          />
        </Field>
        <Field label="Due date">
          <Input
            type="date"
            value={billDraft.dueDate || ""}
            onChange={e =>
              setBillDraft({ ...billDraft, dueDate: e.target.value })
            }
          />
        </Field>
      </FinanceDialog>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">
            Recurring Expenses · {recurring.length}
          </CardTitle>
          <Button size="sm" className="gap-1" onClick={() => setOpen(true)}>
            <Plus className="w-3 h-3" /> New recurring
          </Button>
        </CardHeader>
        <FinanceDialog
          open={open}
          title="New recurring office expense"
          onClose={() => setOpen(false)}
          onSave={saveRecurring}
        >
          <Field label="Type">
            <Select
              value={draft.kind}
              onValueChange={v => setDraft({ ...draft, kind: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "dewa-electricity",
                  "dewa-water",
                  "etisalat-telecom",
                  "du-telecom",
                  "ejari-rent",
                  "office-cleaning",
                  "internet",
                  "parking",
                  "fuel",
                  "other",
                ].map(k => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Description">
            <Input
              value={draft.description}
              onChange={e =>
                setDraft({ ...draft, description: e.target.value })
              }
              placeholder="Dubai office DEWA"
            />
          </Field>
          <Field label="Account number">
            <Input
              value={draft.accountNumber}
              onChange={e =>
                setDraft({ ...draft, accountNumber: e.target.value })
              }
            />
          </Field>
          <Field label="Office">
            <OfficeSelect
              value={draft.office}
              onChange={v =>
                setDraft({
                  ...draft,
                  office: v,
                  currency: officeCurrency[v] || "AED",
                })
              }
            />
          </Field>
          <Field label="Frequency">
            <Select
              value={draft.frequency}
              onValueChange={v => setDraft({ ...draft, frequency: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="biannual">Biannual</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Average amount">
            <Input
              type="number"
              value={draft.averageAmount}
              onChange={e =>
                setDraft({
                  ...draft,
                  averageAmount: Number(e.target.value || 0),
                })
              }
            />
          </Field>
          <Field label="Payment method">
            <Select
              value={draft.paymentMethod}
              onValueChange={v => setDraft({ ...draft, paymentMethod: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="auto-debit">Auto debit</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Next due">
            <Input
              type="date"
              value={draft.nextDueDate}
              onChange={e =>
                setDraft({ ...draft, nextDueDate: e.target.value })
              }
            />
          </Field>
        </FinanceDialog>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left px-2 py-2">Type</th>
                <th className="text-left px-2 py-2">Description</th>
                <th className="text-left px-2 py-2">Account#</th>
                <th className="text-center px-2 py-2">Frequency</th>
                <th className="text-right px-2 py-2">Avg Amount</th>
                <th className="text-left px-2 py-2">Method</th>
                <th className="text-left px-2 py-2">Next Due</th>
              </tr>
            </thead>
            <tbody>
              {recurring.map((r: any) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-2 py-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      {r.kind}
                    </Badge>
                  </td>
                  <td className="px-2 py-1.5 font-medium">{r.description}</td>
                  <td className="px-2 py-1.5 text-muted-foreground font-mono">
                    {r.accountNumber || "—"}
                  </td>
                  <td className="px-2 py-1.5 text-center capitalize">
                    {r.frequency}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {r.currency ?? "AED"} {Number(r.averageAmount ?? r.amount ?? r.monthlyAmount ?? 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5">{r.paymentMethod}</td>
                  <td className="px-2 py-1.5">{r.nextDueDate || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">
            Utility Bills · {bills.length}
          </CardTitle>
          <Button size="sm" className="gap-1" onClick={() => setBillOpen(true)}>
            <Plus className="w-3 h-3" /> New bill
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left px-2 py-2">Bill#</th>
                <th className="text-left px-2 py-2">Period</th>
                <th className="text-right px-2 py-2">Units</th>
                <th className="text-right px-2 py-2">Net</th>
                <th className="text-right px-2 py-2">VAT</th>
                <th className="text-right px-2 py-2">Total</th>
                <th className="text-center px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b: any) => {
                const exVat  = Number(b.amountExVat ?? b.amount ?? b.monthlyAmount ?? 0);
                const vat    = Number(b.vatAmount ?? 0);
                const total  = Number(b.amountIncVat ?? (exVat + vat));
                const period = b.periodStart
                  ? `${b.periodStart} → ${b.periodEnd ?? ""}`
                  : (b.billDate ?? b.dueDate ?? "—");
                return (
                <tr key={b.id} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-mono">{b.billNumber ?? b.accountNumber ?? b.referenceNumber ?? "—"}</td>
                  <td className="px-2 py-1.5">{period}</td>
                  <td className="px-2 py-1.5 text-right">
                    {b.unitsConsumed
                      ? `${b.unitsConsumed} ${b.unitOfMeasure ?? ""}`
                      : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {exVat.toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {vat.toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono font-bold">
                    {total.toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <StatusBadge status={b.status ?? "active"} />
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Insurance =====
function InsuranceTab({ policies, claims }: any) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({
    type: "professional-indemnity",
    policyNumber: "",
    insurerName: "",
    brokerName: "",
    office: "dubai",
    coverageAED: 0,
    premiumAED: 0,
    effectiveFrom: today(),
    expiryDate: addDays(365),
    renewalReminder: 45,
    glAccountCode: "5101004",
    status: "active",
  });
  function savePolicy() {
    if (
      !draft.policyNumber.trim() ||
      !draft.insurerName.trim() ||
      Number(draft.premiumAED) <= 0
    ) {
      toast.error("Policy number, insurer, and premium are required");
      return;
    }
    insurancePoliciesStore.put({
      id: newId("ins"),
      policyNumber: draft.policyNumber.trim(),
      type: draft.type,
      insurerName: draft.insurerName.trim(),
      brokerName: draft.brokerName || undefined,
      office: draft.office,
      insuredItems: draft.insuredItems,
      coverageAED: Number(draft.coverageAED),
      premiumAED: Number(draft.premiumAED),
      premiumPaidAED: Number(draft.premiumPaidAED || draft.premiumAED),
      effectiveFrom: draft.effectiveFrom,
      expiryDate: draft.expiryDate,
      renewalReminder: Number(draft.renewalReminder || 45),
      claimsThisYear: 0,
      glAccountCode: draft.glAccountCode,
      status: draft.status,
      notes: draft.notes,
    });
    setOpen(false);
    setDraft({
      type: "professional-indemnity",
      policyNumber: "",
      insurerName: "",
      brokerName: "",
      office: "dubai",
      coverageAED: 0,
      premiumAED: 0,
      effectiveFrom: today(),
      expiryDate: addDays(365),
      renewalReminder: 45,
      glAccountCode: "5101004",
      status: "active",
    });
    toast.success("Insurance policy created");
  }
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimDraft, setClaimDraft] = useState<any>({ status: "open" });
  function saveClaim() {
    if (!claimDraft.description?.trim() || Number(claimDraft.amountAED) <= 0) {
      toast.error("Description and amount are required");
      return;
    }
    insuranceClaimsStore.put({
      id: newId("clm"),
      policyId: claimDraft.policyId,
      claimNumber:
        claimDraft.claimNumber || `CLM-${Date.now().toString().slice(-5)}`,
      description: claimDraft.description.trim(),
      amountAED: Number(claimDraft.amountAED),
      dateOfLoss: claimDraft.dateOfLoss || today(),
      status: claimDraft.status || "open",
      notes: claimDraft.notes,
    } as any);
    toast.success("Claim filed");
    setClaimOpen(false);
    setClaimDraft({ status: "open" });
  }
  return (
    <div className="space-y-3">
      <FinanceDialog
        open={claimOpen}
        title="New insurance claim"
        onClose={() => setClaimOpen(false)}
        onSave={saveClaim}
      >
        <Field label="Policy">
          <Select
            value={claimDraft.policyId || ""}
            onValueChange={v => setClaimDraft({ ...claimDraft, policyId: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select policy" />
            </SelectTrigger>
            <SelectContent>
              {policies.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.policyNumber} — {p.type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Description">
          <Input
            value={claimDraft.description || ""}
            onChange={e =>
              setClaimDraft({ ...claimDraft, description: e.target.value })
            }
          />
        </Field>
        <Field label="Amount (AED)">
          <Input
            type="number"
            value={claimDraft.amountAED || ""}
            onChange={e =>
              setClaimDraft({ ...claimDraft, amountAED: e.target.value })
            }
          />
        </Field>
        <Field label="Date of loss">
          <Input
            type="date"
            value={claimDraft.dateOfLoss || ""}
            onChange={e =>
              setClaimDraft({ ...claimDraft, dateOfLoss: e.target.value })
            }
          />
        </Field>
      </FinanceDialog>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">
            Insurance Register · {policies.length}
          </CardTitle>
          <Button size="sm" className="gap-1" onClick={() => setOpen(true)}>
            <Plus className="w-3 h-3" /> New policy
          </Button>
        </CardHeader>
        <FinanceDialog
          open={open}
          title="New insurance policy"
          onClose={() => setOpen(false)}
          onSave={savePolicy}
        >
          <Field label="Type">
            <Select
              value={draft.type}
              onValueChange={v => setDraft({ ...draft, type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(INSURANCE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Policy number">
            <Input
              value={draft.policyNumber}
              onChange={e =>
                setDraft({ ...draft, policyNumber: e.target.value })
              }
            />
          </Field>
          <Field label="Insurer">
            <Input
              value={draft.insurerName}
              onChange={e =>
                setDraft({ ...draft, insurerName: e.target.value })
              }
            />
          </Field>
          <Field label="Broker">
            <Input
              value={draft.brokerName}
              onChange={e => setDraft({ ...draft, brokerName: e.target.value })}
            />
          </Field>
          <Field label="Office">
            <OfficeSelect
              value={draft.office}
              onChange={v => setDraft({ ...draft, office: v })}
            />
          </Field>
          <Field label="Coverage AED">
            <Input
              type="number"
              value={draft.coverageAED}
              onChange={e =>
                setDraft({ ...draft, coverageAED: Number(e.target.value || 0) })
              }
            />
          </Field>
          <Field label="Premium AED">
            <Input
              type="number"
              value={draft.premiumAED}
              onChange={e =>
                setDraft({ ...draft, premiumAED: Number(e.target.value || 0) })
              }
            />
          </Field>
          <Field label="Expiry">
            <Input
              type="date"
              value={draft.expiryDate}
              onChange={e => setDraft({ ...draft, expiryDate: e.target.value })}
            />
          </Field>
        </FinanceDialog>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left px-2 py-2">Type</th>
                <th className="text-left px-2 py-2">Policy#</th>
                <th className="text-left px-2 py-2">Insurer</th>
                <th className="text-right px-2 py-2">Coverage AED</th>
                <th className="text-right px-2 py-2">Premium AED</th>
                <th className="text-left px-2 py-2">Effective</th>
                <th className="text-left px-2 py-2">Expiry</th>
                <th className="text-center px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p: any) => {
                const days = Math.floor(
                  (new Date(p.expiryDate).getTime() - Date.now()) / 86_400_000
                );
                const expSoon = days < 60 && days > 0;
                return (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-2 py-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {
                          INSURANCE_LABELS[
                            p.type as keyof typeof INSURANCE_LABELS
                          ]
                        }
                      </Badge>
                    </td>
                    <td className="px-2 py-1.5 font-mono">{p.policyNumber}</td>
                    <td className="px-2 py-1.5">{p.insurerName}</td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      {Number(p.coverageAED ?? p.coverage ?? p.sumInsured ?? 0).toLocaleString()}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      {Number(p.premiumAED ?? p.premium ?? p.annualPremium ?? 0).toLocaleString()}
                    </td>
                    <td className="px-2 py-1.5">{p.effectiveFrom}</td>
                    <td
                      className={`px-2 py-1.5 ${expSoon ? "text-red-600 font-semibold" : ""}`}
                    >
                      {p.expiryDate}{" "}
                      {expSoon && (
                        <span className="text-[10px]">({days}d)</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Claims · {claims.length}</CardTitle>
          <Button
            size="sm"
            className="gap-1"
            onClick={() => setClaimOpen(true)}
          >
            <Plus className="w-3 h-3" /> New claim
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left px-2 py-2">Claim#</th>
                <th className="text-left px-2 py-2">Policy</th>
                <th className="text-left px-2 py-2">Date</th>
                <th className="text-left px-2 py-2">Description</th>
                <th className="text-right px-2 py-2">Claim AED</th>
                <th className="text-right px-2 py-2">Received</th>
                <th className="text-center px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c: any) => {
                const pol = policies.find((p: any) => p.id === c.policyId);
                return (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="px-2 py-1.5 font-mono">
                      {c.claimNumber || "—"}
                    </td>
                    <td className="px-2 py-1.5 text-[10px]">
                      {pol
                        ? INSURANCE_LABELS[
                            pol.type as keyof typeof INSURANCE_LABELS
                          ]
                        : "—"}
                    </td>
                    <td className="px-2 py-1.5">{c.claimDate}</td>
                    <td className="px-2 py-1.5">{c.description}</td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      {c.claimAmount.toLocaleString()}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      {c.amountReceived?.toLocaleString() || "—"}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Fixed Assets =====
function FixedAssetsTab({ assets }: any) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({
    assetTag: "",
    description: "",
    category: "computers-it",
    office: "dubai",
    acquisitionDate: today(),
    acquisitionCostAED: 0,
    usefulLifeYears: 3,
    residualValueAED: 0,
    depreciationMethod: "straight-line",
    glAssetAccount: "1203000",
    glAccumDepreciationAccount: "1303000",
    glDepreciationExpenseAccount: "5102018",
    status: "active",
  });
  const totalCost = assets.reduce(
    (s: number, a: any) => s + Number(a.acquisitionCostAED ?? a.cost ?? a.purchaseCost ?? 0),
    0
  );
  const monthlyDep = assets
    .filter((a: any) => a.status === "active")
    .reduce((s: number, a: any) => s + computeMonthlyDepreciation({
      ...a,
      acquisitionCostAED: Number(a.acquisitionCostAED ?? a.cost ?? a.purchaseCost ?? 0),
      residualValueAED: Number(a.residualValueAED ?? a.residualValue ?? 0),
      usefulLifeYears: Number(a.usefulLifeYears ?? a.lifeYears ?? 1),
    }), 0);
  function saveAsset() {
    if (
      !draft.assetTag.trim() ||
      !draft.description.trim() ||
      Number(draft.acquisitionCostAED) <= 0
    ) {
      toast.error("Asset tag, description, and cost are required");
      return;
    }
    fixedAssetsStore.put({
      id: newId("fa"),
      assetTag: draft.assetTag.trim(),
      description: draft.description.trim(),
      category: draft.category,
      office: draft.office,
      serialNumber: draft.serialNumber,
      acquisitionDate: draft.acquisitionDate,
      acquisitionCostAED: Number(draft.acquisitionCostAED),
      supplier: draft.supplier,
      invoiceRef: draft.invoiceRef,
      usefulLifeYears: Number(draft.usefulLifeYears),
      residualValueAED: Number(draft.residualValueAED || 0),
      depreciationMethod: draft.depreciationMethod,
      location: draft.location,
      glAssetAccount: draft.glAssetAccount,
      glAccumDepreciationAccount: draft.glAccumDepreciationAccount,
      glDepreciationExpenseAccount: draft.glDepreciationExpenseAccount,
      status: draft.status,
      notes: draft.notes,
    });
    setOpen(false);
    setDraft({
      assetTag: "",
      description: "",
      category: "computers-it",
      office: "dubai",
      acquisitionDate: today(),
      acquisitionCostAED: 0,
      usefulLifeYears: 3,
      residualValueAED: 0,
      depreciationMethod: "straight-line",
      glAssetAccount: "1203000",
      glAccumDepreciationAccount: "1303000",
      glDepreciationExpenseAccount: "5102018",
      status: "active",
    });
    toast.success("Fixed asset created");
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground">
              Total Acquisition Cost
            </p>
            <p className="text-lg font-bold font-mono">
              AED {totalCost.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground">
              Monthly Depreciation
            </p>
            <p className="text-lg font-bold font-mono">
              AED {Math.round(monthlyDep).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground">Active Assets</p>
            <p className="text-lg font-bold font-mono">
              {assets.filter((a: any) => a.status === "active").length}
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm">
            Asset Register · {assets.length}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => {
                const month = new Date().toISOString().slice(0, 7);
                toast.promise(
                  fetch(`/api/finance/fixed-assets/post-depreciation`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ month, office: "dubai" }),
                  }).then(r => r.json()),
                  {
                    loading: `Posting depreciation for ${month}…`,
                    success: (d) => `Posted: ${d.assetsProcessed} assets, AED ${Math.round(d.totalDepreciation).toLocaleString()}`,
                    error: "Failed to post depreciation",
                  }
                );
              }}
            >
              <FileSpreadsheet className="w-3 h-3" /> Post Depreciation
            </Button>
            <Button size="sm" className="gap-1" onClick={() => setOpen(true)}>
              <Plus className="w-3 h-3" /> New asset
            </Button>
          </div>
        </CardHeader>
        <FinanceDialog
          open={open}
          title="New fixed asset"
          onClose={() => setOpen(false)}
          onSave={saveAsset}
        >
          <Field label="Asset tag">
            <Input
              value={draft.assetTag}
              onChange={e => setDraft({ ...draft, assetTag: e.target.value })}
              placeholder="NSC-FA-0101"
            />
          </Field>
          <Field label="Description">
            <Input
              value={draft.description}
              onChange={e =>
                setDraft({ ...draft, description: e.target.value })
              }
              placeholder="Laptop"
            />
          </Field>
          <Field label="Category">
            <Select
              value={draft.category}
              onValueChange={v => setDraft({ ...draft, category: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "furniture",
                  "office-equipment",
                  "computers-it",
                  "vehicles",
                  "machinery",
                  "software-license",
                  "other",
                ].map(c => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Office">
            <OfficeSelect
              value={draft.office}
              onChange={v => setDraft({ ...draft, office: v })}
            />
          </Field>
          <Field label="Acquired">
            <Input
              type="date"
              value={draft.acquisitionDate}
              onChange={e =>
                setDraft({ ...draft, acquisitionDate: e.target.value })
              }
            />
          </Field>
          <Field label="Cost AED">
            <Input
              type="number"
              value={draft.acquisitionCostAED}
              onChange={e =>
                setDraft({
                  ...draft,
                  acquisitionCostAED: Number(e.target.value || 0),
                })
              }
            />
          </Field>
          <Field label="Useful life years">
            <Input
              type="number"
              value={draft.usefulLifeYears}
              onChange={e =>
                setDraft({
                  ...draft,
                  usefulLifeYears: Number(e.target.value || 0),
                })
              }
            />
          </Field>
          <Field label="Location">
            <Input
              value={draft.location || ""}
              onChange={e => setDraft({ ...draft, location: e.target.value })}
            />
          </Field>
        </FinanceDialog>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left px-2 py-2">Tag</th>
                <th className="text-left px-2 py-2">Description</th>
                <th className="text-left px-2 py-2">Category</th>
                <th className="text-left px-2 py-2">Acquired</th>
                <th className="text-right px-2 py-2">Cost AED</th>
                <th className="text-right px-2 py-2">Life (yr)</th>
                <th className="text-right px-2 py-2">Monthly Dep</th>
                <th className="text-center px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a: any) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-mono">{a.assetTag}</td>
                  <td className="px-2 py-1.5 font-medium">{a.description}</td>
                  <td className="px-2 py-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      {a.category}
                    </Badge>
                  </td>
                  <td className="px-2 py-1.5">{a.acquisitionDate}</td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {Number(a.acquisitionCostAED ?? a.cost ?? a.purchaseCost ?? 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {a.usefulLifeYears}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {Math.round(computeMonthlyDepreciation(a)).toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <StatusBadge status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Subscriptions =====
function SubscriptionsTab({ subs }: any) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({
    name: "",
    vendor: "",
    kind: "software",
    seats: 1,
    costAED: 0,
    frequency: "annual",
    renewalDate: addDays(365),
    autoRenew: true,
    paidVia: "invoice",
    glAccountCode: "5102020",
    office: "dubai",
    isActive: true,
  });
  const annualised = subs.reduce(
    (s: number, x: any) =>
      s +
      (x.frequency === "annual"
        ? x.costAED
        : x.frequency === "monthly"
          ? x.costAED * 12
          : x.frequency === "quarterly"
            ? x.costAED * 4
            : x.costAED * 2),
    0
  );
  function saveSubscription() {
    if (
      !draft.name.trim() ||
      !draft.vendor.trim() ||
      Number(draft.costAED) <= 0
    ) {
      toast.error("Name, vendor, and cost are required");
      return;
    }
    subscriptionsStore.put({
      id: newId("sub"),
      name: draft.name.trim(),
      vendor: draft.vendor.trim(),
      kind: draft.kind,
      seats: Number(draft.seats || 0),
      costAED: Number(draft.costAED),
      frequency: draft.frequency,
      renewalDate: draft.renewalDate,
      autoRenew: draft.autoRenew,
      paidVia: draft.paidVia,
      glAccountCode: draft.glAccountCode,
      office: draft.office,
      contractRef: draft.contractRef,
      isActive: draft.isActive,
      notes: draft.notes,
    });
    setOpen(false);
    setDraft({
      name: "",
      vendor: "",
      kind: "software",
      seats: 1,
      costAED: 0,
      frequency: "annual",
      renewalDate: addDays(365),
      autoRenew: true,
      paidVia: "invoice",
      glAccountCode: "5102020",
      office: "dubai",
      isActive: true,
    });
    toast.success("Subscription created");
  }
  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground">Annualised cost</p>
            <p className="text-xl font-bold font-mono">
              AED {Math.round(annualised).toLocaleString()}
            </p>
          </div>
          <Button size="sm" className="gap-1" onClick={() => setOpen(true)}>
            <Plus className="w-3 h-3" /> New subscription
          </Button>
        </CardContent>
      </Card>
      <FinanceDialog
        open={open}
        title="New subscription"
        onClose={() => setOpen(false)}
        onSave={saveSubscription}
      >
        <Field label="Name">
          <Input
            value={draft.name}
            onChange={e => setDraft({ ...draft, name: e.target.value })}
            placeholder="Autodesk AEC Collection"
          />
        </Field>
        <Field label="Vendor">
          <Input
            value={draft.vendor}
            onChange={e => setDraft({ ...draft, vendor: e.target.value })}
          />
        </Field>
        <Field label="Kind">
          <Select
            value={draft.kind}
            onValueChange={v => setDraft({ ...draft, kind: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                "software",
                "professional-body",
                "magazine",
                "business-club",
                "saas",
                "other",
              ].map(k => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Seats">
          <Input
            type="number"
            value={draft.seats}
            onChange={e =>
              setDraft({ ...draft, seats: Number(e.target.value || 0) })
            }
          />
        </Field>
        <Field label="Cost AED">
          <Input
            type="number"
            value={draft.costAED}
            onChange={e =>
              setDraft({ ...draft, costAED: Number(e.target.value || 0) })
            }
          />
        </Field>
        <Field label="Frequency">
          <Select
            value={draft.frequency}
            onValueChange={v => setDraft({ ...draft, frequency: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
              <SelectItem value="perpetual">Perpetual</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Renewal date">
          <Input
            type="date"
            value={draft.renewalDate}
            onChange={e => setDraft({ ...draft, renewalDate: e.target.value })}
          />
        </Field>
        <Field label="Auto renew">
          <Select
            value={draft.autoRenew ? "yes" : "no"}
            onValueChange={v => setDraft({ ...draft, autoRenew: v === "yes" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </FinanceDialog>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left px-2 py-2">Name</th>
                <th className="text-left px-2 py-2">Vendor</th>
                <th className="text-left px-2 py-2">Kind</th>
                <th className="text-right px-2 py-2">Seats</th>
                <th className="text-right px-2 py-2">Cost AED</th>
                <th className="text-center px-2 py-2">Frequency</th>
                <th className="text-left px-2 py-2">Renewal</th>
                <th className="text-center px-2 py-2">Auto</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s: any) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-medium">{s.name}</td>
                  <td className="px-2 py-1.5">{s.vendor}</td>
                  <td className="px-2 py-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      {s.kind}
                    </Badge>
                  </td>
                  <td className="px-2 py-1.5 text-right">{s.seats || "—"}</td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {s.costAED.toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 text-center capitalize">
                    {s.frequency}
                  </td>
                  <td className="px-2 py-1.5">{s.renewalDate || "—"}</td>
                  <td className="px-2 py-1.5 text-center">
                    {s.autoRenew ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" />
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Government Fees =====
function GovtTab({ fees }: any) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({
    authority: "DED",
    type: "Trade License Renewal",
    reference: "",
    amountAED: 0,
    paidDate: today(),
    validFrom: today(),
    expiryDate: addDays(365),
    paidBy: "NASEC Finance",
    glAccountCode: "5102007",
    status: "paid",
  });
  function saveFee() {
    if (!draft.type.trim() || Number(draft.amountAED) <= 0) {
      toast.error("Fee type and amount are required");
      return;
    }
    governmentFeesStore.put({
      id: newId("gov"),
      authority: draft.authority,
      type: draft.type.trim(),
      reference: draft.reference || undefined,
      amountAED: Number(draft.amountAED),
      paidDate: draft.paidDate,
      validFrom: draft.validFrom,
      expiryDate: draft.expiryDate,
      paidBy: draft.paidBy,
      glAccountCode: draft.glAccountCode,
      status: draft.status,
      notes: draft.notes,
    });
    setOpen(false);
    setDraft({
      authority: "DED",
      type: "Trade License Renewal",
      reference: "",
      amountAED: 0,
      paidDate: today(),
      validFrom: today(),
      expiryDate: addDays(365),
      paidBy: "NASEC Finance",
      glAccountCode: "5102007",
      status: "paid",
    });
    toast.success("Government payment recorded");
  }
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">
          Trade License & Government Fees · {fees.length}
        </CardTitle>
        <Button size="sm" className="gap-1" onClick={() => setOpen(true)}>
          <Plus className="w-3 h-3" /> Record payment
        </Button>
      </CardHeader>
      <FinanceDialog
        open={open}
        title="Record government payment"
        onClose={() => setOpen(false)}
        onSave={saveFee}
      >
        <Field label="Authority">
          <Select
            value={draft.authority}
            onValueChange={v => setDraft({ ...draft, authority: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                "DED",
                "MOHRE",
                "GDRFA",
                "Trakhees",
                "DM",
                "Dubai-Customs",
                "FTA",
                "DLD",
                "Other",
              ].map(a => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Type">
          <Input
            value={draft.type}
            onChange={e => setDraft({ ...draft, type: e.target.value })}
          />
        </Field>
        <Field label="Reference">
          <Input
            value={draft.reference}
            onChange={e => setDraft({ ...draft, reference: e.target.value })}
          />
        </Field>
        <Field label="Amount AED">
          <Input
            type="number"
            value={draft.amountAED}
            onChange={e =>
              setDraft({ ...draft, amountAED: Number(e.target.value || 0) })
            }
          />
        </Field>
        <Field label="Paid date">
          <Input
            type="date"
            value={draft.paidDate}
            onChange={e => setDraft({ ...draft, paidDate: e.target.value })}
          />
        </Field>
        <Field label="Expiry">
          <Input
            type="date"
            value={draft.expiryDate}
            onChange={e => setDraft({ ...draft, expiryDate: e.target.value })}
          />
        </Field>
      </FinanceDialog>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="text-left px-2 py-2">Authority</th>
              <th className="text-left px-2 py-2">Type</th>
              <th className="text-left px-2 py-2">Ref</th>
              <th className="text-right px-2 py-2">Amount AED</th>
              <th className="text-left px-2 py-2">Paid Date</th>
              <th className="text-left px-2 py-2">Expiry</th>
              <th className="text-center px-2 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {fees.map((f: any) => (
              <tr key={f.id} className="border-t border-slate-100">
                <td className="px-2 py-1.5">
                  <Badge variant="outline" className="text-[10px]">
                    {f.authority}
                  </Badge>
                </td>
                <td className="px-2 py-1.5">{f.type}</td>
                <td className="px-2 py-1.5 font-mono text-[10px]">
                  {f.reference || "—"}
                </td>
                <td className="px-2 py-1.5 text-right font-mono">
                  {f.amountAED.toLocaleString()}
                </td>
                <td className="px-2 py-1.5">{f.paidDate}</td>
                <td className="px-2 py-1.5">{f.expiryDate || "—"}</td>
                <td className="px-2 py-1.5 text-center">
                  <StatusBadge status={f.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ===== VAT =====
function VatTab({ returns }: any) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({
    periodLabel: `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`,
    periodStart: today(),
    periodEnd: addDays(90),
    outputVatStandard: 0,
    outputVatZero: 0,
    outputVatExempt: 0,
    inputVatStandard: 0,
    inputVatReverseCharge: 0,
    status: "draft",
  });
  function saveVat() {
    if (!draft.periodLabel.trim()) {
      toast.error("Period label is required");
      return;
    }
    const netVatPayable =
      Number(draft.outputVatStandard || 0) -
      Number(draft.inputVatStandard || 0) -
      Number(draft.inputVatReverseCharge || 0);
    vatReturnsStore.put({
      id: newId("vat"),
      periodLabel: draft.periodLabel.trim(),
      periodStart: draft.periodStart,
      periodEnd: draft.periodEnd,
      outputVatStandard: Number(draft.outputVatStandard || 0),
      outputVatZero: Number(draft.outputVatZero || 0),
      outputVatExempt: Number(draft.outputVatExempt || 0),
      inputVatStandard: Number(draft.inputVatStandard || 0),
      inputVatReverseCharge: Number(draft.inputVatReverseCharge || 0),
      netVatPayable,
      status: draft.status,
      notes: draft.notes,
    });
    setOpen(false);
    setDraft({
      periodLabel: `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`,
      periodStart: today(),
      periodEnd: addDays(90),
      outputVatStandard: 0,
      outputVatZero: 0,
      outputVatExempt: 0,
      inputVatStandard: 0,
      inputVatReverseCharge: 0,
      status: "draft",
    });
    toast.success("VAT return prepared");
  }
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">
          VAT Returns (UAE FTA) · 5% standard
        </CardTitle>
        <Button size="sm" className="gap-1" onClick={() => setOpen(true)}>
          <Plus className="w-3 h-3" /> Prepare return
        </Button>
      </CardHeader>
      <FinanceDialog
        open={open}
        title="Prepare VAT return"
        onClose={() => setOpen(false)}
        onSave={saveVat}
      >
        <Field label="Period label">
          <Input
            value={draft.periodLabel}
            onChange={e => setDraft({ ...draft, periodLabel: e.target.value })}
          />
        </Field>
        <Field label="Status">
          <Select
            value={draft.status}
            onValueChange={v => setDraft({ ...draft, status: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="filed">Filed</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Period start">
          <Input
            type="date"
            value={draft.periodStart}
            onChange={e => setDraft({ ...draft, periodStart: e.target.value })}
          />
        </Field>
        <Field label="Period end">
          <Input
            type="date"
            value={draft.periodEnd}
            onChange={e => setDraft({ ...draft, periodEnd: e.target.value })}
          />
        </Field>
        <Field label="Output VAT 5%">
          <Input
            type="number"
            value={draft.outputVatStandard}
            onChange={e =>
              setDraft({
                ...draft,
                outputVatStandard: Number(e.target.value || 0),
              })
            }
          />
        </Field>
        <Field label="Input VAT 5%">
          <Input
            type="number"
            value={draft.inputVatStandard}
            onChange={e =>
              setDraft({
                ...draft,
                inputVatStandard: Number(e.target.value || 0),
              })
            }
          />
        </Field>
      </FinanceDialog>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="text-left px-2 py-2">Period</th>
              <th className="text-right px-2 py-2">Output VAT</th>
              <th className="text-right px-2 py-2">Input VAT</th>
              <th className="text-right px-2 py-2">Net Payable</th>
              <th className="text-left px-2 py-2">Filed</th>
              <th className="text-left px-2 py-2">Payment Ref</th>
              <th className="text-center px-2 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {returns.map((v: any) => (
              <tr key={v.id} className="border-t border-slate-100">
                <td className="px-2 py-1.5 font-medium">{v.periodLabel}</td>
                <td className="px-2 py-1.5 text-right font-mono">
                  AED {v.outputVatStandard.toLocaleString()}
                </td>
                <td className="px-2 py-1.5 text-right font-mono">
                  AED{" "}
                  {(
                    v.inputVatStandard + v.inputVatReverseCharge
                  ).toLocaleString()}
                </td>
                <td className="px-2 py-1.5 text-right font-mono font-bold">
                  AED {v.netVatPayable.toLocaleString()}
                </td>
                <td className="px-2 py-1.5">{v.filedDate || "—"}</td>
                <td className="px-2 py-1.5 font-mono text-[10px]">
                  {v.paymentRef || "—"}
                </td>
                <td className="px-2 py-1.5 text-center">
                  <StatusBadge status={v.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ===== WPS =====
function WpsTab({ runs }: any) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({
    payPeriod: new Date().toISOString().slice(0, 7),
    office: "dubai",
    totalEmployees: 0,
    totalAmountAED: 0,
    bankAccountId: "",
    status: "draft",
  });
  function saveWps() {
    if (
      !draft.payPeriod ||
      Number(draft.totalEmployees) <= 0 ||
      Number(draft.totalAmountAED) <= 0
    ) {
      toast.error("Pay period, employees, and amount are required");
      return;
    }
    wpsRunsStore.put({
      id: newId("wps"),
      reference: makeRef("WPS", runs.length),
      payPeriod: draft.payPeriod,
      office: draft.office,
      totalEmployees: Number(draft.totalEmployees),
      totalAmountAED: Number(draft.totalAmountAED),
      bankAccountId: draft.bankAccountId || "bank-enbd-aed",
      fileGeneratedAt:
        draft.status === "draft" ? undefined : new Date().toISOString(),
      status: draft.status,
    });
    setOpen(false);
    setDraft({
      payPeriod: new Date().toISOString().slice(0, 7),
      office: "dubai",
      totalEmployees: 0,
      totalAmountAED: 0,
      bankAccountId: "",
      status: "draft",
    });
    toast.success("WPS run generated");
  }
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">
          Wage Protection System (WPS) · {runs.length} runs
        </CardTitle>
        <Button size="sm" className="gap-1" onClick={() => setOpen(true)}>
          <Plus className="w-3 h-3" /> Generate run
        </Button>
      </CardHeader>
      <FinanceDialog
        open={open}
        title="Generate WPS run"
        onClose={() => setOpen(false)}
        onSave={saveWps}
      >
        <Field label="Pay period">
          <Input
            type="month"
            value={draft.payPeriod}
            onChange={e => setDraft({ ...draft, payPeriod: e.target.value })}
          />
        </Field>
        <Field label="Office">
          <OfficeSelect
            value={draft.office}
            onChange={v => setDraft({ ...draft, office: v })}
          />
        </Field>
        <Field label="Employees">
          <Input
            type="number"
            value={draft.totalEmployees}
            onChange={e =>
              setDraft({
                ...draft,
                totalEmployees: Number(e.target.value || 0),
              })
            }
          />
        </Field>
        <Field label="Amount AED">
          <Input
            type="number"
            value={draft.totalAmountAED}
            onChange={e =>
              setDraft({
                ...draft,
                totalAmountAED: Number(e.target.value || 0),
              })
            }
          />
        </Field>
        <Field label="Bank account ID">
          <Input
            value={draft.bankAccountId}
            onChange={e =>
              setDraft({ ...draft, bankAccountId: e.target.value })
            }
            placeholder="bank-enbd-aed"
          />
        </Field>
        <Field label="Status">
          <Select
            value={draft.status}
            onValueChange={v => setDraft({ ...draft, status: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="generated">Generated</SelectItem>
              <SelectItem value="submitted-to-bank">
                Submitted to bank
              </SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </FinanceDialog>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="text-left px-2 py-2">Reference</th>
              <th className="text-left px-2 py-2">Period</th>
              <th className="text-right px-2 py-2">Employees</th>
              <th className="text-right px-2 py-2">Amount AED</th>
              <th className="text-left px-2 py-2">Generated</th>
              <th className="text-center px-2 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r: any) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-2 py-1.5 font-mono">{r.reference}</td>
                <td className="px-2 py-1.5">{r.payPeriod}</td>
                <td className="px-2 py-1.5 text-right">{r.totalEmployees}</td>
                <td className="px-2 py-1.5 text-right font-mono">
                  {r.totalAmountAED.toLocaleString()}
                </td>
                <td className="px-2 py-1.5 text-[10px]">
                  {r.fileGeneratedAt
                    ? new Date(r.fileGeneratedAt).toLocaleString()
                    : "—"}
                </td>
                <td className="px-2 py-1.5 text-center">
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ===== Payroll =====
function PayrollTab({ runs }: any) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<any>({
    payPeriod: new Date().toISOString().slice(0, 7),
    office: "dubai",
    gross: 0,
    deductions: 0,
    net: 0,
    gratuity: 0,
    count: 0,
    currency: "AED",
    status: "draft",
  });

  const getNet = (r: any) => Number(r.totalNet ?? r.totals?.net ?? 0);
  const getGratuity = (r: any) => Number(r.totalGratuityAccrual ?? r.totals?.gratuity ?? 0);
  const getGross = (r: any) => Number(r.totalGross ?? r.totals?.gross ?? 0);
  const getDeductions = (r: any) => Number(r.totalDeductions ?? r.totals?.deductions ?? 0);
  const getCount = (r: any) => Number(r.totalEmployees ?? r.totals?.count ?? 0);
  const getPeriod = (r: any) => r.payPeriod ?? (r.periodYear && r.periodMonth ? `${r.periodYear}-${String(r.periodMonth).padStart(2, "0")}` : "—");

  const totalNetYTD = runs.reduce((s: number, r: any) => s + getNet(r), 0);
  const totalGratuityYTD = runs.reduce((s: number, r: any) => s + getGratuity(r), 0);

  function saveRun() {
    if (!draft.payPeriod || Number(draft.net) <= 0) {
      toast.error("Pay period and net salary are required");
      return;
    }
    const ref = makeRef("PAY", runs.length);
    payrollRunsStore.put({
      id: newId("pay"),
      reference: ref,
      payPeriod: draft.payPeriod,
      office: draft.office,
      currency: draft.currency || "AED",
      totalEmployees: Number(draft.count),
      totalGross: Number(draft.gross),
      totalDeductions: Number(draft.deductions),
      totalNet: Number(draft.net),
      totalGratuityAccrual: Number(draft.gratuity),
      bankAccountId: "",
      employees: [],
      status: draft.status,
      createdAt: new Date().toISOString(),
    });
    setOpen(false);
    toast.success("Payroll run saved");
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Net Salaries YTD</p>
          <p className="text-lg font-bold font-mono mt-1">AED {Math.round(totalNetYTD).toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">{runs.length} payroll run{runs.length !== 1 ? "s" : ""}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Gratuity Provision YTD</p>
          <p className="text-lg font-bold font-mono mt-1 text-amber-700">AED {Math.round(totalGratuityYTD).toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">End-of-service accrual</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Last Run</p>
          <p className="text-lg font-bold mt-1">{runs[runs.length - 1]?.payPeriod ?? "—"}</p>
          <p className="text-[10px] text-muted-foreground">{runs[runs.length - 1]?.status ?? ""}</p>
        </CardContent></Card>
      </div>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Payroll Runs · {runs.length}</CardTitle>
          <Button size="sm" className="gap-1" onClick={() => setOpen(true)}>
            <Plus className="w-3 h-3" /> New run
          </Button>
        </CardHeader>
        <FinanceDialog open={open} title="New payroll run" onClose={() => setOpen(false)} onSave={saveRun}>
          <Field label="Pay period">
            <Input type="month" value={draft.payPeriod} onChange={e => setDraft({ ...draft, payPeriod: e.target.value })} />
          </Field>
          <Field label="Office">
            <OfficeSelect value={draft.office} onChange={v => setDraft({ ...draft, office: v })} />
          </Field>
          <Field label="Employees">
            <Input type="number" value={draft.count} onChange={e => setDraft({ ...draft, count: e.target.value })} />
          </Field>
          <Field label="Gross salaries (AED)">
            <Input type="number" value={draft.gross} onChange={e => setDraft({ ...draft, gross: e.target.value, net: (Number(e.target.value) - Number(draft.deductions)).toString() })} />
          </Field>
          <Field label="Total deductions (AED)">
            <Input type="number" value={draft.deductions} onChange={e => setDraft({ ...draft, deductions: e.target.value, net: (Number(draft.gross) - Number(e.target.value)).toString() })} />
          </Field>
          <Field label="Net salaries (AED)">
            <Input type="number" value={draft.net} onChange={e => setDraft({ ...draft, net: e.target.value })} />
          </Field>
          <Field label="Gratuity provision (AED)">
            <Input type="number" value={draft.gratuity} onChange={e => setDraft({ ...draft, gratuity: e.target.value })} />
          </Field>
          <Field label="Status">
            <Select value={draft.status} onValueChange={v => setDraft({ ...draft, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="approved">Approved (posts to GL)</SelectItem>
                <SelectItem value="paid">Paid (WPS processed)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </FinanceDialog>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left px-2 py-2">Reference</th>
                <th className="text-left px-2 py-2">Period</th>
                <th className="text-left px-2 py-2">Office</th>
                <th className="text-right px-2 py-2">Employees</th>
                <th className="text-right px-2 py-2">Gross</th>
                <th className="text-right px-2 py-2">Deductions</th>
                <th className="text-right px-2 py-2">Net</th>
                <th className="text-right px-2 py-2">Gratuity</th>
                <th className="text-center px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 && (
                <tr><td colSpan={9} className="px-2 py-4 text-center text-muted-foreground">No payroll runs yet</td></tr>
              )}
              {runs.map((r: any) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-mono">{r.totals?.reference || "—"}</td>
                  <td className="px-2 py-1.5">{getPeriod(r)}</td>
                  <td className="px-2 py-1.5 capitalize">{r.office}</td>
                  <td className="px-2 py-1.5 text-right">{getCount(r)}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{getGross(r).toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-red-600">{getDeductions(r).toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-emerald-700">{getNet(r).toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-amber-700">{getGratuity(r).toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-center"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
            {runs.length > 0 && (
              <tfoot className="bg-slate-50 font-semibold">
                <tr>
                  <td colSpan={4} className="px-2 py-2 text-xs">Totals</td>
                  <td className="px-2 py-2 text-right font-mono text-xs">{Math.round(runs.reduce((s: number, r: any) => s + getGross(r), 0)).toLocaleString()}</td>
                  <td className="px-2 py-2 text-right font-mono text-xs text-red-600">{Math.round(runs.reduce((s: number, r: any) => s + getDeductions(r), 0)).toLocaleString()}</td>
                  <td className="px-2 py-2 text-right font-mono text-xs text-emerald-700">{Math.round(totalNetYTD).toLocaleString()}</td>
                  <td className="px-2 py-2 text-right font-mono text-xs text-amber-700">{Math.round(totalGratuityYTD).toLocaleString()}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">End-of-Service Gratuity — UAE Labour Law</CardTitle>
        </CardHeader>
        <CardContent className="p-3 text-xs text-muted-foreground space-y-1">
          <p>• <span className="font-medium text-foreground">First 5 years:</span> 21 working days basic salary per year of service</p>
          <p>• <span className="font-medium text-foreground">After 5 years:</span> 30 working days basic salary per year of service</p>
          <p>• <span className="font-medium text-foreground">Resignation (&lt;1 yr):</span> No entitlement</p>
          <p>• <span className="font-medium text-foreground">Resignation (1–3 yrs):</span> 1/3 of entitlement</p>
          <p>• <span className="font-medium text-foreground">Resignation (3–5 yrs):</span> 2/3 of entitlement</p>
          <p>• <span className="font-medium text-foreground">Resignation (&gt;5 yrs) or termination:</span> Full entitlement</p>
          <p className="mt-2 text-[10px]">GL: DR Gratuity Expense (5101010) / CR Employee End of Service Provision (2201010)</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Corporate Tax (UAE 9%) =====
function CorpTaxTab({ returns: ctReturns }: any) {
  const [open, setOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const [draft, setDraft] = useState<any>({
    taxYear: currentYear,
    periodStart: `${currentYear}-01-01`,
    periodEnd: `${currentYear}-12-31`,
    office: "dubai",
    accountingProfit: 0,
    nonDeductibleExpenses: 0,
    exemptIncome: 0,
    smallBusinessRelief: false,
    status: "draft",
  });

  function taxableIncome(d: any) {
    return Math.max(0, Number(d.accountingProfit) + Number(d.nonDeductibleExpenses) - Number(d.exemptIncome));
  }
  function ctPayable(d: any) {
    return d.smallBusinessRelief ? 0 : taxableIncome(d) * 0.09;
  }

  function saveReturn() {
    if (!draft.taxYear) {
      toast.error("Tax year is required");
      return;
    }
    corporateTaxReturnsStore.put({
      id: newId("ct"),
      taxYear: Number(draft.taxYear),
      periodStart: draft.periodStart,
      periodEnd: draft.periodEnd,
      office: draft.office,
      accountingProfit: Number(draft.accountingProfit),
      nonDeductibleExpenses: Number(draft.nonDeductibleExpenses),
      exemptIncome: Number(draft.exemptIncome),
      taxableIncome: taxableIncome(draft),
      smallBusinessRelief: Boolean(draft.smallBusinessRelief),
      taxRate: draft.smallBusinessRelief ? 0 : 0.09,
      ctPayable: ctPayable(draft),
      quarterlyProvisions: [],
      status: draft.status,
      createdAt: new Date().toISOString(),
    });
    setOpen(false);
    toast.success("CT return saved");
  }

  const totalCtPayable = ctReturns.reduce((s: number, r: any) => s + Number(r.ctPayable || 0), 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Corporate Tax Rate</p>
          <p className="text-2xl font-bold mt-1">9%</p>
          <p className="text-[10px] text-muted-foreground">UAE Federal CT — effective Jan 2023</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Small Business Relief</p>
          <p className="text-lg font-bold mt-1 text-emerald-700">0%</p>
          <p className="text-[10px] text-muted-foreground">Revenue &lt; AED 3M (elect annually)</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total CT Payable</p>
          <p className="text-lg font-bold font-mono mt-1">{fmt(totalCtPayable)}</p>
          <p className="text-[10px] text-muted-foreground">{ctReturns.length} return{ctReturns.length !== 1 ? "s" : ""}</p>
        </CardContent></Card>
      </div>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Corporate Tax Returns · UAE 9%</CardTitle>
          <Button size="sm" className="gap-1" onClick={() => setOpen(true)}>
            <Plus className="w-3 h-3" /> New CT return
          </Button>
        </CardHeader>
        <FinanceDialog open={open} title="New corporate tax return" onClose={() => setOpen(false)} onSave={saveReturn}>
          <Field label="Tax year">
            <Input type="number" value={draft.taxYear} onChange={e => setDraft({ ...draft, taxYear: e.target.value, periodStart: `${e.target.value}-01-01`, periodEnd: `${e.target.value}-12-31` })} />
          </Field>
          <Field label="Office">
            <OfficeSelect value={draft.office} onChange={v => setDraft({ ...draft, office: v })} />
          </Field>
          <Field label="Accounting profit (AED)">
            <Input type="number" value={draft.accountingProfit} onChange={e => setDraft({ ...draft, accountingProfit: e.target.value })} />
          </Field>
          <Field label="Add: non-deductible expenses">
            <Input type="number" value={draft.nonDeductibleExpenses} onChange={e => setDraft({ ...draft, nonDeductibleExpenses: e.target.value })} placeholder="Fines, excess entertainment…" />
          </Field>
          <Field label="Less: exempt income">
            <Input type="number" value={draft.exemptIncome} onChange={e => setDraft({ ...draft, exemptIncome: e.target.value })} placeholder="Qualifying dividends…" />
          </Field>
          <Field label="Taxable income (computed)">
            <Input readOnly value={taxableIncome(draft).toLocaleString()} className="bg-muted" />
          </Field>
          <Field label="CT payable @ 9% (computed)">
            <Input readOnly value={ctPayable(draft).toLocaleString()} className="bg-muted font-mono" />
          </Field>
          <Field label="Small Business Relief?">
            <Select value={draft.smallBusinessRelief ? "yes" : "no"} onValueChange={v => setDraft({ ...draft, smallBusinessRelief: v === "yes" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No — standard 9% rate</SelectItem>
                <SelectItem value="yes">Yes — revenue &lt; AED 3M (0%)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={draft.status} onValueChange={v => setDraft({ ...draft, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="filed">Filed with FTA</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </FinanceDialog>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left px-2 py-2">Tax Year</th>
                <th className="text-left px-2 py-2">Period</th>
                <th className="text-right px-2 py-2">Accounting Profit</th>
                <th className="text-right px-2 py-2">Taxable Income</th>
                <th className="text-right px-2 py-2">Rate</th>
                <th className="text-right px-2 py-2">CT Payable</th>
                <th className="text-center px-2 py-2">SBR</th>
                <th className="text-center px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {ctReturns.length === 0 && (
                <tr><td colSpan={8} className="px-2 py-4 text-center text-muted-foreground">No CT returns filed. UAE 9% CT effective from financial years starting on or after 1 Jun 2023.</td></tr>
              )}
              {ctReturns.map((r: any) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-semibold">{r.taxYear}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{r.periodStart} → {r.periodEnd}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{Number(r.accountingProfit).toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{Number(r.taxableIncome).toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-right">{r.smallBusinessRelief ? "0%" : "9%"}</td>
                  <td className="px-2 py-1.5 text-right font-mono font-semibold">{Number(r.ctPayable).toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-center">{r.smallBusinessRelief ? <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Yes</Badge> : "—"}</td>
                  <td className="px-2 py-1.5 text-center"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">UAE Corporate Tax — Key Rules for Engineering Consultancies</CardTitle>
        </CardHeader>
        <CardContent className="p-3 text-xs space-y-1 text-muted-foreground">
          <p>• <span className="font-medium text-foreground">Effective date:</span> Financial years beginning on or after 1 June 2023</p>
          <p>• <span className="font-medium text-foreground">Standard rate:</span> 9% on taxable income above AED 375,000</p>
          <p>• <span className="font-medium text-foreground">Zero band:</span> 0% on first AED 375,000 of taxable income</p>
          <p>• <span className="font-medium text-foreground">Small Business Relief:</span> 0% if total revenue ≤ AED 3M (must elect annually)</p>
          <p>• <span className="font-medium text-foreground">Non-deductible:</span> Fines, penalties, bribes, entertainment &gt;50% threshold</p>
          <p>• <span className="font-medium text-foreground">Exempt income:</span> Qualifying dividends, capital gains from subsidiaries</p>
          <p>• <span className="font-medium text-foreground">Registration:</span> All companies must register with FTA regardless of CT liability</p>
          <p>• <span className="font-medium text-foreground">Filing deadline:</span> 9 months after financial year end</p>
          <p className="mt-2 text-[10px]">GL: DR CT Expense (5104001) / CR CT Payable (2301001) when provision posted</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Budget =====
function BudgetTab({ budgets, journals, accounts }: any) {
  const budget = budgets[0];
  if (!budget)
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          No budget configured.
        </CardContent>
      </Card>
    );
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          Budget {budget.year} - {budget.office.toUpperCase()} (
          {budget.currency})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="text-left px-2 py-2">Account</th>
              <th className="text-right px-2 py-2">Budget</th>
              <th className="text-right px-2 py-2">Actual YTD</th>
              <th className="text-right px-2 py-2">Variance</th>
              <th className="text-right px-2 py-2">%</th>
            </tr>
          </thead>
          <tbody>
            {budget.lines.map((l: any) => {
              const acct = accounts.find((a: any) => a.code === l.accountCode);
              const actual = journals
                .filter((j: any) => j.status === "posted")
                .reduce(
                  (s: number, j: any) =>
                    s +
                    j.lines
                      .filter((jl: any) => jl.accountCode === l.accountCode)
                      .reduce(
                        (s2: number, jl: any) =>
                          s2 +
                          (acct?.type === "income"
                            ? jl.credit - jl.debit
                            : jl.debit - jl.credit),
                        0
                      ),
                  0
                );
              const variance = l.annualTotal - actual;
              const pct =
                l.annualTotal > 0 ? (actual / l.annualTotal) * 100 : 0;
              return (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="px-2 py-1.5">
                    <span className="font-mono text-[10px] mr-1">
                      {l.accountCode}
                    </span>
                    {acct?.name}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {l.annualTotal.toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {Math.round(actual).toLocaleString()}
                  </td>
                  <td
                    className={`px-2 py-1.5 text-right font-mono ${variance < 0 ? "text-red-600" : "text-emerald-700"}`}
                  >
                    {Math.round(variance).toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 text-right">{pct.toFixed(0)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ===== Reports =====
function ReportsTab({ accounts, journals, arInvoices, apBills }: any) {
  // Compute balances from posted journals
  const balanceByAccount: Record<string, number> = {};
  for (const j of journals.filter((j: any) => j.status === "posted")) {
    for (const l of j.lines) {
      balanceByAccount[l.accountCode] =
        (balanceByAccount[l.accountCode] || 0) + l.debit - l.credit;
    }
  }
  const totalRevenue = accounts
    .filter((a: any) => a.type === "income")
    .reduce((s: number, a: any) => s - (balanceByAccount[a.code] || 0), 0);
  const totalExpense = accounts
    .filter((a: any) => a.type === "expense")
    .reduce((s: number, a: any) => s + (balanceByAccount[a.code] || 0), 0);
  const netProfit = totalRevenue - totalExpense;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Profit & Loss Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-b">
                <td className="py-1.5">Total Revenue</td>
                <td className="text-right font-mono text-emerald-700">
                  AED {Math.round(totalRevenue).toLocaleString()}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5">Total Expense</td>
                <td className="text-right font-mono text-red-600">
                  AED {Math.round(totalExpense).toLocaleString()}
                </td>
              </tr>
              <tr className="border-b-2 font-bold">
                <td className="py-1.5">Net Profit / (Loss)</td>
                <td
                  className={`text-right font-mono ${netProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}
                >
                  AED {Math.round(netProfit).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building className="w-4 h-4" /> Balance Sheet Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-b">
                <td className="py-1.5">Total Assets</td>
                <td className="text-right font-mono">
                  AED{" "}
                  {Math.round(
                    accounts
                      .filter((a: any) => a.type === "asset")
                      .reduce(
                        (s: number, a: any) =>
                          s + (balanceByAccount[a.code] || 0),
                        0
                      )
                  ).toLocaleString()}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5">Total Liabilities</td>
                <td className="text-right font-mono">
                  AED{" "}
                  {Math.round(
                    -accounts
                      .filter((a: any) => a.type === "liability")
                      .reduce(
                        (s: number, a: any) =>
                          s + (balanceByAccount[a.code] || 0),
                        0
                      )
                  ).toLocaleString()}
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5">Equity</td>
                <td className="text-right font-mono">
                  AED{" "}
                  {Math.round(
                    -accounts
                      .filter((a: any) => a.type === "equity")
                      .reduce(
                        (s: number, a: any) =>
                          s + (balanceByAccount[a.code] || 0),
                        0
                      )
                  ).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">AR Aging</CardTitle>
        </CardHeader>
        <CardContent>
          <ArAgingMini invoices={arInvoices} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">AP Aging</CardTitle>
        </CardHeader>
        <CardContent>
          <ApAgingMini bills={apBills} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Trial Balance (top 20)</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-2 py-1.5">Code</th>
                <th className="text-left px-2 py-1.5">Account</th>
                <th className="text-right px-2 py-1.5">Debit</th>
                <th className="text-right px-2 py-1.5">Credit</th>
              </tr>
            </thead>
            <tbody>
              {accounts.slice(0, 20).map((a: any) => {
                const bal = balanceByAccount[a.code] || 0;
                return (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="px-2 py-1.5 font-mono">{a.code}</td>
                    <td className="px-2 py-1.5">{a.name}</td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      {bal > 0 ? bal.toLocaleString() : ""}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      {bal < 0 ? Math.abs(bal).toLocaleString() : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Status Badge =====
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700",
    cleared: "bg-emerald-100 text-emerald-700",
    active: "bg-emerald-100 text-emerald-700",
    processed: "bg-emerald-100 text-emerald-700",
    approved: "bg-emerald-100 text-emerald-700",
    sent: "bg-blue-100 text-blue-700",
    received: "bg-blue-100 text-blue-700",
    submitted: "bg-blue-100 text-blue-700",
    issued: "bg-blue-100 text-blue-700",
    "under-review": "bg-blue-100 text-blue-700",
    draft: "bg-slate-100 text-slate-700",
    pending: "bg-slate-100 text-slate-700",
    drawn: "bg-slate-100 text-slate-700",
    overdue: "bg-red-100 text-red-700",
    rejected: "bg-red-100 text-red-700",
    bounced: "bg-red-100 text-red-700",
    cancelled: "bg-red-100 text-red-700",
    "claim-pending": "bg-amber-100 text-amber-700",
    "partially-paid": "bg-amber-100 text-amber-700",
    disputed: "bg-amber-100 text-amber-700",
    expired: "bg-red-100 text-red-700",
    "submitted-to-bank": "bg-blue-100 text-blue-700",
    presented: "bg-blue-100 text-blue-700",
    filed: "bg-emerald-100 text-emerald-700",
    deposited: "bg-blue-100 text-blue-700",
  };
  return (
    <Badge
      className={`text-[10px] capitalize ${map[status] || "bg-slate-100 text-slate-700"}`}
    >
      {status}
    </Badge>
  );
}

// ===== Cash Flow Tab =========================================================
function CashFlowTab({
  banks,
  bankTxs,
  arReceipts,
  supplierPayments,
  payrollRuns,
  wpsRuns,
  arInvoices,
  apBills,
  customers,
  suppliers,
  pettyCash,
}: {
  banks: any[];
  bankTxs: any[];
  arReceipts: any[];
  supplierPayments: any[];
  payrollRuns: any[];
  wpsRuns: any[];
  arInvoices: any[];
  apBills: any[];
  customers: any[];
  suppliers: any[];
  pettyCash: number;
}) {
  const [period, setPeriod] = useState<"mtd" | "3m" | "6m" | "ytd" | "all">("mtd");

  const periodStart = useMemo(() => {
    const now = new Date();
    if (period === "mtd") return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    if (period === "3m") { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0, 10); }
    if (period === "6m") { const d = new Date(now); d.setMonth(d.getMonth() - 6); return d.toISOString().slice(0, 10); }
    if (period === "ytd") return `${now.getFullYear()}-01-01`;
    return "2000-01-01";
  }, [period]);

  const inPeriod = (date: string) => date >= periodStart;

  const custMap = useMemo(() => new Map(customers.map((c: any) => [c.id, c.name])), [customers]);
  const suppMap = useMemo(() => new Map(suppliers.map((s: any) => [s.id, s.name || s.legalName || "Supplier"])), [suppliers]);
  const invMap = useMemo(() => new Map(arInvoices.map((i: any) => [i.id, i])), [arInvoices]);

  // Opening balance = sum of bank accounts opening balances + txs before period
  const openingBankBalance = useMemo(() => {
    const bkIds = new Set(banks.map((b: any) => b.id));
    const base = banks.reduce((s: number, b: any) => s + Number(b.openingBalance || 0), 0);
    const txBefore = bankTxs
      .filter((t: any) => bkIds.has(t.bankAccountId) && t.date < periodStart)
      .reduce((s: number, t: any) => s + (Number(t.debit || 0) - Number(t.credit || 0)), 0);
    return base + txBefore;
  }, [banks, bankTxs, periodStart]);

  // Collections in period
  const periodReceipts = useMemo(() => arReceipts.filter((r: any) => inPeriod(r.date)), [arReceipts, periodStart]);
  const totalCollections = periodReceipts.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

  // Salary payments in period
  const periodPayroll = useMemo(() =>
    [...payrollRuns, ...wpsRuns].filter((r: any) => {
      const d = r.periodEnd || r.paymentDate || r.createdAt || "";
      return inPeriod(typeof d === "string" ? d.slice(0, 10) : "");
    }), [payrollRuns, wpsRuns, periodStart]);
  const totalSalaries = periodPayroll.reduce((s: number, r: any) =>
    s + Number(r.totalNet ?? r.totals?.net ?? r.netSalary ?? 0), 0);

  // Supplier payments in period
  const periodSupplierPay = useMemo(() =>
    supplierPayments.filter((p: any) => inPeriod(p.date)), [supplierPayments, periodStart]);
  const totalSupplierPayments = periodSupplierPay.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

  // Closing balance
  const closingBalance = openingBankBalance + totalCollections - totalSalaries - totalSupplierPayments;

  // Client collection detail
  const collectionByClient = useMemo(() => {
    const map = new Map<string, { name: string; collected: number; outstanding: number; receipts: any[] }>();
    for (const r of periodReceipts) {
      const cid = r.customerId;
      if (!map.has(cid)) map.set(cid, { name: custMap.get(cid) || cid, collected: 0, outstanding: 0, receipts: [] });
      map.get(cid)!.collected += Number(r.amount || 0);
      map.get(cid)!.receipts.push(r);
    }
    for (const inv of arInvoices) {
      if (inv.status === "paid" || inv.status === "cancelled") continue;
      const cid = inv.customerId;
      if (!map.has(cid)) map.set(cid, { name: custMap.get(cid) || cid, collected: 0, outstanding: 0, receipts: [] });
      map.get(cid)!.outstanding += Number(inv.balance || 0);
    }
    return [...map.values()].sort((a, b) => b.collected - a.collected);
  }, [periodReceipts, arInvoices, custMap]);

  // AP upcoming (next 30 days, unpaid)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 30);
  const upcomingAP = apBills.filter((b: any) =>
    b.status !== "paid" && b.status !== "rejected" && b.dueDate && new Date(b.dueDate) <= cutoff
  );

  const pfmt = (n: number) =>
    `AED ${Math.round(n).toLocaleString()}`;

  const flowRows = [
    { label: "Opening Bank Balance", amount: openingBankBalance, type: "balance" as const },
    { label: `+ Client Receipts (${periodReceipts.length})`, amount: totalCollections, type: "in" as const },
    { label: `– Salary / WPS Payments (${periodPayroll.length} runs)`, amount: -totalSalaries, type: "out" as const },
    { label: `– Supplier Payments (${periodSupplierPay.length})`, amount: -totalSupplierPayments, type: "out" as const },
    { label: "= Closing Bank Balance", amount: closingBalance, type: "total" as const },
    { label: "+ Petty Cash", amount: pettyCash, type: "in" as const },
    { label: "= Available Cash Position", amount: closingBalance + pettyCash, type: "total" as const },
  ];

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cash Flow Statement</h2>
        <div className="flex gap-1">
          {(["mtd", "3m", "6m", "ytd", "all"] as const).map(p => (
            <Button
              key={p}
              size="sm"
              variant={period === p ? "default" : "outline"}
              onClick={() => setPeriod(p)}
              className="h-7 px-2.5 text-xs"
            >
              {p === "mtd" ? "MTD" : p === "3m" ? "3 Months" : p === "6m" ? "6 Months" : p === "ytd" ? "YTD" : "All Time"}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Cash Position waterfall */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cash Position ({period.toUpperCase()})</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody>
                {flowRows.map((row, i) => (
                  <tr
                    key={i}
                    className={
                      row.type === "total"
                        ? "border-t-2 border-slate-300 font-bold bg-slate-50/60"
                        : row.type === "balance"
                        ? "font-semibold border-b border-slate-200"
                        : ""
                    }
                  >
                    <td className="py-2 pr-4 text-slate-700">{row.label}</td>
                    <td className={`text-right font-mono whitespace-nowrap ${
                      row.type === "total"
                        ? row.amount >= 0 ? "text-emerald-700" : "text-red-700"
                        : row.type === "in"
                        ? "text-emerald-600"
                        : row.type === "out"
                        ? "text-red-600"
                        : ""
                    }`}>
                      {row.type === "out"
                        ? `(${pfmt(Math.abs(row.amount))})`
                        : pfmt(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Upcoming outflows */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Upcoming Outflows (Next 30 Days)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingAP.length === 0 && (
              <p className="text-xs text-muted-foreground">No AP bills due in the next 30 days</p>
            )}
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {upcomingAP.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between text-xs border-b pb-1 last:border-0">
                  <div>
                    <span className="font-medium">{suppMap.get(b.supplierId) || "Supplier"}</span>
                    <span className="text-muted-foreground ml-2">{b.number}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-red-700">({pfmt(Number(b.balance || 0))})</div>
                    <div className="text-muted-foreground">Due {b.dueDate}</div>
                  </div>
                </div>
              ))}
            </div>
            {upcomingAP.length > 0 && (
              <div className="flex justify-between font-semibold text-sm border-t pt-2">
                <span>Total Due</span>
                <span className="font-mono text-red-700">
                  ({pfmt(upcomingAP.reduce((s: number, b: any) => s + Number(b.balance || 0), 0))})
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Client collections detail */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Client Collections & Outstanding</CardTitle>
        </CardHeader>
        <CardContent>
          {collectionByClient.length === 0 ? (
            <p className="text-xs text-muted-foreground">No client collections in period</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">Client</th>
                    <th className="pb-2 font-medium text-right">Receipts ({period.toUpperCase()})</th>
                    <th className="pb-2 font-medium text-right">Outstanding AR</th>
                    <th className="pb-2 font-medium text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {collectionByClient.map((c, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 font-medium">{c.name}</td>
                      <td className="py-2 text-right font-mono text-emerald-700">{pfmt(c.collected)}</td>
                      <td className="py-2 text-right font-mono text-red-700">{c.outstanding > 0 ? `(${pfmt(c.outstanding)})` : "—"}</td>
                      <td className={`py-2 text-right font-mono font-semibold ${c.collected - c.outstanding >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {pfmt(c.collected - c.outstanding)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-300 font-bold bg-slate-50/40">
                    <td className="py-2">Total</td>
                    <td className="py-2 text-right font-mono text-emerald-700">{pfmt(totalCollections)}</td>
                    <td className="py-2 text-right font-mono text-red-700">
                      {collectionByClient.reduce((s, c) => s + c.outstanding, 0) > 0
                        ? `(${pfmt(collectionByClient.reduce((s, c) => s + c.outstanding, 0))})`
                        : "—"}
                    </td>
                    <td className="py-2 text-right font-mono text-emerald-700">
                      {pfmt(totalCollections - collectionByClient.reduce((s, c) => s + c.outstanding, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent receipts */}
      {periodReceipts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Receipt Vouchers ({period.toUpperCase()})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Ref</th>
                    <th className="pb-2 font-medium">Client</th>
                    <th className="pb-2 font-medium">Method</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {periodReceipts.slice().sort((a: any, b: any) => b.date.localeCompare(a.date)).map((r: any) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-1.5">{r.date}</td>
                      <td className="py-1.5 font-mono">{r.reference}</td>
                      <td className="py-1.5">{custMap.get(r.customerId) || r.customerId}</td>
                      <td className="py-1.5 capitalize">{(r.paymentMethod || "").replace(/-/g, " ")}</td>
                      <td className="py-1.5">
                        <Badge className={r.advancePayment ? "bg-orange-100 text-orange-700 text-[10px]" : "bg-blue-100 text-blue-700 text-[10px]"}>
                          {r.advancePayment ? "Advance" : "AR Settlement"}
                        </Badge>
                      </td>
                      <td className="py-1.5 text-right font-mono text-emerald-700 font-semibold">
                        {r.currency} {Number(r.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
