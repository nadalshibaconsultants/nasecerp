import type { Backend, BackendInfo } from "./types";

export function createLocalBackend(): Backend {
  // Cross-tab sync via the storage event
  const subs = new Map<string, Set<() => void>>();
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (!e.key) return;
      subs.get(e.key)?.forEach((fn) => { try { fn(); } catch { /* noop */ } });
    });
  }
  return {
    info(): BackendInfo { return { kind: "local", ready: true, message: "Browser localStorage (single-user)" }; },
    read(key) { try { return window.localStorage.getItem(key); } catch { return null; } },
    write(key, value) { try { window.localStorage.setItem(key, value); } catch { /* noop */ } },
    remove(key) { try { window.localStorage.removeItem(key); } catch { /* noop */ } },
    subscribe(key, fn) {
      if (!subs.has(key)) subs.set(key, new Set());
      subs.get(key)!.add(fn);
      return () => { subs.get(key)?.delete(fn); };
    },
  };
}
