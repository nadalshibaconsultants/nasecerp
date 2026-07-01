/**
 * New Journal Entry — full double-entry voucher form.
 * Writes to journalEntriesStore. The Financial Statements (P&L, BS, CF,
 * Trial Balance, Project P&L) re-derive automatically because they read
 * the store via useCollection.
 */
import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, AlertTriangle, CheckCircle2, Save, FileCheck, Lock, Ban } from "lucide-react";
import { toast } from "sonner";
import {
  glAccountsStore, journalEntriesStore, projectsStore, auditStore,
} from "@/lib/stores";
import { useCollection, newId } from "@/lib/store";
import { useAuth } from "@/lib/auth/AuthContext";
import type { JournalEntry, JournalLine } from "@/lib/finance/types";

type Props = { open: boolean; onClose: () => void; existing?: JournalEntry };

type DraftLine = {
  id: string;
  accountCode: string;
  description: string;
  projectId: string;
  debit: number;
  credit: number;
};

function emptyLine(): DraftLine {
  return { id: newId("dl"), accountCode: "", description: "", projectId: "", debit: 0, credit: 0 };
}

function nextRef(existingCount: number): string {
  const y = new Date().getFullYear();
  return `JE-${y}-${String(existingCount + 1).padStart(5, "0")}`;
}

