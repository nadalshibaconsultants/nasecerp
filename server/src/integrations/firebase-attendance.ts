/**
 * Firebase Realtime Database → ERP attendance importer.
 *
 * Pulls attendance punches from a Firebase RTDB node and writes them into
 * `attendance_punches`, matching each record to an employee by Staff ID,
 * Firebase UID, email, or full name. Idempotent (dedupes by employee+type+timestamp), so it is
 * safe to run repeatedly — used for both the one-time backfill and the
 * scheduled sync (jobs/firebase-sync.ts).
 *
 * Config (env):
 *   FIREBASE_SERVICE_ACCOUNT_PATH   path to the service-account JSON (preferred)
 *   FIREBASE_SERVICE_ACCOUNT_JSON   OR the JSON inline
 *   FIREBASE_DB_URL                 RTDB URL (default https://<projectId>-default-rtdb.firebaseio.com)
 *   FIREBASE_ATTENDANCE_PATH        RTDB node to read (default "attendance")
 *   FB_FIELD_STAFFID / _TS / _TYPE / _LAT / _LNG   override auto-detected field names
 *
 * Run a dry run first to confirm the detected field mapping:
 *   npm run import:firebase-attendance -- --dry-run
 */
import { readFileSync } from "node:fs";
import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { db, pool } from "../db/client.js";
import { employees, attendancePunches } from "../db/schema/index.js";

// ---- field name candidates (first match wins; env overrides take priority) ----
const STAFFID_KEYS = ["staffId", "staff_id", "staffID", "code", "empId", "employeeId", "employee_id", "badge", "badgeId", "empCode"];
const TS_KEYS = ["timestamp", "ts", "time", "datetime", "dateTime", "punchAt", "punchTime", "date", "epoch", "createdAt"];
const TYPE_KEYS = ["type", "direction", "status", "inOut", "punchType", "event", "action", "mode"];
const LAT_KEYS = ["lat", "latitude", "gpsLat"];
const LNG_KEYS = ["lng", "lon", "long", "longitude", "gpsLng"];
const SITE_KEYS = ["office", "site", "siteId", "siteName", "project", "projectId", "project_id", "location", "locationName", "allotted_office"];

function loadServiceAccount(): any {
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (path) return JSON.parse(readFileSync(path, "utf8"));
  if (inline) return JSON.parse(inline);
  throw new Error("Set FIREBASE_SERVICE_ACCOUNT_PATH (file) or FIREBASE_SERVICE_ACCOUNT_JSON (inline).");
}

let app: App | undefined;
function fbApp(sa: any): App {
  if (app) return app;
  if (getApps().length) { app = getApps()[0]; return app; }
  const databaseURL = process.env.FIREBASE_DB_URL || `https://${sa.project_id}-default-rtdb.firebaseio.com`;
  app = initializeApp({ credential: cert(sa), databaseURL });
  return app;
}

function pick(obj: any, keys: string[]): { key: string; value: any } | null {
  for (const k of keys) if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return { key: k, value: obj[k] };
  return null;
}

