/**
 * My Tasks — every signed-in user's personal task board.
 *   - Tasks where assigneeUserId = current user, status != done
 *   - Sorted: urgent first, then priority, then earliest due
 *   - Overdue tasks highlighted red
 *   - Inline TaskTimer per task with live clock
 *   - Click row → drawer with description, history, mark-complete
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ListTodo, AlertCircle, CheckCircle2, Clock, Activity, Flame, History, Calendar } from "lucide-react";
import { tasksStore, projectsStore, timerSessionsStore, auditStore, activeTimerStore } from "@/lib/stores";
import { useCollection, useSingleton, newId } from "@/lib/store";
import { useAuth, useCurrentActor } from "@/lib/auth/AuthContext";
import TaskTimer from "@/components/timer/TaskTimer";
import { PRIORITY_LABEL, TASK_STATUS_LABEL, type Task, type TaskStatus, type TaskPriority } from "@/lib/tasks/types";
import { stopTimer } from "@/lib/timer/api";

const PRIORITY_RANK: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

const PRIORITY_TONE: Record<TaskPriority, string> = {
  urgent: "border-red-300 bg-red-50 text-red-700",
  high: "border-orange-300 bg-orange-50 text-orange-700",
  medium: "border-amber-300 bg-amber-50 text-amber-700",
  low: "border-slate-300 bg-slate-50 text-slate-700",
};
const STATUS_TONE: Record<TaskStatus, string> = {
  todo: "bg-slate-100 text-slate-700",
  "in-progress": "bg-blue-100 text-blue-700",
  blocked: "bg-red-100 text-red-700",
  done: "bg-emerald-100 text-emerald-700",
};

export default function MyTasks() {
  const { currentUser } = useAuth();
  const actor = useCurrentActor();
  const tasks = useCollection(tasksStore);
  const projects = useCollection(projectsStore);
  const sessions = useCollection(timerSessionsStore);
  const active = useSingleton(activeTimerStore);
  useCollection(auditStore);
  const [detailId, setDetailId] = useState<string | undefined>(undefined);
  const [completeNote, setCompleteNote] = useState("");

  if (!currentUser) return null;

  const todayISO = new Date().toISOString().slice(0, 10);

  const myTasks = useMemo(() => tasks.filter((t) => t.assigneeUserId === currentUser.id), [tasks, currentUser]);
  const myOpen = useMemo(() => myTasks.filter((t) => t.status !== "done").sort((a, b) => {
    // Overdue first, then urgent priority, then earliest due
    const aOverdue = (a.dueDate || "9999-12-31") < todayISO ? 0 : 1;
    const bOverdue = (b.dueDate || "9999-12-31") < todayISO ? 0 : 1;
    if (aOverdue !== bOverdue) return aOverdue - bOverdue;
    if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority]) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    return (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31");
  }), [myTasks, todayISO]);
  const myDone = useMemo(() => myTasks.filter((t) => t.status === "done").slice(0, 12).sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || "")), [myTasks]);

  const overdueCount = myOpen.filter((t) => t.dueDate && t.dueDate < todayISO).length;
  const totalLoggedSec = sessions.filter((s) => s.userId === currentUser.id).reduce((a, s) => a + s.durationSec, 0);
  const todayLoggedSec = sessions.filter((s) => s.userId === currentUser.id && s.startedAt.slice(0, 10) === todayISO).reduce((a, s) => a + s.durationSec, 0);
  const weekStart = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const weekLoggedSec = sessions.filter((s) => s.userId === currentUser.id && s.startedAt.slice(0, 10) >= weekStart).reduce((a, s) => a + s.durationSec, 0);

  function fmtH(sec: number) { return (sec / 3600).toFixed(1) + "h"; }

  async function completeTask(t: Task) {
    const next: Task = { ...t, status: "done", completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    try {
      // If active timer was on this task, stop it on the backend first.
      const a = activeTimerStore.get();
      if (a && a.taskId === t.id) {
        await stopTimer(t.id);
        activeTimerStore.set(null);
        timerSessionsStore.refresh?.();
      }
      tasksStore.put(next);
      auditStore.put({ id: newId("au"), timestamp: new Date().toISOString(), actor, module: "hr", action: "update", subject: `Task completed · ${t.title}`, detail: completeNote });
      toast.success(`"${t.title}" marked complete`);
      setDetailId(undefined); setCompleteNote("");
    } catch (err: any) {
      toast.error(err?.message || "Could not complete task");
    }
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-slate-500">Personal</div>
          <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
          <p className="text-sm text-slate-600 mt-1">Everything assigned to you — start the timer on the one you're working on right now.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={<ListTodo className="w-4 h-4 text-blue-600" />} label="Open tasks" value={String(myOpen.length)} />
        <KPI icon={<AlertCircle className="w-4 h-4 text-red-600" />} label="Overdue" value={String(overdueCount)} tone={overdueCount > 0 ? "bad" : undefined} sub={overdueCount > 0 ? "Action needed" : "All on track"} />
        <KPI icon={<Clock className="w-4 h-4 text-emerald-600" />} label="Time today" value={fmtH(todayLoggedSec)} sub={fmtH(weekLoggedSec) + " this week"} />
        <KPI icon={<CheckCircle2 className="w-4 h-4 text-emerald-700" />} label="Completed (total)" value={String(myDone.length)} sub={fmtH(totalLoggedSec) + " logged total"} />
      </div>

      {/* Active timer banner */}
      {active && active.userId === currentUser.id && (() => {
        const task = tasks.find((t) => t.id === active.taskId);
        if (!task) return null;
        return (
          <Card className="border-emerald-300 bg-emerald-50">
            <CardContent className="p-3 flex items-center gap-3">
              <Activity className="w-5 h-5 text-emerald-700 shrink-0 animate-pulse" />
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-widest text-emerald-700">Currently working on</div>
                <div className="text-sm font-semibold truncate">{task.title}</div>
              </div>
              <TaskTimer taskId={task.id} compact />
            </CardContent>
          </Card>
        );
      })()}

      {/* Open tasks */}
      <div>
        <h2 className="text-base font-semibold mb-2 flex items-center gap-2"><Flame className="w-4 h-4 text-red-600" /> Open ({myOpen.length})</h2>
        {myOpen.length === 0 ? (
          <Card><CardContent className="p-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm text-slate-700 font-medium">Nothing on your plate.</p>
            <p className="text-xs text-slate-500 mt-1">You're all caught up.</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {myOpen.map((t) => {
              const proj = projects.find((p) => p.id === t.projectId);
              const overdue = !!t.dueDate && t.dueDate < todayISO;
              const ageDays = overdue && t.dueDate ? Math.max(1, Math.round((Date.now() - new Date(t.dueDate).getTime()) / 86_400_000)) : 0;
              return (
                <Card key={t.id} className={`${overdue ? "border-red-300 bg-red-50/40" : "hover:bg-slate-50/60"} transition-colors`}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-2 self-stretch rounded-full ${overdue ? "bg-red-500" : t.priority === "urgent" ? "bg-red-400" : t.priority === "high" ? "bg-orange-400" : t.priority === "medium" ? "bg-amber-400" : "bg-slate-300"}`} />
                      <div className="flex-1 min-w-0" onClick={() => setDetailId(t.id)}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-sm font-semibold truncate cursor-pointer">{t.title}</div>
                          <Badge variant="outline" className={`text-[10px] ${PRIORITY_TONE[t.priority]}`}>{PRIORITY_LABEL[t.priority]}</Badge>
                          <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_TONE[t.status]}`}>{TASK_STATUS_LABEL[t.status]}</Badge>
                          {overdue && <Badge className="bg-red-600 text-white text-[10px] gap-1"><AlertCircle className="w-3 h-3" /> Overdue · {ageDays}d</Badge>}
                        </div>
                        {t.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description}</p>}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-500">
                          {proj && <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {proj.nameEn}</span>}
                          {t.dueDate && <span className={`tabular-nums ${overdue ? "text-red-700 font-semibold" : ""}`}>Due {t.dueDate}</span>}
                          <span className="capitalize">{t.category}</span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <TaskTimer taskId={t.id} compact />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Done recently */}
      {myDone.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Completed recently</h2>
          <Card>
            <CardContent className="p-0 divide-y divide-slate-100">
              {myDone.map((t) => {
                const taskHours = sessions.filter((s) => s.taskId === t.id && s.userId === currentUser.id).reduce((a, s) => a + s.durationSec, 0) / 3600;
                return (
                  <div key={t.id} className="p-3 flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{t.title}</div>
                      <div className="text-[11px] text-slate-500">{t.completedAt && `Completed ${new Date(t.completedAt).toLocaleDateString("en-GB", { timeZone: "UTC" })}`}</div>
                    </div>
                    {taskHours > 0 && <Badge variant="outline" className="text-[10px] tabular-nums">{taskHours.toFixed(1)}h</Badge>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detailId} onOpenChange={(v) => !v && setDetailId(undefined)}>
        <DialogContent className="max-w-lg">
          {(() => {
            const t = myTasks.find((x) => x.id === detailId);
            if (!t) return null;
            const taskSessions = sessions.filter((s) => s.taskId === t.id && s.userId === currentUser.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
            const totalHours = taskSessions.reduce((a, s) => a + s.durationSec, 0) / 3600;
            const proj = projects.find((p) => p.id === t.projectId);
            const overdue = !!t.dueDate && t.dueDate < todayISO;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {overdue && <AlertCircle className="w-4 h-4 text-red-600" />}
                    {t.title}
                  </DialogTitle>
                  <DialogDescription className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={PRIORITY_TONE[t.priority]}>{PRIORITY_LABEL[t.priority]}</Badge>
                    <Badge variant="outline" className={`capitalize ${STATUS_TONE[t.status]}`}>{TASK_STATUS_LABEL[t.status]}</Badge>
                    {proj && <span className="text-xs">· {proj.nameEn}</span>}
                    {t.dueDate && <span className={`text-xs tabular-nums ${overdue ? "text-red-700 font-semibold" : ""}`}>· Due {t.dueDate}</span>}
                  </DialogDescription>
                </DialogHeader>

                {t.description && <p className="text-sm text-slate-700 p-3 bg-slate-50 rounded">{t.description}</p>}

                <TaskTimer taskId={t.id} onSaved={() => { /* re-renders via hook */ }} />

                {taskSessions.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold flex items-center gap-1.5 mb-1"><History className="w-3.5 h-3.5" /> Past sessions · {totalHours.toFixed(1)}h total</div>
                    <div className="space-y-1 max-h-40 overflow-auto">
                      {taskSessions.slice(0, 12).map((s) => (
                        <div key={s.id} className="flex items-center justify-between text-xs border-b border-slate-100 py-1">
                          <span className="text-slate-600">{new Date(s.startedAt).toLocaleString("en-GB", { timeZone: "UTC", hour12: true })}</span>
                          <span className="tabular-nums font-mono">{(s.durationSec / 3600).toFixed(2)}h</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {t.status !== "done" && (
                  <div>
                    <div className="text-xs font-semibold mb-1">Optional completion note</div>
                    <Textarea rows={2} value={completeNote} onChange={(e) => setCompleteNote(e.target.value)} placeholder="What did you do? (saved to the audit log)" />
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setDetailId(undefined)}>Close</Button>
                  {t.status !== "done" && <Button onClick={() => completeTask(t)} className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="w-4 h-4 mr-1.5" /> Mark complete</Button>}
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KPI({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: "bad" }) {
  return (
    <Card className={tone === "bad" && value !== "0" ? "border-red-300 bg-red-50/70 animate-pulse-slow" : ""}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">{icon}</div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-lg font-bold leading-tight ${tone === "bad" && value !== "0" ? "text-red-700" : ""}`}>{value}</p>
            {sub && <p className="text-[10px] text-muted-foreground truncate">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
