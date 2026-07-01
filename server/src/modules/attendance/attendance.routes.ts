import { Router } from "express";
import { z } from "zod";
import { and, eq, gte, lte, sql, desc } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  geofences, attendancePunches, locationPings, attendanceDailyRollup,
} from "../../db/schema/index.js";
import { requireAuth } from "../../middleware/auth.js";
import { requirePerm } from "../../middleware/rbac.js";
import { writeAudit } from "../../middleware/audit.js";
import { HttpError } from "../../middleware/errors.js";
import { attachCrud, numStrOrNull } from "../../lib/crud.js";

export const attendanceRouter = Router();
attendanceRouter.use(requireAuth);

// -------------------- GEOFENCES --------------------
const geofenceCreate = z.object({
  projectId: z.string().uuid().nullable().optional(),
  name: z.string().min(1),
  // Frontend may send either {center:{lat,lng}, radiusM} or {latitude, longitude, radiusM}
  center: z.object({ lat: z.number(), lng: z.number() }).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radiusM: z.number().int().positive(),
  siteName: z.string().optional(),
  active: z.boolean().optional(),
});

attendanceRouter.get("/geofences", requirePerm("attendance:read"), async (_req, res, next) => {
  try {
    const rows = await db.select().from(geofences);
    // Echo frontend shape — expose center.{lat,lng}
    res.json(rows.map((r) => ({
      ...r,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      center: { lat: Number(r.latitude), lng: Number(r.longitude) },
    })));
  } catch (e) { next(e); }
});

attendanceRouter.post("/geofences", requirePerm("attendance:override"), async (req, res, next) => {
  try {
    const input = geofenceCreate.parse(req.body);
    const lat = input.center?.lat ?? input.latitude;
    const lng = input.center?.lng ?? input.longitude;
    if (lat == null || lng == null) throw new HttpError(400, "latitude/longitude required");
    const inserted = await db.insert(geofences).values({
      projectId: input.projectId ?? null,
      name: input.name,
      latitude: String(lat),
      longitude: String(lng),
      radiusM: input.radiusM,
      siteName: input.siteName ?? null,
      active: input.active ?? true,
    }).returning();
    await writeAudit(req, { action: "create-geofence", entityType: "geofence", entityId: inserted[0].id, after: inserted[0] });
    res.status(201).json(inserted[0]);
  } catch (e) { next(e); }
});

attendanceRouter.patch("/geofences/:id", requirePerm("attendance:override"), async (req, res, next) => {
  try {
    const input = geofenceCreate.partial().parse(req.body);
    const next: any = { ...input, updatedAt: new Date() };
    if (input.center) { next.latitude = String(input.center.lat); next.longitude = String(input.center.lng); delete next.center; }
    if (input.latitude != null) next.latitude = String(input.latitude);
    if (input.longitude != null) next.longitude = String(input.longitude);
    const updated = await db.update(geofences).set(next).where(eq(geofences.id, req.params.id)).returning();
    if (!updated[0]) throw new HttpError(404, "Geofence not found");
    res.json(updated[0]);
  } catch (e) { next(e); }
});

