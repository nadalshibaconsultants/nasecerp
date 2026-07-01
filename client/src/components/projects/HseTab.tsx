/**
 * HSE — Project-level incidents, toolbox talks, safety inspections.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HardHat, Plus, AlertTriangle, MessageCircle, ShieldCheck } from "lucide-react";
import { incidentsStore, toolboxTalksStore, safetyInspectionsStore } from "@/lib/stores";
import { useCollection, newId } from "@/lib/store";
import { SEVERITY_COLOR, type IncidentSeverity } from "@/lib/hse/types";
import { useState } from "react";
import { toast } from "sonner";
import { useCurrentActor } from "@/lib/auth/AuthContext";

export default function HseTab({ projectId }: { projectId: string }) {
  const incidents = useCollection(incidentsStore).filter((i) => i.projectId === projectId);
  const tbts = useCollection(toolboxTalksStore).filter((t) => t.projectId === projectId);
  const inspections = useCollection(safetyInspectionsStore).filter((s) => s.projectId === projectId);
  const actor = useCurrentActor();
  const [incOpen, setIncOpen] = useState(false);
  const [draft, setDraft] = useState<any>({ severity: "near-miss" });
  function reportIncident() {
    if (!draft.location?.trim() || !draft.immediateAction?.trim()) { toast.error("Location and immediate action are required"); return; }
    const now = new Date().toISOString();
    incidentsStore.put({
      id: newId("inc"), reference: draft.reference?.trim() || `INC-${now.slice(0,10)}-${Math.floor(Math.random()*900+100)}`,
      projectId, date: draft.date || now.slice(0, 10), location: draft.location.trim(),
      severity: (draft.severity || "near-miss") as IncidentSeverity, involvedPersons: draft.involvedPersons,
      injuredDescription: draft.injuredDescription, immediateAction: draft.immediateAction.trim(),
      investigatorDisplay: actor, status: "open", createdAt: now, updatedAt: now,
    } as any);
    toast.success("Incident reported");
    setIncOpen(false); setDraft({ severity: "near-miss" });
  }
  const [hOpen, setHOpen] = useState(false);
  const [hKind, setHKind] = useState<"toolbox" | "inspection">("toolbox");
  const [h, setH] = useState<any>({});
  function openH(k: "toolbox" | "inspection") { setHKind(k); setH({}); setHOpen(true); }
  function quickAddHse() {
    const now = new Date().toISOString();
    const ref = h.reference?.trim() || `${hKind === "toolbox" ? "TBT" : "INS"}-${now.slice(0, 10)}-${Math.floor(Math.random() * 900 + 100)}`;
    const base: any = { id: newId(hKind), reference: ref, projectId, date: h.date || now.slice(0, 10), createdAt: now, updatedAt: now };
    if (hKind === "toolbox") {
      if (!h.topic?.trim()) { toast.error("Topic is required"); return; }
      toolboxTalksStore.put({ ...base, topic: h.topic.trim(), presenter: h.presenter || actor, attendeesCount: Number(h.attendeesCount) || 0, duration: Number(h.duration) || 15 } as any);
    } else {
      safetyInspectionsStore.put({ ...base, inspectorDisplay: h.inspector || actor, location: h.location || "—", totalFindings: Number(h.totalFindings) || 0, criticalFindings: Number(h.criticalFindings) || 0, score: h.score ? Number(h.score) : 100, status: "open" } as any);
    }
    toast.success("Added"); setHOpen(false); setH({});
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><HardHat className="w-5 h-5 text-amber-600" /> Health, Safety & Environment</h2>
        <p className="text-xs text-muted-foreground">UAE OSHAD / ISO 45001 incident, toolbox talk and safety inspection register</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Kpi label="Open Incidents" value={incidents.filter((i) => i.status !== "closed").length} tone={incidents.filter((i) => i.status !== "closed").length > 0 ? "red" : "neutral"} />
        <Kpi label="Near-misses (90d)" value={incidents.filter((i) => i.severity === "near-miss").length} />
        <Kpi label="Toolbox Talks" value={tbts.length} />
        <Kpi label="Last Inspection Score" value={inspections[0]?.score ?? 0} suffix="/100" />
      </div>

      <Tabs defaultValue="incidents">
        <TabsList>
          <TabsTrigger value="incidents">Incidents ({incidents.length})</TabsTrigger>
          <TabsTrigger value="tbt">Toolbox Talks ({tbts.length})</TabsTrigger>
          <TabsTrigger value="inspect">Safety Inspections ({inspections.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="incidents" className="mt-3">
          <Card><CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-red-600" /> Incidents &amp; Near-Misses</CardTitle>
            <Button size="sm" className="gap-1" onClick={() => { setDraft({ severity: "near-miss" }); setIncOpen(true); }}><Plus className="w-3 h-3" /> Report incident</Button></CardHeader>
            <CardContent className="p-0 overflow-x-auto"><table className="w-full text-xs">
              <thead className="bg-slate-50"><tr>
                <th className="text-left px-2 py-2">Reference</th><th className="text-left px-2 py-2">Date</th>
                <th className="text-left px-2 py-2">Severity</th><th className="text-left px-2 py-2">Location</th>
                <th className="text-left px-2 py-2">Description</th>
                <th className="text-center px-2 py-2">Status</th>
              </tr></thead>
              <tbody>{incidents.map((i) => (
                <tr key={i.id} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-mono">{i.reference}</td>
                  <td className="px-2 py-1.5">{i.date} {i.time && <span className="text-[10px] text-muted-foreground">{i.time}</span>}</td>
                  <td className="px-2 py-1.5"><Badge className={`text-[10px] capitalize ${SEVERITY_COLOR[i.severity]}`}>{i.severity.replace(/-/g, " ")}</Badge></td>
                  <td className="px-2 py-1.5 text-[10px]">{i.location}</td>
                  <td className="px-2 py-1.5 text-[10px]">{i.immediateAction.slice(0, 80)}</td>
                  <td className="px-2 py-1.5 text-center"><Badge variant="outline" className="text-[10px] capitalize">{i.status.replace(/-/g, " ")}</Badge></td>
                </tr>))}
                {incidents.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground text-xs">No incidents recorded — keep it that way.</td></tr>}
              </tbody>
            </table></CardContent></Card>
        </TabsContent>

        <TabsContent value="tbt" className="mt-3">
          <Card><CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm flex items-center gap-1"><MessageCircle className="w-4 h-4 text-blue-600" /> Toolbox Talks</CardTitle>
            <Button size="sm" className="gap-1" onClick={() => openH("toolbox")}><Plus className="w-3 h-3" /> Log TBT</Button></CardHeader>
            <CardContent className="p-0 overflow-x-auto"><table className="w-full text-xs">
              <thead className="bg-slate-50"><tr>
                <th className="text-left px-2 py-2">Reference</th><th className="text-left px-2 py-2">Date</th>
                <th className="text-left px-2 py-2">Topic</th><th className="text-left px-2 py-2">Presenter</th>
                <th className="text-right px-2 py-2">Attendees</th><th className="text-right px-2 py-2">Mins</th>
              </tr></thead>
              <tbody>{tbts.map((t) => (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-mono">{t.reference}</td>
                  <td className="px-2 py-1.5">{t.date}</td>
                  <td className="px-2 py-1.5 font-medium">{t.topic}</td>
                  <td className="px-2 py-1.5">{t.presenter}</td>
                  <td className="px-2 py-1.5 text-right">{t.attendeesCount}</td>
                  <td className="px-2 py-1.5 text-right">{t.duration}</td>
                </tr>))}
                {tbts.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground text-xs">No TBTs logged.</td></tr>}
              </tbody>
            </table></CardContent></Card>
        </TabsContent>

        <TabsContent value="inspect" className="mt-3">
          <Card><CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Safety Inspections</CardTitle>
            <Button size="sm" className="gap-1" onClick={() => openH("inspection")}><Plus className="w-3 h-3" /> New inspection</Button></CardHeader>
            <CardContent className="p-0 overflow-x-auto"><table className="w-full text-xs">
              <thead className="bg-slate-50"><tr>
                <th className="text-left px-2 py-2">Reference</th><th className="text-left px-2 py-2">Date</th>
                <th className="text-left px-2 py-2">Inspector</th><th className="text-left px-2 py-2">Location</th>
                <th className="text-right px-2 py-2">Findings</th><th className="text-right px-2 py-2">Critical</th>
                <th className="text-right px-2 py-2">Score</th><th className="text-center px-2 py-2">Status</th>
              </tr></thead>
              <tbody>{inspections.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-mono">{s.reference}</td>
                  <td className="px-2 py-1.5">{s.date}</td>
                  <td className="px-2 py-1.5">{s.inspectorDisplay}</td>
                  <td className="px-2 py-1.5 text-[10px]">{s.location}</td>
                  <td className="px-2 py-1.5 text-right">{s.totalFindings}</td>
                  <td className="px-2 py-1.5 text-right text-red-600 font-semibold">{s.criticalFindings}</td>
                  <td className="px-2 py-1.5 text-right font-mono font-bold">{s.score ?? "—"}</td>
                  <td className="px-2 py-1.5 text-center"><Badge variant="outline" className="text-[10px] capitalize">{s.status.replace(/-/g, " ")}</Badge></td>
                </tr>))}
                {inspections.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground text-xs">No inspections done.</td></tr>}
              </tbody>
            </table></CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={incOpen} onOpenChange={setIncOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Report incident</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Reference</Label><Input value={draft.reference || ""} onChange={(e) => setDraft({ ...draft, reference: e.target.value })} placeholder="auto" className="mt-1" /></div>
              <div><Label className="text-xs">Date</Label><Input type="date" value={draft.date || ""} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Severity</Label>
                <Select value={draft.severity} onValueChange={(v) => setDraft({ ...draft, severity: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{["near-miss","first-aid","medical-treatment","lost-time","major","fatality"].map((s) => <SelectItem key={s} value={s}>{s.replace(/-/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Location *</Label><Input value={draft.location || ""} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="e.g. Basement 2" className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Involved persons</Label><Input value={draft.involvedPersons || ""} onChange={(e) => setDraft({ ...draft, involvedPersons: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">What happened</Label><Input value={draft.injuredDescription || ""} onChange={(e) => setDraft({ ...draft, injuredDescription: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Immediate action *</Label><Input value={draft.immediateAction || ""} onChange={(e) => setDraft({ ...draft, immediateAction: e.target.value })} className="mt-1" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIncOpen(false)}>Cancel</Button><Button onClick={reportIncident}>Report</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={hOpen} onOpenChange={setHOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{hKind === "toolbox" ? "Log toolbox talk" : "New safety inspection"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Reference</Label><Input value={h.reference || ""} onChange={(e) => setH({ ...h, reference: e.target.value })} placeholder="auto" className="mt-1" /></div>
              <div><Label className="text-xs">Date</Label><Input type="date" value={h.date || ""} onChange={(e) => setH({ ...h, date: e.target.value })} className="mt-1" /></div>
            </div>
            {hKind === "toolbox" ? (
              <>
                <div><Label className="text-xs">Topic *</Label><Input value={h.topic || ""} onChange={(e) => setH({ ...h, topic: e.target.value })} className="mt-1" /></div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-xs">Presenter</Label><Input value={h.presenter || ""} onChange={(e) => setH({ ...h, presenter: e.target.value })} className="mt-1" /></div>
                  <div><Label className="text-xs">Attendees</Label><Input type="number" value={h.attendeesCount || ""} onChange={(e) => setH({ ...h, attendeesCount: e.target.value })} className="mt-1" /></div>
                  <div><Label className="text-xs">Mins</Label><Input type="number" value={h.duration || ""} onChange={(e) => setH({ ...h, duration: e.target.value })} className="mt-1" /></div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Inspector</Label><Input value={h.inspector || ""} onChange={(e) => setH({ ...h, inspector: e.target.value })} className="mt-1" /></div>
                  <div><Label className="text-xs">Location</Label><Input value={h.location || ""} onChange={(e) => setH({ ...h, location: e.target.value })} className="mt-1" /></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-xs">Findings</Label><Input type="number" value={h.totalFindings || ""} onChange={(e) => setH({ ...h, totalFindings: e.target.value })} className="mt-1" /></div>
                  <div><Label className="text-xs">Critical</Label><Input type="number" value={h.criticalFindings || ""} onChange={(e) => setH({ ...h, criticalFindings: e.target.value })} className="mt-1" /></div>
                  <div><Label className="text-xs">Score</Label><Input type="number" value={h.score || ""} onChange={(e) => setH({ ...h, score: e.target.value })} className="mt-1" /></div>
                </div>
              </>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setHOpen(false)}>Cancel</Button><Button onClick={quickAddHse}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ label, value, suffix, tone }: { label: string; value: number; suffix?: string; tone?: "red" | "neutral" }) {
  const cls = tone === "red" ? "border-red-300 bg-red-50/30" : "border-border";
  return <Card className={`border ${cls}`}><CardContent className="p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="text-lg font-bold font-mono">{value}{suffix || ""}</p></CardContent></Card>;
}