function parseTs(v: any): Date | null {
  if (typeof v === "number") {
    const ms = v > 1e12 ? v : v > 1e9 ? v * 1000 : v; // ms vs seconds
    const d = new Date(ms); return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function normalizeMatch(v: any): string {
  return String(v ?? "").trim().toLowerCase().replace(/[^a-z0-9@.]+/g, "");
}

function dateFromPath(segs: string[]): string | null {
  for (const seg of segs) {
    const m = String(seg).match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

function timeFromValue(v: any): string | null {
  const match = String(v ?? "").match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
  if (!match) return null;
  const [h, m, s = "00"] = match[1].split(":");
  return `${h.padStart(2, "0")}:${m}:${s}`;
}

function timeFromPath(segs: string[]): string | null {
  for (let i = segs.length - 1; i >= 0; i--) {
    const time = timeFromValue(segs[i]);
    if (time) return time;
  }
  return null;
}

function parseFirebaseTs(v: any, segs: string[]): Date | null {
  const direct = parseTs(v);
  if (direct) return direct;
  const date = dateFromPath(segs);
  const time = timeFromValue(v) ?? timeFromPath(segs);
  if (!date || !time) return null;
  const d = new Date(`${date}T${time}.000Z`);
  return isNaN(d.getTime()) ? null : d;
}

function parseType(v: any): "in" | "out" | null {
  const s = String(v).toLowerCase();
  if (["in", "checkin", "check-in", "check_in", "clockin", "clock-in", "1", "true", "entry"].includes(s)) return "in";
  if (["out", "checkout", "check-out", "check_out", "clockout", "clock-out", "0", "false", "exit"].includes(s)) return "out";
  if (s.includes("in")) return "in";
  if (s.includes("out")) return "out";
  return null;
}

type EmployeeMatch = {
  id: string;
  code: string;
  email: string;
  firstName: string;
  lastName: string;
};

function buildEmployeeLookup(emps: EmployeeMatch[]): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const emp of emps) {
    const fullName = `${emp.firstName} ${emp.lastName}`;
    for (const candidate of [emp.id, emp.code, emp.email, fullName]) {
      const key = normalizeMatch(candidate);
      if (key) lookup.set(key, emp.id);
    }
  }
  return lookup;
}

function firebaseUserCandidates(uid: string | undefined, rec: any, segs: string[], firebaseUsers: any): any[] {
  const user = uid ? firebaseUsers?.[uid] : undefined;
  return [
    pick(rec, STAFFID_KEYS)?.value,
    rec?.UID,
    rec?.uid,
    rec?.email,
    rec?.Email,
    uid,
    user?.UID,
    user?.uid,
    user?.staffId,
    user?.staffID,
    user?.code,
    user?.employeeId,
    user?.Email,
    user?.email,
    user?.authEmail,
    user?.Name,
    user?.name,
    user?.fullName,
    ...segs,
  ];
}

function resolveEmployeeId(rec: any, segs: string[], firebaseUsers: any, lookup: Map<string, string>): { employeeId?: string; staffRaw?: any } {
  const uid = segs[0];
  for (const candidate of firebaseUserCandidates(uid, rec, segs, firebaseUsers)) {
    const key = normalizeMatch(candidate);
    if (!key) continue;
    const employeeId = lookup.get(key);
    if (employeeId) return { employeeId, staffRaw: candidate };
  }
  return { staffRaw: uid ?? pick(rec, STAFFID_KEYS)?.value };
}

function firebaseSiteId(rec: any): string | undefined {
  const raw = pick(rec, SITE_KEYS)?.value;
  const site = String(raw ?? "").trim();
  return site || undefined;
}

function firebaseSiteName(id: string, locations: any, projects: any): string {
  const projectId = id.startsWith("project:") ? id.slice("project:".length) : id;
  return String(
    locations?.[id]?.name
      || locations?.[id]?.locationName
      || projects?.[projectId]?.locationName
      || projects?.[projectId]?.name
      || id,
  );
}

function buildFirebaseSiteOptions(records: { rec: any; path: string[] }[], locations: any, projects: any): { id: string; name: string }[] {
  const sites = new Map<string, string>();
  for (const { rec } of records) {
    const id = firebaseSiteId(rec);
    if (id) sites.set(id, firebaseSiteName(id, locations, projects));
  }
  for (const [id, loc] of Object.entries(locations || {})) {
    sites.set(String(id), String((loc as any)?.name || (loc as any)?.locationName || id));
  }
  for (const [id, project] of Object.entries(projects || {})) {
    const siteId = `project:${id}`;
    sites.set(siteId, String((project as any)?.locationName || (project as any)?.name || siteId));
  }
  return Array.from(sites.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Recursively collect leaf "record" objects + the path segments above them.
function collectRecords(node: any, path: string[], out: { rec: any; path: string[] }[]) {
  if (!node || typeof node !== "object") return;
  const values = Object.values(node);
  const looksLikePunch = pick(node, TS_KEYS) || pick(node, TYPE_KEYS) || pick(node, LAT_KEYS);
  const hasChildObjects = values.some((v) => v && typeof v === "object");
  if (looksLikePunch && !(hasChildObjects && !pick(node, TS_KEYS))) {
    out.push({ rec: node, path });
    return;
  }
  for (const [k, v] of Object.entries(node)) if (v && typeof v === "object") collectRecords(v, [...path, k], out);
}

// Last-sync state (in-memory) so the Attendance page can show "last synced …".
let lastSyncAt: string | null = null;
let lastSyncResult: { read: number; inserted: number; skipped: number; unmatched: number } | null = null;
export function getLastSync() { return { lastSyncAt, lastSyncResult }; }

export function isConfigured(): boolean {
  return !!(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
}

/**
 * Lightweight connectivity probe for the Attendance page banner — reads the
 * RTDB node and reports counts + the auto-detected field mapping WITHOUT writing.
 * Never throws: returns { connected:false, reason } so the UI can render a status.
 */
export async function getFirebaseStatus(): Promise<{
  configured: boolean; connected: boolean; reason?: string;
  projectId?: string; dbUrl?: string; attendancePath?: string;
  recordCount?: number; matchedCount?: number; unmatchedCount?: number;
  mapping?: Record<string, string | null>; sample?: any[];
  projectOptions?: { id: string; name: string }[];
  employeeSiteMap?: Record<string, string[]>;
  lastSyncAt?: string | null; lastSyncResult?: typeof lastSyncResult;
}> {
  if (!isConfigured()) {
    return { configured: false, connected: false, reason: "No Firebase service-account credentials configured on the server." };
  }
  let sa: any;
  try { sa = loadServiceAccount(); } catch (e: any) {
    return { configured: false, connected: false, reason: `Service-account key unreadable: ${e.message}` };
  }
  const path = process.env.FIREBASE_ATTENDANCE_PATH || "attendance";
  const dbUrl = process.env.FIREBASE_DB_URL || `https://${sa.project_id}-default-rtdb.firebaseio.com`;
  try {
    const database = getDatabase(fbApp(sa));
    const [snap, usersSnap, locationsSnap, projectsSnap] = await Promise.all([
      database.ref(path).get(),
      database.ref("users").get(),
      database.ref("location").get(),
      database.ref("projects").get(),
    ]);
    const firebaseUsers = usersSnap.exists() ? usersSnap.val() : {};
    const firebaseLocations = locationsSnap.exists() ? locationsSnap.val() : {};
    const firebaseProjects = projectsSnap.exists() ? projectsSnap.val() : {};
    const records: { rec: any; path: string[] }[] = [];
    if (snap.exists()) collectRecords(snap.val(), [], records);

    const emps = await db.select({
      id: employees.id,
      code: employees.code,
      email: employees.email,
      firstName: employees.firstName,
      lastName: employees.lastName,
    }).from(employees);
    const employeeLookup = buildEmployeeLookup(emps);

    const fStaff = process.env.FB_FIELD_STAFFID, fTs = process.env.FB_FIELD_TS, fType = process.env.FB_FIELD_TYPE, fLat = process.env.FB_FIELD_LAT, fLng = process.env.FB_FIELD_LNG;
    let matched = 0;
    const sample: any[] = [];
    const employeeSites = new Map<string, Set<string>>();
    for (const { rec, path: segs } of records) {
      const overrideStaff = fStaff && rec[fStaff] ? rec[fStaff] : undefined;
      const resolved = overrideStaff
        ? { employeeId: employeeLookup.get(normalizeMatch(overrideStaff)), staffRaw: overrideStaff }
        : resolveEmployeeId(rec, segs, firebaseUsers, employeeLookup);
      if (resolved.employeeId) {
        matched++;
        const site = firebaseSiteId(rec);
        if (site) {
          const current = employeeSites.get(resolved.employeeId) ?? new Set<string>();
          current.add(site);
          employeeSites.set(resolved.employeeId, current);
        }
      }
      if (sample.length < 5) sample.push({ staff: resolved.staffRaw ?? null, matched: !!resolved.employeeId, path: segs.join("/"), site: firebaseSiteId(rec) ?? null, raw: rec });
    }
    const employeeSiteMap = Object.fromEntries(Array.from(employeeSites.entries()).map(([employeeId, sites]) => [employeeId, Array.from(sites)]));
    const projectOptions = buildFirebaseSiteOptions(records, firebaseLocations, firebaseProjects);
    // Detected mapping from the first record (so the UI can show what we read)
    const first = records[0]?.rec ?? {};
    const mapping = {
      staffId: fStaff ?? pick(first, STAFFID_KEYS)?.key ?? null,
      timestamp: fTs ?? pick(first, TS_KEYS)?.key ?? null,
      type: fType ?? pick(first, TYPE_KEYS)?.key ?? null,
      lat: fLat ?? pick(first, LAT_KEYS)?.key ?? null,
      lng: fLng ?? pick(first, LNG_KEYS)?.key ?? null,
    };
    return {
      configured: true, connected: true,
      projectId: sa.project_id, dbUrl, attendancePath: path,
      recordCount: records.length, matchedCount: matched, unmatchedCount: records.length - matched,
      mapping, sample, projectOptions, employeeSiteMap, lastSyncAt, lastSyncResult,
    };
  } catch (e: any) {
    return { configured: true, connected: false, projectId: sa.project_id, dbUrl, attendancePath: path, reason: e.message };
  }
}

export async function runImport(opts: { dryRun?: boolean } = {}) {
  const sa = loadServiceAccount();
  const path = process.env.FIREBASE_ATTENDANCE_PATH || "attendance";
  const database = getDatabase(fbApp(sa));
  const [snap, usersSnap] = await Promise.all([database.ref(path).get(), database.ref("users").get()]);
  if (!snap.exists()) { console.log(`[firebase] no data at /${path}`); return { read: 0, inserted: 0, skipped: 0, unmatched: 0 }; }
  const firebaseUsers = usersSnap.exists() ? usersSnap.val() : {};

  const records: { rec: any; path: string[] }[] = [];
  collectRecords(snap.val(), [], records);

  const emps = await db.select({
    id: employees.id,
    code: employees.code,
    email: employees.email,
    firstName: employees.firstName,
    lastName: employees.lastName,
  }).from(employees);
  const employeeLookup = buildEmployeeLookup(emps);

  // Existing punches for dedupe: employeeId|epochMs|type
  const existing = await db.select({ employeeId: attendancePunches.employeeId, type: attendancePunches.type, timestamp: attendancePunches.timestamp }).from(attendancePunches);
  const seen = new Set(existing.map((p) => `${p.employeeId}|${new Date(p.timestamp as any).getTime()}|${p.type}`));

  const fStaff = process.env.FB_FIELD_STAFFID, fTs = process.env.FB_FIELD_TS, fType = process.env.FB_FIELD_TYPE, fLat = process.env.FB_FIELD_LAT, fLng = process.env.FB_FIELD_LNG;
  let inserted = 0, skipped = 0, unmatched = 0;
  const rows: any[] = [];
  const sampleLog: any[] = [];

  for (const { rec, path: segs } of records) {
    const overrideStaff = fStaff && rec[fStaff] ? rec[fStaff] : undefined;
    const resolved = overrideStaff
      ? { employeeId: employeeLookup.get(normalizeMatch(overrideStaff)), staffRaw: overrideStaff }
      : resolveEmployeeId(rec, segs, firebaseUsers, employeeLookup);
    const tsRaw = (fTs && rec[fTs]) ?? pick(rec, TS_KEYS)?.value ?? segs[segs.length - 1];
    const typeRaw = (fType && rec[fType]) ?? pick(rec, TYPE_KEYS)?.value ?? segs[segs.length - 1] ?? "in";
    const lat = (fLat && rec[fLat]) ?? pick(rec, LAT_KEYS)?.value;
    const lng = (fLng && rec[fLng]) ?? pick(rec, LNG_KEYS)?.value;

    const ts = parseFirebaseTs(tsRaw, segs);
    const type = parseType(typeRaw) ?? "in";
    const empId = resolved.employeeId;

    if (sampleLog.length < 5) sampleLog.push({ staff: resolved.staffRaw, path: segs.join("/"), ts: tsRaw, type: typeRaw, matched: !!empId, parsedTs: ts?.toISOString() });
    if (!empId) { unmatched++; continue; }
    if (!ts) { skipped++; continue; }
    const key = `${empId}|${ts.getTime()}|${type}`;
    if (seen.has(key)) { skipped++; continue; }
    seen.add(key);
    const site = firebaseSiteId(rec);
    rows.push({
      employeeId: empId, type, timestamp: ts,
      gpsLat: lat != null ? String(lat) : null, gpsLng: lng != null ? String(lng) : null,
      device: "mobile-app" as const, geofenceCheck: "passed" as const, note: site ? `Imported from Firebase · Site: ${site}` : "Imported from Firebase",
    });
    inserted++;
  }

  console.log(`[firebase] read ${records.length} records · sample:`, JSON.stringify(sampleLog, null, 2));
  console.log(`[firebase] to insert: ${inserted} · skipped(dupe/no-ts): ${skipped} · unmatched staff: ${unmatched}`);

  if (opts.dryRun) { console.log("[firebase] DRY RUN — nothing written."); return { read: records.length, inserted: 0, skipped, unmatched, dryRun: true }; }
  for (let i = 0; i < rows.length; i += 500) await db.insert(attendancePunches).values(rows.slice(i, i + 500) as any);
  console.log(`[firebase] inserted ${rows.length} punches.`);
  lastSyncAt = new Date().toISOString();
  lastSyncResult = { read: records.length, inserted: rows.length, skipped, unmatched };
  return lastSyncResult;
}

// CLI entry
const invokedDirectly = process.argv[1] && process.argv[1].includes("firebase-attendance");
if (invokedDirectly) {
  const dryRun = process.argv.includes("--dry-run");
  runImport({ dryRun })
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => { console.error("[firebase] import failed:", err); process.exit(1); });
}
