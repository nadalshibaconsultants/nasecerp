/**
 * Geofence + attendance computation helpers.
 */
import type {
  Geofence, AttendancePunch, AttendanceDay, LeaveRequest, DayStatus,
} from "./types";
import { UAE_HOLIDAYS_2025_2027, isWeekend, fromISO, toISO } from "@/lib/timeline-utils";

const HOLIDAY_SET = new Set(UAE_HOLIDAYS_2025_2027.map((h) => h.date));

// ---- Haversine distance in meters between two lat/lng points
export function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function isInsideGeofence(g: Geofence, lat: number, lng: number, accuracyM = 0): boolean {
  const d = distanceMeters(g.center.lat, g.center.lng, lat, lng);
  // Add device accuracy as a tolerance to avoid spurious "out of fence" false negatives
  return d <= g.radiusM + Math.max(0, accuracyM);
}

// ---- Aggregate punches into per-employee per-day rows
export function aggregateDays(opts: {
  punches: AttendancePunch[];
  employeeIds: string[];
  fromDate: string;
  toDate: string;
  leaves?: LeaveRequest[];
  extraHolidays?: string[];
}): AttendanceDay[] {
  const out: AttendanceDay[] = [];
  const fromD = fromISO(opts.fromDate);
  const toD = fromISO(opts.toDate);
  const leaves = opts.leaves || [];

  // Index punches by employee + date for fast lookup
  const idx = new Map<string, AttendancePunch[]>();
  for (const p of opts.punches) {
    const date = p.timestamp.slice(0, 10);
    const key = p.employeeId + "::" + date;
    if (!idx.has(key)) idx.set(key, []);
    idx.get(key)!.push(p);
  }

  for (const empId of opts.employeeIds) {
    let cursor = new Date(fromD.getTime());
    while (cursor.getTime() <= toD.getTime()) {
      const date = toISO(cursor);
      const key = empId + "::" + date;
      const punches = (idx.get(key) || []).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      const day = computeDay(empId, date, punches, leaves, opts.extraHolidays || []);
      out.push(day);
      cursor = new Date(cursor.getTime() + 86_400_000);
    }
  }
  return out;
}

function computeDay(employeeId: string, date: string, punches: AttendancePunch[], leaves: LeaveRequest[], extraHolidays: string[]): AttendanceDay {
  const flags: AttendanceDay["flags"] = [];
  const dt = fromISO(date);
  const onLeave = leaves.some((l) => l.status === "approved" && l.employeeId === employeeId && date >= l.fromDate && date <= l.toDate);
  const isHol = HOLIDAY_SET.has(date) || extraHolidays.includes(date);
  const isWE = isWeekend(dt);

  if (punches.length === 0) {
    let status: DayStatus = "absent";
    if (onLeave) status = "leave";
    else if (isHol) status = "holiday";
    else if (isWE) status = "weekend";
    return {
      employeeId, date, totalMinutes: 0, normalMinutes: 0, overtimeMinutes: 0,
      status, punchCount: 0, flags,
    };
  }

  // Pair ins/outs in time order; if odd number, the last in has no matching out
  let totalMs = 0;
  let firstIn: string | undefined;
  let lastOut: string | undefined;
  let openIn: AttendancePunch | undefined;
  for (const p of punches) {
    if (p.type === "in") {
      if (!firstIn) firstIn = p.timestamp;
      openIn = p;
    } else if (p.type === "out") {
      lastOut = p.timestamp;
      if (openIn) {
        totalMs += new Date(p.timestamp).getTime() - new Date(openIn.timestamp).getTime();
        openIn = undefined;
      }
    }
  }
  if (openIn) flags.push("missing-out");

  // Late-after-9am check
  if (firstIn) {
    const inH = new Date(firstIn).getUTCHours();
    if (inH >= 9) flags.push("late");
  }
  // Out-of-geofence check
  if (punches.some((p) => p.geofenceCheck === "failed-out")) flags.push("out-of-geofence");

  const totalMin = Math.max(0, Math.round(totalMs / 60_000));
  const normalMin = Math.min(480, totalMin);
  const overtimeMin = Math.max(0, totalMin - 480);
  if (overtimeMin > 0) flags.push("ot-unapproved");

  // Primary project = the projectId of the longest in-window
  // (simple heuristic for this iteration — pick the projectId of the first punch)
  const projectId = punches.find((p) => p.projectId)?.projectId;

  let status: DayStatus = totalMin > 0 ? "present" : "partial";
  if (onLeave) status = "leave";
  else if (isHol) status = "holiday";
  else if (isWE) status = "weekend";

  return {
    employeeId, date,
    projectId,
    firstIn, lastOut,
    totalMinutes: totalMin, normalMinutes: normalMin, overtimeMinutes: overtimeMin,
    status, punchCount: punches.length, flags,
  };
}

// ---- Working day count in a calendar month
export function workingDaysInMonth(year: number, monthIndex0: number, extraHolidays: string[] = []): number {
  let count = 0;
  const last = new Date(Date.UTC(year, monthIndex0 + 1, 0));
  for (let d = 1; d <= last.getUTCDate(); d++) {
    const dt = new Date(Date.UTC(year, monthIndex0, d));
    const date = toISO(dt);
    if (isWeekend(dt)) continue;
    if (HOLIDAY_SET.has(date) || extraHolidays.includes(date)) continue;
    count++;
  }
  return count;
}

// ---- Filter days to a month
export function daysInMonth(days: AttendanceDay[], year: number, monthIndex0: number): AttendanceDay[] {
  const ym = `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-`;
  return days.filter((d) => d.date.startsWith(ym));
}
