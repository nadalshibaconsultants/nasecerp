import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { ListTodo, Plus, Trash2, Search, ArrowLeft, ArrowRight, AlertCircle, Clock, CheckCircle2, Pencil, MessagesSquare } from "lucide-react";
import { useLocation } from "wouter";
import { tasksStore, projectsStore, userDirectoryStore, auditStore } from "@/lib/stores";
import { useCollection, newId } from "@/lib/store";
import { useAuth, useCurrentActor } from "@/lib/auth/AuthContext";
import { visibleProjects } from "@/lib/projects/acl";
import type { Task, TaskStatus, TaskPriority, TaskCategory } from "@/lib/tasks/types";
import { TASK_STATUS_ORDER, TASK_STATUS_LABEL, PRIORITY_LABEL } from "@/lib/tasks/types";

const STATUS_COLORS: Record<TaskStatus, string> = { todo: "bg-slate-50 border-slate-200", "in-progress": "bg-blue-50 border-blue-200", blocked: "bg-red-50 border-red-200", done: "bg-emerald-50 border-emerald-200" };
const PRIORITY_COLORS: Record<TaskPriority, string> = { low: "border-slate-300 text-slate-600", medium: "border-amber-300 text-amber-700", high: "border-orange-300 text-orange-700", urgent: "border-red-300 text-red-700" };

