import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShieldAlert, Plus } from "lucide-react";
import { employeesStore, disciplinaryStore, auditStore } from "@/lib/stores";
import { useCollection, newId } from "@/lib/store";
import { useCurrentActor } from "@/lib/auth/AuthContext";
import type { DisciplinaryRecord } from "@/lib/hr/extra-types";

export default function Disciplinary() {
  const actor = useCurrentActor();
  const employees = useCollection(employeesStore);
  const records = useCollection(disciplinaryStore);
  useCollection(auditStore);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<DisciplinaryRecord>>({ type: "verbal-warning", date: new Date().toISOString().slice(0, 10) });

  function add() {
    if (!draft.employeeId || !draft.reason) { toast.error("Pick employee and reason"); return; }
    const r: DisciplinaryRecord = { id: newId("dc"), employeeId: draft.employeeId, date: draft.date || new Date().toISOString().slice(0, 10), type: (draft.type || "verbal-warning") as DisciplinaryRecord["type"], reason: draft.reason!, detail: draft.detail, issuedBy: actor, acknowledgedByEmployee: false };
    disciplinaryStore.put(r);
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor: actor, module: "disciplinary", action: "create", subject: `${r.type} · ${employees.find((e) => e.id === r.employeeId)?.firstName}`, detail: r.reason });
    toast.success("Disciplinary record added");
    setOpen(false); setDraft({ type: "verbal-warning", date: new Date().toISOString().slice(0, 10) });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Disciplinary Records</h3>
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" /> Issue notice</Button>
      </div>
      <Card>
        <CardContent className="p-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="text-left px-3 py-2">Date</th><th className="text-left px-3 py-2">Employee</th><th className="text-left px-3 py-2">Type</th><th className="text-left px-3 py-2">Reason</th><th className="text-left px-3 py-2">Issued by</th><th className="text-left px-3 py-2">Ack.</th></tr></thead>
            <tbody>
              {records.map((r) => {
                const emp = employees.find((e) => e.id === r.employeeId);
                return (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 tabular-nums">{r.date}</td>
                    <td className="px-3 py-2">{emp ? `${emp.firstName} ${emp.lastName}` : r.employeeId}</td>
                    <td className="px-3 py-2"><Badge variant="outline" className="capitalize">{r.type.replace("-", " ")}</Badge></td>
                    <td className="px-3 py-2">{r.reason}</td>
                    <td className="px-3 py-2 text-xs">{r.issuedBy}</td>
                    <td className="px-3 py-2 text-xs">{r.acknowledgedByEmployee ? "Yes" : "Pending"}</td>
                  </tr>
                );
              })}
              {records.length === 0 && <tr><td colSpan={6} className="text-center text-slate-500 py-4">No disciplinary records.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Issue disciplinary notice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Employee</Label>
              <Select value={draft.employeeId} onValueChange={(v) => setDraft({ ...draft, employeeId: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label className="text-xs">Type</Label>
              <Select value={draft.type} onValueChange={(v) => setDraft({ ...draft, type: v as DisciplinaryRecord["type"] })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="verbal-warning">Verbal warning</SelectItem><SelectItem value="written-warning">Written warning</SelectItem><SelectItem value="suspension">Suspension</SelectItem><SelectItem value="final-warning">Final warning</SelectItem><SelectItem value="termination">Termination</SelectItem></SelectContent></Select>
            </div>
            <div><Label className="text-xs">Reason</Label><Input value={draft.reason || ""} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Detail</Label><Textarea rows={3} value={draft.detail || ""} onChange={(e) => setDraft({ ...draft, detail: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Date</Label><Input type="date" value={draft.date || ""} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="mt-1" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={add}>Issue</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
