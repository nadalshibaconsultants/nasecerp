import type { Backend, BackendInfo } from "./types";

/**
 * Supabase adapter — connects via the official @supabase/supabase-js client.
 *
 * Storage model: a single "kv" table with (key text primary key, value text, updated_at timestamptz default now()).
 * This keeps the adapter shape identical to localStorage. Realtime channels
 * subscribe per-key and fire local subscribers on remote changes.
 *
 * For larger-scale production you'd map each collection to its own Postgres
 * table for query performance — that's a follow-up; the kv-table version is
 * fast to ship and works for the data volumes a small consultancy would have.
 *
 * NOTE: this code compiles even without @supabase/supabase-js installed, because
 * the client is loaded dynamically via globalThis. Install the package + paste
 * URL/key in Settings → Backend to activate.
 */
type SupabaseClient = any;

const KV_TABLE = "nasec_kv";

export function createSupabaseBackend(url: string, anonKey: string): Backend {
  let client: SupabaseClient | null = null;
  let ready = false;
  let initError: string | undefined;
  const subs = new Map<string, Set<() => void>>();
  // Local cache: read returns instantly from cache, writes go to Supabase + cache
  const cache = new Map<string, string>();
  // Hydrate cache from localStorage so reads stay fast offline
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)!;
      cache.set(k, window.localStorage.getItem(k)!);
    }
  } catch { /* noop */ }

  // Attempt to load the Supabase client. We use a dynamic import because in
  // some build environments tree-shaking gets aggressive.
  (async () => {
    try {
      // @ts-ignore — package may not be installed; loaded at runtime when activated
const mod: any = await (new Function("return import('@supabase/supabase-js').catch(() => null)")()).catch?.(() => null) || null;
      if (!mod) {
        initError = "@supabase/supabase-js not installed. Run: pnpm add @supabase/supabase-js";
        return;
      }
      client = mod.createClient(url, anonKey, { auth: { persistSession: true } });
      ready = true;
      // On every realtime broadcast, refresh cache for that key + notify subscribers
      const channel = client.channel("kv-broadcast");
      channel.on("postgres_changes", { event: "*", schema: "public", table: KV_TABLE }, async (payload: any) => {
        const k = payload?.new?.key || payload?.old?.key;
        if (!k) return;
        const { data } = await client!.from(KV_TABLE).select("value").eq("key", k).single();
        if (data) {
          cache.set(k, data.value);
          try { window.localStorage.setItem(k, data.value); } catch { /* noop */ }
        } else {
          cache.delete(k);
          try { window.localStorage.removeItem(k); } catch { /* noop */ }
        }
        subs.get(k)?.forEach((fn) => { try { fn(); } catch { /* noop */ } });
      });
      await channel.subscribe();
    } catch (e: any) {
      initError = e?.message || "Failed to initialise Supabase client";
    }
  })();

  return {
    info(): BackendInfo {
      return { kind: "supabase", ready, message: ready ? `Connected to ${url}` : (initError || "Connecting…") };
    },
    read(key) {
      // Cache hit instantly. Async refresh from Supabase happens via realtime.
      return cache.get(key) ?? null;
    },
    write(key, value) {
      cache.set(key, value);
      try { window.localStorage.setItem(key, value); } catch { /* noop */ }
      subs.get(key)?.forEach((fn) => { try { fn(); } catch { /* noop */ } });
      if (client) {
        client.from(KV_TABLE).upsert({ key, value }).then(() => { /* noop */ }, (e: any) => console.warn("Supabase write failed", e));
      }
    },
    remove(key) {
      cache.delete(key);
      try { window.localStorage.removeItem(key); } catch { /* noop */ }
      subs.get(key)?.forEach((fn) => { try { fn(); } catch { /* noop */ } });
      if (client) {
        client.from(KV_TABLE).delete().eq("key", key).then(() => { /* noop */ }, (e: any) => console.warn("Supabase remove failed", e));
      }
    },
    subscribe(key, fn) {
      if (!subs.has(key)) subs.set(key, new Set());
      subs.get(key)!.add(fn);
      return () => { subs.get(key)?.delete(fn); };
    },
  };
}
