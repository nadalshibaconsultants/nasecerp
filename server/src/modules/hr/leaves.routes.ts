import { Router } from "express";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { leaveRequests, leaveBalances, leaveHandovers, employees } from "../../db/schema/index.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireAnyPerm, requirePerm } from "../../middleware/rbac.js";
import { writeAudit } from "../../middleware/audit.js";
import { HttpError } from "../../middleware/errors.js";

export const leavesRouter = Router();
leavesRouter.use(requireAuth);

const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const leaveType = z.enum(["annual","sick","maternity","paternity","unpaid","compassionate","permission"]);
// Temporary permission: 1–3h to leave early, inside the 08:50–18:30 working
// window (9h40m = 9.667h). Hours are deducted from the annual balance.
const WORK_DAY_HOURS = 9 + 40 / 60;
const leaveStatus = z.enum(["submitted","approved","rejected","cancelled"]);

const hhmm = z.string().regex(/^\d{2}:\d{2}$/);
const createSchema = z.object({
  employeeId: z.string().uuid(),
  type: leaveType,
  fromDate: iso,
  toDate: iso,
  startTime: hhmm.optional(),                           // permission only
  endTime: hhmm.optional(),                             // permission only
  effectiveDate: iso.optional(),                        // back-on-duty date after the leave
  note: z.string().optional(),
});

const WORK_START_MIN = 8 * 60 + 50;    // 08:50
const WORK_END_MIN = 18 * 60 + 30;     // 18:30
const minutesOf = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

const updateSchema = z.object({
  type: leaveType.optional(),
  fromDate: iso.optional(),
  toDate: iso.optional(),
  note: z.string().optional(),
  status: leaveStatus.optional(),
});

function addDays(iso: string, n: number): Date {
  return new Date(new Date(iso + "T00:00:00Z").getTime() + n * 86_400_000);
}
function toISODate(d: Date): string { return d.toISOString().slice(0, 10); }

function daysBetween(from: string, to: string) {
  const a = new Date(from + "T00:00:00Z").getTime();
  const b = new Date(to + "T00:00:00Z").getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000) + 1);
}

const isHrActor = (req: any) => req.user?.role === "director" || req.user?.role === "hr-manager";

async function syncUsedLeaveBalance(employeeId: string, type: z.infer<typeof leaveType>, year: number) {
  // Permission requests deduct from the ANNUAL balance (hours / working day)
  const balanceType = type === "permission" ? "annual" : type;
  const approved = await db.select({ fromDate: leaveRequests.fromDate, days: leaveRequests.days, hours: leaveRequests.hours, type: leaveRequests.type })
    .from(leaveRequests)
    .where(and(
      eq(leaveRequests.employeeId, employeeId),
      eq(leaveRequests.status, "approved"),
    ));
  const sameYear = approved.filter((r) => new Date(r.fromDate as any).getUTCFullYear() === year);
  let used: number;
  if (balanceType === "annual") {
    const annualDays = sameYear.filter((r) => r.type === "annual").reduce((sum, r) => sum + r.days, 0);
    const permissionHours = sameYear.filter((r) => r.type === "permission").reduce((sum, r) => sum + Number(r.hours ?? 0), 0);
    used = Math.round((annualDays + permissionHours / WORK_DAY_HOURS) * 100) / 100;
  } else {
    used = sameYear.filter((r) => r.type === balanceType).reduce((sum, r) => sum + r.days, 0);
  }

  await db.update(leaveBalances)
    .set({ used: String(used), updatedAt: new Date() })
    .where(and(
      eq(leaveBalances.employeeId, employeeId),
      eq(leaveBalances.leaveType, balanceType),
      eq(leaveBalances.year, year),
    ));
}

leavesRouter.get("/", requireAnyPerm("hr:read", "self:read"), async (req, res, next) => {
  try {
    const q = db.select().from(leaveRequests);
    const rows = isHrActor(req)
      ? await q.orderBy(sql`${leaveRequests.createdAt} desc`)
      : req.user?.employeeId
        ? await q.where(eq(leaveRequests.employeeId, req.user.employeeId)).orderBy(sql`${leaveRequests.createdAt} desc`)
        : [];
    res.json(rows);
  } catch (e) { next(e); }
});

