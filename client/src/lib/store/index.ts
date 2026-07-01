/**
 * Generic store layer — delegates to whatever Backend is active
 * (LocalBackend by default, SupabaseBackend when configured in Settings).
 *
 * Existing API surface unchanged: createCollection / useCollection / newId
 * / createSingleton / useSingleton. Every page using these keeps working.
 */
import { useEffect, useState } from "react";
import { getBackend, onBackendChange } from "@/lib/backend";

const STORAGE_PREFIX = "nasec-erp-v1::";

// ---- Pub/sub
type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();
function notify(name: string) { listeners.get(name)?.forEach((l) => { try { l(); } catch { /* noop */ } }); }

// ---- Collection
export type Collection<T extends { id: string }> = {
  name: string;
  list: () => T[];
  get: (id: string) => T | undefined;
  put: (item: T) => T;
  upsertMany: (items: T[]) => void;
  remove: (id: string) => void;
  clear: () => void;
  reseed: (items: T[]) => void;
  /** Re-pull from the source (API refetch / localStorage re-read + notify). */
  refresh?: () => void;
};

export function createCollection<T extends { id: string }>(name: string, defaultItems: T[] = []): Collection<T> {
  const key = STORAGE_PREFIX + name;

  function readAll(): T[] {
    const raw = getBackend().read(key);
    if (!raw) return [];
    try { return JSON.parse(raw) as T[]; } catch { return []; }
  }
  function writeAll(items: T[]) {
    getBackend().write(key, JSON.stringify(items));
    notify(name);
  }
  // Idempotent seed
  if (readAll().length === 0 && defaultItems.length > 0) writeAll(defaultItems);

  // Subscribe to backend changes for this key (realtime when on Supabase)
  if (typeof window !== "undefined") {
    getBackend().subscribe(key, () => notify(name));
    onBackendChange(() => {
      // When backend swaps, re-seed if empty and refresh subscribers
      if (readAll().length === 0 && defaultItems.length > 0) writeAll(defaultItems);
      getBackend().subscribe(key, () => notify(name));
      notify(name);
    });
  }

  return {
    name,
    list: () => readAll(),
    get: (id) => readAll().find((x) => x.id === id),
    put: (item) => {
      const all = readAll();
      const idx = all.findIndex((x) => x.id === item.id);
      if (idx >= 0) all[idx] = item; else all.push(item);
      writeAll(all);
      return item;
    },
    upsertMany: (items) => {
      const all = readAll();
      const map = new Map(all.map((x) => [x.id, x]));
      for (const it of items) map.set(it.id, it);
      writeAll(Array.from(map.values()));
    },
    remove: (id) => writeAll(readAll().filter((x) => x.id !== id)),
    clear: () => writeAll([]),
    reseed: (items) => writeAll(items),
    refresh: () => notify(name),
  };
}

// ---- React hook — re-renders consumer when collection changes
export function useCollection<T extends { id: string }>(c: Collection<T>): T[] {
  const [, force] = useState(0);
  useEffect(() => {
    if (!listeners.has(c.name)) listeners.set(c.name, new Set());
    const fn = () => force((n) => n + 1);
    listeners.get(c.name)!.add(fn);
    return () => { listeners.get(c.name)?.delete(fn); };
  }, [c.name]);
  return c.list();
}

