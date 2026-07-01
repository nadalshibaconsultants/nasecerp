import type { Geofence, AttendancePunch, GeofenceCheck } from "./types";
import { distanceMeters, isInsideGeofence } from "./utils";

export type LocationPing = {
  id: string;
  employeeId: string;
  lat: number;
  lng: number;
  accuracyM: number;
  timestamp: string;
  batteryPct?: number;
  deviceState?: "active" | "background" | "stationary" | "offline";
};

export type PresenceStatus = "on-site" | "in-office" | "in-transit" | "off-duty" | "offline";

export type EmployeePresence = {
  employeeId: string;
  status: PresenceStatus;
  currentFenceId?: string;
  lastLat?: number;
  lastLng?: number;
  lastSeen?: string;
  batteryPct?: number;
  metersFromFence?: number;
};

export function derivePresence(employeeId: string, latest: LocationPing | undefined, fences: Geofence[]): EmployeePresence {
  if (!latest) return { employeeId, status: "offline" };
  const ageMin = (Date.now() - new Date(latest.timestamp).getTime()) / 60_000;
  if (ageMin > 30) return { employeeId, status: "offline", lastSeen: latest.timestamp, lastLat: latest.lat, lastLng: latest.lng, batteryPct: latest.batteryPct };

  let inside: Geofence | undefined;
  let nearest: { fence: Geofence; dist: number } | undefined;
  for (const f of fences) {
    const d = distanceMeters(f.center.lat, f.center.lng, latest.lat, latest.lng);
    if (!nearest || d < nearest.dist) nearest = { fence: f, dist: d };
    if (isInsideGeofence(f, latest.lat, latest.lng, latest.accuracyM)) {
      if (!inside || (inside.projectId === "office" && f.projectId !== "office")) inside = f;
    }
  }

  if (inside) {
    const status: PresenceStatus = inside.projectId === "office" ? "in-office" : "on-site";
    return { employeeId, status, currentFenceId: inside.id, lastLat: latest.lat, lastLng: latest.lng, lastSeen: latest.timestamp, batteryPct: latest.batteryPct, metersFromFence: 0 };
  }
  const status: PresenceStatus = (latest.deviceState === "stationary") ? "off-duty" : "in-transit";
  return { employeeId, status, lastLat: latest.lat, lastLng: latest.lng, lastSeen: latest.timestamp, batteryPct: latest.batteryPct, metersFromFence: nearest ? Math.round(nearest.dist) : undefined };
}

export function autoPunchOnPing(opts: {
  employeeId: string;
  prevPing?: LocationPing;
  newPing: LocationPing;
  fences: Geofence[];
  newPunchId: () => string;
}): AttendancePunch[] {
  const { prevPing, newPing, fences, employeeId } = opts;
  const out: AttendancePunch[] = [];
  function fenceMembership(p: LocationPing): Geofence | undefined {
    let pick: Geofence | undefined;
    for (const f of fences) {
      if (isInsideGeofence(f, p.lat, p.lng, p.accuracyM)) {
        if (!pick || (pick.projectId === "office" && f.projectId !== "office")) pick = f;
      }
    }
    return pick;
  }
  const prevFence = prevPing ? fenceMembership(prevPing) : undefined;
  const curFence = fenceMembership(newPing);

  if (prevFence && prevFence.id !== curFence?.id) {
    out.push({
      id: opts.newPunchId(), employeeId,
      projectId: prevFence.projectId === "office" ? undefined : prevFence.projectId,
      timestamp: newPing.timestamp, type: "out",
      gpsLat: newPing.lat, gpsLng: newPing.lng, accuracyM: newPing.accuracyM,
      geofenceCheck: prevFence.projectId === "office" ? "office" : "passed",
      device: "mobile-app", note: "Auto-detected exit",
    });
  }
  if (curFence && curFence.id !== prevFence?.id) {
    const check: GeofenceCheck = curFence.projectId === "office" ? "office" : "passed";
    out.push({
      id: opts.newPunchId(), employeeId,
      projectId: curFence.projectId === "office" ? undefined : curFence.projectId,
      timestamp: newPing.timestamp, type: "in",
      gpsLat: newPing.lat, gpsLng: newPing.lng, accuracyM: newPing.accuracyM,
      geofenceCheck: check, device: "mobile-app", note: "Auto-detected entry",
    });
  }
  return out;
}