export default function NewJournalDialog({ open, onClose, existing }: Props) {
  const { currentUser } = useAuth();
  const accounts = useCollection(glAccountsStore);
  const projects = useCollection(projectsStore);
  const journals = useCollection(journalEntriesStore);

  // System-generated journals (payroll, depreciation, AR/AP, etc.) are read-only.
  // Posted manual journals can still be voided or reversed, but not silently edited.
  const isSystemGenerated = !!existing && existing.source !== "manual";
  const isPosted = !!existing && existing.status === "posted";
  const readOnly = isSystemGenerated;

  const [date, setDate] = useState(existing?.date || new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState(existing?.reference || nextRef(journals.length));
  const [office, setOffice] = useState<JournalEntry["office"]>(existing?.office || "dubai");
  const [currency, setCurrency] = useState<JournalEntry["currency"]>(existing?.currency || "AED");
  const [narration, setNarration] = useState(existing?.narration || "");
  const [lines, setLines] = useState<DraftLine[]>(() => {
    if (existing) return existing.lines.map((l) => ({
      id: l.id, accountCode: l.accountCode, description: l.description || "",
      projectId: l.projectId || "", debit: l.debit, credit: l.credit,
    }));
    return [emptyLine(), emptyLine()];
  });

  const totals = useMemo(() => {
    const debit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const credit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
    return { debit, credit, diff: debit - credit, balanced: Math.abs(debit - credit) < 0.005 && debit > 0 };
  }, [lines]);

  function setLine(idx: number, patch: Partial<DraftLine>) {
    setLines((arr) => arr.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }
  function addLine() { setLines((arr) => [...arr, emptyLine()]); }
  function removeLine(idx: number) {
    setLines((arr) => arr.length <= 2 ? arr : arr.filter((_, i) => i !== idx));
  }

  function save(status: JournalEntry["status"]) {
    if (readOnly) return toast.error("System-generated entries cannot be edited");
    if (!narration.trim()) return toast.error("Narration required");
    const validLines = lines.filter((l) => l.accountCode && (l.debit > 0 || l.credit > 0));
    if (validLines.length < 2) return toast.error("At least two lines with account and amount required");
    if (status === "posted" && !totals.balanced) return toast.error("Total debit must equal total credit before posting");

    const now = new Date().toISOString();
    const entry: JournalEntry = {
      id: existing?.id || newId("je"),
      reference, date, office, currency,
      source: "manual",
      narration,
      lines: validLines.map((l) => ({
        id: l.id,
        accountCode: l.accountCode,
        description: l.description || undefined,
        projectId: l.projectId || undefined,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      } as JournalLine)),
      status,
      postedAt: status === "posted" ? now : (existing?.postedAt),
      postedBy: status === "posted" ? (currentUser?.displayName || "Unknown") : (existing?.postedBy),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    journalEntriesStore.put(entry);
    auditStore.put({
      id: newId("au"), timestamp: now,
      actor: currentUser?.displayName || "System",
      module: "hr", action: existing ? "update" : (status === "posted" ? "approve" : "create"),
      subject: `${existing ? "Updated" : (status === "posted" ? "Posted" : "Saved draft")} journal ${reference}`,
      detail: `${narration} (Dr ${totals.debit.toFixed(2)} / Cr ${totals.credit.toFixed(2)})`,
    });
    toast.success(existing
      ? `Journal ${reference} updated - statements re-derived`
      : status === "posted" ? `Journal ${reference} posted - statements updated` : `Journal ${reference} saved as draft`);
    onClose();
  }

  function voidEntry() {
    if (!existing || readOnly) return;
    const ok = confirm(`Void journal ${existing.reference}?\n\nThis will reverse its effect on the Trial Balance, P&L, Balance Sheet and Cash Flow. The entry stays in the system for audit purposes.`);
    if (!ok) return;
    const now = new Date().toISOString();
    journalEntriesStore.put({ ...existing, status: "void", updatedAt: now });
    auditStore.put({
      id: newId("au"), timestamp: now,
      actor: currentUser?.displayName || "System",
      module: "hr", action: "delete",
      subject: `Voided journal ${existing.reference}`,
      detail: existing.narration,
    });
    toast.success(`Journal ${existing.reference} voided`);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="!max-w-[96vw] xl:!max-w-[1280px] w-full max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {existing ? (readOnly ? "View journal entry" : "Edit journal entry") : "New journal entry"}
            {existing && (
              <Badge variant="outline" className="font-mono text-[10px]">{existing.reference}</Badge>
            )}
            {readOnly && (
              <Badge className="bg-slate-200 text-slate-700 text-[10px] gap-1"><Lock className="w-3 h-3" /> System-generated · read only</Badge>
            )}
            {existing && isPosted && !readOnly && (
              <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Posted</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {readOnly
              ? `This journal was generated automatically from ${existing!.source.replace(/-/g, " ")} and cannot be edited directly. To change it, modify the underlying ${existing!.source.replace(/-/g, " ")} document.`
              : "Double-entry posting. Total Debit must equal Total Credit. Once posted, the entry flows into the Trial Balance, P&L, Balance Sheet and Cash Flow instantly."}
          </DialogDescription>
        </DialogHeader>

        {/* Header fields */}
        <div className="grid grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Reference</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} className="h-8 font-mono" disabled={readOnly} />
          </div>
          <div>
            <Label className="text-xs">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8" disabled={readOnly} />
          </div>
          <div>
            <Label className="text-xs">Office</Label>
            <Select value={office} onValueChange={(v) => setOffice(v as JournalEntry["office"])} disabled={readOnly}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dubai">Dubai</SelectItem>
                <SelectItem value="cairo">Cairo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Currency</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as JournalEntry["currency"])} disabled={readOnly}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AED">AED</SelectItem>
                <SelectItem value="EGP">EGP</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs">Narration *</Label>
          <Textarea value={narration} onChange={(e) => setNarration(e.target.value)} rows={2} placeholder="e.g. May 2026 office cleaning expense - paid via FAB cheque #100416" disabled={readOnly} />
        </div>

        {/* Line items table */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs">Journal lines</Label>
            {!readOnly && (
              <Button size="sm" variant="outline" onClick={addLine} className="h-7 gap-1"><Plus className="w-3 h-3" /> Add line</Button>
            )}
          </div>
          <table className="w-full text-xs border border-slate-200 rounded table-fixed">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-2 py-1.5 w-[240px]">Account</th>
                <th className="text-left px-2 py-1.5">Description</th>
                <th className="text-left px-2 py-1.5 w-[180px]">Project (optional)</th>
                <th className="text-right px-2 py-1.5 w-[150px]">Debit</th>
                <th className="text-right px-2 py-1.5 w-[150px]">Credit</th>
                <th className="w-[40px]"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="px-1 py-1">
                    <Select value={l.accountCode} onValueChange={(v) => setLine(idx, { accountCode: v })} disabled={readOnly}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pick account..." /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {accounts.filter((a) => a.isActive).map((a) => (
                          <SelectItem key={a.code} value={a.code} className="text-xs">
                            <span className="font-mono text-muted-foreground mr-1">{a.code}</span>{a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-1 py-1">
                    <Input value={l.description} onChange={(e) => setLine(idx, { description: e.target.value })} className="h-8 text-xs" placeholder="Line description" disabled={readOnly} />
                  </td>
                  <td className="px-1 py-1">
                    <Select value={l.projectId || "none"} onValueChange={(v) => setLine(idx, { projectId: v === "none" ? "" : v })} disabled={readOnly}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— None —</SelectItem>
                        {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-1 py-1">
                    <Input type="number" step="0.01" value={l.debit || ""} onChange={(e) => setLine(idx, { debit: Number(e.target.value) || 0, credit: 0 })} className="h-8 text-right font-mono text-xs" placeholder="0.00" disabled={readOnly} />
                  </td>
                  <td className="px-1 py-1">
                    <Input type="number" step="0.01" value={l.credit || ""} onChange={(e) => setLine(idx, { credit: Number(e.target.value) || 0, debit: 0 })} className="h-8 text-right font-mono text-xs" placeholder="0.00" disabled={readOnly} />
                  </td>
                  <td className="text-center">
                    {lines.length > 2 && !readOnly && (
                      <Button size="sm" variant="ghost" className="h-7 px-1 text-red-600" onClick={() => removeLine(idx)}><Trash2 className="w-3 h-3" /></Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-300">
              <tr className="font-bold">
                <td colSpan={3} className="px-2 py-2 text-right">TOTAL</td>
                <td className="px-2 py-2 text-right font-mono">{totals.debit.toFixed(2)}</td>
                <td className="px-2 py-2 text-right font-mono">{totals.credit.toFixed(2)}</td>
                <td></td>
              </tr>
              <tr>
                <td colSpan={6} className="px-2 py-2">
                  {totals.balanced ? (
                    <Badge className="bg-emerald-100 text-emerald-700 text-[10px]"><CheckCircle2 className="w-3 h-3 inline mr-1" />Balanced - Dr {totals.debit.toFixed(2)} = Cr {totals.credit.toFixed(2)}</Badge>
                  ) : totals.debit === 0 && totals.credit === 0 ? (
                    <Badge className="bg-slate-100 text-slate-600 text-[10px]">Enter debit and credit amounts</Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-700 text-[10px]"><AlertTriangle className="w-3 h-3 inline mr-1" />Out of balance by {Math.abs(totals.diff).toFixed(2)} - cannot post until balanced</Badge>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Help block — what happens when posted */}
        <div className="text-xs p-2 bg-blue-50 border border-blue-200 rounded">
          <strong>When you Post this entry, the following will update instantly:</strong>
          <ul className="list-disc ml-4 mt-1 space-y-0.5">
            <li><strong>Trial Balance</strong> — affected account balances change immediately</li>
            <li><strong>Profit &amp; Loss</strong> — if any line hits an income (4xxx) or expense (5xxx–7xxx) account</li>
            <li><strong>Balance Sheet</strong> — if any line hits an asset (1xxx), liability (2xxx) or equity (3xxx) account</li>
            <li><strong>Cash Flow Statement</strong> — if the entry touches cash or bank accounts (1010–1034)</li>
            <li><strong>Project P&amp;L</strong> — if a line is tagged with a project</li>
            <li><strong>Audit Log</strong> — full event captured with your name and timestamp</li>
          </ul>
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          {readOnly ? (
            <Button variant="outline" onClick={onClose}>Close</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              {existing && isPosted && (
                <Button variant="outline" onClick={voidEntry} className="gap-1 text-red-700 hover:text-red-800 hover:bg-red-50">
                  <Ban className="w-3.5 h-3.5" /> Void entry
                </Button>
              )}
              <Button variant="outline" onClick={() => save("draft")} className="gap-1"><Save className="w-3.5 h-3.5" /> {existing ? "Save changes (draft)" : "Save as draft"}</Button>
              <Button onClick={() => save("posted")} disabled={!totals.balanced} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                <FileCheck className="w-3.5 h-3.5" /> {existing && isPosted ? "Update posted entry" : "Post entry"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
