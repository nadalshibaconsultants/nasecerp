/**
 * Task time-tracking types.
 *
 * - TaskTimerSession: a completed work block. Persisted in timerSessionsStore.
 * - ActiveTimer (singleton): the currently-running timer for the signed-in user,
 *   if any. Persists across reloads so the clock keeps counting.
 */
export type TaskTimerSession = {
  id: string;
  taskId: string;
  userId: string;
  startedAt: string;   // ISO
  endedAt: string;     // ISO
  durationSec: number;
  note?: string;
};

export type ActiveTimer = {
  taskId: string;
  userId: string;
  startedAt: string;   // ISO
  note?: string;
} | null;
