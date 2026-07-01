/**
 * CRM Module — store-driven leads pipeline (kanban) + activity log.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Briefcase, Plus, Trash2, ArrowRight, ArrowLeft, Search, Phone, Mail, MessageSquare, ChevronRight, History } from "lucide-react";
import { leadsStore, leadActivitiesStore, auditStore, projectsStore } from "@/lib/stores";
import { useLocation } from "wouter";
import { useCollection, newId } from "@/lib/store";
import { useCurrentActor } from "@/lib/auth/AuthContext";
import type { Lead, LeadActivity, LeadStage, LeadSource } from "@/lib/crm/types";

const STAGES: LeadStage[] = ["new", "qualified", "proposal", "negotiation", "won", "lost"];
const STAGE_LABELS: Record<LeadStage, string> = { new: "New", qualified: "Qualified", proposal: "Proposal", negotiation: "Negotiation", won: "Won", lost: "Lost" };
const STAGE_COLORS: Record<LeadStage, string> = {
  new: "bg-blue-50 border-blue-200",
  qualified: "bg-purple-50 border-purple-200",
  proposal: "bg-amber-50 border-amber-200",
  negotiation: "bg-orange-50 border-orange-200",
  won: "bg-emerald-50 border-emerald-200",
  lost: "bg-slate-50 border-slate-200",
};

export default function CRMModule() {
  const leads = useCollection(leadsStore);
  const activities = useCollection(leadActivitiesStore);
  useCollection(auditStore);
  const actor = useCurrentActor();

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | undefined>(undefined);
  const [draft, setDraft] = useState<Partial<Lead>>({ stage: "new", source: "website", probability: 25 });
  const [detailId, setDetailId] = useState<string | undefined>(undefined);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) => l.companyName.toLowerCase().includes(q) || l.contactName.toLowerCase().includes(q));
  }, [leads, search]);

  function openAdd() { setEditing(undefined); setDraft({ stage: "new", source: "website", probability: 25, estimatedValueAED: 0 }); setOpen(true); }
  function openEdit(l: Lead) { setEditing(l); setDraft({ ...l }); setOpen(true); }
  function save() {
    if (!draft.companyName || !draft.contactName) { toast.error("Company + contact name required"); return; }
    const id = editing?.id || newId("ld");
    const next: Lead = {
      id, companyName: draft.companyName!, contactName: draft.contactName!,
      contactRole: draft.contactRole, contactEmail: draft.contactEmail, contactPhone: draft.contactPhone,
      industry: draft.industry, source: (draft.source || "website") as LeadSource,
      stage: (draft.stage || "new") as LeadStage,
      estimatedValueAED: draft.estimatedValueAED || 0, probability: draft.probability ?? 25,
      expectedCloseDate: draft.expectedCloseDate, ownerUserId: draft.ownerUserId,
      notes: draft.notes,
      createdAt: editing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    leadsStore.put(next);
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor, module: "hr", action: editing ? "update" : "create", subject: `Lead · ${next.companyName}`, detail: `Stage: ${next.stage}` });
    if (!editing) leadActivitiesStore.put({ id: newId("la"), leadId: id, type: "note", by: actor, at: new Date().toISOString(), summary: "Lead created" });
    toast.success(editing ? "Lead updated" : "Lead created");
    setOpen(false);
  }
  function deleteLead(l: Lead) {
    if (!confirm(`Delete ${l.companyName}? Their activity history is preserved.`)) return;
    leadsStore.remove(l.id);
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor, module: "hr", action: "delete", subject: `Lead deleted · ${l.companyName}` });
    toast.success("Deleted");
  }
  function moveStage(l: Lead, dir: 1 | -1) {
    const idx = STAGES.indexOf(l.stage);
    const next = STAGES[Math.max(0, Math.min(STAGES.length - 1, idx + dir))];
    if (next === l.stage) return;
    leadsStore.put({ ...l, stage: next, updatedAt: new Date().toISOString() });
    leadActivitiesStore.put({ id: newId("la"), leadId: l.id, type: "stage-change", by: actor, at: new Date().toISOString(), summary: `Moved to ${STAGE_LABELS[next]}` });
  }

  // Headline metrics
  const totalValue = leads.reduce((a, l) => a + (l.stage === "lost" ? 0 : l.estimatedValueAED), 0);
  const weighted = leads.reduce((a, l) => a + (l.stage === "lost" ? 0 : l.estimatedValueAED * (l.probability / 100)), 0);
  const wonValue = leads.filter((l) => l.stage === "won").reduce((a, l) => a + l.estimatedValueAED, 0);
  const wonCount = leads.filter((l) => l.stage === "won").length;
  const lostCount = leads.filter((l) => l.stage === "lost").length;
  const winRate = (wonCount + lostCount) > 0 ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CRM — Leads & Pipeline</h1>
          <p className="text-muted-foreground text-sm mt-1">Sales-side: capture, qualify, propose, close. Won leads convert to projects.</p>
        </div>
        <Button onClick={openAdd} className="gap-2"><Plus className="w-4 h-4" /> New Lead</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Open pipeline" value={`AED ${(totalValue / 1_000_000).toFixed(2)}M`} sub={`${leads.filter((l) => !["won","lost"].includes(l.stage)).length} open leads`} />
        <KPI label="Weighted forecast" value={`AED ${(weighted / 1_000_000).toFixed(2)}M`} sub="Σ value × probability" />
        <KPI label="Won YTD" value={`AED ${(wonValue / 1_000_000).toFixed(2)}M`} sub={`${wonCount} deal${wonCount === 1 ? "" : "s"}`} />
        <KPI label="Win rate" value={`${winRate}%`} sub={`${wonCount}W / ${lostCount}L`} />
      </div>

      <Card>
        <CardContent className="p-3 flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2 w-4 h-4 text-slate-400" />
            <Input className="pl-8 h-9 w-72" placeholder="Search company or contact…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="ml-auto text-xs text-slate-500">{filtered.length} of {leads.length}</div>
        </CardContent>
      </Card>

      {/* Kanban pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAGES.map((stage) => {
          const inStage = filtered.filter((l) => l.stage === stage);
          const stageValue = inStage.reduce((a, l) => a + l.estimatedValueAED, 0);
          return (
            <div key={stage} className={`p-2 rounded-lg border ${STAGE_COLORS[stage]} min-h-[280px] flex flex-col`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-semibold capitalize">{STAGE_LABELS[stage]}</div>
                  <div className="text-[10px] text-slate-500">{inStage.length} · AED {(stageValue / 1000).toFixed(0)}K</div>
                </div>
              </div>
              <div className="space-y-2 flex-1 overflow-auto">
                {inStage.map((l) => (
                  <div key={l.id} className="bg-white rounded p-2 border border-slate-200 hover:border-slate-400 cursor-pointer text-xs" onClick={() => setDetailId(l.id)}>
                    <div className="font-medium truncate">{l.companyName}</div>
                    <div className="text-[10px] text-slate-500 truncate">{l.contactName}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="tabular-nums text-[11px]">AED {(l.estimatedValueAED / 1000).toFixed(0)}K</span>
                      <Badge variant="outline" className="text-[9px]">{l.probability}%</Badge>
                    </div>
                    {!["won","lost"].includes(stage) && (
                      <div className="flex items-center justify-end gap-0.5 mt-1">
                        <Button size="sm" variant="ghost" className="h-6 px-1" onClick={(e) => { e.stopPropagation(); moveStage(l, -1); }}><ArrowLeft className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-6 px-1" onClick={(e) => { e.stopPropagation(); moveStage(l, 1); }}><ArrowRight className="w-3 h-3" /></Button>
                      </div>
                    )}
                  </div>
                ))}
                {inStage.length === 0 && <div className="text-[10px] text-slate-400 text-center mt-3">No leads</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lead detail */}
      <Dialog open={!!detailId} onOpenChange={(v) => !v && setDetailId(undefined)}>
        <DialogContent className="max-w-2xl">
          {detailId && <LeadDetail leadId={detailId} onClose={() => setDetailId(undefined)} onEdit={() => { const l = leads.find(x => x.id === detailId); if (l) { openEdit(l); setDetailId(undefined); } }} onDelete={() => { const l = leads.find(x => x.id === detailId); if (l) { deleteLead(l); setDetailId(undefined); } }} />}
        </DialogContent>
      </Dialog>

      {/* Add/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit lead" : "New lead"}</DialogTitle><DialogDescription>Capture a new prospect or update an existing one.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company"><Input value={draft.companyName || ""} onChange={(e) => setDraft({ ...draft, companyName: e.target.value })} /></Field>
            <Field label="Industry"><Input value={draft.industry || ""} onChange={(e) => setDraft({ ...draft, industry: e.target.value })} /></Field>
            <Field label="Contact name"><Input value={draft.contactName || ""} onChange={(e) => setDraft({ ...draft, contactName: e.target.value })} /></Field>
            <Field label="Contact role"><Input value={draft.contactRole || ""} onChange={(e) => setDraft({ ...draft, contactRole: e.target.value })} /></Field>
            <Field label="Email"><Input value={draft.contactEmail || ""} onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })} /></Field>
            <Field label="Phone"><Input value={draft.contactPhone || ""} onChange={(e) => setDraft({ ...draft, contactPhone: e.target.value })} /></Field>
            <Field label="Source">
              <Select value={draft.source || "website"} onValueChange={(v) => setDraft({ ...draft, source: v as LeadSource })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(["referral","website","tender","cold","event","existing-client","other"] as LeadSource[]).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Stage">
              <Select value={draft.stage || "new"} onValueChange={(v) => setDraft({ ...draft, stage: v as LeadStage })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Estimated value (AED)"><Input type="number" value={draft.estimatedValueAED || 0} onChange={(e) => setDraft({ ...draft, estimatedValueAED: Number(e.target.value || 0) })} /></Field>
            <Field label="Probability (%)"><Input type="number" value={draft.probability ?? 25} onChange={(e) => setDraft({ ...draft, probability: Number(e.target.value || 0) })} /></Field>
            <Field label="Expected close date"><Input type="date" value={draft.expectedCloseDate || ""} onChange={(e) => setDraft({ ...draft, expectedCloseDate: e.target.value })} /></Field>
            <div className="col-span-2"><Label className="text-xs">Notes</Label><Textarea rows={2} value={draft.notes || ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="mt-1" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>{editing ? "Save" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs">{label}</Label><div className="mt-1">{children}</div></div>;
}
function KPI({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="text-xl font-bold">{value}</div>{sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}</CardContent></Card>;
}

function makeUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function LeadDetail({ leadId, onClose, onEdit, onDelete }: { leadId: string; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const leads = useCollection(leadsStore);
  const acts = useCollection(leadActivitiesStore);
  const actor = useCurrentActor();
  const [actSummary, setActSummary] = useState("");
  const [actType, setActType] = useState<LeadActivity["type"]>("note");
  const lead = leads.find((l) => l.id === leadId);
  const myActs = useMemo(() => acts.filter((a) => a.leadId === leadId).sort((a, b) => b.at.localeCompare(a.at)), [acts, leadId]);
  const [, navigate] = useLocation();
  function convertToProject() {
    if (!lead) return;
    const code = `AR-${new Date().getFullYear()}-${lead.companyName.replace(/[^A-Z]/gi, "").slice(0, 3).toUpperCase()}-${String(Math.floor(Math.random() * 9000) + 1000).slice(0, 4)}`;
    const id = makeUuid();
    projectsStore.put({
      id, code,
      nameEn: `${lead.companyName} — ${lead.industry || "Project"}`,
      nameAr: "",
      stage: "pipeline", health: "on-track",
      type: lead.industry || "—", plotNo: "—", community: "—", emirate: "Dubai",
      authority: "—", client: lead.companyName,
      contractValue: lead.estimatedValueAED, feeType: "TBD",
      startDate: "—", targetCompletion: "—",
      gfa: 0, plotArea: 0, floors: 0,
      currentSubStage: 0, progress: 0, budgetConsumed: 0,
      hoursLogged: 0, hoursPlanned: 0, daysToDeadline: 0,
      openRFIs: 0, openNCRs: 0, pendingApprovals: 0, starred: false,
      pmUserId: lead.ownerUserId, teamUserIds: lead.ownerUserId ? [lead.ownerUserId] : [],
    } as any);
    leadActivitiesStore.put({ id: newId("la"), leadId: lead.id, type: "stage-change", by: actor, at: new Date().toISOString(), summary: `Converted to Project ${code}` });
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor, module: "hr", action: "create", subject: `Project from lead · ${lead.companyName}`, detail: `Project ${code}, AED ${lead.estimatedValueAED.toLocaleString()}` });
    toast.success(`Project ${code} created from lead`);
    onClose();
    navigate(`/projects/pipeline/${id}`);
  }
  if (!lead) return null;

  function logActivity() {
    if (!actSummary.trim()) return;
    leadActivitiesStore.put({ id: newId("la"), leadId, type: actType, by: actor, at: new Date().toISOString(), summary: actSummary });
    setActSummary("");
    toast.success("Activity logged");
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{lead.companyName}</DialogTitle>
        <DialogDescription>{lead.contactName}{lead.contactRole ? ` · ${lead.contactRole}` : ""}</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Info icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={lead.contactEmail || "—"} />
        <Info icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={lead.contactPhone || "—"} />
        <Info icon={<Briefcase className="w-3.5 h-3.5" />} label="Industry" value={lead.industry || "—"} />
        <Info icon={<ChevronRight className="w-3.5 h-3.5" />} label="Source" value={lead.source} />
        <Info icon={<ChevronRight className="w-3.5 h-3.5" />} label="Stage" value={STAGE_LABELS[lead.stage]} />
        <Info icon={<ChevronRight className="w-3.5 h-3.5" />} label="Estimated" value={`AED ${lead.estimatedValueAED.toLocaleString()} · ${lead.probability}%`} />
      </div>
      {lead.notes && <div className="p-2 bg-slate-50 rounded text-xs text-slate-700 mt-2">{lead.notes}</div>}

      <Card className="mt-3">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><History className="w-4 h-4" /> Activity log · {myActs.length}</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-56 overflow-auto">
          {myActs.map((a) => (
            <div key={a.id} className="flex items-start gap-2 text-xs">
              <span className="w-2 h-2 mt-1.5 rounded-full bg-emerald-500" />
              <div className="flex-1">
                <div><span className="font-medium capitalize">{a.type.replace("-", " ")}</span> — {a.summary}</div>
                <div className="text-[10px] text-slate-500">{new Date(a.at).toLocaleString("en-GB", { timeZone: "UTC", hour12: true })} · {a.by}</div>
              </div>
            </div>
          ))}
          {myActs.length === 0 && <p className="text-xs text-slate-500">No activity yet.</p>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-12 gap-2 mt-3">
        <Select value={actType} onValueChange={(v) => setActType(v as LeadActivity["type"])}>
          <SelectTrigger className="col-span-3 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="note">Note</SelectItem>
            <SelectItem value="call">Call</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="meeting">Meeting</SelectItem>
            <SelectItem value="proposal-sent">Proposal sent</SelectItem>
          </SelectContent>
        </Select>
        <Input className="col-span-7 h-9" placeholder="Log activity…" value={actSummary} onChange={(e) => setActSummary(e.target.value)} />
        <Button className="col-span-2 h-9" onClick={logActivity}><MessageSquare className="w-3.5 h-3.5 mr-1" /> Log</Button>
      </div>
      {lead.stage === "won" && <Button onClick={convertToProject} className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700">Convert to Project →</Button>}
      <DialogFooter>
        <Button variant="outline" onClick={onDelete}><Trash2 className="w-3.5 h-3.5 mr-1 text-red-500" /> Delete</Button>
        <Button onClick={onEdit}>Edit</Button>
      </DialogFooter>
    </>
  );
}
function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (<div className="flex items-center gap-2 text-xs"><div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center">{icon}</div><div><div className="text-[10px] text-slate-500">{label}</div><div className="truncate max-w-[160px]">{value}</div></div></div>);
}
