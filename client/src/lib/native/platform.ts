/**
 * Native platform helpers. The web build uses these as no-ops; on a
 * Capacitor-packaged app they delegate to the real native modules.
 */
let cachedNative: boolean | null = null;

export function isNative(): boolean {
  if (cachedNative !== null) return cachedNative;
  try {
    // @ts-ignore — Capacitor injects globally in native builds
    const Cap = (window as any).Capacitor;
    cachedNative = !!(Cap && typeof Cap.isNativePlatform === "function" && Cap.isNativePlatform());
  } catch { cachedNative = false; }
  return cachedNative!;
}

export function nativePlatform(): "ios" | "android" | "web" {
  try {
    // @ts-ignore
    const p = (window as any).Capacitor?.getPlatform?.();
    if (p === "ios" || p === "android") return p;
  } catch { /* noop */ }
  return "web";
}

export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px)").matches;
}
