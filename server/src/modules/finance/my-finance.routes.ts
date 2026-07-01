// Employee-facing finance self-service: staff submit expense claims and invoice
// uploads, track approval status, and view the petty-cash float they hold.
// Finance (finance:read/finance:write) sees every submission and approves/rejects.
//
// Storage reuses the generic `finance_items` table (kind = "staff-finance").
// Access is enforced here at the app layer: a non-finance user only ever sees
// or mutates rows whose data.ownerUserId is their own user id.
import { Router } from "express";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import { financeItems } from "../../db/schema/index.js";
import { requireAuth } from "../../middleware/auth.js";
import { requirePerm, userHasPerm } from "../../middleware/rbac.js";
import { writeAudit } from "../../middleware/audit.js";
import { HttpError } from "../../middleware/errors.js";

export const myFinanceRouter = Router();
myFinanceRouter.use(requireAuth);

const KIND = "staff-finance";

function spread(row: any) {
  return { ...(row.data || {}), id: row.id, kind: row.kind, createdAt: row.createdAt, updatedAt: row.updatedAt };
}

// LIST — finance sees all submissions; everyone else only their own.
myFinanceRouter.get("/", async (req, res, next) => {
  try {
    const rows = await db.select().from(financeItems).where(eq(financeItems.kind, KIND));
    const all = rows.map(spread);
    const isFinance = await userHasPerm(req, "finance:read");
    res.json(isFinance ? all : all.filter((r: any) => r.ownerUserId === req.user!.sub));
  } catch (e) { next(e); }
});

// PETTY CASH — the float(s) this user is custodian of + their vouchers (read-only).
// Finance gets every float/voucher. Placed before "/:id" so it isn't shadowed.
myFinanceRouter.get("/petty-cash", async (req, res, next) => {
  try {
    const rows = await db.select().from(financeItems).where(inArray(financeItems.kind, ["petty-float", "petty-voucher"]));
    const floatsAll = rows.filter((r) => r.kind === "petty-float").map(spread);
    const vouchersAll = rows.filter((r) => r.kind === "petty-voucher").map(spread);
    const isFinance = await userHasPerm(req, "finance:read");
    const myFloats = isFinance ? floatsAll : floatsAll.filter((f: any) => f.custodianUserId && f.custodianUserId === req.user!.sub);
    const floatIds = new Set(myFloats.map((f: any) => f.id));
    const myVouchers = isFinance ? vouchersAll : vouchersAll.filter((v: any) => floatIds.has(v.floatId));
    res.json({ floats: myFloats, vouchers: myVouchers });
  } catch (e) { next(e); }
});

const createSchema = z.object({
  docType: z.enum(["expense", "invoice"]),
  title: z.string().min(1),
  amount: z.number().nonnegative().optional(),
  currency: z.string().optional(),
  category: z.string().optional(),
  vendor: z.string().optional(),
  date: z.string().optional(),
  description: z.string().optional(),
  projectId: z.string().optional(),
  fileId: z.string().optional(),
  fileName: z.string().optional(),
});

// CREATE — any authenticated user submits on their own behalf (status = submitted).
myFinanceRouter.post("/", async (req, res, next) => {
  try {
    const input = createSchema.parse(req.body);
    const data = {
      ...input,
      currency: input.currency || "AED",
      ownerUserId: req.user!.sub,
      ownerEmail: req.user!.email,
      employeeId: req.user!.employeeId ?? null,
      office: req.user!.office ?? null,
      status: "submitted" as const,
      submittedAt: new Date().toISOString(),
    };
    const inserted = await db.insert(financeItems).values({ kind: KIND, data } as any).returning();
    await writeAudit(req, { action: "create-staff-finance", entityType: KIND, entityId: inserted[0].id, after: { docType: input.docType, amount: input.amount } });
    res.status(201).json(spread(inserted[0]));
  } catch (e) { next(e); }
});

async function loadOwnedOrFinance(req: any, id: string) {
  const before = (await db.select().from(financeItems).where(eq(financeItems.id, id)).limit(1))[0];
  if (!before || before.kind !== KIND) throw new HttpError(404, "Submission not found");
  const isFinance = await userHasPerm(req, "finance:read");
  if (!isFinance && (before.data as any)?.ownerUserId !== req.user.sub) throw new HttpError(403, "Not your submission");
  return { before, isFinance };
}

// EDIT — owner may edit while still 'submitted'; finance may edit anytime.
// Server-managed fields (owner/status/review) can never be set through here.
myFinanceRouter.patch("/:id", async (req, res, next) => {
  try {
    const { before, isFinance } = await loadOwnedOrFinance(req, req.params.id);
    if (!isFinance && (before.data as any)?.status !== "submitted") throw new HttpError(400, "Cannot edit a reviewed submission");
    const { kind, id, createdAt, updatedAt, ownerUserId, ownerEmail, status, reviewedByUserId, reviewedByEmail, reviewedAt, rejectReason, submittedAt, employeeId, ...patch } = req.body || {};
    const updated = await db.update(financeItems)
      .set({ data: { ...(before.data as any), ...patch }, updatedAt: new Date() })
      .where(eq(financeItems.id, req.params.id)).returning();
    res.json(spread(updated[0]));
  } catch (e) { next(e); }
});

// DECISION — finance approves/rejects, with an optional reason shown to the employee.
const decisionSchema = z.object({ decision: z.enum(["approve", "reject"]), reason: z.string().optional() });
myFinanceRouter.patch("/:id/decision", requirePerm("finance:write"), async (req, res, next) => {
  try {
    const { decision, reason } = decisionSchema.parse(req.body);
    const before = (await db.select().from(financeItems).where(eq(financeItems.id, req.params.id)).limit(1))[0];
    if (!before || before.kind !== KIND) throw new HttpError(404, "Submission not found");
    const data = {
      ...(before.data as any),
      status: decision === "approve" ? "approved" : "rejected",
      rejectReason: decision === "reject" ? (reason || "") : undefined,
      reviewedByUserId: req.user!.sub,
      reviewedByEmail: req.user!.email,
      reviewedAt: new Date().toISOString(),
    };
    const updated = await db.update(financeItems).set({ data, updatedAt: new Date() }).where(eq(financeItems.id, req.params.id)).returning();
    await writeAudit(req, { action: `staff-finance-${decision}`, entityType: KIND, entityId: req.params.id, after: { status: data.status } });
    res.json(spread(updated[0]));
  } catch (e) { next(e); }
});

// DELETE — owner may withdraw while submitted; finance may remove anytime.
myFinanceRouter.delete("/:id", async (req, res, next) => {
  try {
    const { before, isFinance } = await loadOwnedOrFinance(req, req.params.id);
    if (!isFinance && (before.data as any)?.status !== "submitted") throw new HttpError(400, "Cannot delete a reviewed submission");
    await db.delete(financeItems).where(eq(financeItems.id, req.params.id));
    await writeAudit(req, { action: "delete-staff-finance", entityType: KIND, entityId: req.params.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});
