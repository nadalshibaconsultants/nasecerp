/**
 * LessonsChecklistTab — Lessons Learnt Design Checklist
 *
 * Mandatory before the G3 gate (Client Approval after Schematic). The Lead
 * Architect responds (Complied / Not Complied / Not Applicable) for every
 * active item, then the Project Manager verifies. PM and LA can both ADD
 * new items at any time — once added, the item appears in every project's
 * checklist (global list). Items cannot be deleted; only the Director can
 * deactivate them (the historic record is preserved for audit).
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ClipboardCheck, Plus, AlertTriangle, CheckCircle2, Lock, Unlock,
  ShieldCheck, FileDown, Search, EyeOff, Eye,
} from "lucide-react";
import {
  lessonItemsStore, lessonResponsesStore, auditStore,
} from "@/lib/stores";
import { useCollection, newId } from "@/lib/store";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  computeReadiness, DISCIPLINE_LABELS, DISCIPLINE_ORDER, STATUS_LABELS, STATUS_COLOR,
  type LessonItem, type LessonResponse, type LessonResponseStatus, type LessonDiscipline,
} from "@/lib/lessons/types";

type Props = { projectId: string };

export default function LessonsChecklistTab({ projectId }: Props) {
  const { currentUser, hasRole } = useAuth();
  const items = useCollection(lessonItemsStore);
  const responses = useCollection(lessonResponsesStore);

  const projectResponses = useMemo(
    () => responses.filter((r) => r.projectId === projectId),
    [responses, projectId]
  );
  const responseByItem = useMemo(() => {
    const m = new Map<string, LessonResponse>();
    for (const r of projectResponses) m.set(r.lessonItemId, r);
    return m;
  }, [projectResponses]);

  const readiness = useMemo(() => computeReadiness(items, projectResponses), [items, projectResponses]);

  const [search, setSearch] = useState("");
  const [filterDiscipline, setFilterDiscipline] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const canAddItem = hasRole("pm", "design-lead", "director");
  const canRespond = hasRole("design-lead", "pm", "director");
  const canVerify = hasRole("pm", "director");
  const canDeactivate = hasRole("director");

  const filtered = items.filter((i) => {
    if (!showInactive && !i.isActive) return false;
    if (filterDiscipline !== "all" && i.discipline !== filterDiscipline) return false;
    if (filterStatus !== "all") {
      const r = responseByItem.get(i.id);
      if (filterStatus === "pending" && r && r.status !== "pending") return false;
      if (filterStatus === "responded" && (!r || r.status === "pending")) return false;
      if (filterStatus === "complied" && r?.status !== "complied") return false;
      if (filterStatus === "not-complied" && r?.status !== "not-complied") return false;
      if (filterStatus === "not-applicable" && r?.status !== "not-applicable") return false;
      if (filterStatus === "verified" && !(r?.pmVerified || r?.directorOverride)) return false;
    }
    if (search && !i.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by discipline
  const grouped = useMemo(() => {
    const g: Record<string, LessonItem[]> = {};
    for (const i of filtered) {
      (g[i.discipline] = g[i.discipline] || []).push(i);
    }
    for (const k of Object.keys(g)) {
      g[k].sort((a, b) => (a.itemNumber ?? 999) - (b.itemNumber ?? 999));
    }
    return g;
  }, [filtered]);

  function setResponse(item: LessonItem, status: LessonResponseStatus, evidenceNote?: string) {
    const now = new Date().toISOString();
    const existing = responseByItem.get(item.id);
    const r: LessonResponse = existing
      ? { ...existing, status, evidenceNote: evidenceNote ?? existing.evidenceNote, respondedByUserId: currentUser?.id, respondedByDisplay: currentUser?.displayName, respondedAt: now, pmVerified: false, pmVerifiedAt: undefined, pmVerifiedByUserId: undefined, pmVerifiedByDisplay: undefined, updatedAt: now }
      : { id: newId("lr"), projectId, lessonItemId: item.id, status, evidenceNote, respondedByUserId: currentUser?.id, respondedByDisplay: currentUser?.displayName, respondedAt: now, pmVerified: false, createdAt: now, updatedAt: now };
    lessonResponsesStore.put(r);
    auditStore.put({
      id: newId("au"), timestamp: now, actor: currentUser?.displayName || "System",
      module: "projects", action: "edit",
      subject: `Lessons checklist response: ${item.text.slice(0, 60)}`,
      detail: `Project ${projectId} • ${STATUS_LABELS[status]}`,
    });
  }

  function verifyResponse(item: LessonItem, verified: boolean, pmNote?: string) {
    const r = responseByItem.get(item.id);
    if (!r) return toast.error("Lead Architect must respond first");
    const now = new Date().toISOString();
    lessonResponsesStore.put({
      ...r, pmVerified: verified,
      pmVerifiedByUserId: verified ? currentUser?.id : undefined,
      pmVerifiedByDisplay: verified ? currentUser?.displayName : undefined,
      pmVerifiedAt: verified ? now : undefined,
      pmNote: pmNote ?? r.pmNote,
      updatedAt: now,
    });
    toast.success(verified ? "Verified by PM" : "Verification cleared");
  }

  function directorOverride(item: LessonItem, override: boolean) {
    const r = responseByItem.get(item.id);
    if (!r) return;
    const now = new Date().toISOString();
    lessonResponsesStore.put({
      ...r, directorOverride: override,
      directorOverrideBy: override ? currentUser?.displayName : undefined,
      directorOverrideAt: override ? now : undefined,
      updatedAt: now,
    });
    toast.success(override ? "Director override applied" : "Override removed");
  }

  function deactivateItem(item: LessonItem) {
    if (!canDeactivate) return toast.error("Only Director can deactivate items");
    if (!confirm(`Deactivate "${item.text.slice(0, 50)}..." ? It will hide from active list but remain in audit history.`)) return;
    const now = new Date().toISOString();
    lessonItemsStore.put({ ...item, isActive: false, deactivatedAt: now, deactivatedByUserId: currentUser?.id });
    auditStore.put({
      id: newId("au"), timestamp: now, actor: currentUser?.displayName || "System",
      module: "projects", action: "delete",
      subject: `Deactivated lesson item: ${item.text.slice(0, 60)}`,
    });
  }

  function reactivateItem(item: LessonItem) {
    lessonItemsStore.put({ ...item, isActive: true, deactivatedAt: undefined, deactivatedByUserId: undefined });
    toast.success("Item reactivated");
  }

  function exportCSV() {
    const headers = ["#", "Discipline", "Item", "Source", "Status", "Evidence", "Responded by", "PM Verified by", "Verified At"];
    const rows = items.filter((i) => i.isActive).map((i) => {
      const r = responseByItem.get(i.id);
      return [
        i.itemNumber || "", DISCIPLINE_LABELS[i.discipline], i.text, i.problemSource || "",
        r ? STATUS_LABELS[r.status] : "Pending",
        r?.evidenceNote || "",
        r?.respondedByDisplay || "",
        r?.pmVerifiedByDisplay || "",
        r?.pmVerifiedAt ? r.pmVerifiedAt.slice(0, 10) : "",
      ];
    });
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `lessons-checklist-${projectId}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-emerald-600" /> Lessons Learnt Design Checklist</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Mandatory before G3 (Client Approval after Schematic). Lead Architect responds → Project Manager verifies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1"><FileDown className="w-3.5 h-3.5" /> Export CSV</Button>
          {canAddItem && (
            <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1"><Plus className="w-3.5 h-3.5" /> Add Item</Button>
          )}
        </div>
      </div>

      {/* Readiness gate banner */}
      <Card className={`border-2 ${readiness.ready ? "border-emerald-400 bg-emerald-50/60" : "border-amber-400 bg-amber-50/60"}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              {readiness.ready ? <Unlock className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" /> : <Lock className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />}
              <div>
                <p className="text-base font-bold">
                  {readiness.ready ? "G3 Gate ready — all items responded and verified" : "G3 Gate blocked — checklist incomplete"}
                </p>
                {readiness.blockReasons.length > 0 ? (
                  <ul className="text-xs text-amber-800 mt-1 list-disc ml-4">
                    {readiness.blockReasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                ) : (
                  <p className="text-xs text-emerald-800 mt-1">Lead Architect responses complete. PM has verified all items. Project may proceed to G3 client submission.</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Stat label="Total active" value={readiness.totalActiveItems} />
              <Stat label="Responded" value={readiness.responded} className="text-blue-700" />
              <Stat label="PM verified" value={readiness.pmVerified} className="text-emerald-700" />
              <Stat label="Pending" value={readiness.pendingResponses + readiness.pendingPmVerification} className="text-amber-700" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <ProgressPill label="Complied" value={readiness.complied} total={readiness.totalActiveItems} color="emerald" />
            <ProgressPill label="Not Complied" value={readiness.notComplied} total={readiness.totalActiveItems} color="red" />
            <ProgressPill label="N/A" value={readiness.notApplicable} total={readiness.totalActiveItems} color="blue" />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[160px]">
            <Label className="text-[10px]">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search item text..." className="h-8 pl-7" />
            </div>
          </div>
          <div>
            <Label className="text-[10px]">Discipline</Label>
            <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
              <SelectTrigger className="h-8 w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All disciplines</SelectItem>
                {DISCIPLINE_ORDER.map((d) => <SelectItem key={d} value={d}>{DISCIPLINE_LABELS[d]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px]">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending response</SelectItem>
                <SelectItem value="responded">Responded</SelectItem>
                <SelectItem value="complied">Complied</SelectItem>
                <SelectItem value="not-complied">Not Complied</SelectItem>
                <SelectItem value="not-applicable">Not Applicable</SelectItem>
                <SelectItem value="verified">PM Verified</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowInactive(!showInactive)} className="gap-1">
            {showInactive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showInactive ? "Hide inactive" : "Show inactive"}
          </Button>
          <div className="text-xs text-muted-foreground self-center">
            {filtered.length} of {items.filter((i) => i.isActive).length}
          </div>
        </CardContent>
      </Card>

      {/* Checklist groups */}
      {DISCIPLINE_ORDER.map((d) => {
        const group = grouped[d];
        if (!group || group.length === 0) return null;
        return (
          <Card key={d}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{group.length}</Badge>
                {DISCIPLINE_LABELS[d as LessonDiscipline]}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="text-left px-2 py-2 w-[40px]">#</th>
                    <th className="text-left px-2 py-2">Item</th>
                    <th className="text-left px-2 py-2 w-[160px]">Status (LA)</th>
                    <th className="text-left px-2 py-2 w-[140px]">PM Verify</th>
                    <th className="text-left px-2 py-2 w-[140px]">Evidence Note</th>
                    {canDeactivate && <th className="w-[60px]"></th>}
                  </tr>
                </thead>
                <tbody>
                  {group.map((it) => {
                    const r = responseByItem.get(it.id);
                    const status = r?.status || "pending";
                    return (
                      <tr key={it.id} className={`border-t border-slate-100 ${!it.isActive ? "opacity-50" : ""}`}>
                        <td className="px-2 py-2 align-top font-mono text-[10px]">{it.itemNumber || "—"}</td>
                        <td className="px-2 py-2 align-top">
                          <div className="font-medium">{it.text}</div>
                          {it.problemSource && <p className="text-[10px] text-muted-foreground mt-0.5">Source: {it.problemSource}</p>}
                          {it.recommendedAction && <p className="text-[10px] text-blue-700 mt-0.5">Action: {it.recommendedAction}</p>}
                          {!it.isCore && (
                            <p className="text-[10px] text-muted-foreground italic">Added by {it.addedByDisplay} on {it.addedAt.slice(0, 10)}</p>
                          )}
                          {!it.isActive && <Badge variant="outline" className="text-[9px] mt-1 border-red-300 text-red-700">Deactivated</Badge>}
                        </td>
                        <td className="px-2 py-2 align-top">
                          {canRespond && it.isActive ? (
                            <Select value={status} onValueChange={(v) => setResponse(it, v as LessonResponseStatus)}>
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="complied">Complied</SelectItem>
                                <SelectItem value="not-complied">Not Complied</SelectItem>
                                <SelectItem value="not-applicable">Not Applicable</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge className={`text-[10px] ${STATUS_COLOR[status]}`}>{STATUS_LABELS[status]}</Badge>
                          )}
                          {r?.respondedByDisplay && (
                            <p className="text-[9px] text-muted-foreground mt-1">by {r.respondedByDisplay} • {r.respondedAt?.slice(0, 10)}</p>
                          )}
                        </td>
                        <td className="px-2 py-2 align-top">
                          {r && r.status !== "pending" ? (
                            <div>
                              {canVerify ? (
                                <Button
                                  size="sm" variant={r.pmVerified ? "default" : "outline"} className="h-7 gap-1"
                                  onClick={() => verifyResponse(it, !r.pmVerified)}
                                >
                                  <ShieldCheck className="w-3 h-3" /> {r.pmVerified ? "Verified" : "Verify"}
                                </Button>
                              ) : (
                                <Badge className={`text-[10px] ${r.pmVerified ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                                  {r.pmVerified ? "✓ PM verified" : "Awaiting PM"}
                                </Badge>
                              )}
                              {r.pmVerifiedByDisplay && (
                                <p className="text-[9px] text-muted-foreground mt-1">{r.pmVerifiedByDisplay} • {r.pmVerifiedAt?.slice(0, 10)}</p>
                              )}
                              {r.status === "not-complied" && hasRole("director") && (
                                <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] mt-1" onClick={() => directorOverride(it, !r.directorOverride)}>
                                  {r.directorOverride ? "Remove override" : "Director override"}
                                </Button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2 align-top">
                          {canRespond && it.isActive ? (
                            <Textarea
                              defaultValue={r?.evidenceNote || ""}
                              onBlur={(e) => {
                                const v = e.target.value;
                                if (v !== (r?.evidenceNote || "")) setResponse(it, status, v);
                              }}
                              rows={2}
                              className="text-[11px] min-h-[40px]"
                              placeholder="Drawing #, photo ref, note..."
                            />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">{r?.evidenceNote || "—"}</span>
                          )}
                        </td>
                        {canDeactivate && (
                          <td className="px-2 py-2 align-top text-center">
                            {it.isActive ? (
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-red-600" onClick={() => deactivateItem(it)} title="Deactivate (Director only)">
                                <EyeOff className="w-3 h-3" />
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-emerald-600" onClick={() => reactivateItem(it)}>
                                <Eye className="w-3 h-3" />
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })}

      {filtered.length === 0 && (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          No items match the current filters.
        </CardContent></Card>
      )}

      {/* Add item dialog */}
      {addOpen && canAddItem && (
        <AddItemDialog
          onClose={() => setAddOpen(false)}
          onAdd={(newItem) => {
            lessonItemsStore.put(newItem);
            auditStore.put({
              id: newId("au"), timestamp: new Date().toISOString(),
              actor: currentUser?.displayName || "System",
              module: "projects", action: "create",
              subject: `Added lesson item: ${newItem.text.slice(0, 60)}`,
              detail: `${DISCIPLINE_LABELS[newItem.discipline]} • applies to all projects`,
            });
            toast.success("Item added to checklist (visible in all projects)");
            setAddOpen(false);
          }}
          actorDisplay={currentUser?.displayName || "Unknown"}
          actorId={currentUser?.id}
        />
      )}
    </div>
  );
}

