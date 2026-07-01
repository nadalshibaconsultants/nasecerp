/**
 * 30 days of attendance punches across 12 employees and 4 active sites.
 *
 * Constructed deterministically so the demo always shows:
 *  - Most employees punching in/out at their assigned site
 *  - One out-of-geofence event (Mohammed Iqbal, day -10)
 *  - One absence (Sara Khan, day -8)
 *  - One late-arrival (James Wong, day -5, in @ 10:15)
 *  - One overtime evening (Omar Al-Shamsi, day -3 — 11h on site)
 *  - One approved leave window (Priya Nair, days -14..-12)
 */
import type { AttendancePunch, LeaveRequest } from "@/lib/attendance/types";
import { SEED_EMPLOYEES } from "./employees";
import { SEED_GEOFENCES, OFFICE_GEOFENCE } from "./geofences";

const today = new Date();
function dayOffset(n: number) {
  const d = new Date(today.getTime());
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}
function iso(d: Date, hh: number, mm: number) {
  const out = new Date(d.getTime());
  out.setUTCHours(hh, mm, 0, 0);
  return out.toISOString();
}
function isoDateOnly(d: Date) { return d.toISOString().slice(0, 10); }

const fences = new Map(SEED_GEOFENCES.map((g) => [g.projectId, g]));
const punches: AttendancePunch[] = [];

let nextId = 1;
function pid() { return "punch-" + (nextId++).toString(36); }

for (let off = -29; off <= 0; off++) {
  const day = dayOffset(off);
  const dow = day.getUTCDay();
  const isWeekend = dow === 0 || dow === 6;
  if (isWeekend) continue;

  for (const emp of SEED_EMPLOYEES) {
    // Skip absent employee for one specific day
    if (emp.id === "emp-sara-khan" && off === -8) continue;
    // Skip leave window for Priya Nair
    if (emp.id === "emp-priya-nair" && off >= -14 && off <= -12) continue;

    const projectId = emp.assignedProjectId;
    const fence = projectId ? fences.get(projectId) : undefined;
    const isOfficeBased = !fence || emp.workLocation === "Office" || emp.department === "HR" || emp.department === "Finance" || emp.department === "Business Development" || emp.department === "Admin" || emp.department === "BIM";
    const usedFence = isOfficeBased ? OFFICE_GEOFENCE : fence!;

    // Default working window 08:00 - 17:00, with lunch break (skipped — single in / single out for simplicity)
    let inH = 8, inM = 0, outH = 17, outM = 0;

    // Late arrival case
    if (emp.id === "emp-james-wong" && off === -5) { inH = 10; inM = 15; }

    // Overtime case
    if (emp.id === "emp-omar-shamsi" && off === -3) { outH = 19; outM = 30; }

    const inT = iso(day, inH, inM);
    const outT = iso(day, outH, outM);

    // GPS — usually inside fence; one out-of-geofence event
    const inGeo = !(emp.id === "emp-mohammed-iqbal" && off === -10);
    const lat = usedFence.center.lat + (inGeo ? 0.0004 : 0.005);  // ~50m vs ~500m
    const lng = usedFence.center.lng + (inGeo ? 0.0003 : 0.005);
    const accuracy = 8;

    punches.push({
      id: pid(),
      employeeId: emp.id,
      projectId: usedFence.projectId === "office" ? undefined : usedFence.projectId,
      timestamp: inT,
      type: "in",
      gpsLat: lat, gpsLng: lng, accuracyM: accuracy,
      geofenceCheck: usedFence.projectId === "office" ? "office" : (inGeo ? "passed" : "failed-out"),
      device: "mobile-app",
    });
    punches.push({
      id: pid(),
      employeeId: emp.id,
      projectId: usedFence.projectId === "office" ? undefined : usedFence.projectId,
      timestamp: outT,
      type: "out",
      gpsLat: lat, gpsLng: lng, accuracyM: accuracy,
      geofenceCheck: usedFence.projectId === "office" ? "office" : (inGeo ? "passed" : "failed-out"),
      device: "mobile-app",
    });
  }
}

export const SEED_PUNCHES: AttendancePunch[] = punches;

export const SEED_LEAVES: LeaveRequest[] = [
  {
    id: "lv-priya-1",
    employeeId: "emp-priya-nair",
    type: "annual",
    fromDate: isoDateOnly(dayOffset(-14)),
    toDate: isoDateOnly(dayOffset(-12)),
    status: "approved",
    approvedBy: "emp-fatima-zaabi",
    note: "Family travel — pre-approved",
    createdAt: dayOffset(-30).toISOString(),
  },
];
