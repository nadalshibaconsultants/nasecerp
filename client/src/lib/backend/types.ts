/**
 * Backend abstraction. The store layer delegates to whatever Backend is
 * currently active. Two implementations ship:
 *   - LocalBackend  → reads/writes browser localStorage (default, offline-friendly)
 *   - SupabaseBackend → reads/writes a hosted Postgres + realtime sync
 *
 * The interface intentionally mirrors localStorage's surface (sync-ish) plus a
 * subscribe hook so collections can re-render on remote changes.
 */
export type BackendKind = "local" | "supabase";

export type BackendInfo = {
  kind: BackendKind;
  ready: boolean;
  message?: string;
};

export type Backend = {
  info(): BackendInfo;
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
  /** Optional realtime subscribe — Local is a no-op, Supabase fires on remote changes */
  subscribe(key: string, fn: () => void): () => void;
};

export type BackendConfig = {
  kind: BackendKind;
  supabase?: { url: string; anonKey: string };
};