attendanceRouter.delete("/geofences/:id", requirePerm("attendance:override"), async (req, res, next) => {
  try {
    const deleted = await db.delete(geofences).where(eq(geofences.id, req.params.id)).returning();
    if (!deleted[0]) throw new HttpError(404, "Geofence not found");
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// -------------------- PUNCHES --------------------
const punchCreate = z.object({
  employeeId: z.string().uuid().optional(),
  projectId: z.string().uuid().nullable().optional(),
  geofenceId: z.string().uuid().nullable().optional(),
  type: z.enum(["in", "out"]),
  timestamp: z.string(),                                            // ISO datetime
  gpsLat: z.number().optional(),
  gpsLng: z.number().optional(),
  accuracyM: z.number().optional(),
  geofenceCheck: z.enum(["passed", "failed-out", "low-accuracy", "no-gps", "manual-override"]).default("passed"),
  device: z.enum(["mobile-app", "web-simulator", "biometric-office"]).optional(),
  note: z.string().optional(),
});

attendanceRouter.get("/punches", requirePerm("attendance:read"), async (req, res, next) => {
  try {
    const { employeeId, from, to } = req.query as Record<string, string>;
    const conds: any[] = [];
    if (employeeId) conds.push(eq(attendancePunches.employeeId, employeeId));
    if (from) conds.push(gte(attendancePunches.timestamp, new Date(from)));
    if (to) conds.push(lte(attendancePunches.timestamp, new Date(to)));
    const q = conds.length ? db.select().from(attendancePunches).where(and(...conds)) : db.select().from(attendancePunches);
    const rows = await q.orderBy(desc(attendancePunches.timestamp));
    res.json(rows.map((p) => ({
      ...p,
      gpsLat: p.gpsLat != null ? Number(p.gpsLat) : undefined,
      gpsLng: p.gpsLng != null ? Number(p.gpsLng) : undefined,
      accuracyM: p.accuracyM != null ? Number(p.accuracyM) : undefined,
    })));
  } catch (e) { next(e); }
});

attendanceRouter.post("/punches", requirePerm("attendance:write"), async (req, res, next) => {
  try {
    const input = punchCreate.parse(req.body);
    const employeeId = input.employeeId ?? req.user!.employeeId ?? null;
    if (!employeeId) throw new HttpError(400, "employeeId required (caller has no linked employee)");

    const inserted = await db.insert(attendancePunches).values({
      employeeId,
      projectId: input.projectId ?? null,
      geofenceId: input.geofenceId ?? null,
      type: input.type,
      timestamp: new Date(input.timestamp),
      gpsLat: numStrOrNull(input.gpsLat),
      gpsLng: numStrOrNull(input.gpsLng),
      accuracyM: numStrOrNull(input.accuracyM),
      geofenceCheck: input.geofenceCheck,
      device: input.device ?? null,
      note: input.note ?? null,
    } as any).returning();

    await writeAudit(req, { action: "create-punch", entityType: "attendance-punch", entityId: inserted[0].id, after: { type: input.type, employeeId } });
    res.status(201).json(inserted[0]);
  } catch (e) { next(e); }
});

attendanceRouter.post("/punches/:id/override", requirePerm("attendance:override"), async (req, res, next) => {
  try {
    const reason = z.object({ reason: z.string().min(1) }).parse(req.body).reason;
    const updated = await db.update(attendancePunches)
      .set({ overrideByUserId: req.user!.sub, overrideReason: reason, geofenceCheck: "manual-override" })
      .where(eq(attendancePunches.id, req.params.id))
      .returning();
    if (!updated[0]) throw new HttpError(404, "Punch not found");
    await writeAudit(req, { action: "override-punch", entityType: "attendance-punch", entityId: req.params.id, after: { reason } });
    res.json(updated[0]);
  } catch (e) { next(e); }
});

attendanceRouter.delete("/punches/:id", requirePerm("attendance:override"), async (req, res, next) => {
  try {
    const deleted = await db.delete(attendancePunches).where(eq(attendancePunches.id, req.params.id)).returning();
    if (!deleted[0]) throw new HttpError(404, "Punch not found");
    await writeAudit(req, { action: "delete-punch", entityType: "attendance-punch", entityId: req.params.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// -------------------- LOCATIONS --------------------
const locationCreate = z.object({
  employeeId: z.string().uuid().optional(),
  lat: z.number(),
  lng: z.number(),
  accuracyM: z.number().optional(),
  timestamp: z.string(),
  batteryPct: z.number().int().optional(),
  deviceState: z.string().optional(),
});

attendanceRouter.get("/locations", requirePerm("attendance:read"), async (req, res, next) => {
  try {
    const { employeeId, since } = req.query as Record<string, string>;
    const conds: any[] = [];
    if (employeeId) conds.push(eq(locationPings.employeeId, employeeId));
    if (since) conds.push(gte(locationPings.timestamp, new Date(since)));
    const q = conds.length ? db.select().from(locationPings).where(and(...conds)) : db.select().from(locationPings);
    const rows = await q.orderBy(desc(locationPings.timestamp)).limit(500);
    res.json(rows.map((p) => ({
      ...p,
      lat: Number(p.latitude),
      lng: Number(p.longitude),
      accuracyM: p.accuracyM != null ? Number(p.accuracyM) : undefined,
    })));
  } catch (e) { next(e); }
});

// Batch endpoint — mobile app posts an array of pings collected while offline
attendanceRouter.post("/locations/batch", requirePerm("attendance:write"), async (req, res, next) => {
  try {
    const input = z.array(locationCreate).parse(req.body?.pings ?? req.body);
    if (input.length === 0) return res.json({ inserted: 0 });
    const employeeFallback = req.user!.employeeId;
    const rows = input.map((p) => ({
      employeeId: p.employeeId ?? employeeFallback!,
      latitude: String(p.lat),
      longitude: String(p.lng),
      accuracyM: numStrOrNull(p.accuracyM),
      timestamp: new Date(p.timestamp),
      batteryPct: p.batteryPct ?? null,
      deviceState: p.deviceState ?? null,
    }));
    if (rows.some((r) => !r.employeeId)) throw new HttpError(400, "employeeId required on every ping (or set on user)");
    const inserted = await db.insert(locationPings).values(rows as any).returning();
    res.status(201).json({ inserted: inserted.length });
  } catch (e) { next(e); }
});

// -------------------- DAILY ROLLUP --------------------
attendanceRouter.get("/rollup", requirePerm("attendance:read"), async (req, res, next) => {
  try {
    const { employeeId, from, to } = req.query as Record<string, string>;
    const conds: any[] = [];
    if (employeeId) conds.push(eq(attendanceDailyRollup.employeeId, employeeId));
    if (from) conds.push(gte(attendanceDailyRollup.day, from));
    if (to) conds.push(lte(attendanceDailyRollup.day, to));
    const q = conds.length ? db.select().from(attendanceDailyRollup).where(and(...conds)) : db.select().from(attendanceDailyRollup);
    res.json(await q.orderBy(desc(attendanceDailyRollup.day)));
  } catch (e) { next(e); }
});

// -------------------- FIREBASE ATTENDANCE INTEGRATION --------------------
// Connectivity probe for the Attendance page banner (no writes).
attendanceRouter.get("/firebase/status", requirePerm("attendance:read"), async (_req, res, next) => {
  try {
    const { getFirebaseStatus } = await import("../../integrations/firebase-attendance.js");
    res.json(await getFirebaseStatus());
  } catch (e) { next(e); }
});

// Pull the latest punches from Firebase RTDB into attendance_punches (idempotent).
attendanceRouter.post("/firebase/sync", requirePerm("attendance:write"), async (req, res, next) => {
  try {
    const { runImport, isConfigured } = await import("../../integrations/firebase-attendance.js");
    if (!isConfigured()) throw new HttpError(400, "Firebase is not configured on the server (set FIREBASE_SERVICE_ACCOUNT_PATH/_JSON).");
    const dryRun = req.query.dryRun === "1" || req.query.dryRun === "true";
    let result;
    try {
      result = await runImport({ dryRun });
    } catch (err: any) {
      const msg = String(err?.message || err);
      // Missing/unreadable key or unreachable RTDB → 400 with a clear, non-leaky message
      if (/ENOENT|service.?account|credential|FIREBASE/i.test(msg)) {
        throw new HttpError(400, `Firebase sync unavailable: ${msg.slice(0, 200)}`);
      }
      throw err;
    }
    await writeAudit(req, { action: "firebase-sync", entityType: "attendance", after: result });
    res.json({ ok: true, dryRun, ...result });
  } catch (e) { next(e); }
});