function Stat({ label, value, className = "" }: { label: string; value: number; className?: string }) {
  return (
    <div className={`px-3 py-1 bg-white/70 rounded border ${className}`}>
      <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-base font-bold font-mono">{value}</p>
    </div>
  );
}

function ProgressPill({ label, value, total, color }: { label: string; value: number; total: number; color: "emerald" | "red" | "blue" }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const bg = color === "emerald" ? "bg-emerald-500" : color === "red" ? "bg-red-500" : "bg-blue-500";
  return (
    <div className="text-[10px]">
      <div className="flex justify-between"><span>{label}</span><span className="font-mono">{value}/{total}</span></div>
      <div className="h-2 bg-slate-200 rounded mt-0.5 overflow-hidden">
        <div className={`h-full ${bg}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AddItemDialog({
  onClose, onAdd, actorDisplay, actorId,
}: {
  onClose: () => void;
  onAdd: (item: LessonItem) => void;
  actorDisplay: string;
  actorId?: string;
}) {
  const [text, setText] = useState("");
  const [discipline, setDiscipline] = useState<LessonDiscipline>("arch");
  const [problemSource, setProblemSource] = useState("");
  const [recommendedAction, setRecommendedAction] = useState("");

  function submit() {
    if (!text.trim()) return toast.error("Item text required");
    onAdd({
      id: newId("ll"),
      discipline,
      text: text.trim(),
      problemSource: problemSource.trim() || undefined,
      recommendedAction: recommendedAction.trim() || undefined,
      isActive: true,
      isCore: false,
      addedByUserId: actorId,
      addedByDisplay: actorDisplay,
      addedAt: new Date().toISOString(),
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add lesson-learnt item</DialogTitle>
          <DialogDescription>This item will be added to every project's checklist company-wide. It cannot be deleted afterwards — only the Director can deactivate it.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Discipline</Label>
            <Select value={discipline} onValueChange={(v) => setDiscipline(v as LessonDiscipline)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DISCIPLINE_ORDER.map((d) => <SelectItem key={d} value={d}>{DISCIPLINE_LABELS[d]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Lesson / Item text *</Label>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="e.g. Coordinate slab cut-outs with MEP shafts before...." />
          </div>
          <div>
            <Label className="text-xs">Problem source (project / consultant / authority)</Label>
            <Input value={problemSource} onChange={(e) => setProblemSource(e.target.value)} placeholder="e.g. M.Wolf, Al Satwa, DCD" />
          </div>
          <div>
            <Label className="text-xs">Recommended action</Label>
            <Textarea value={recommendedAction} onChange={(e) => setRecommendedAction(e.target.value)} rows={2} placeholder="Optional — what should the team do to ensure compliance" />
          </div>
          <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px]">
            <AlertTriangle className="w-3 h-3 inline mr-1 text-amber-600" />
            Once added, this item appears in every active project's checklist immediately. It can only be deactivated by the Director.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} className="gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Add to company checklist</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