// ---- Utility: short id
export function newId(prefix = "id"): string {
  return prefix + "-" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

// ---- Singleton (single value, not a collection)
export type Singleton<T> = { name: string; get: () => T; set: (v: T) => void };

export function createSingleton<T>(name: string, defaultValue: T): Singleton<T> {
  const key = STORAGE_PREFIX + "singleton::" + name;
  function read(): T {
    const raw = getBackend().read(key);
    if (raw === null) return defaultValue;
    try { return JSON.parse(raw) as T; } catch { return defaultValue; }
  }
  function write(v: T) {
    getBackend().write(key, JSON.stringify(v));
    notify(name);
  }
  if (typeof window !== "undefined") {
    getBackend().subscribe(key, () => notify(name));
    onBackendChange(() => { getBackend().subscribe(key, () => notify(name)); notify(name); });
  }
  return { name, get: read, set: write };
}

export function useSingleton<T>(s: Singleton<T>): T {
  const [, force] = useState(0);
  useEffect(() => {
    if (!listeners.has(s.name)) listeners.set(s.name, new Set());
    const fn = () => force((n) => n + 1);
    listeners.get(s.name)!.add(fn);
    return () => { listeners.get(s.name)?.delete(fn); };
  }, [s.name]);
  return s.get();
}

// Compatibility: keep setStoreBackend export so anything that imported it still typechecks.
export function setStoreBackend(_b: unknown) { /* deprecated — use lib/backend activateBackend */ }

// ---- API-backed Collection -----------------------------------------------
// A Collection<T> whose data lives on the real backend. Implements the same
// synchronous surface as createCollection() so existing pages don't change:
// .list() returns the current in-memory cache (initially []) and re-renders
// happen via the existing listeners map once the network response arrives.
//
// Mutations call the API, then optimistically refresh the cache.
import { apiFetch } from "@/lib/backend/api";

export type ApiCollectionEndpoints<T extends { id: string }> = {
  list: string;                                         // GET — returns T[]
  create: string;                                       // POST — returns T
  update: (id: string) => string;                       // PATCH — returns T
  remove: (id: string) => string;                       // DELETE
};

export type ApiCollectionOptions<T extends { id: string }> = {
  /** When the page hasn't loaded yet and we need data, fall back to these. */
  fallback?: T[];
  /** Map incoming server response rows to the expected frontend client format. */
  mapResponse?: (item: any) => T;
  /** Map the request body before POST (e.g. strip server-managed fields). */
  beforeCreate?: (item: T) => unknown;
  /** Map the request body before PATCH. */
  beforeUpdate?: (item: T) => unknown;
};

export function createApiCollection<T extends { id: string }>(
  name: string,
  endpoints: ApiCollectionEndpoints<T>,
  opts: ApiCollectionOptions<T> = {},
): Collection<T> {
  let cache: T[] = opts.fallback ?? [];
  let loaded = false;
  let inflight: Promise<T[]> | null = null;

  function setCache(next: T[]) {
    cache = next;
    notify(name);
  }

  async function refresh(): Promise<T[]> {
    if (inflight) return inflight;
    inflight = apiFetch<T[]>(endpoints.list)
      .then((rows) => {
        const mapped = opts.mapResponse ? rows.map(opts.mapResponse) : rows;
        loaded = true;
        setCache(mapped);
        return mapped;
      })
      .catch((err) => { console.warn(`[apiCollection:${name}] list failed`, err); return cache; })
      .finally(() => { inflight = null; });
    return inflight;
  }

  // Kick off initial load when running in the browser
  if (typeof window !== "undefined") {
    // Defer to next tick so AuthContext can set the token first
    setTimeout(() => { void refresh(); }, 0);
  }

  return {
    name,
    list: () => {
      if (!loaded && !inflight) void refresh();
      return cache;
    },
    get: (id) => cache.find((x) => x.id === id),
    put: (item) => {
      // Sync optimistic update
      const idx = cache.findIndex((x) => x.id === item.id);
      const existedBefore = idx >= 0;
      const next = existedBefore ? cache.map((x) => x.id === item.id ? item : x) : [...cache, item];
      setCache(next);

      const body = existedBefore
        ? (opts.beforeUpdate ? opts.beforeUpdate(item) : item)
        : (opts.beforeCreate ? opts.beforeCreate(item) : item);

      const promise = existedBefore
        ? apiFetch<T>(endpoints.update(item.id), { method: "PATCH", body })
        : apiFetch<T>(endpoints.create, { method: "POST", body });

      promise
        .then((saved) => {
          const mapped = opts.mapResponse ? opts.mapResponse(saved) : saved;
          // Server may have rewritten fields (e.g. id, timestamps) — reconcile
          const after = cache.map((x) => x.id === item.id ? { ...mapped, id: mapped.id ?? item.id } : x);
          // If server assigned a new id (e.g. uuid) replace the optimistic id
          if (mapped.id && mapped.id !== item.id) {
            setCache(after.map((x) => x.id === item.id ? mapped : x));
          } else {
            setCache(after);
          }
        })
        .catch((err) => {
          console.error(`[apiCollection:${name}] put failed — rolling back`, err);
          void refresh();
        });

      return item;
    },
    upsertMany: (items) => {
      // Treat as create-or-update one-by-one (rare in practice)
      for (const it of items) {
        const idx = cache.findIndex((x) => x.id === it.id);
        if (idx >= 0) cache[idx] = it; else cache.push(it);
      }
      notify(name);
      // Fire individual upserts; future improvement: bulk endpoint
      items.forEach((it) => {
        const body = opts.beforeUpdate ? opts.beforeUpdate(it) : it;
        apiFetch(endpoints.update(it.id), { method: "PATCH", body })
          .catch((err) => console.error(`[apiCollection:${name}] upsert failed`, err));
      });
    },
    remove: (id) => {
      const prev = cache;
      setCache(cache.filter((x) => x.id !== id));
      apiFetch(endpoints.remove(id), { method: "DELETE" })
        .catch((err) => {
          console.error(`[apiCollection:${name}] delete failed — rolling back`, err);
          setCache(prev);
        });
    },
    clear: () => {
      const prev = cache;
      setCache([]);
      // No bulk delete endpoint — fire individual deletes
      prev.forEach((x) => apiFetch(endpoints.remove(x.id), { method: "DELETE" }).catch(() => {}));
    },
    reseed: (items) => setCache(items),
    refresh: () => { void refresh(); },
  };
}
