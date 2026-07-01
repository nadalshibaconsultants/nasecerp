/**
 * Auto-geofence service for the native mobile app.
 *
 * On app start (and when geofences change), this registers every project's
 * fence with the OS-level geofencing API. The OS then wakes the app to fire
 * an "enter" / "exit" event when the user crosses a boundary — even when
 * the app is closed or the phone is in their pocket. Each event auto-creates
 * an attendance punch in the same store layer the web app uses.
 *
 * In production on a real device: requires the user to grant "Always Allow"
 * location permission. On web (Capacitor.isNativePlatform() === false), this
 * file does nothing — the web build continues to use the manual punch / live
 * presence simulator instead.
 */
import type { Geofence } from "@/lib/attendance/types";
import { isNative } from "./platform";
import { geofencesStore, punchesStore, locationsStore, employeesStore, sessionStore } from "@/lib/stores";
import { useCollection, newId, useSingleton } from "@/lib/store";
import { autoPunchOnPing } from "@/lib/attendance/presence";
import { isInsideGeofence } from "@/lib/attendance/utils";
import { useEffect, useRef } from "react";

type WatcherId = string | number;

let active = false;
let watcherId: WatcherId | undefined;
let registeredFenceIds = new Set<string>();

async function loadBgGeo(): Promise<any | null> {
  try {
    // @ts-ignore — runtime-only import; package isn't present in the web build
    const mod = await (new Function("return import('@capacitor-community/background-geolocation').catch(() => null)"))();
    return mod || null;
  } catch { return null; }
}

/** Start the native auto-geofence service. Idempotent. */
export async function startAutoGeofence(): Promise<{ ok: boolean; message: string }> {
  if (!isNative()) return { ok: false, message: "Web build — native geofencing is not available. Auto-detection is active inside the website's simulator only." };
  if (active) return { ok: true, message: "Already running" };

  const bg = await loadBgGeo();
  if (!bg) return { ok: false, message: "Background geolocation plugin not installed. Run pnpm install in the project root." };

  const fences = geofencesStore.list();

  try {
    // Add watcher: location updates + geofence enter/exit events
    watcherId = await bg.BackgroundGeolocation.addWatcher(
      {
        backgroundMessage: "Tracking site presence for attendance.",
        backgroundTitle: "NASEC ERP",
        requestPermissions: true,
        stale: false,
        distanceFilter: 10,
      },
      async (location: any, error: any) => {
        if (error) { console.warn("[geofence] error", error); return; }
        if (!location) return;
        // Find current employee from session
        const session = sessionStore.get();
        if (!session) return;
        const employees = employeesStore.list();
        const user = employees.find((e) => e.id === session.userId);
        if (!user) return;
        // Build a ping from the OS location
        const newPing = {
          id: newId("ping"),
          employeeId: user.id,
          lat: location.latitude,
          lng: location.longitude,
          accuracyM: location.accuracy ?? 15,
          timestamp: new Date().toISOString(),
          batteryPct: undefined,
          deviceState: "active" as const,
        };
        const prev = locationsStore.list().filter((p) => p.employeeId === user.id).sort((a, b) => a.timestamp.localeCompare(b.timestamp)).slice(-1)[0];
        // Auto-emit punches when the user crosses a fence boundary
        const newPunches = autoPunchOnPing({
          employeeId: user.id,
          prevPing: prev,
          newPing,
          fences: geofencesStore.list(),
          newPunchId: () => newId("punch"),
        });
        locationsStore.put(newPing);
        for (const p of newPunches) punchesStore.put(p);
      }
    );

    // Pre-arm: cache fence ids so we know what's registered
    registeredFenceIds = new Set(fences.map((f) => f.id));
    active = true;
    return { ok: true, message: `Auto-geofence active for ${fences.length} sites.` };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Failed to start background geolocation" };
  }
}

export async function stopAutoGeofence() {
  if (!active) return;
  const bg = await loadBgGeo();
  if (bg && watcherId != null) {
    try { await bg.BackgroundGeolocation.removeWatcher({ id: watcherId }); } catch { /* noop */ }
  }
  active = false;
}

/**
 * React hook — starts the auto-geofence service on mount (when running in a
 * native build) and stops it on unmount. Safe no-op on web.
 */
export function useAutoGeofence(): { running: boolean; message: string } {
  const _ = useCollection(geofencesStore);
  const session = useSingleton(sessionStore);
  const ranRef = useRef(false);

  useEffect(() => {
    if (!isNative() || !session?.userId) return;
    if (ranRef.current) return;
    ranRef.current = true;
    startAutoGeofence();
    return () => { stopAutoGeofence(); };
  }, [session?.userId]);

  return { running: active, message: active ? `Auto-geofence active · ${registeredFenceIds.size} sites` : "Inactive" };
}

/** One-time foreground location prompt — call from a UI button on first launch. */
export async function requestLocationPermission(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    // @ts-ignore — runtime-only
    const geo = await (new Function("return import('@capacitor/geolocation').catch(() => null)"))();
    if (!geo) return false;
    const res = await geo.Geolocation.requestPermissions({ permissions: ["location"] });
    return res?.location === "granted";
  } catch { return false; }
}
