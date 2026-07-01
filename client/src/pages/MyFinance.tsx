/**
 * My Finance — employee self-service finance portal.
 *  - Submit expense claims and upload invoices (with receipt/invoice file).
 *  - Track approval status (pending / approved / rejected, with reason).
 *  - View the petty-cash float the employee holds (read-only).
 *  - Finance staff (finance:write) get an inline review panel to approve/reject.
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Wallet, ReceiptText, FileUp, Plus, Clock, CheckCircle2, XCircle, ChevronRight,
  Paperclip, Download, Banknote, ShieldCheck, Coins,
} from "lucide-react";
import { useCollection } from "@/lib/store";
import { useAuth } from "@/lib/auth/AuthContext";
import { apiFetch } from "@/lib/backend/api";
import { uploadFile, downloadFileById } from "@/lib/files/api";
import {
  staffFinanceStore, decideSubmission, fetchMyPettyCash,
  type StaffFinanceSubmission, type PettyCashFloatLite, type PettyCashVoucherLite,
} from "@/lib/finance/my-finance";

const today = () => new Date().toISOString().slice(0, 10);

export default function MyFinance() {
  const { currentUser, can } = useAuth();
  const isFinance = can("finance:write");
  const submissions = useCollection(staffFinanceStore);

  const [petty, setPetty] = useState<{ floats: PettyCashFloatLite[]; vouchers: PettyCashVoucherLite[] }>({ floats: [], vouchers: [] });
  useEffect(() => { fetchMyPettyCash().then(setPetty).catch(() => { /* no access / none */ }); }, []);

  const mine = useMemo(
    () => submissions.filter((s) => s.ownerUserId === currentUser?.id),
    [submissions, currentUser?.id],
  );
  // What the page lists as "my submissions": for a regular user that's everything
  // the server returned; for finance it's only the ones they personally raised.
  const myList = isFinance ? mine : submissions;
  const reviewList = useMemo(
    () => [...submissions].sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || "")),
    [submissions],
  );

  const counts = {
    pending: myList.filter((s) => s.status === "submitted").length,
    approved: myList.filter((s) => s.status === "approved").length,
    rejected: myList.filter((s) => s.status === "rejected").length,
  };
  const pettyBalance = petty.floats.reduce((a, f) => a + (f.currentBalance ?? 0), 0);
  const pettyCurrency = petty.floats[0]?.currency || "AED";

  // ---- submit dialog ----
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState<"expense" | "invoice">("expense");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [vendor, setVendor] = useState("");
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  function openSubmit(type: "expense" | "invoice") {
    setDocType(type);
    setTitle(""); setAmount(""); setCategory(""); setVendor(""); setDate(today()); setDescription(""); setFile(null);
    setOpen(true);
  }

  async function submit() {
    if (!title.trim()) { toast.error("Add a title / description"); return; }
    setBusy(true);
    try {
      // 1) Create the record (direct POST so we get the real id back).
      const saved = await apiFetch<StaffFinanceSubmission>("/my-finance", {
        method: "POST",
        body: {
          docType, title: title.trim(),
          amount: amount ? Number(amount) : undefined,
          currency: "AED",
          category: docType === "expense" ? (category || undefined) : undefined,
          vendor: docType === "invoice" ? (vendor || undefined) : undefined,
          date, description: description || undefined,
        },
      });

      // 2) Attach the receipt/invoice file to that record, then patch the link in.
      if (file) {
        const uploaded = await uploadFile(file, {
          entityType: "other",
          entityId: saved.id,
          category: "finance-claim",
          uploadedByDisplay: currentUser?.displayName,
        });
        await apiFetch(`/my-finance/${saved.id}`, { method: "PATCH", body: { fileId: uploaded.id, fileName: file.name } });
      }

      staffFinanceStore.refresh?.();
      toast.success(docType === "expense" ? "Expense claim submitted to finance" : "Invoice submitted to finance");
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Could not submit");
    } finally {
      setBusy(false);
    }
  }

  // ---- details dialog ----
  const [detail, setDetail] = useState<StaffFinanceSubmission | null>(null);
  // ---- reject dialog ----
  const [rejecting, setRejecting] = useState<StaffFinanceSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function approve(s: StaffFinanceSubmission) {
    try { await decideSubmission(s.id, "approve"); toast.success("Approved"); }
    catch (e: any) { toast.error(e?.message || "Failed"); }
  }
  async function doReject() {
    if (!rejecting) return;
    try {
      await decideSubmission(rejecting.id, "reject", rejectReason || undefined);
      toast.success("Rejected");
      setRejecting(null); setRejectReason("");
    } catch (e: any) { toast.error(e?.message || "Failed"); }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Wallet className="w-5 h-5" /> My Finance</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Submit expenses & invoices to finance, track approvals, and view your petty cash.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => openSubmit("expense")}><Plus className="w-3.5 h-3.5" /> Submit expense</Button>
          <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700" onClick={() => openSubmit("invoice")}><FileUp className="w-3.5 h-3.5" /> Upload invoice</Button>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={<Clock className="w-4 h-4 text-amber-600" />} label="Pending" value={String(counts.pending)} />
        <Kpi icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />} label="Approved" value={String(counts.approved)} />
        <Kpi icon={<XCircle className="w-4 h-4 text-red-600" />} label="Rejected" value={String(counts.rejected)} />
        <Kpi icon={<Coins className="w-4 h-4 text-blue-600" />} label="Petty cash balance" value={`${pettyCurrency} ${pettyBalance.toLocaleString()}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* My submissions */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ReceiptText className="w-4 h-4" /> My submissions <span className="text-xs font-normal text-slate-400">({myList.length})</span></CardTitle></CardHeader>
          <CardContent className="p-0">
            {myList.length === 0 ? (
              <p className="text-xs text-slate-500 px-4 pb-4">Nothing submitted yet. Use “Submit expense” or “Upload invoice” above.</p>
            ) : (
              <ul className="divide-y divide-slate-100 max-h-[26rem] overflow-auto">
                {[...myList].sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || "")).map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => setDetail(s)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.docType === "expense" ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600"}`}>
                        {s.docType === "expense" ? <ReceiptText className="w-4 h-4" /> : <FileUp className="w-4 h-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-sm font-medium block truncate">{s.title}</span>
                        <span className="text-xs text-slate-500 block truncate capitalize">{s.docType}{s.date ? ` · ${s.date}` : ""}{s.fileId ? " · 📎 file" : ""}</span>
                      </span>
                      {s.amount != null && <span className="text-sm tabular-nums text-slate-700 shrink-0">{s.currency || "AED"} {Number(s.amount).toLocaleString()}</span>}
                      <StatusBadge status={s.status} />
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* My petty cash */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Banknote className="w-4 h-4" /> My petty cash</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {petty.floats.length === 0 ? (
              <p className="text-xs text-slate-500">You are not assigned a petty-cash float. If you hold one, ask finance to set you as custodian.</p>
            ) : (
              petty.floats.map((f) => (
                <div key={f.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 uppercase">{f.office || "—"}</span>
                    {f.isActive === false && <Badge variant="outline" className="text-[10px]">inactive</Badge>}
                  </div>
                  <div className="text-2xl font-bold tabular-nums mt-1">{f.currency || "AED"} {(f.currentBalance ?? 0).toLocaleString()}</div>
                  <div className="text-xs text-slate-500">of {f.currency || "AED"} {(f.floatAmount ?? 0).toLocaleString()} float{f.custodianDisplay ? ` · ${f.custodianDisplay}` : ""}</div>
                </div>
              ))
            )}
            {petty.vouchers.length > 0 && (
              <div>
                <div className="text-xs font-medium text-slate-600 mb-1">Recent vouchers</div>
                <ul className="space-y-1">
                  {[...petty.vouchers].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 6).map((v) => (
                    <li key={v.id} className="flex items-center justify-between text-xs border-b border-slate-100 pb-1">
                      <span className="truncate">{v.payee || v.description || v.voucherNumber}</span>
                      <span className="tabular-nums text-slate-600 shrink-0 ml-2">{(v.amount ?? 0).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Finance review panel */}
      {isFinance && (
        <Card className="border-emerald-200">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Staff submissions — finance review <span className="text-xs font-normal text-slate-400">({reviewList.length})</span></CardTitle></CardHeader>
          <CardContent className="p-0 overflow-auto">
            {reviewList.length === 0 ? (
              <p className="text-xs text-slate-500 px-4 pb-4">No staff submissions yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr><th className="text-left px-3 py-2">Submitted by</th><th className="text-left px-3 py-2">Type</th><th className="text-left px-3 py-2">Title</th><th className="text-right px-3 py-2">Amount</th><th className="text-left px-3 py-2">File</th><th className="text-left px-3 py-2">Status</th><th className="text-right px-3 py-2">Action</th></tr>
                </thead>
                <tbody>
                  {reviewList.map((s) => (
                    <tr key={s.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-xs">{s.ownerEmail || s.ownerUserId}</td>
                      <td className="px-3 py-2 capitalize">{s.docType}</td>
                      <td className="px-3 py-2"><button className="hover:underline text-left" onClick={() => setDetail(s)}>{s.title}</button></td>
                      <td className="px-3 py-2 text-right tabular-nums">{s.amount != null ? `${s.currency || "AED"} ${Number(s.amount).toLocaleString()}` : "—"}</td>
                      <td className="px-3 py-2">{s.fileId ? <button className="text-blue-600 inline-flex items-center gap-1 text-xs" onClick={() => downloadFileById(s.fileId!, s.fileName || "file")}><Download className="w-3 h-3" /> open</button> : "—"}</td>
                      <td className="px-3 py-2"><StatusBadge status={s.status} /></td>
                      <td className="px-3 py-2 text-right">
                        {s.status === "submitted" ? (
                          <span className="inline-flex gap-1">
                            <Button size="sm" variant="outline" className="h-7 px-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50" onClick={() => approve(s)}>Approve</Button>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-red-700 border-red-300 hover:bg-red-50" onClick={() => { setRejecting(s); setRejectReason(""); }}>Reject</Button>
                          </span>
                        ) : <span className="text-xs text-slate-400">reviewed</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{docType === "expense" ? "Submit expense claim" : "Upload invoice"}</DialogTitle>
            <DialogDescription>This goes to the finance department for approval. You'll see the status here.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">{docType === "expense" ? "What is this expense for?" : "Invoice title / description"}</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder={docType === "expense" ? "e.g. Taxi to client site" : "e.g. Supplier invoice #1234"} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Amount (AED)</Label><Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" /></div>
              <div><Label className="text-xs">Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" /></div>
            </div>
            {docType === "expense" ? (
              <div><Label className="text-xs">Category</Label>
                <Select value={category} onValueChange={setCategory}><SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="travel">Travel</SelectItem>
                    <SelectItem value="meals">Meals & entertainment</SelectItem>
                    <SelectItem value="supplies">Office supplies</SelectItem>
                    <SelectItem value="fuel">Fuel</SelectItem>
                    <SelectItem value="accommodation">Accommodation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent></Select>
              </div>
            ) : (
              <div><Label className="text-xs">Vendor / supplier</Label><Input value={vendor} onChange={(e) => setVendor(e.target.value)} className="mt-1" placeholder="Supplier name" /></div>
            )}
            <div><Label className="text-xs">Notes</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" /></div>
            <div>
              <Label className="text-xs flex items-center gap-1"><Paperclip className="w-3 h-3" /> {docType === "expense" ? "Receipt" : "Invoice file"} (PDF or image)</Label>
              <Input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-1" />
              {file && <p className="text-[11px] text-slate-500 mt-1 truncate">{file.name}</p>}
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={busy} onClick={submit}>{busy ? "Submitting…" : "Submit to finance"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">{detail?.docType === "expense" ? <ReceiptText className="w-4 h-4 text-blue-600" /> : <FileUp className="w-4 h-4 text-violet-600" />}{detail?.title}</DialogTitle>
            <DialogDescription>Submission details and status.</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm">
              <DetailRow label="Status" value={<StatusBadge status={detail.status} />} />
              <DetailRow label="Type" value={<span className="capitalize">{detail.docType}</span>} />
              {detail.amount != null && <DetailRow label="Amount" value={`${detail.currency || "AED"} ${Number(detail.amount).toLocaleString()}`} />}
              {detail.date && <DetailRow label="Date" value={detail.date} />}
              {detail.category && <DetailRow label="Category" value={<span className="capitalize">{detail.category}</span>} />}
              {detail.vendor && <DetailRow label="Vendor" value={detail.vendor} />}
              {detail.description && <DetailRow label="Notes" value={detail.description} />}
              {detail.fileId && <DetailRow label="Attachment" value={<button className="text-blue-600 inline-flex items-center gap-1" onClick={() => downloadFileById(detail.fileId!, detail.fileName || "file")}><Download className="w-3.5 h-3.5" /> {detail.fileName || "download"}</button>} />}
              {detail.submittedAt && <DetailRow label="Submitted" value={new Date(detail.submittedAt).toLocaleString("en-GB")} />}
              {detail.status === "rejected" && detail.rejectReason && <DetailRow label="Reason" value={<span className="text-red-700">{detail.rejectReason}</span>} />}
              {detail.reviewedAt && <DetailRow label="Reviewed" value={`${new Date(detail.reviewedAt).toLocaleString("en-GB")}${detail.reviewedByEmail ? ` · ${detail.reviewedByEmail}` : ""}`} />}
            </div>
          )}
          <DialogFooter className="gap-2">
            {detail && !isFinance && detail.status === "submitted" && (
              <Button variant="outline" className="text-red-700 border-red-300 hover:bg-red-50" onClick={() => { staffFinanceStore.remove(detail.id); setDetail(null); toast.success("Withdrawn"); }}>Withdraw</Button>
            )}
            <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject reason dialog */}
      <Dialog open={!!rejecting} onOpenChange={(o) => { if (!o) setRejecting(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reject submission</DialogTitle><DialogDescription>The reason is shown to the employee.</DialogDescription></DialogHeader>
          <Textarea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection (optional)" />
          <DialogFooter><Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button><Button className="bg-red-600 hover:bg-red-700" onClick={doReject}>Reject</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card><CardContent className="p-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">{icon}</div>
        <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-base font-bold leading-tight">{value}</p></div>
      </div>
    </CardContent></Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    submitted: { cls: "border-amber-300 text-amber-700 bg-amber-50", icon: <Clock className="w-3 h-3" />, label: "pending" },
    approved: { cls: "border-emerald-300 text-emerald-700 bg-emerald-50", icon: <CheckCircle2 className="w-3 h-3" />, label: "approved" },
    rejected: { cls: "border-red-300 text-red-700 bg-red-50", icon: <XCircle className="w-3 h-3" />, label: "rejected" },
  };
  const m = map[status] || { cls: "border-slate-300 text-slate-600 bg-slate-50", icon: null, label: status };
  return <Badge variant="outline" className={`text-[10px] gap-1 capitalize shrink-0 ${m.cls}`}>{m.icon}{m.label}</Badge>;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-0">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-right font-medium text-slate-800">{value}</span>
    </div>
  );
}
