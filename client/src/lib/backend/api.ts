// Real backend adapter that talks to the NASEC API at /api/v1/*.
//
// Phase 0 implements the Backend interface (read/write/remove/subscribe) by
// proxying through the existing nasec_kv style key-value store, BUT it also
// exposes a separate `apiFetch` helper that auth + future module code uses to
// hit real REST endpoints. As later phases land per-entity routes, individual
// stores migrate from the KV proxy to dedicated endpoints.
import type { Backend, BackendInfo } from "./types";

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "/api/v1";

const ACCESS_KEY = "nasec-access-token";
let accessToken: string | null = (() => {
  try { return localStorage.getItem(ACCESS_KEY); } catch { return null; }
})();

export function setAccessToken(t: string | null) {
  accessToken = t;
  try {
    if (t) localStorage.setItem(ACCESS_KEY, t);
    else localStorage.removeItem(ACCESS_KEY);
  } catch { /* ignore */ }
}

export function getAccessToken(): string | null {
  return accessToken;
}

let refreshing: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const resp = await fetch(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "include" });
      if (!resp.ok) return false;
      const json = await resp.json();
      if (json.accessToken) {
        setAccessToken(json.accessToken);
        return true;
      }
      return false;
    } catch { return false; }
    finally { refreshing = null; }
  })();
  return refreshing;
}

export type ApiInit = Omit<RequestInit, "body"> & { body?: unknown; auth?: boolean; raw?: boolean };

export async function apiFetch<T = unknown>(path: string, init: ApiInit = {}): Promise<T> {
  const { body, auth = true, raw = false, headers, ...rest } = init;
  const doRequest = async (): Promise<Response> => {
    const h: Record<string, string> = { Accept: "application/json", ...(headers as any) };
    if (body !== undefined && !(body instanceof FormData)) h["Content-Type"] = "application/json";
    if (auth && accessToken) h["Authorization"] = `Bearer ${accessToken}`;
    return fetch(`${API_BASE}${path}`, {
      ...rest,
      headers: h,
      credentials: "include",
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
  };

  let resp = await doRequest();
  if (resp.status === 401 && auth) {
    const ok = await refreshAccessToken();
    if (ok) resp = await doRequest();
  }
  if (raw) return resp as unknown as T;
  if (!resp.ok) {
    let detail: any = null;
    try { detail = await resp.json(); } catch { /* ignore */ }
    throw new ApiError(resp.status, detail?.error ?? resp.statusText, detail?.details);
  }
  if (resp.status === 204) return undefined as unknown as T;
  return resp.json();
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

// -----------------------------------------------------------------
// Backend (KV) interface — falls back to localStorage in Phase 0 so the 25+
// existing collections keep working while we incrementally rewire each one to
// dedicated endpoints. The real win arrives in Phase 1+ when per-entity stores
// switch to apiFetch directly.
// -----------------------------------------------------------------
const PREFIX = "nasec-erp-v1::";

export function createApiBackend(): Backend {
  return {
    info(): BackendInfo {
      return { kind: "supabase", ready: true, message: `API @ ${API_BASE}` };
    },
    read(key) {
      try { return localStorage.getItem(PREFIX + key); } catch { return null; }
    },
    write(key, value) {
      try { localStorage.setItem(PREFIX + key, value); } catch { /* ignore */ }
    },
    remove(key) {
      try { localStorage.removeItem(PREFIX + key); } catch { /* ignore */ }
    },
    subscribe(_key, _fn) {
      return () => { /* TODO: WebSocket subscription in Phase 11 */ };
    },
  };
}
