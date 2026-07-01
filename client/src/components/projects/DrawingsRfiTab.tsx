/**
 * Drawing Control + RFI tab for a project — ISO 19650 / BS 1192.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Ruler, Plus, FileText, Send, MessageSquareWarning, Search, AlertTriangle } from "lucide-react";
import { drawingsStore, drawingRevisionsStore, transmittalsStore, rfisStore } from "@/lib/stores";
import { useCollection, newId } from "@/lib/store";
import { DISCIPLINE_LABELS_DCC, rfiAgeDays } from "@/lib/dcc/types";
import { toast } from "sonner";
import { useCurrentActor } from "@/lib/auth/AuthContext";

export default function DrawingsRfiTab({ projectId }: { projectId: string }) {
  const drawings = useCollection(drawingsStore).filter((d) => d.projectId === projectId);
  const revisions = useCollection(drawingRevisionsStore);
  const transmittals = useCollection(transmittalsStore).filter((t) => t.projectId === projectId);
  const rfis = useCollection(rfisStore).filter((r) => r.projectId === projectId);
  const actor = useCurrentActor();
  const [dwgOpen, setDwgOpen] = useState(false);
  const [rfiOpen, setRfiOpen] = useState(false);
  const [dwg, setDwg] = useState<any>({ discipline: "AR", currentRev: "P01", currentStatus: "WIP" });
  const [rfi, setRfi] = useState<any>({ priority: "medium" });
  function addDrawing() {
    if (!dwg.drawingNumber?.trim() || !dwg.title?.trim()) { toast.error("Drawing number and title are required"); return; }
    const now = new Date().toISOString();
    drawingsStore.put({
      id: newId("dwg"), projectId, drawingNumber: dwg.drawingNumber.trim(), title: dwg.title.trim(),
      discipline: dwg.discipline || "AR", currentRev: dwg.currentRev || "P01", currentStatus: dwg.currentStatus || "WIP",
      preparedByDisplay: actor, isActive: true, createdAt: now, updatedAt: now,
    } as any);
    toast.success("Drawing added"); setDwgOpen(false); setDwg({ discipline: "AR", currentRev: "P01", currentStatus: "WIP" });
  }
  function raiseRfi() {
    if (!rfi.subject?.trim() || !rfi.question?.trim()) { toast.error("Subject and question are required"); return; }
    const now = new Date().toISOString();
    rfisStore.put({
      id: newId("rfi"), projectId, reference: rfi.reference?.trim() || `RFI-${now.slice(0,10)}-${Math.floor(Math.random()*900+100)}`,
      date: now.slice(0, 10), raisedByCompany: "NASEC", raisedByDisplay: actor,
      subject: rfi.subject.trim(), question: rfi.question.trim(), priority: rfi.priority || "medium",
      status: "open", createdAt: now, updatedAt: now,
    } as any);
    toast.success("RFI raised"); setRfiOpen(false); setRfi({ priority: "medium" });
  }
  const [tnxOpen, setTnxOpen] = useState(false);
  const [tnx, setTnx] = useState<any>({ purpose: "for-information" });
  function addTransmittal() {
    if (!tnx.toCompany?.trim()) { toast.error("Recipient is required"); return; }
    const now = new Date().toISOString();
    transmittalsStore.put({
      id: newId("trn"), projectId, reference: tnx.reference?.trim() || `TR-${now.slice(0,10)}-${Math.floor(Math.random()*900+100)}`,
      date: now.slice(0, 10), toCompany: tnx.toCompany.trim(), purpose: tnx.purpose || "for-information",
      drawings: [], coverNote: tnx.coverNote || "", status: "issued", createdAt: now, updatedAt: now,
    } as any);
    toast.success("Transmittal issued"); setTnxOpen(false); setTnx({ purpose: "for-information" });
  }

  const openRfis = rfis.filter((r) => r.status !== "closed" && r.status !== "void").length;
  const urgentRfis = rfis.filter((r) => r.priority === "urgent" && r.status !== "closed").length;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Ruler className="w-5 h-5" /> Drawing Control & RFI</h2>
          <p className="text-xs text-muted-foreground">ISO 19650 drawing register, transmittals and technical queries</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Kpi label="Drawings" value={drawings.length} />
        <Kpi label="Transmittals" value={transmittals.length} />
        <Kpi label="Open RFIs" value={openRfis} tone={openRfis > 0 ? "amber" : "neutral"} />
        <Kpi label="Urgent RFIs" value={urgentRfis} tone={urgentRfis > 0 ? "red" : "neutral"} />
      </div>

      <Tabs defaultValue="register">
        <TabsList>
          <TabsTrigger value="register">Drawing Register</TabsTrigger>
          <TabsTrigger value="transmittals">Transmittals</TabsTrigger>
          <TabsTrigger value="rfis">RFI / TQ</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="mt-3">
          <Card><CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Drawing Register</CardTitle>
            <Button size="sm" className="gap-1" onClick={() => setDwgOpen(true)}><Plus className="w-3 h-3" /> New drawing</Button>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto"><table className="w-full text-xs">
            <thead className="bg-slate-50"><tr>
              <th className="text-left px-2 py-2">No.</th><th className="text-left px-2 py-2">Title</th>
              <th className="text-left px-2 py-2 w-[120px]">Discipline</th>
              <th className="text-left px-2 py-2 w-[80px]">Scale</th>
              <th className="text-left px-2 py-2 w-[80px]">Rev</th>
              <th className="text-left px-2 py-2 w-[80px]">Status</th>
              <th className="text-left px-2 py-2">Prepared by</th>
              <th className="text-center px-2 py-2 w-[80px]">History</th>
            </tr></thead>
            <tbody>
              {drawings.map((d) => {
                const dRevs = revisions.filter((r) => r.drawingId === d.id);
                return (
                  <tr key={d.id} className="border-t border-slate-100">
                    <td className="px-2 py-1.5 font-mono">{d.drawingNumber}</td>
                    <td className="px-2 py-1.5 font-medium">{d.title}</td>
                    <td className="px-2 py-1.5"><Badge variant="outline" className="text-[10px]">{DISCIPLINE_LABELS_DCC[d.discipline]}</Badge></td>
                    <td className="px-2 py-1.5">{d.scale || "—"}</td>
                    <td className="px-2 py-1.5 font-mono">{d.currentRev}</td>
                    <td className="px-2 py-1.5"><Badge className="text-[10px] bg-blue-100 text-blue-700">{d.currentStatus}</Badge></td>
                    <td className="px-2 py-1.5">{d.preparedByDisplay || "—"}</td>
                    <td className="px-2 py-1.5 text-center text-[10px]">{dRevs.length} revs</td>
                  </tr>
                );
              })}
              {drawings.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground text-xs">No drawings registered yet.</td></tr>}
            </tbody>
          </table></CardContent></Card>
        </TabsContent>

        <TabsContent value="transmittals" className="mt-3">
          <Card><CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Transmittals</CardTitle>
            <Button size="sm" className="gap-1" onClick={() => setTnxOpen(true)}><Send className="w-3 h-3" /> New transmittal</Button>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto"><table className="w-full text-xs">
            <thead className="bg-slate-50"><tr>
              <th className="text-left px-2 py-2">Reference</th><th className="text-left px-2 py-2">Date</th>
              <th className="text-left px-2 py-2">To</th><th className="text-left px-2 py-2">Purpose</th>
              <th className="text-center px-2 py-2">Drawings</th>
              <th className="text-left px-2 py-2">Cover Note</th>
              <th className="text-center px-2 py-2">Status</th>
            </tr></thead>
            <tbody>{transmittals.map((t) => (
              <tr key={t.id} className="border-t border-slate-100">
                <td className="px-2 py-1.5 font-mono">{t.reference}</td>
                <td className="px-2 py-1.5">{t.date}</td>
                <td className="px-2 py-1.5">{t.toCompany}</td>
                <td className="px-2 py-1.5"><Badge variant="outline" className="text-[10px] capitalize">{t.purpose.replace(/-/g, " ")}</Badge></td>
                <td className="px-2 py-1.5 text-center">{t.drawings.length}</td>
                <td className="px-2 py-1.5 text-[10px]">{t.coverNote}</td>
                <td className="px-2 py-1.5 text-center"><Badge className="text-[10px] capitalize">{t.status}</Badge></td>
              </tr>
            ))}
            {transmittals.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground text-xs">No transmittals issued yet.</td></tr>}
            </tbody>
          </table></CardContent></Card>
        </TabsContent>

        <TabsContent value="rfis" className="mt-3">
          <Card><CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">RFIs &amp; Technical Queries</CardTitle>
            <Button size="sm" className="gap-1" onClick={() => setRfiOpen(true)}><MessageSquareWarning className="w-3 h-3" /> Raise RFI</Button>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {rfis.map((r) => {
              const age = rfiAgeDays(r);
              const overdue = r.dueDate && r.dueDate < new Date().toISOString().slice(0, 10) && r.status !== "closed";
              return (
                <div key={r.id} className={`p-3 border rounded ${overdue ? "border-red-300 bg-red-50/40" : "border-slate-200"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex-1 min-w-[280px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold">{r.reference}</span>
                        <Badge className={`text-[10px] capitalize ${r.priority === "urgent" ? "bg-red-100 text-red-700" : r.priority === "high" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}`}>{r.priority}</Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">{r.status.replace(/-/g, " ")}</Badge>
                        <span className="text-[10px] text-muted-foreground">Age: {age}d</span>
                      </div>
                      <p className="text-sm font-semibold mt-1">{r.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.question}</p>
                      {r.drawingRefs && r.drawingRefs.length > 0 && (
                        <p className="text-[10px] mt-1">Drawings: {r.drawingRefs.join(", ")}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">From: {r.raisedByDisplay} ({r.raisedByCompany}){r.raisedToDisplay ? ` → ${r.raisedToDisplay}` : ""}{r.dueDate ? ` · Due ${r.dueDate}` : ""}</p>
                    </div>
                  </div>
                  {r.responses.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200 space-y-1">
                      {r.responses.map((rsp) => (
                        <div key={rsp.id} className="p-2 bg-emerald-50 rounded text-xs">
                          <p className="font-semibold text-emerald-800">{rsp.respondedByDisplay} <span className="text-[10px] text-muted-foreground">· {rsp.respondedAt.slice(0, 10)}</span></p>
                          <p className="mt-0.5">{rsp.responseText}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {rfis.length === 0 && <p className="text-center text-muted-foreground text-xs p-6">No RFIs raised.</p>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dwgOpen} onOpenChange={setDwgOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New drawing</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Drawing no. *</Label><Input value={dwg.drawingNumber || ""} onChange={(e) => setDwg({ ...dwg, drawingNumber: e.target.value })} placeholder="AR-AWT-100" className="mt-1" /></div>
              <div><Label className="text-xs">Discipline</Label>
                <Select value={dwg.discipline} onValueChange={(v) => setDwg({ ...dwg, discipline: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(DISCIPLINE_LABELS_DCC).map(([k, l]) => <SelectItem key={k} value={k}>{l as string}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Title *</Label><Input value={dwg.title || ""} onChange={(e) => setDwg({ ...dwg, title: e.target.value })} placeholder="Ground Floor Plan" className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Rev</Label><Input value={dwg.currentRev || ""} onChange={(e) => setDwg({ ...dwg, currentRev: e.target.value })} placeholder="P01" className="mt-1" /></div>
              <div><Label className="text-xs">Status</Label>
                <Select value={dwg.currentStatus} onValueChange={(v) => setDwg({ ...dwg, currentStatus: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{["WIP","S0","P01","P02","P03","C01","C02","AB"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDwgOpen(false)}>Cancel</Button><Button onClick={addDrawing}>Add drawing</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rfiOpen} onOpenChange={setRfiOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Raise RFI</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Reference</Label><Input value={rfi.reference || ""} onChange={(e) => setRfi({ ...rfi, reference: e.target.value })} placeholder="auto" className="mt-1" /></div>
              <div><Label className="text-xs">Priority</Label>
                <Select value={rfi.priority} onValueChange={(v) => setRfi({ ...rfi, priority: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{["low","medium","high","urgent"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Subject *</Label><Input value={rfi.subject || ""} onChange={(e) => setRfi({ ...rfi, subject: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Question *</Label><Input value={rfi.question || ""} onChange={(e) => setRfi({ ...rfi, question: e.target.value })} className="mt-1" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setRfiOpen(false)}>Cancel</Button><Button onClick={raiseRfi}>Raise RFI</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={tnxOpen} onOpenChange={setTnxOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New transmittal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Reference</Label><Input value={tnx.reference || ""} onChange={(e) => setTnx({ ...tnx, reference: e.target.value })} placeholder="auto" className="mt-1" /></div>
              <div><Label className="text-xs">To (company) *</Label><Input value={tnx.toCompany || ""} onChange={(e) => setTnx({ ...tnx, toCompany: e.target.value })} className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Purpose</Label>
              <Select value={tnx.purpose} onValueChange={(v) => setTnx({ ...tnx, purpose: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{["for-information","for-coordination","for-comments","for-client-approval","for-authority","for-construction"].map((p) => <SelectItem key={p} value={p}>{p.replace(/-/g," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Cover note</Label><Input value={tnx.coverNote || ""} onChange={(e) => setTnx({ ...tnx, coverNote: e.target.value })} className="mt-1" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setTnxOpen(false)}>Cancel</Button><Button onClick={addTransmittal}>Issue transmittal</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: "amber" | "red" | "neutral" }) {
  const cls = tone === "red" ? "border-red-300 bg-red-50/30" : tone === "amber" ? "border-amber-300 bg-amber-50/30" : "border-border";
  return <Card className={`border ${cls}`}><CardContent className="p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="text-lg font-bold font-mono">{value}</p></CardContent></Card>;
}
