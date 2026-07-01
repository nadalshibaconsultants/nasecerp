/**
 * Quality Module — NCR / IR / MAR / WIR per project.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardCheck, Plus, ShieldAlert, FlaskConical, ListChecks } from "lucide-react";
import { ncrsStore, inspectionRequestsStore, marsStore, wirsStore } from "@/lib/stores";
import { useCollection, newId } from "@/lib/store";
import { useState } from "react";
import { toast } from "sonner";
import { useCurrentActor } from "@/lib/auth/AuthContext";

export default function QualityTab({ projectId }: { projectId: string }) {
  const actor = useCurrentActor();
  const [ncrOpen, setNcrOpen] = useState(false);
  const [draft, setDraft] = useState<any>({});
  function raiseNcr() {
    if (!draft.description?.trim()) { toast.error("Description is required"); return; }
    const now = new Date().toISOString();
    ncrsStore.put({
      id: newId("ncr"), reference: draft.reference?.trim() || `NCR-${now.slice(0,10)}-${Math.floor(Math.random()*900+100)}`,
      projectId, date: draft.date || now.slice(0, 10), raisedByDisplay: actor,
      location: draft.location || "—", discipline: draft.discipline || "General",
      description: draft.description.trim(), costAED: draft.costAED ? Number(draft.costAED) : undefined,
      status: "open" as any, createdAt: now, updatedAt: now,
    } as any);
    toast.success("NCR raised");
    setNcrOpen(false); setDraft({});
  }
  const [qaOpen, setQaOpen] = useState(false);
  const [qaKind, setQaKind] = useState<"ir" | "mar" | "wir">("ir");
  const [qa, setQa] = useState<any>({});
  const qaLabels = { ir: { p: "Scope of inspection", s: "Contractor" }, mar: { p: "Material description", s: "Manufacturer" }, wir: { p: "Work description", s: "Building / area" } } as const;
  function openQa(k: "ir" | "mar" | "wir") { setQaKind(k); setQa({}); setQaOpen(true); }
  function quickAdd() {
    if (!qa.primary?.trim()) { toast.error(`${qaLabels[qaKind].p} is required`); return; }
    const now = new Date().toISOString();
    const ref = qa.reference?.trim() || `${qaKind.toUpperCase()}-${now.slice(0, 10)}-${Math.floor(Math.random() * 900 + 100)}`;
    const base: any = { id: newId(qaKind), reference: ref, projectId, date: qa.date || now.slice(0, 10), result: "pending", raisedByDisplay: actor, createdAt: now, updatedAt: now };
    if (qaKind === "ir") inspectionRequestsStore.put({ ...base, scopeDescription: qa.primary.trim(), raisedByContractor: qa.secondary || "—", location: qa.secondary || "—" } as any);
    else if (qaKind === "mar") marsStore.put({ ...base, materialDescription: qa.primary.trim(), manufacturer: qa.secondary || "—" } as any);
    else wirsStore.put({ ...base, workDescription: qa.primary.trim(), buildingArea: qa.secondary || "—" } as any);
    toast.success("Added"); setQaOpen(false); setQa({});
  }
  const ncrs = useCollection(ncrsStore).filter((n) => n.projectId === projectId);
  const irs = useCollection(inspectionRequestsStore).filter((i) => i.projectId === projectId);
  const mars = useCollection(marsStore).filter((m) => m.projectId === projectId);
  const wirs = useCollection(wirsStore).filter((w) => w.projectId === projectId);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><ClipboardCheck className="w-5 h-5" /> Quality (NCR / IR / MAR / WIR)</h2>
        <p className="text-xs text-muted-foreground">ISO 9001 conformance — site supervision register</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Kpi label="Open NCRs" value={ncrs.filter((n) => n.status !== "closed" && n.status !== "approved").length} />
        <Kpi label="Pending IRs" value={irs.filter((i) => i.result === "pending").length} />
        <Kpi label="Pending MARs" value={mars.filter((m) => m.result === "pending").length} />
        <Kpi label="Pending WIRs" value={wirs.filter((w) => w.result === "pending").length} />
      </div>

      <Tabs defaultValue="ncr">
        <TabsList>
          <TabsTrigger value="ncr">NCR ({ncrs.length})</TabsTrigger>
          <TabsTrigger value="ir">Inspection Requests ({irs.length})</TabsTrigger>
          <TabsTrigger value="mar">Material Approval ({mars.length})</TabsTrigger>
          <TabsTrigger value="wir">Work Inspection ({wirs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="ncr" className="mt-3">
          <Card><CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm flex items-center gap-1"><ShieldAlert className="w-4 h-4 text-red-600" /> Non-Conformance Reports</CardTitle>
            <Button size="sm" className="gap-1" onClick={() => { setDraft({}); setNcrOpen(true); }}><Plus className="w-3 h-3" /> Raise NCR</Button></CardHeader>
            <CardContent className="p-0 overflow-x-auto"><table className="w-full text-xs">
              <thead className="bg-slate-50"><tr>
                <th className="text-left px-2 py-2">Reference</th><th className="text-left px-2 py-2">Date</th>
                <th className="text-left px-2 py-2">Discipline</th><th className="text-left px-2 py-2">Location</th>
                <th className="text-left px-2 py-2">Description</th>
                <th className="text-right px-2 py-2">Cost AED</th>
                <th className="text-center px-2 py-2">Status</th>
              </tr></thead>
              <tbody>{ncrs.map((n) => (
                <tr key={n.id} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-mono">{n.reference}</td>
                  <td className="px-2 py-1.5">{n.date}</td>
                  <td className="px-2 py-1.5">{n.discipline}</td>
                  <td className="px-2 py-1.5 text-[10px]">{n.location}</td>
                  <td className="px-2 py-1.5">{n.description}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{n.costAED?.toLocaleString() || "—"}</td>
                  <td className="px-2 py-1.5 text-center"><StatusBadge status={n.status} /></td>
                </tr>))}
                {ncrs.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground text-xs">No NCRs raised.</td></tr>}
              </tbody>
            </table></CardContent></Card>
        </TabsContent>

        <TabsContent value="ir" className="mt-3">
          <Card><CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm flex items-center gap-1"><ListChecks className="w-4 h-4 text-blue-600" /> Inspection Requests</CardTitle>
            <Button size="sm" className="gap-1" onClick={() => openQa("ir")}><Plus className="w-3 h-3" /> New IR</Button></CardHeader>
            <CardContent className="p-0 overflow-x-auto"><table className="w-full text-xs">
              <thead className="bg-slate-50"><tr>
                <th className="text-left px-2 py-2">Reference</th><th className="text-left px-2 py-2">Date</th>
                <th className="text-left px-2 py-2">Contractor</th><th className="text-left px-2 py-2">Scope</th>
                <th className="text-left px-2 py-2">Location</th><th className="text-center px-2 py-2">Result</th>
              </tr></thead>
              <tbody>{irs.map((i) => (
                <tr key={i.id} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-mono">{i.reference}</td>
                  <td className="px-2 py-1.5">{i.date}</td>
                  <td className="px-2 py-1.5">{i.raisedByContractor}</td>
                  <td className="px-2 py-1.5">{i.scopeDescription}</td>
                  <td className="px-2 py-1.5 text-[10px]">{i.location}</td>
                  <td className="px-2 py-1.5 text-center"><StatusBadge status={i.result} /></td>
                </tr>))}
                {irs.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground text-xs">No IRs raised.</td></tr>}
              </tbody>
            </table></CardContent></Card>
        </TabsContent>

        <TabsContent value="mar" className="mt-3">
          <Card><CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm flex items-center gap-1"><FlaskConical className="w-4 h-4 text-emerald-600" /> Material Approval Requests</CardTitle>
            <Button size="sm" className="gap-1" onClick={() => openQa("mar")}><Plus className="w-3 h-3" /> New MAR</Button></CardHeader>
            <CardContent className="p-0 overflow-x-auto"><table className="w-full text-xs">
              <thead className="bg-slate-50"><tr>
                <th className="text-left px-2 py-2">Reference</th>
                <th className="text-left px-2 py-2">Material</th><th className="text-left px-2 py-2">Manufacturer</th>
                <th className="text-left px-2 py-2">Origin</th><th className="text-left px-2 py-2">Certification</th>
                <th className="text-center px-2 py-2">Result</th>
              </tr></thead>
              <tbody>{mars.map((m) => (
                <tr key={m.id} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-mono">{m.reference}</td>
                  <td className="px-2 py-1.5 font-medium">{m.materialDescription}</td>
                  <td className="px-2 py-1.5">{m.manufacturer}</td>
                  <td className="px-2 py-1.5">{m.countryOfOrigin || "—"}</td>
                  <td className="px-2 py-1.5 text-[10px]">{m.certificationRef || "—"}</td>
                  <td className="px-2 py-1.5 text-center"><StatusBadge status={m.result} /></td>
                </tr>))}
                {mars.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground text-xs">No MARs raised.</td></tr>}
              </tbody>
            </table></CardContent></Card>
        </TabsContent>

        <TabsContent value="wir" className="mt-3">
          <Card><CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm">Work Inspection Requests</CardTitle>
            <Button size="sm" className="gap-1" onClick={() => openQa("wir")}><Plus className="w-3 h-3" /> New WIR</Button></CardHeader>
            <CardContent className="p-0 overflow-x-auto"><table className="w-full text-xs">
              <thead className="bg-slate-50"><tr>
                <th className="text-left px-2 py-2">Reference</th><th className="text-left px-2 py-2">Date</th>
                <th className="text-left px-2 py-2">Work</th><th className="text-left px-2 py-2">Area</th>
                <th className="text-center px-2 py-2">Punch items</th><th className="text-center px-2 py-2">Result</th>
              </tr></thead>
              <tbody>{wirs.map((w) => (
                <tr key={w.id} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-mono">{w.reference}</td>
                  <td className="px-2 py-1.5">{w.date}</td>
                  <td className="px-2 py-1.5">{w.workDescription}</td>
                  <td className="px-2 py-1.5 text-[10px]">{w.buildingArea}</td>
                  <td className="px-2 py-1.5 text-center">{w.punchlistItems?.length || 0}</td>
                  <td className="px-2 py-1.5 text-center"><StatusBadge status={w.result} /></td>
                </tr>))}
                {wirs.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground text-xs">No WIRs raised.</td></tr>}
              </tbody>
            </table></CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={ncrOpen} onOpenChange={setNcrOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Raise NCR</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Reference</Label><Input value={draft.reference || ""} onChange={(e) => setDraft({ ...draft, reference: e.target.value })} placeholder="auto" className="mt-1" /></div>
              <div><Label className="text-xs">Date</Label><Input type="date" value={draft.date || ""} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Discipline</Label><Input value={draft.discipline || ""} onChange={(e) => setDraft({ ...draft, discipline: e.target.value })} placeholder="e.g. Structural" className="mt-1" /></div>
              <div><Label className="text-xs">Location</Label><Input value={draft.location || ""} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="e.g. L3 slab" className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Description *</Label><Input value={draft.description || ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Non-conformance details" className="mt-1" /></div>
            <div><Label className="text-xs">Cost impact (AED)</Label><Input type="number" value={draft.costAED || ""} onChange={(e) => setDraft({ ...draft, costAED: e.target.value })} className="mt-1" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setNcrOpen(false)}>Cancel</Button><Button onClick={raiseNcr}>Raise NCR</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={qaOpen} onOpenChange={setQaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New {qaKind.toUpperCase()}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Reference</Label><Input value={qa.reference || ""} onChange={(e) => setQa({ ...qa, reference: e.target.value })} placeholder="auto" className="mt-1" /></div>
              <div><Label className="text-xs">Date</Label><Input type="date" value={qa.date || ""} onChange={(e) => setQa({ ...qa, date: e.target.value })} className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">{qaLabels[qaKind].p} *</Label><Input value={qa.primary || ""} onChange={(e) => setQa({ ...qa, primary: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">{qaLabels[qaKind].s}</Label><Input value={qa.secondary || ""} onChange={(e) => setQa({ ...qa, secondary: e.target.value })} className="mt-1" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setQaOpen(false)}>Cancel</Button><Button onClick={quickAdd}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return <Card><CardContent className="p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="text-lg font-bold font-mono">{value}</p></CardContent></Card>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "bg-emerald-100 text-emerald-700", "approved-with-comments": "bg-emerald-100 text-emerald-700", passed: "bg-emerald-100 text-emerald-700", "passed-with-comments": "bg-emerald-100 text-emerald-700", closed: "bg-emerald-100 text-emerald-700",
    submitted: "bg-blue-100 text-blue-700", "under-review": "bg-blue-100 text-blue-700",
    pending: "bg-slate-100 text-slate-700", draft: "bg-slate-100 text-slate-700",
    rejected: "bg-red-100 text-red-700", failed: "bg-red-100 text-red-700", "rejected-resubmit": "bg-red-100 text-red-700",
  };
  return <Badge className={`text-[10px] capitalize ${map[status] || "bg-slate-100 text-slate-700"}`}>{status.replace(/-/g, " ")}</Badge>;
}
