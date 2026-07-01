/**
 * Invoice Creation — VAT-compliant invoice generator
 * Features: Auto-populate from project milestones, VAT calculation, multi-currency
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  Calculator,
  Send,
  Download,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/backend/api";
import { arInvoicesStore } from "@/lib/stores";
import { newId } from "@/lib/store";

// Clients from CRM
const clients = [
  { id: "dh", name: "Dubai Holding", trn: "100123456789012", address: "P.O. Box 73137, Dubai, UAE" },
  { id: "emaar", name: "Emaar Properties", trn: "100987654321098", address: "P.O. Box 9440, Dubai, UAE" },
  { id: "nakheel", name: "Nakheel", trn: "100456789012345", address: "P.O. Box 17777, Dubai, UAE" },
];

// Projects with milestones
const projectMilestones = [
  { project: "Al Wasl Tower", milestone: "Design Development (20%)", amount: 240000, invoiced: false },
  { project: "Al Wasl Tower", milestone: "Authority Submission (15%)", amount: 180000, invoiced: false },
  { project: "Marina Heights", milestone: "Tender Documentation (15%)", amount: 127500, invoiced: false },
  { project: "Marina Heights", milestone: "Construction Supervision (20%)", amount: 170000, invoiced: true },
  { project: "Palm Villas Ph.2", milestone: "Concept Design (15%)", amount: 63000, invoiced: false },
];

interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export default function InvoiceCreate() {
  const [, navigate] = useLocation();
  const [client, setClient] = useState("");
  const [project, setProject] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState("AED");
  const [vatRate] = useState(5);
  const [includeVat, setIncludeVat] = useState(true);
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", quantity: 1, rate: 0, amount: 0 },
  ]);
  const [notes, setNotes] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("30");
  const [saving, setSaving] = useState(false);

  // Auto-generated invoice number
  const invoiceNumber = `INV-2026-${String(Math.floor(Math.random() * 900) + 100)}`;

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const vatAmount = includeVat ? subtotal * (vatRate / 100) : 0;
  const total = subtotal + vatAmount;

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    const item = { ...newItems[index] };
    if (field === "description") {
      item.description = value as string;
    } else {
      const numVal = typeof value === "string" ? parseFloat(value) || 0 : value;
      if (field === "quantity") item.quantity = numVal;
      if (field === "rate") item.rate = numVal;
      item.amount = item.quantity * item.rate;
    }
    newItems[index] = item;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, rate: 0, amount: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleAutoPopulate = () => {
    const uninvoiced = projectMilestones.filter(m => !m.invoiced && m.project === "Al Wasl Tower");
    if (uninvoiced.length > 0) {
      setItems(uninvoiced.map(m => ({
        description: `${m.project} — ${m.milestone}`,
        quantity: 1,
        rate: m.amount,
        amount: m.amount,
      })));
      toast.success("Auto-populated from project milestones", {
        description: `${uninvoiced.length} uninvoiced milestones added`,
      });
    }
  };

  const submit = async (status: "draft" | "sent") => {
    if (saving) return;
    const clientObj = clients.find((c) => c.id === client);
    if (!clientObj) { toast.error("Select a client"); return; }
    if (!dueDate) { toast.error("Due date is required"); return; }
    const lines = items.filter((it) => it.description.trim() && it.amount > 0);
    if (lines.length === 0) { toast.error("Add at least one line item with an amount"); return; }

    setSaving(true);
    try {
      // Resolve the customer to a real backend record (created by the seed).
      // Best-effort create as a fallback for users with finance:write.
      const existing = await apiFetch<any[]>("/finance/customers");
      let customer = existing.find((c) => c.name === clientObj.name);
      if (!customer) {
        customer = await apiFetch<any>("/finance/customers", {
          method: "POST",
          body: {
            code: (clientObj.name.replace(/[^A-Za-z0-9]+/g, "-").toUpperCase().slice(0, 16)) || "CUST",
            name: clientObj.name, trnNumber: clientObj.trn, address: clientObj.address, currency,
          },
        });
      }

      arInvoicesStore.put({
        id: newId("inv"),
        number: invoiceNumber,
        customerId: customer.id,
        invoiceDate,
        dueDate,
        office: "dubai",
        currency,
        lines: lines.map((it) => ({
          description: it.description,
          qty: it.quantity,
          unitPrice: it.rate,
          vatCode: includeVat ? "STD-5" : "OUT-OF-SCOPE",
          accountCode: "4000",
        })),
        status,
        notes,
      } as any);

      toast.success(status === "draft" ? "Invoice saved as draft" : "Invoice created successfully!", {
        description: `${invoiceNumber} · ${currency} ${total.toLocaleString()} · ${clientObj.name}`,
      });
      navigate("/finance");
    } catch {
      toast.error("Couldn't create the invoice");
    } finally {
      setSaving(false);
    }
  };
  const handleSubmit = () => submit("sent");

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/finance")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Finance
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Invoice</h1>
          <p className="text-muted-foreground text-sm mt-1">
            UAE VAT compliant · Auto-populate from project milestones
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleAutoPopulate}>
          <Sparkles className="w-4 h-4" />
          Auto-Populate from Milestones
        </Button>
      </div>

      {/* Invoice header info */}
      <Card className="border border-border">
        <CardContent className="p-6 space-y-5">
          {/* Invoice number & dates */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Invoice Number</Label>
              <div className="h-11 flex items-center px-3 rounded-md border border-border bg-secondary/30">
                <span className="text-sm font-mono font-bold">{invoiceNumber}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Invoice Date *</Label>
              <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Due Date *</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Payment Terms</Label>
              <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">Net 15</SelectItem>
                  <SelectItem value="30">Net 30</SelectItem>
                  <SelectItem value="45">Net 45</SelectItem>
                  <SelectItem value="60">Net 60</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Client & Project */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Bill To (Client) *</Label>
              <Select value={client} onValueChange={setClient}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {client && (
                <div className="text-xs text-muted-foreground mt-1">
                  <p>TRN: {clients.find(c => c.id === client)?.trn}</p>
                  <p>{clients.find(c => c.id === client)?.address}</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Project</Label>
              <Select value={project} onValueChange={setProject}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="al-wasl">Al Wasl Tower</SelectItem>
                  <SelectItem value="marina">Marina Heights Residences</SelectItem>
                  <SelectItem value="palm">Palm Villas Phase 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Currency */}
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-11 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AED">AED</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border self-end">
              <Checkbox checked={includeVat} onCheckedChange={(v) => setIncludeVat(v as boolean)} />
              <div>
                <p className="text-sm font-medium">Apply VAT (5%)</p>
                <p className="text-xs text-muted-foreground">UAE Federal Tax Authority</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Line Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Header */}
          <div className="grid grid-cols-12 gap-3 text-xs font-semibold text-muted-foreground uppercase px-1">
            <div className="col-span-5">Description</div>
            <div className="col-span-2 text-center">Qty</div>
            <div className="col-span-2 text-right">Rate ({currency})</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-1"></div>
          </div>

          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-5">
                <Input
                  value={item.description}
                  onChange={(e) => updateItem(i, "description", e.target.value)}
                  placeholder="Service description"
                  className="h-10"
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  value={item.quantity || ""}
                  onChange={(e) => updateItem(i, "quantity", e.target.value)}
                  className="h-10 text-center font-data"
                  min={1}
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  value={item.rate || ""}
                  onChange={(e) => updateItem(i, "rate", e.target.value)}
                  className="h-10 text-right font-data"
                />
              </div>
              <div className="col-span-2 text-right">
                <span className="text-sm font-data font-bold">
                  {item.amount.toLocaleString()}
                </span>
              </div>
              <div className="col-span-1 text-center">
                <Button variant="ghost" size="sm" onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button variant="ghost" size="sm" onClick={addItem} className="gap-2 text-muted-foreground">
            <Plus className="w-4 h-4" />
            Add Line Item
          </Button>

          {/* Totals */}
          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="text-sm font-data">{currency} {subtotal.toLocaleString()}</span>
            </div>
            {includeVat && (
              <div className="flex items-center justify-between px-1">
                <span className="text-sm text-muted-foreground">VAT ({vatRate}%)</span>
                <span className="text-sm font-data">{currency} {vatAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex items-center justify-between px-1 pt-2 border-t border-border">
              <span className="text-base font-bold">Total</span>
              <span className="text-xl font-mono font-bold">{currency} {total.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="border border-border">
        <CardContent className="p-4">
          <Label className="text-sm font-medium">Notes / Payment Instructions</Label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Bank details, payment instructions, or additional notes..."
            className="w-full h-20 mt-2 p-3 rounded-lg border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            defaultValue="Bank: Emirates NBD | Account: 1234567890 | IBAN: AE12 0260 0012 3456 7890 12 | SWIFT: EABORAEADXXX"
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="outline" onClick={() => navigate("/finance")}>Cancel</Button>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2" onClick={() => submit("draft")} disabled={saving}>
            <Download className="w-4 h-4" />
            Save as Draft
          </Button>
          <Button onClick={handleSubmit} className="gap-2" disabled={saving}>
            <Send className="w-4 h-4" />
            {saving ? "Saving…" : "Create & Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