leavesRouter.get("/:id", requireAnyPerm("hr:read", "self:read"), async (req, res, next) => {
  try {
    const rows = await db.select().from(leaveRequests).where(eq(leaveRequests.id, req.params.id)).limit(1);
    if (!rows[0]) throw new HttpError(404, "Leave request not found");
    if (!isHrActor(req) && rows[0].employeeId !== req.user?.employeeId) throw new HttpError(403, "Not permitted for this leave request");
    res.json(rows[0]);
  } catch (e) { next(e); }
});

leavesRouter.post("/", requireAnyPerm("hr:read", "self:read"), async (req, res, next) => {
  // hr:read = self can submit; HR can submit on behalf
  try {
    const input = createSchema.parse(req.body);
    if (!isHrActor(req) && input.employeeId !== req.user?.employeeId) throw new HttpError(403, "Employees can submit leave only for themselves");
    let permissionHours: number | null = null;
    if (input.type === "permission") {
      if (!input.startTime || !input.endTime) throw new HttpError(400, "Pick the permission start and end time");
      if (input.fromDate !== input.toDate) throw new HttpError(400, "A temporary permission applies to a single day");
      const startMin = minutesOf(input.startTime);
      const endMin = minutesOf(input.endTime);
      if (startMin < WORK_START_MIN || endMin > WORK_END_MIN) throw new HttpError(400, "Permission must be within the working day (08:50–18:30)");
      if (endMin <= startMin) throw new HttpError(400, "End time must be after start time");
      const durationMin = endMin - startMin;
      if (durationMin > 3 * 60) throw new HttpError(400, "A temporary permission is limited to 3 hours");
      permissionHours = Math.round((durationMin / 60) * 100) / 100;
    }
    const days = input.type === "permission" ? 0 : daysBetween(input.fromDate, input.toDate);
    // Effective (back-on-duty) date: must fall after the leave ends; defaults
    // to the day after the last leave day.
    let effectiveDate: string | null = null;
    if (input.type !== "permission") {
      effectiveDate = input.effectiveDate ?? toISODate(addDays(input.toDate, 1));
      if (effectiveDate <= input.toDate) throw new HttpError(400, "Effective (back-on-duty) date must be after the last day of leave");
    }
    const inserted = await db.insert(leaveRequests).values({
      employeeId: input.employeeId,
      type: input.type,
      fromDate: input.fromDate,
      toDate: input.toDate,
      days,
      hours: permissionHours !== null ? String(permissionHours) : null,
      startTime: input.type === "permission" ? input.startTime : null,
      endTime: input.type === "permission" ? input.endTime : null,
      effectiveDate,
      note: input.note ?? null,
    }).returning();
    await writeAudit(req, { action: "create-leave", entityType: "leave", entityId: inserted[0].id, after: inserted[0] });
    res.status(201).json(inserted[0]);
  } catch (e) { next(e); }
});

leavesRouter.patch("/:id", requireAnyPerm("hr:read", "self:read"), async (req, res, next) => {
  try {
    const input = updateSchema.parse(req.body);
    const before = (await db.select().from(leaveRequests).where(eq(leaveRequests.id, req.params.id)).limit(1))[0];
    if (!before) throw new HttpError(404, "Leave request not found");
    if (!isHrActor(req) && before.employeeId !== req.user?.employeeId) throw new HttpError(403, "Not permitted for this leave request");
    if (!isHrActor(req) && before.status !== "submitted") throw new HttpError(409, "Only submitted leave requests can be changed");
    if (!isHrActor(req) && input.status && input.status !== "submitted") throw new HttpError(403, "Employees cannot approve or reject leave");
    const next: any = { ...input };
    if (input.fromDate || input.toDate) {
      next.days = daysBetween(input.fromDate ?? before.fromDate as any, input.toDate ?? before.toDate as any);
    }
    const updated = await db.update(leaveRequests).set(next).where(eq(leaveRequests.id, req.params.id)).returning();
    await writeAudit(req, { action: "update-leave", entityType: "leave", entityId: req.params.id, before, after: updated[0] });
    res.json(updated[0]);
  } catch (e) { next(e); }
});

