/**
 * Procurement — LPO (Local Purchase Orders), GRN (Goods Received Notes),
 * three-way matching with AP Bills.
 */
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ShoppingCart, Plus, GitCompareArrows, Trash2 } from "lucide-react";
import { lposStore, grnsStore, apBillsStore, suppliersStore } from "@/lib/stores";
import { newId, useCollection } from "@/lib/store";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiFetch } from "@/lib/backend/api";
import { toast } from "sonner";
import type { LPO, LPOLine } from "@/lib/procurement/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const today = () => new Date().toISOString().slice(0, 10);
const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

type DraftLine = {
  id: string;
  description: string;
  qty: string;
  unitOfMeasure: string;
  unitPrice: string;
  vatPct: string;
  glAccountCode: string;
};

type LPODraft = {
  reference: string;
  date: string;
  supplierId: string;
  office: "dubai" | "cairo";
  currency: LPO["currency"];
  deliveryDate: string;
  deliveryAddress: string;
  paymentTermsDays: string;
  notes: string;
  lines: DraftLine[];
};

const blankLine = (): DraftLine => ({
  id: newId("line"),
  description: "",
  qty: "1",
  unitOfMeasure: "EA",
  unitPrice: "",
  vatPct: "5",
  glAccountCode: "6115",
});