export default function TasksModule() {
  const tasks = useCollection(tasksStore);
  const projects = useCollection(projectsStore);
  const users = useCollection(userDirectoryStore);
  useCollection(auditStore);
  const { currentUser } = useAuth();
  const actor = useCurrentActor();
  const [, navigate] = useLocation();
  const visibleProjectIds = useMemo(() => new Set(visibleProjects(projects, currentUser).map((p) => p.id)), [projects, currentUser]);
  const [search, setSearch] = useState("");
  const [filterProj, setFilterProj] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | undefined>(undefined);
  const [draft, setDraft] = useState<Partial<Task>>({ status: "todo", priority: "medium", category: "design" });

  const filtered = useMemo(() => tasks.filter((t) => {
    // Directors see all tasks; everyone else sees tasks they created (reporter)
    // or that were assigned to them (assignee). Mirrors the server-side scope.
    const assignedIds = new Set(t.assigneeUserIds?.length ? t.assigneeUserIds : t.assigneeUserId ? [t.assigneeUserId] : []);
    if (currentUser?.role !== "director" && !assignedIds.has(currentUser?.id || "") && t.reporterUserId !== currentUser?.id) return false;
    const q = search.trim().toLowerCase();
    if (q && !t.title.toLowerCase().includes(q) && !(t.description || "").toLowerCase().includes(q)) return false;
    if (filterProj !== "all" && filterProj !== "_none" && t.projectId !== filterProj) return false;
    if (filterProj === "_none" && t.projectId) return false;
    if (filterAssignee !== "all" && t.assigneeUserId !== filterAssignee) return false;
    if (filterCat !== "all" && t.category !== filterCat) return false;
    return true;
  }), [tasks, visibleProjectIds, search, filterProj, filterAssignee, filterCat, currentUser]);

  function openAdd() { setEditing(undefined); setDraft({ status: "todo", priority: "medium", category: "design", assigneeUserId: currentUser?.id, reporterUserId: currentUser?.id }); setOpen(true); }
  function openEdit(t: Task) { setEditing(t); setDraft({ ...t }); setOpen(true); }
  function save() {
    if (!draft.title?.trim()) { toast.error("Title is required"); return; }
    const id = editing?.id || newId("tk");
    const t: Task = {
      id, title: draft.title!, description: draft.description,
      status: (draft.status || "todo") as TaskStatus, priority: (draft.priority || "medium") as TaskPriority, category: (draft.category || "design") as TaskCategory,
      projectId: draft.projectId === "_none" ? undefined : draft.projectId,
      assigneeUserId: draft.assigneeUserId === "_none" ? undefined : draft.assigneeUserId,
      reporterUserId: draft.reporterUserId, dueDate: draft.dueDate,
      createdAt: editing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: draft.status === "done" && !editing?.completedAt ? new Date().toISOString() : editing?.completedAt,
    };
    tasksStore.put(t);
    auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor, module: "hr", action: editing ? "update" : "create", subject: `Task · ${t.title}`, detail: `Status: ${t.status}` });
    toast.success(editing ? "Task updated" : "Task created");
    setOpen(false);
  }
  function deleteTask(t: Task) { if (!confirm(`Delete "${t.title}"?`)) return; tasksStore.remove(t.id); auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor, module: "hr", action: "delete", subject: `Task deleted · ${t.title}` }); toast.success("Deleted"); }
  function moveStatus(t: Task, dir: 1 | -1) {
    const idx = TASK_STATUS_ORDER.indexOf(t.status);
    const next = TASK_STATUS_ORDER[Math.max(0, Math.min(TASK_STATUS_ORDER.length - 1, idx + dir))];
    if (next === t.status) return;
    tasksStore.put({ ...t, status: next, updatedAt: new Date().toISOString(), completedAt: next === "done" ? new Date().toISOString() : t.completedAt });
  }

  const overdue = filtered.filter((t) => t.status !== "done" && t.dueDate && t.dueDate < new Date().toISOString().slice(0, 10)).length;
  const myOpen = filtered.filter((t) => t.assigneeUserId === currentUser?.id && t.status !== "done").length;
  const totalOpen = filtered.filter((t) => t.status !== "done").length;
  const doneThisWeek = filtered.filter((t) => t.status === "done" && t.completedAt && Date.now() - new Date(t.completedAt).getTime() < 7 * 86_400_000).length;
  function userName(id?: string) { if (!id) return "—"; const u = users.find((x) => x.id === id); return u ? u.displayName : id; }
  function userInitials(id?: string) { if (!id) return "—"; const u = users.find((x) => x.id === id); return u ? u.displayName.split(" ").map((s) => s[0]).slice(0, 2).join("") : "?"; }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Tasks</h1><p className="text-muted-foreground text-sm mt-1">Project-linked and standalone tasks · respects project ACLs.</p></div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-slate-200 overflow-hidden text-xs">
            {(["kanban", "list"] as const).map((v) => (<button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 capitalize ${view === v ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>{v}</button>))}
          </div>
          <Button onClick={openAdd} className="gap-1.5"><Plus className="w-4 h-4" /> New Task</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={<ListTodo className="w-4 h-4 text-blue-600" />} label="Open tasks" value={totalOpen} />
        <KPI icon={<Clock className="w-4 h-4 text-amber-600" />} label="My open" value={myOpen} sub={currentUser?.displayName} />
        <KPI icon={<AlertCircle className="w-4 h-4 text-red-600" />} label="Overdue" value={overdue} tone={overdue > 0 ? "bad" : undefined} />
        <KPI icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />} label="Done this week" value={doneThisWeek} />
      </div>

      <Card>
        <CardContent className="p-3 flex flex-wrap gap-2 items-center">
          <div className="relative"><Search className="absolute left-2 top-2 w-4 h-4 text-slate-400" /><Input className="pl-8 h-9 w-64" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <Select value={filterProj} onValueChange={setFilterProj}>
            <SelectTrigger className="h-9 w-56"><SelectValue placeholder="Project" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem><SelectItem value="_none">— Standalone —</SelectItem>
              {visibleProjects(projects, currentUser).map((p) => <SelectItem key={p.id} value={p.id}>{p.nameEn}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Assignee" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All categories</SelectItem>{(["design","review","meeting","submission","site","admin","client","other"] as TaskCategory[]).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <div className="ml-auto text-xs text-slate-500">{filtered.length} tasks</div>
        </CardContent>
      </Card>

      {view === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {TASK_STATUS_ORDER.map((status) => {
            const inCol = filtered.filter((t) => t.status === status);
            return (
              <div key={status} className={`p-2 rounded-lg border ${STATUS_COLORS[status]} min-h-[300px]`}>
                <div className="flex items-center justify-between mb-2 px-1"><span className="text-xs font-semibold">{TASK_STATUS_LABEL[status]}</span><Badge variant="outline" className="text-[10px]">{inCol.length}</Badge></div>
                <div className="space-y-2">
                  {inCol.map((t) => {
                    const proj = projects.find((p) => p.id === t.projectId);
                    const overdueFlag = t.dueDate && t.dueDate < new Date().toISOString().slice(0, 10) && t.status !== "done";
                    return (
                      <div key={t.id} className="bg-white rounded p-2 border border-slate-200 hover:border-slate-400 cursor-pointer" onClick={() => navigate(`/tasks/${t.id}`)}>
                        <div className="flex items-start justify-between gap-1"><div className="text-sm font-medium leading-tight">{t.title}</div><Badge variant="outline" className={`text-[9px] ${PRIORITY_COLORS[t.priority]}`}>{PRIORITY_LABEL[t.priority]}</Badge></div>
                        {proj && <div className="text-[10px] text-slate-500 mt-0.5 truncate">{proj.nameEn}</div>}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            {(t.assigneeUserIds?.length ? t.assigneeUserIds : t.assigneeUserId ? [t.assigneeUserId] : []).slice(0, 3).map((uid) => (
                              <Avatar key={uid} className="h-5 w-5"><AvatarFallback className="text-[8px]">{userInitials(uid)}</AvatarFallback></Avatar>
                            ))}
                            {t.dueDate && <span className={`text-[10px] tabular-nums ${overdueFlag ? "text-red-600 font-medium" : "text-slate-500"}`}>{t.dueDate}</span>}
                          </div>
                          <div className="flex">
                            <Button size="sm" variant="ghost" className="h-6 px-1" title="Open chat" onClick={(e) => { e.stopPropagation(); navigate(`/tasks/${t.id}`); }}><MessagesSquare className="w-3 h-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-6 px-1" title="Edit" onClick={(e) => { e.stopPropagation(); openEdit(t); }}><Pencil className="w-3 h-3" /></Button>
                            {status !== "todo" && <Button size="sm" variant="ghost" className="h-6 px-1" onClick={(e) => { e.stopPropagation(); moveStatus(t, -1); }}><ArrowLeft className="w-3 h-3" /></Button>}
                            {status !== "done" && <Button size="sm" variant="ghost" className="h-6 px-1" onClick={(e) => { e.stopPropagation(); moveStatus(t, 1); }}><ArrowRight className="w-3 h-3" /></Button>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {inCol.length === 0 && <div className="text-[10px] text-slate-400 text-center mt-3">Empty</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="text-left px-3 py-2">Title</th><th className="text-left px-3 py-2">Project</th><th className="text-left px-3 py-2">Assignee</th><th className="text-left px-3 py-2">Priority</th><th className="text-left px-3 py-2">Due</th><th className="text-left px-3 py-2">Status</th><th className="text-right px-3 py-2"></th></tr></thead>
              <tbody>
                {filtered.map((t) => {
                  const proj = projects.find((p) => p.id === t.projectId);
                  const overdueFlag = t.dueDate && t.dueDate < new Date().toISOString().slice(0, 10) && t.status !== "done";
                  return (
                    <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/tasks/${t.id}`)}>
                      <td className="px-3 py-2">{t.title}</td>
                      <td className="px-3 py-2 text-xs">{proj?.nameEn || "—"}</td>
                      <td className="px-3 py-2 text-xs">{(t.assigneeUserIds?.length ? t.assigneeUserIds.map(userName).join(", ") : userName(t.assigneeUserId))}</td>
                      <td className="px-3 py-2"><Badge variant="outline" className={PRIORITY_COLORS[t.priority]}>{PRIORITY_LABEL[t.priority]}</Badge></td>
                      <td className={`px-3 py-2 text-xs tabular-nums ${overdueFlag ? "text-red-600 font-medium" : ""}`}>{t.dueDate || "—"}</td>
                      <td className="px-3 py-2"><Badge variant="outline" className="capitalize">{TASK_STATUS_LABEL[t.status]}</Badge></td>
                      <td className="px-3 py-2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="h-7 px-2" title="Open chat" onClick={() => navigate(`/tasks/${t.id}`)}><MessagesSquare className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" title="Edit" onClick={() => openEdit(t)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => deleteTask(t)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit task" : "New task"}</DialogTitle><DialogDescription>{editing && `Created ${new Date(editing.createdAt).toLocaleDateString("en-GB", { timeZone: "UTC" })}`}</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Title</Label><Input value={draft.title || ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Description</Label><Textarea rows={2} value={draft.description || ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Status</Label><Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as TaskStatus })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{TASK_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{TASK_STATUS_LABEL[s]}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs">Priority</Label><Select value={draft.priority} onValueChange={(v) => setDraft({ ...draft, priority: v as TaskPriority })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{(["low","medium","high","urgent"] as TaskPriority[]).map((p) => <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs">Project</Label><Select value={draft.projectId || "_none"} onValueChange={(v) => setDraft({ ...draft, projectId: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="_none">— None —</SelectItem>{visibleProjects(projects, currentUser).map((p) => <SelectItem key={p.id} value={p.id}>{p.nameEn}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs">Category</Label><Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v as TaskCategory })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{(["design","review","meeting","submission","site","admin","client","other"] as TaskCategory[]).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs">Assignee</Label><Select value={draft.assigneeUserId || "_none"} onValueChange={(v) => setDraft({ ...draft, assigneeUserId: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="_none">— None —</SelectItem>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs">Due date</Label><Input type="date" value={draft.dueDate || ""} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} className="mt-1" /></div>
            </div>
          </div>
          <DialogFooter>
            {editing && <Button variant="outline" onClick={() => { deleteTask(editing); setOpen(false); }}><Trash2 className="w-3.5 h-3.5 mr-1 text-red-500" /> Delete</Button>}
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function KPI({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: number; sub?: string; tone?: "bad" }) {
  return <Card className={tone === "bad" && value > 0 ? "border-red-200 bg-red-50" : ""}><CardContent className="p-3"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">{icon}</div><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-bold leading-tight">{value}</p>{sub && <p className="text-[10px] text-muted-foreground truncate">{sub}</p>}</div></div></CardContent></Card>;
}
