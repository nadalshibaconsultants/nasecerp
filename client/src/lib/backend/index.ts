import type { Backend, BackendConfig } from "./types";
import { createLocalBackend } from "./local";
import { createSupabaseBackend } from "./supabase";

const CONFIG_KEY = "nasec-backend-config-v1";

let active: Backend = createLocalBackend();
let listeners = new Set<() => void>();

export function getBackend(): Backend { return active; }

export function loadBackendConfig(): BackendConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return JSON.parse(raw) as BackendConfig;
  } catch { /* noop */ }
  return { kind: "local" };
}

export function saveBackendConfig(cfg: BackendConfig) {
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); } catch { /* noop */ }
}

export function activateBackend(cfg: BackendConfig) {
  if (cfg.kind === "supabase" && cfg.supabase?.url && cfg.supabase?.anonKey) {
    active = createSupabaseBackend(cfg.supabase.url, cfg.supabase.anonKey);
  } else {
    active = createLocalBackend();
  }
  saveBackendConfig(cfg);
  listeners.forEach((fn) => fn());
}

export function onBackendChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// Auto-activate on module load
activateBackend(loadBackendConfig());
