// Salary-increment self-service requests.
//   - An employee may request an increment only once 1 full year has elapsed
//     since their join date (re-checked here on the server, by request date).
//   - HR (hr:write / hr:payroll:write) approves or rejects.
// Stored in the generic hr_items table (kind = "salary-increment").
import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import { hrItems, employees } from "../../db/schema/index.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireAnyPerm, userHasPerm } from "../../middleware/rbac.js";
import { writeAudit } from "../../middleware/audit.js";
import { HttpError } from "../../middleware/errors.js";

export const incrementRequestsRouter = Router();
incrementRequestsRouter.use(requireAuth);

const KIND = "salary-increment";

function spread(row: any) {
  return { ...(row.data || {}), id: row.id, kind: row.kind, createdAt: row.createdAt, updatedAt: row.updatedAt };
}

// True when `asOf` is on/after the 1-year anniversary of `joinDate`.
export function hasCompletedOneYear(joinDate: string, asOf: Date = new Date()): boolean {
  const join = new Date(joinDate + (joinDate.length <= 10 ? "T00:00:00Z" : ""));
  if (isNaN(join.getTime())) return false;
  const eligible = new Date(join.getTime());
  eligible.setUTCFullYear(eligible.getUTCFullYear() + 1);
  return asOf.getTime() >= eligible.getTime();
}

function eligibleDate(joinDate: string): string {
  const join = new Date(joinDate + (joinDate.length <= 10 ? "T00:00:00Z" : ""));
  const d = new Date(join.getTime());
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

async function isHr(req: any) {
  return (await userHasPerm(req, "hr:write")) || (await userHasPerm(req, "hr:payroll:write")) || (await userHasPerm(req, "hr:read"));
}

// LIST — HR sees all; everyone else only their own.
incrementRequestsRouter.get("/", requireAnyPerm("self:read", "hr:read"), async (req, res, next) => {
  try {
    const rows = (await db.select().from(hrItems).where(eq(hrItems.kind, KIND))).map(spread);
    res.json((await isHr(req)) ? rows : rows.filter((r: any) => r.ownerUserId === req.user!.sub));
  } catch (e) { next(e); }
});

// ELIGIBILITY — does the current user qualify to request today?
incrementRequestsRouter.get("/eligibility", requireAnyPerm("self:read", "hr:read"), async (req, res, next) => {
  try {
    const empId = req.user?.employeeId;
    if (!empId) return res.json({ eligible: false, reason: "Your account is not linked to an employee record." });
    const emp = (await db.select().from(employees).where(eq(employees.id, empId)).limit(1))[0];
    if (!emp) return res.json({ eligible: false, reason: "Employee record not found." });
    const eligible = hasCompletedOneYear(emp.joinDate as any);
    // Already has a pending request?
    const mine = (await db.select().from(hrItems).where(eq(hrItems.kind, KIND))).map(spread)
      .filter((r: any) => r.ownerUserId === req.user!.sub);
    const pending = mine.find((r: any) => r.status === "submitted");
    res.json({
      eligible: eligible && !pending,
      joinDate: emp.joinDate,
      eligibleDate: eligibleDate(emp.joinDate as any),
      completedOneYear: eligible,
      pending: !!pending,
      reason: pending ? "You already have a pending increment request." : eligible ? undefined : `Eligible after 1 year of service (on ${eligibleDate(emp.joinDate as any)}).`,
    });
  } catch (e) { next(e); }
});

const createSchema = z.object({
  reason: z.string().optional(),
  requestedPercent: z.number().min(0).max(500).optional(),
  requestedAmount: z.number().min(0).optional(),
});

// CREATE — employee submits their own; server enforces the 1-year rule.
incrementRequestsRouter.post("/", requireAnyPerm("self:read", "hr:read"), async (req, res, next) => {
  try {
    const input = createSchema.parse(req.body);
    const empId = req.user?.employeeId;
    if (!empId) throw new HttpError(400, "Your account is not linked to an employee record.");
    const emp = (await db.select().from(employees).where(eq(employees.id, empId)).limit(1))[0];
    if (!emp) throw new HttpError(404, "Employee record not found.");
    if (!hasCompletedOneYear(emp.joinDate as any)) {
      throw new HttpError(400, `Not eligible yet — a salary increment can be requested only after 1 year of service (on ${eligibleDate(emp.joinDate as any)}).`);
    }
    const existing = (await db.select().from(hrItems).where(eq(hrItems.kind, KIND))).map(spread)
      .filter((r: any) => r.ownerUserId === req.user!.sub && r.status === "submitted");
    if (existing.length) throw new HttpError(400, "You already have a pending increment request.");

    const data = {
      ...input,
      ownerUserId: req.user!.sub,
      ownerEmail: req.user!.email,
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      employeeCode: emp.code,
      joinDate: emp.joinDate,
      office: req.user!.office ?? null,
      status: "submitted" as const,
      requestedAt: new Date().toISOString(),
    };
    const inserted = await db.insert(hrItems).values({ kind: KIND, data } as any).returning();
    await writeAudit(req, { action: "request-salary-increment", entityType: KIND, entityId: inserted[0].id, after: { employeeId: emp.id } });
    res.status(201).json(spread(inserted[0]));
  } catch (e) { next(e); }
});

// DECISION — HR approves/rejects.
const decisionSchema = z.object({ decision: z.enum(["approve", "reject"]), note: z.string().optional() });
incrementRequestsRouter.patch("/:id/decision", requireAnyPerm("hr:write", "hr:payroll:write"), async (req, res, next) => {
  try {
    const { decision, note } = decisionSchema.parse(req.body);
    const before = (await db.select().from(hrItems).where(eq(hrItems.id, req.params.id)).limit(1))[0];
    if (!before || before.kind !== KIND) throw new HttpError(404, "Request not found");
    const data = {
      ...(before.data as any),
      status: decision === "approve" ? "approved" : "rejected",
      decisionNote: note || undefined,
      reviewedByUserId: req.user!.sub,
      reviewedByEmail: req.user!.email,
      reviewedAt: new Date().toISOString(),
    };
    const updated = await db.update(hrItems).set({ data, updatedAt: new Date() }).where(eq(hrItems.id, req.params.id)).returning();
    await writeAudit(req, { action: `salary-increment-${decision}`, entityType: KIND, entityId: req.params.id, after: { status: data.status } });
    res.json(spread(updated[0]));
  } catch (e) { next(e); }
});

// DELETE — owner may withdraw while pending; HR may remove.
incrementRequestsRouter.delete("/:id", requireAnyPerm("self:read", "hr:read"), async (req, res, next) => {
  try {
    const before = (await db.select().from(hrItems).where(eq(hrItems.id, req.params.id)).limit(1))[0];
    if (!before || before.kind !== KIND) throw new HttpError(404, "Request not found");
    const hr = await isHr(req);
    const owns = (before.data as any)?.ownerUserId === req.user!.sub;
    if (!hr && !owns) throw new HttpError(403, "Not your request");
    if (!hr && (before.data as any)?.status !== "submitted") throw new HttpError(400, "Cannot withdraw a reviewed request");
    await db.delete(hrItems).where(eq(hrItems.id, req.params.id));
    res.json({ ok: true });
  } catch (e) { next(e); }
});
