// Thin API wrapper for task timer endpoints. Components should prefer these
// helpers over manipulating the timerSessionsStore directly so the active
// running session row stays consistent (only one per user at a time).
import { apiFetch } from "@/lib/backend/api";
import type { TaskTimerSession } from "./types";

export type ActiveSession = Omit<TaskTimerSession, "endedAt" | "durationSec" | "note"> & {
  endedAt: null;
  durationSec: number | null;
  note?: string | null;
};

export function getActiveTimer(): Promise<ActiveSession | null> {
  return apiFetch<ActiveSession | null>("/tasks/timer/active");
}

export function startTimer(taskId: string, note?: string): Promise<TaskTimerSession> {
  return apiFetch<TaskTimerSession>(`/tasks/${taskId}/timer/start`, {
    method: "POST",
    body: { note },
  });
}

export function stopTimer(taskId: string): Promise<TaskTimerSession> {
  return apiFetch<TaskTimerSession>(`/tasks/${taskId}/timer/stop`, { method: "POST" });
}

export function listTaskSessions(taskId: string): Promise<TaskTimerSession[]> {
  return apiFetch<TaskTimerSession[]>(`/tasks/${taskId}/sessions`);
}