leavesRouter.post("/:id/approve", requirePerm("hr:write"), async (req, res, next) => {
  try {
    const before = (await db.select().from(leaveRequests).where(eq(leaveRequests.id, req.params.id)).limit(1))[0];
    if (!before) throw new HttpError(404, "Leave request not found");
    if (before.status === "approved") {
      await syncUsedLeaveBalance(before.employeeId, before.type, new Date(before.fromDate as any).getUTCFullYear());
      return res.json(before);
    }
    if (before.status !== "submitted") throw new HttpError(409, `Cannot approve a ${before.status} leave request`);

    const updated = await db.update(leaveRequests)
      .set({ status: "approved", approvedByUserId: req.user!.sub, decidedAt: new Date() })
      .where(eq(leaveRequests.id, req.params.id))
      .returning();

    // Move days from accrued -> used on the matching balance row
    const lr = updated[0];
    const year = new Date(lr.fromDate as any).getUTCFullYear();
    await syncUsedLeaveBalance(lr.employeeId, lr.type, year);
    await writeAudit(req, { action: "approve-leave", entityType: "leave", entityId: req.params.id });
    res.json(updated[0]);
  } catch (e) { next(e); }
});

leavesRouter.post("/:id/reject", requirePerm("hr:write"), async (req, res, next) => {
  try {
    const before = (await db.select().from(leaveRequests).where(eq(leaveRequests.id, req.params.id)).limit(1))[0];
    if (!before) throw new HttpError(404, "Leave request not found");
    if (before.status === "rejected") return res.json(before);
    if (before.status !== "submitted") throw new HttpError(409, `Cannot reject a ${before.status} leave request`);

    const updated = await db.update(leaveRequests)
      .set({ status: "rejected", approvedByUserId: req.user!.sub, decidedAt: new Date() })
      .where(eq(leaveRequests.id, req.params.id))
      .returning();
    await writeAudit(req, { action: "reject-leave", entityType: "leave", entityId: req.params.id });
    res.json(updated[0]);
  } catch (e) { next(e); }
});

leavesRouter.delete("/:id", requireAnyPerm("hr:read", "self:read"), async (req, res, next) => {
  try {
    const before = (await db.select().from(leaveRequests).where(eq(leaveRequests.id, req.params.id)).limit(1))[0];
    if (!before) throw new HttpError(404, "Leave request not found");
    if (!isHrActor(req) && before.employeeId !== req.user?.employeeId) throw new HttpError(403, "Not permitted for this leave request");
    if (!isHrActor(req) && before.status !== "submitted") throw new HttpError(409, "Only submitted leave requests can be cancelled");
    const deleted = await db.delete(leaveRequests).where(eq(leaveRequests.id, req.params.id)).returning();
    await writeAudit(req, { action: "cancel-leave", entityType: "leave", entityId: req.params.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// -------- Balances --------
leavesRouter.get("/balances/:employeeId", requirePerm("hr:read"), async (req, res, next) => {
  try {
    const year = Number(req.query.year ?? new Date().getUTCFullYear());
    const rows = await db.select().from(leaveBalances)
      .where(and(eq(leaveBalances.employeeId, req.params.employeeId), eq(leaveBalances.year, year)));
    res.json(rows);
  } catch (e) { next(e); }
});

// -------- Handovers --------
const handoverSchema = z.object({
  leaveRequestId: z.string().uuid(),
  coverUserId: z.string().uuid().nullable().optional(),
  taskId: z.string().uuid().nullable().optional(),
  note: z.string().optional(),
});

leavesRouter.get("/:id/handovers", requirePerm("hr:read"), async (req, res, next) => {
  try {
    const rows = await db.select().from(leaveHandovers).where(eq(leaveHandovers.leaveRequestId, req.params.id));
    res.json(rows);
  } catch (e) { next(e); }
});

leavesRouter.post("/handovers", requirePerm("hr:read"), async (req, res, next) => {
  try {
    const input = handoverSchema.parse(req.body);
    const inserted = await db.insert(leaveHandovers).values(input).returning();
    res.status(201).json(inserted[0]);
  } catch (e) { next(e); }
});
