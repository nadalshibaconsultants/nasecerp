/**
 * Inline TaskTimer — one running session at a time per user.
 * Persists in activeTimerStore so the clock survives reloads.
 * When stopped, saves a TaskTimerSession to timerSessionsStore.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Play, Square, Pause } from "lucide-react";
import { activeTimerStore, timerSessionsStore } from "@/lib/stores";
import { useSingleton, useCollection } from "@/lib/store";
import { useAuth } from "@/lib/auth/AuthContext";
import { getActiveTimer, startTimer, stopTimer } from "@/lib/timer/api";

type Props = {
  taskId: string;
  /** Optional callback after a session is saved */
  onSaved?: () => void;
  /** Compact variant — narrower, ideal for rows in a list */
  compact?: boolean;
};

function fmtElapsed(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TaskTimer({ taskId, onSaved, compact }: Props) {
  const { currentUser } = useAuth();
  const active = useSingleton(activeTimerStore);
  const sessions = useCollection(timerSessionsStore);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!currentUser) return;
    getActiveTimer()
      .then((row) => {
        activeTimerStore.set(row ? { taskId: row.taskId, userId: row.userId, startedAt: row.startedAt, note: row.note ?? undefined } : null);
      })
      .catch((err) => console.warn("[timer] active timer sync failed", err));
  }, [currentUser]);

  // Tick every second when this task's timer is running
  const mine = active && active.userId === currentUser?.id && active.taskId === taskId;
  useEffect(() => {
    if (!mine) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [mine]);

  // Total time previously logged on this task (in seconds) for this user
  const totalPrev = sessions
    .filter((s) => s.taskId === taskId && s.userId === currentUser?.id)
    .reduce((a, s) => a + s.durationSec, 0);
  const liveSec = mine && active ? Math.max(0, Math.round((now - new Date(active.startedAt).getTime()) / 1000)) : 0;
  const total = totalPrev + liveSec;

  async function start() {
    if (!currentUser) return;
    if (active && active.taskId !== taskId) {
      if (!confirm("Another task timer is running. Stop it and start this one?")) return;
      await stop(true);
    }
    try {
      const row = await startTimer(taskId);
      activeTimerStore.set({ taskId: row.taskId, userId: row.userId, startedAt: row.startedAt, note: row.note ?? undefined });
      timerSessionsStore.refresh?.();
      toast.success("Timer started");
    } catch (err: any) {
      toast.error(err?.message || "Could not start timer");
    }
  }
  async function stop(silent = false) {
    if (!active || !currentUser) return;
    try {
      const session = await stopTimer(active.taskId);
      activeTimerStore.set(null);
      timerSessionsStore.refresh?.();
      if (!silent) toast.success(`Logged ${fmtElapsed(session.durationSec || 0)}`);
      onSaved?.();
    } catch (err: any) {
      toast.error(err?.message || "Could not stop timer");
    }
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {mine ? (
          <>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 tabular-nums">{fmtElapsed(liveSec)}</Badge>
            <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => stop()}><Square className="w-3 h-3" /> Stop</Button>
          </>
        ) : (
          <>
            <Badge variant="outline" className="tabular-nums text-slate-600">{fmtElapsed(totalPrev)}</Badge>
            <Button size="sm" className="h-7 gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={start}><Play className="w-3 h-3" /> Start</Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mine ? "bg-emerald-100" : "bg-slate-100"}`}>
        {mine ? <Pause className="w-5 h-5 text-emerald-700" /> : <Play className="w-5 h-5 text-slate-700" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-slate-500">{mine ? "Running" : "Time on this task"}</div>
        <div className="text-2xl font-bold tabular-nums">{fmtElapsed(total)}</div>
        {totalPrev > 0 && mine && <div className="text-[10px] text-slate-500">(+{fmtElapsed(totalPrev)} from previous sessions)</div>}
      </div>
      {mine ? (
        <Button onClick={() => stop()} className="gap-1.5"><Square className="w-4 h-4" /> Stop & log</Button>
      ) : (
        <Button onClick={start} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"><Play className="w-4 h-4" /> Start working</Button>
      )}
    </div>
  );
}
