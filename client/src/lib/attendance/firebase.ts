// Firebase attendance integration — talks to the NASEC API (Express), not Netlify.
// GET  /attendance/firebase/status  → connectivity + counts + detected mapping
// POST /attendance/firebase/sync    → pull latest punches into the DB (idempotent)
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/backend/api";

export type FirebaseStatus = {
  configured: boolean;
  connected: boolean;
  reason?: string;
  projectId?: string;
  dbUrl?: string;
  attendancePath?: string;
  recordCount?: number;
  matchedCount?: number;
  unmatchedCount?: number;
  mapping?: Record<string, string | null>;
  sample?: any[];
  projectOptions?: { id: string; name: string }[];
  employeeSiteMap?: Record<string, string[]>;
  lastSyncAt?: string | null;
  lastSyncResult?: { read: number; inserted: number; skipped: number; unmatched: number } | null;
};

export type SyncResult = { ok: boolean; dryRun: boolean; read: number; inserted: number; skipped: number; unmatched: number };

export async function fetchFirebaseStatus(): Promise<FirebaseStatus> {
  return apiFetch<FirebaseStatus>("/attendance/firebase/status");
}

export async function syncFirebaseNow(dryRun = false): Promise<SyncResult> {
  return apiFetch<SyncResult>(`/attendance/firebase/sync${dryRun ? "?dryRun=1" : ""}`, { method: "POST" });
}

/** Polls Firebase connection status; exposes a `sync()` that triggers an import then refreshes. */
export function useFirebaseAttendance() {
  const [status, setStatus] = useState<FirebaseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await fetchFirebaseStatus());
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to reach Firebase status endpoint");
    } finally {
      setLoading(false);
    }
  }, []);

  const sync = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await syncFirebaseNow(false);
      await refresh();
      return res;
    } catch (e: any) {
      setError(e?.message || "Sync failed");
      return null;
    } finally {
      setSyncing(false);
    }
  }, [refresh]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { status, loading, syncing, error, refresh, sync };
}
