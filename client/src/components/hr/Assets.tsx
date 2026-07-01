import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Laptop, Plus, Trash2, RotateCcw } from "lucide-react";
import { employeesStore, assetsStore, auditStore } from "@/lib/stores";
import { useCollection, newId } from "@/lib/store";
import { useCurrentActor } from "@/lib/auth/AuthContext";
import type { AssetAssignment } from "@/lib/hr/extra-types";

export default function Assets() {
  const actor = useCurrentActor();
  const employees = useCollection(employeesStore);
  const assets = useCollection(assetsStore);
  useCollection(auditStore);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<AssetAssignment>>({ type: "laptop", condition: "good", assignedDate: new Date().toISOString().slice(0, 10) });

  function add() {
    if (!draft.employeeId || !draft.identifier || !draft.description) { toast.error("Fill required fields"); return; }
    const a: AssetAssignment = { id: newId("as"), employeeId: draft.employeeId, type: (draft.type || "laptop") as AssetAssignment["type"], identifier: draft.identifier!, description: draft.description!, assignedDate: draft.assignedDate || new Date().toISOString().slice(0, 10), condition: draft.condition as any, estimatedValueAED: draft.estimatedValueAED, notes: draft.notes };
    assetsStore.put(a);
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor: actor, module: "assets", action: "create", subject: `${a.type} assigned · ${employees.find((e) => e.id === a.employeeId)?.firstName}`, detail: a.description });
    toast.success("Asset assigned");
    setOpen(false); setDraft({ type: "laptop", condition: "good", assignedDate: new Date().toISOString().slice(0, 10) });
  }
  function returnAsset(a: AssetAssignment) {
    assetsStore.put({ ...a, returnedDate: new Date().toISOString().slice(0, 10) });
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor: actor, module: "assets", action: "update", subject: `Asset returned · ${a.description}` });
    toast.success("Marked returned");
  }

  const totalValue = assets.filter((a) => !a.returnedDate).reduce((sum, a) => sum + (a.estimatedValueAED || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2"><Laptop className="w-4 h-4" /> Asset Assignments <span className="text-xs text-slate-500 ml-2">Total active value: AED {totalValue.toLocaleString()}</span></h3>
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" /> Assign asset</Button>
      </div>
      <Card>
        <CardContent className="p-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="text-left px-3 py-2">Employee</th><th className="text-left px-3 py-2">Type</th><th className="text-left px-3 py-2">Identifier</th><th className="text-left px-3 py-2">Description</th><th className="text-left px-3 py-2">Assigned</th><th className="text-left px-3 py-2">Returned</th><th className="text-right px-3 py-2">Value</th><th className="text-right px-3 py-2"></th></tr></thead>
            <tbody>
              {assets.map((a) => {
                const emp = employees.find((e) => e.id === a.employeeId);
                return (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{emp ? `${emp.firstName} ${emp.lastName}` : a.employeeId}</td>
                    <td className="px-3 py-2 capitalize"><Badge variant="outline">{a.type}</Badge></td>
                    <td className="px-3 py-2 font-mono text-xs">{a.identifier}</td>
                    <td className="px-3 py-2">{a.description}</td>
                    <td className="px-3 py-2 text-xs">{a.assignedDate}</td>
                    <td className="px-3 py-2 text-xs">{a.returnedDate || "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{a.estimatedValueAED?.toLocaleString() || "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {!a.returnedDate && <Button size="sm" variant="ghost" className="h-7" onClick={() => returnAsset(a)}><RotateCcw className="w-3.5 h-3.5 mr-1" /> Return</Button>}
                      <Button size="sm" variant="ghost" className="h-7" onClick={() => assetsStore.remove(a.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Assign asset</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label className="text-xs">Employee</Label>
              <Select value={draft.employeeId} onValueChange={(v) => setDraft({ ...draft, employeeId: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label className="text-xs">Type</Label>
              <Select value={draft.type} onValueChange={(v) => setDraft({ ...draft, type: v as AssetAssignment["type"] })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="laptop">Laptop</SelectItem><SelectItem value="phone">Phone</SelectItem><SelectItem value="vehicle">Vehicle</SelectItem><SelectItem value="software">Software</SelectItem><SelectItem value="tool">Tool</SelectItem><SelectItem value="uniform">Uniform/PPE</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select>
            </div>
            <div><Label className="text-xs">Identifier</Label><Input value={draft.identifier || ""} onChange={(e) => setDraft({ ...draft, identifier: e.target.value })} placeholder="serial / plate / username" className="mt-1" /></div>
            <div className="col-span-2"><Label className="text-xs">Description</Label><Input value={draft.description || ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Assigned date</Label><Input type="date" value={draft.assignedDate || ""} onChange={(e) => setDraft({ ...draft, assignedDate: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Estimated value (AED)</Label><Input type="number" value={draft.estimatedValueAED || ""} onChange={(e) => setDraft({ ...draft, estimatedValueAED: Number(e.target.value || 0) })} className="mt-1" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={add}>Assign</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
