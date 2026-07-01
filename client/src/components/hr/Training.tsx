import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { GraduationCap, Plus, Trash2, AlertTriangle } from "lucide-react";
import { employeesStore, trainingStore, auditStore } from "@/lib/stores";
import { useCollection, newId } from "@/lib/store";
import FileUpload from "@/components/files/FileUpload";
import { useCurrentActor } from "@/lib/auth/AuthContext";
import { expiryStatus, expiryColorClass } from "@/lib/hr/types";
import type { TrainingRecord } from "@/lib/hr/extra-types";

export default function Training() {
  const actor = useCurrentActor();
  const employees = useCollection(employeesStore);
  const records = useCollection(trainingStore);
  useCollection(auditStore);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<TrainingRecord>>({ category: "professional" });

  function add() {
    if (!draft.employeeId || !draft.name) { toast.error("Pick employee and certificate name"); return; }
    const t: TrainingRecord = { id: newId("tr"), employeeId: draft.employeeId, name: draft.name!, provider: draft.provider, category: (draft.category || "professional") as TrainingRecord["category"], issueDate: draft.issueDate, expiryDate: draft.expiryDate, costAED: draft.costAED, notes: draft.notes };
    trainingStore.put(t);
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor: actor, module: "training", action: "create", subject: `${t.name} · ${employees.find((e) => e.id === t.employeeId)?.firstName || ""}` });
    toast.success("Training record added");
    setOpen(false); setDraft({ category: "professional" });
  }

  const expiringCount = records.filter((r) => ["critical", "warning"].includes(expiryStatus(r.expiryDate))).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Training & Certifications {expiringCount > 0 && <Badge className="ml-2 bg-amber-100 text-amber-700 border-amber-200">{expiringCount} expiring</Badge>}</h3>
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" /> Add certificate</Button>
      </div>
      <Card>
        <CardContent className="p-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="text-left px-3 py-2">Employee</th><th className="text-left px-3 py-2">Certificate</th><th className="text-left px-3 py-2">Category</th><th className="text-left px-3 py-2">Issued</th><th className="text-left px-3 py-2">Expires</th><th className="text-right px-3 py-2">Cost AED</th><th className="text-left px-3 py-2">Files</th><th className="text-right px-3 py-2"></th></tr></thead>
            <tbody>
              {records.map((r) => {
                const emp = employees.find((e) => e.id === r.employeeId);
                const exp = expiryStatus(r.expiryDate);
                return (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{emp ? `${emp.firstName} ${emp.lastName}` : r.employeeId}</td>
                    <td className="px-3 py-2"><span className="font-medium">{r.name}</span>{r.provider && <span className="text-xs text-slate-500 ml-1">· {r.provider}</span>}</td>
                    <td className="px-3 py-2 text-xs capitalize">{r.category}</td>
                    <td className="px-3 py-2 text-xs">{r.issueDate || "—"}</td>
                    <td className="px-3 py-2 text-xs"><Badge className={`border ${expiryColorClass(exp)}`}>{r.expiryDate || "—"}</Badge></td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs">{r.costAED?.toLocaleString() || "—"}</td>
                    <td className="px-3 py-2"><FileUpload entityType="training" entityId={r.id} compact /></td>
                    <td className="px-3 py-2 text-right"><Button size="sm" variant="ghost" className="h-7" onClick={() => { trainingStore.remove(r.id); toast.success("Removed"); }}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add training / certificate</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label className="text-xs">Employee</Label>
              <Select value={draft.employeeId} onValueChange={(v) => setDraft({ ...draft, employeeId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pick employee" /></SelectTrigger>
                <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label className="text-xs">Certificate name</Label><Input value={draft.name || ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. PMP, OSHA 30hr, NEBOSH IGC" className="mt-1" /></div>
            <div><Label className="text-xs">Provider</Label><Input value={draft.provider || ""} onChange={(e) => setDraft({ ...draft, provider: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Category</Label>
              <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v as TrainingRecord["category"] })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="professional">Professional</SelectItem><SelectItem value="safety">Safety</SelectItem><SelectItem value="technical">Technical</SelectItem><SelectItem value="soft-skills">Soft skills</SelectItem><SelectItem value="compliance">Compliance</SelectItem></SelectContent></Select>
            </div>
            <div><Label className="text-xs">Issue date</Label><Input type="date" value={draft.issueDate || ""} onChange={(e) => setDraft({ ...draft, issueDate: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Expiry date</Label><Input type="date" value={draft.expiryDate || ""} onChange={(e) => setDraft({ ...draft, expiryDate: e.target.value })} className="mt-1" /></div>
            <div className="col-span-2"><Label className="text-xs">Cost (AED)</Label><Input type="number" value={draft.costAED || ""} onChange={(e) => setDraft({ ...draft, costAED: Number(e.target.value || 0) })} className="mt-1" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={add}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
