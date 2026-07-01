import type { LocationPing } from "@/lib/attendance/presence";
import { SEED_EMPLOYEES } from "./employees";
import { SEED_GEOFENCES, OFFICE_GEOFENCE } from "./geofences";

const now = new Date();
function isoNow(minOffset = 0) { return new Date(now.getTime() + minOffset * 60_000).toISOString(); }
const fenceById = new Map(SEED_GEOFENCES.map((g) => [g.projectId, g]));

export const SEED_LOCATIONS: LocationPing[] = SEED_EMPLOYEES.map((e, idx) => {
  const fence = (e.assignedProjectId && fenceById.get(e.assignedProjectId)) || OFFICE_GEOFENCE;
  const offsetMin = idx === 7 ? -65 : 0;
  const inTransit = idx === 11;
  const lat = inTransit ? fence.center.lat + 0.012 : fence.center.lat + (Math.random() - 0.5) * 0.0008;
  const lng = inTransit ? fence.center.lng + 0.018 : fence.center.lng + (Math.random() - 0.5) * 0.0008;
  return {
    id: `ping-${e.id}`, employeeId: e.id,
    lat, lng, accuracyM: 8 + Math.round(Math.random() * 6),
    timestamp: isoNow(offsetMin),
    batteryPct: 30 + Math.round(Math.random() * 65),
    deviceState: inTransit ? "active" : "stationary",
  };
});