const newDraft = (supplierId = ""): LPODraft => ({
  reference: `LPO-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
  date: today(),
  supplierId,
  office: "dubai",
  currency: "AED",
  deliveryDate: "",
  deliveryAddress: "",
  paymentTermsDays: "30",
  notes: "",
  lines: [blankLine()],
});

export default function ProcurementModule() {
  const lpos = useCollection(lposStore);
  const grns = useCollection(grnsStore);
  const bills = useCollection(apBillsStore);
  const suppliers = useCollection(suppliersStore);
  const { can, currentUser } = useAuth();
  const [office, setOffice] = useState("all");
  const [newLpoOpen, setNewLpoOpen] = useState(false);
  const [savingLpo, setSavingLpo] = useState(false);
  const validSuppliers = useMemo(() => suppliers.filter((s) => s.active !== false && UUID_RE.test(s.id)), [suppliers]);
  const [draft, setDraft] = useState<LPODraft>(() => newDraft(validSuppliers[0]?.id ?? ""));

  useEffect(() => {
    if (!draft.supplierId && validSuppliers[0]) setDraft((d) => ({ ...d, supplierId: validSuppliers[0].id }));
  }, [draft.supplierId, validSuppliers]);

  const officeLpos = office === "all" ? lpos : lpos.filter((l) => l.office === office);

  const kpis = useMemo(() => {
    return {
      total: officeLpos.length,
      draft: officeLpos.filter((l) => l.status === "draft").length,
      pending: officeLpos.filter((l) => l.status === "submitted").length,
      issued: officeLpos.filter((l) => l.status === "issued" || l.status === "partially-received").length,
      received: officeLpos.filter((l) => l.status === "received").length,
      totalValue: officeLpos.reduce((s, l) => s + l.total, 0),
    };
  }, [officeLpos]);

  function supplierName(id: string) { return suppliers.find((s) => s.id === id)?.name || id; }

  const draftTotals = useMemo(() => {
    const lines = draft.lines.map((line): LPOLine => {
      const qty = Number(line.qty || 0);
      const unitPrice = Number(line.unitPrice || 0);
      const vatPct = Number(line.vatPct || 0);
      const amountExVat = money(qty * unitPrice);
      const vatAmount = money(amountExVat * (vatPct / 100));
      return {
        id: line.id,
        description: line.description.trim(),
        qty,
        unitOfMeasure: line.unitOfMeasure.trim() || "EA",
        unitPrice,
        vatPct,
        glAccountCode: line.glAccountCode.trim() || "6115",
        amountExVat,
        vatAmount,
        amountIncVat: money(amountExVat + vatAmount),
      };
    });
    const subtotal = money(lines.reduce((sum, line) => sum + line.amountExVat, 0));
    const vatTotal = money(lines.reduce((sum, line) => sum + line.vatAmount, 0));
    return { lines, subtotal, vatTotal, total: money(subtotal + vatTotal) };
  }, [draft.lines]);

  function updateLine(id: string, patch: Partial<DraftLine>) {
    setDraft((d) => ({ ...d, lines: d.lines.map((line) => line.id === id ? { ...line, ...patch } : line) }));
  }

  function resetDraft() {
    setDraft(newDraft(validSuppliers[0]?.id ?? ""));
  }

  async function saveLpo() {
    if (!can("finance:write")) {
      toast.error("You need Finance write access to create an LPO");
      return;
    }
    if (!UUID_RE.test(draft.supplierId)) {
      toast.error("Supplier master is still loading. Try again in a moment.");
      return;
    }
    if (!draft.reference.trim()) {
      toast.error("LPO reference is required");
      return;
    }
    const lines = draftTotals.lines.filter((line) => line.description && line.qty > 0 && line.unitPrice >= 0);
    if (lines.length === 0) {
      toast.error("Add at least one valid LPO line");
      return;
    }

    setSavingLpo(true);
    try {
      await apiFetch<LPO>("/procurement/lpos", {
        method: "POST",
        body: {
          reference: draft.reference.trim(),
          date: draft.date,
          supplierId: draft.supplierId,
          office: draft.office,
          currency: draft.currency,
          deliveryDate: draft.deliveryDate || undefined,
          deliveryAddress: draft.deliveryAddress.trim() || undefined,
          paymentTermsDays: Number(draft.paymentTermsDays || 0) || undefined,
          raisedByDisplay: currentUser?.displayName || "System",
          lines,
          status: "draft",
          linkedGrnIds: [],
          notes: draft.notes.trim() || undefined,
        },
      });
      lposStore.refresh?.();
      toast.success(`LPO ${draft.reference.trim()} created`);
      setNewLpoOpen(false);
      resetDraft();
    } catch (err: any) {
      toast.error(err?.message || "Could not create LPO");
    } finally {
      setSavingLpo(false);
    }
  }

  // 3-way matching audit: for each LPO with GRNs, check if a bill exists and amount matches
  const threeWay = useMemo(() => {
    return officeLpos.map((l) => {
      const grnsForLpo = grns.filter((g) => g.lpoId === l.id);
      const bill = bills.find((b) => b.id === l.linkedBillId);
      const qtyRec = l.lines.reduce((s, line) => s + (line.qtyReceived || 0), 0);
      const qtyOrd = l.lines.reduce((s, line) => s + line.qty, 0);
      const fullyReceived = qtyRec >= qtyOrd && qtyOrd > 0;
      const valueOk = bill ? Math.abs(bill.total - l.total) < 1 : false;
      let match: "matched" | "partial" | "no-grn" | "no-bill" | "mismatch" = "no-grn";
      if (grnsForLpo.length === 0) match = "no-grn";
      else if (!bill) match = "no-bill";
      else if (fullyReceived && valueOk) match = "matched";
      else if (!valueOk) match = "mismatch";
      else match = "partial";
      return { lpo: l, grns: grnsForLpo, bill, match, qtyRec, qtyOrd };
    });
  }, [officeLpos, grns, bills]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Procurement</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><ShoppingCart className="w-6 h-6 text-emerald-700" /> Procurement</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Local Purchase Orders · Goods Received Notes · Three-way matching with AP Bills
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={office} onValueChange={setOffice}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All offices</SelectItem>
              <SelectItem value="dubai">Dubai</SelectItem>
              <SelectItem value="cairo">Cairo</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="gap-1 border border-emerald-700 bg-emerald-700 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-800 hover:shadow-md"
            onClick={() => {
              if (!can("finance:write")) {
                toast.error("You need Finance write access to create an LPO");
                return;
              }
              setNewLpoOpen(true);
            }}
          >
            <Plus className="w-3.5 h-3.5" /> New LPO
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <Kpi label="Total LPOs" value={kpis.total} />
        <Kpi label="Draft" value={kpis.draft} />
        <Kpi label="Pending Approval" value={kpis.pending} tone={kpis.pending > 0 ? "amber" : "neutral"} />
        <Kpi label="Issued / Partial" value={kpis.issued} />
        <Kpi label="Received" value={kpis.received} />
        <Kpi label="Total Value" value={`AED ${Math.round(kpis.totalValue).toLocaleString()}`} text />
      </div>

      <Tabs defaultValue="lpos">
        <TabsList>
          <TabsTrigger value="lpos">LPOs ({officeLpos.length})</TabsTrigger>
          <TabsTrigger value="grns">GRNs ({grns.length})</TabsTrigger>
          <TabsTrigger value="3way">3-way Matching</TabsTrigger>
        </TabsList>

        <TabsContent value="lpos" className="mt-3">
          <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-700"><tr>
              <th className="text-left px-2 py-2">Reference</th><th className="text-left px-2 py-2">Date</th>
              <th className="text-left px-2 py-2">Supplier</th><th className="text-left px-2 py-2">Office</th>
              <th className="text-right px-2 py-2">Lines</th><th className="text-right px-2 py-2">Total</th>
              <th className="text-left px-2 py-2">Raised by</th>
              <th className="text-center px-2 py-2">Status</th>
            </tr></thead>
            <tbody>{officeLpos.map((l) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="px-2 py-1.5 font-mono">{l.reference}</td>
                <td className="px-2 py-1.5">{l.date}</td>
                <td className="px-2 py-1.5 font-medium">{supplierName(l.supplierId)}</td>
                <td className="px-2 py-1.5 capitalize">{l.office}</td>
                <td className="px-2 py-1.5 text-right">{l.lines.length}</td>
                <td className="px-2 py-1.5 text-right font-mono">{l.currency} {l.total.toLocaleString()}</td>
                <td className="px-2 py-1.5">{l.raisedByDisplay}</td>
                <td className="px-2 py-1.5 text-center"><StatusBadge status={l.status} /></td>
              </tr>))}
              {officeLpos.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground text-xs">No LPOs.</td></tr>}
            </tbody>
          </table></CardContent></Card>
        </TabsContent>

        <TabsContent value="grns" className="mt-3">
          <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-xs">
            <thead className="bg-slate-50"><tr>
              <th className="text-left px-2 py-2">Reference</th><th className="text-left px-2 py-2">Date</th>
              <th className="text-left px-2 py-2">LPO</th><th className="text-left px-2 py-2">Supplier</th>
              <th className="text-left px-2 py-2">Received by</th>
              <th className="text-right px-2 py-2">Lines</th>
              <th className="text-center px-2 py-2">Status</th>
            </tr></thead>
            <tbody>{grns.map((g) => { const lpo = lpos.find((l) => l.id === g.lpoId);
              return (<tr key={g.id} className="border-t border-slate-100">
                <td className="px-2 py-1.5 font-mono">{g.reference}</td>
                <td className="px-2 py-1.5">{g.date}</td>
                <td className="px-2 py-1.5 font-mono text-[10px]">{lpo?.reference}</td>
                <td className="px-2 py-1.5">{supplierName(g.supplierId)}</td>
                <td className="px-2 py-1.5">{g.receivedByDisplay}</td>
                <td className="px-2 py-1.5 text-right">{g.lines.length}</td>
                <td className="px-2 py-1.5 text-center"><StatusBadge status={g.status} /></td>
              </tr>);
            })}
              {grns.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground text-xs">No GRNs.</td></tr>}
            </tbody>
          </table></CardContent></Card>
        </TabsContent>

        <TabsContent value="3way" className="mt-3">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><GitCompareArrows className="w-4 h-4" /> Three-way Matching: LPO ↔ GRN ↔ Bill</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto"><table className="w-full text-xs">
            <thead className="bg-slate-50"><tr>
              <th className="text-left px-2 py-2">LPO</th>
              <th className="text-left px-2 py-2">Supplier</th>
              <th className="text-right px-2 py-2">LPO Qty</th>
              <th className="text-right px-2 py-2">GRN Qty</th>
              <th className="text-right px-2 py-2">LPO Value</th>
              <th className="text-right px-2 py-2">Bill Value</th>
              <th className="text-center px-2 py-2">3-way</th>
            </tr></thead>
            <tbody>{threeWay.map((tw) => (
              <tr key={tw.lpo.id} className="border-t border-slate-100">
                <td className="px-2 py-1.5 font-mono">{tw.lpo.reference}</td>
                <td className="px-2 py-1.5">{supplierName(tw.lpo.supplierId)}</td>
                <td className="px-2 py-1.5 text-right font-mono">{tw.qtyOrd}</td>
                <td className="px-2 py-1.5 text-right font-mono">{tw.qtyRec}</td>
                <td className="px-2 py-1.5 text-right font-mono">{tw.lpo.currency} {tw.lpo.total.toLocaleString()}</td>
                <td className="px-2 py-1.5 text-right font-mono">{tw.bill ? `${tw.bill.currency} ${tw.bill.total.toLocaleString()}` : "—"}</td>
                <td className="px-2 py-1.5 text-center">
                  <Badge className={`text-[10px] capitalize ${tw.match === "matched" ? "bg-emerald-100 text-emerald-700" : tw.match === "mismatch" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                    {tw.match.replace(/-/g, " ")}
                  </Badge>
                </td>
              </tr>))}
            </tbody>
          </table></CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={newLpoOpen} onOpenChange={setNewLpoOpen}>
        <DialogContent className="!max-w-[96vw] xl:!max-w-[1120px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Local Purchase Order</DialogTitle>
            <DialogDescription>Create an LPO against the supplier master for AP bill and GRN matching.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <Field label="Reference">
                <Input value={draft.reference} onChange={(e) => setDraft({ ...draft, reference: e.target.value })} />
              </Field>
              <Field label="Date">
                <Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
              </Field>
              <Field label="Office">
                <Select value={draft.office} onValueChange={(value: "dubai" | "cairo") => setDraft({ ...draft, office: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dubai">Dubai</SelectItem>
                    <SelectItem value="cairo">Cairo</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Currency">
                <Select value={draft.currency} onValueChange={(value: LPO["currency"]) => setDraft({ ...draft, currency: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AED">AED</SelectItem>
                    <SelectItem value="EGP">EGP</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <Field label="Supplier">
                <Select value={draft.supplierId} onValueChange={(value) => setDraft({ ...draft, supplierId: value })}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    {validSuppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Delivery Date">
                <Input type="date" value={draft.deliveryDate} onChange={(e) => setDraft({ ...draft, deliveryDate: e.target.value })} />
              </Field>
              <Field label="Payment Terms">
                <Input type="number" min={0} value={draft.paymentTermsDays} onChange={(e) => setDraft({ ...draft, paymentTermsDays: e.target.value })} />
              </Field>
              <Field label="Delivery Address">
                <Input value={draft.deliveryAddress} onChange={(e) => setDraft({ ...draft, deliveryAddress: e.target.value })} placeholder="Office / project / store" />
              </Field>
            </div>

            <div className="rounded-md border border-emerald-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-emerald-100 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold">LPO Lines</p>
                  <p className="text-[11px] text-muted-foreground">Amounts are calculated and saved to the backend.</p>
                </div>
                <Button variant="outline" size="sm" className="border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50" onClick={() => setDraft((d) => ({ ...d, lines: [...d.lines, blankLine()] }))}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Line
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-2 py-2 text-left">Description</th>
                      <th className="px-2 py-2 text-right">Qty</th>
                      <th className="px-2 py-2 text-left">UOM</th>
                      <th className="px-2 py-2 text-right">Unit Price</th>
                      <th className="px-2 py-2 text-right">VAT %</th>
                      <th className="px-2 py-2 text-left">GL</th>
                      <th className="px-2 py-2 text-right">Total</th>
                      <th className="px-2 py-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.lines.map((line, idx) => {
                      const total = draftTotals.lines[idx]?.amountIncVat ?? 0;
                      return (
                        <tr key={line.id} className="border-t border-slate-100 transition hover:bg-emerald-50/40">
                          <td className="px-2 py-2"><Input value={line.description} onChange={(e) => updateLine(line.id, { description: e.target.value })} placeholder="Item / service description" /></td>
                          <td className="px-2 py-2"><Input className="text-right" type="number" min={0} value={line.qty} onChange={(e) => updateLine(line.id, { qty: e.target.value })} /></td>
                          <td className="px-2 py-2"><Input value={line.unitOfMeasure} onChange={(e) => updateLine(line.id, { unitOfMeasure: e.target.value })} /></td>
                          <td className="px-2 py-2"><Input className="text-right" type="number" min={0} value={line.unitPrice} onChange={(e) => updateLine(line.id, { unitPrice: e.target.value })} /></td>
                          <td className="px-2 py-2"><Input className="text-right" type="number" min={0} value={line.vatPct} onChange={(e) => updateLine(line.id, { vatPct: e.target.value })} /></td>
                          <td className="px-2 py-2"><Input value={line.glAccountCode} onChange={(e) => updateLine(line.id, { glAccountCode: e.target.value })} /></td>
                          <td className="px-2 py-2 text-right font-mono">{draft.currency} {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          <td className="px-2 py-2 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                              disabled={draft.lines.length === 1}
                              onClick={() => setDraft((d) => ({ ...d, lines: d.lines.filter((x) => x.id !== line.id) }))}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_320px]">
              <Field label="Notes">
                <Textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Terms, delivery notes, internal comments" />
              </Field>
              <div className="rounded-md border border-emerald-200 bg-emerald-50/40 p-3">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-mono">{draft.currency} {draftTotals.subtotal.toLocaleString()}</span></div>
                <div className="mt-1 flex justify-between text-sm"><span>VAT</span><span className="font-mono">{draft.currency} {draftTotals.vatTotal.toLocaleString()}</span></div>
                <div className="mt-2 flex justify-between border-t border-emerald-200 pt-2 text-base font-bold"><span>Total</span><span className="font-mono">{draft.currency} {draftTotals.total.toLocaleString()}</span></div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setNewLpoOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-700 text-white hover:bg-emerald-800" onClick={saveLpo} disabled={savingLpo}>
              {savingLpo ? "Creating..." : "Create LPO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Kpi({ label, value, tone, text }: { label: string; value: number | string; tone?: "amber" | "neutral"; text?: boolean }) {
  const cls = tone === "amber" ? "border-amber-300 bg-amber-50/30" : "border-border";
  return <Card className={`border ${cls}`}><CardContent className="p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className={`font-bold font-mono ${text ? "text-sm" : "text-lg"}`}>{value}</p></CardContent></Card>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    submitted: "bg-blue-100 text-blue-700",
    approved: "bg-emerald-100 text-emerald-700",
    issued: "bg-blue-100 text-blue-700",
    "partially-received": "bg-amber-100 text-amber-700",
    received: "bg-emerald-100 text-emerald-700",
    invoiced: "bg-purple-100 text-purple-700",
    closed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
    confirmed: "bg-emerald-100 text-emerald-700",
    "matched-to-bill": "bg-emerald-100 text-emerald-700",
  };
  return <Badge className={`text-[10px] capitalize ${map[status] || "bg-slate-100 text-slate-700"}`}>{status.replace(/-/g, " ")}</Badge>;
}
