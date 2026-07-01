import { Router } from "express";
import { z } from "zod";
import { and, eq, desc, isNull } from "drizzle-orm";
import { db } from "../../db/client.js";
import { goodsReceivedNotes, purchaseOrders } from "../../db/schema/index.js";
import { requireAuth } from "../../middleware/auth.js";
import { requirePerm } from "../../middleware/rbac.js";
import { writeAudit } from "../../middleware/audit.js";
import { HttpError } from "../../middleware/errors.js";
import { numStrOrNull } from "../../lib/crud.js";

export const procurementRouter = Router();
procurementRouter.use(requireAuth);

const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);

const lpoLineSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1),
  qty: z.number().positive(),
  unitOfMeasure: z.string().min(1).default("EA"),
  unitPrice: z.number().nonnegative(),
  vatPct: z.number().min(0).max(100).default(5),
  glAccountCode: z.string().min(1).default("6115"),
  projectId: z.string().optional(),
  amountExVat: z.number().optional(),
  vatAmount: z.number().optional(),
  amountIncVat: z.number().optional(),
  qtyReceived: z.number().nonnegative().optional(),
});

const lpoSchema = z.object({
  reference: z.string().min(1).optional(),
  date: iso.default(today),
  supplierId: z.string().uuid(),
  office: z.enum(["dubai", "cairo"]),
  currency: z.enum(["AED", "EGP", "USD", "EUR", "GBP"]).default("AED"),
  fxRate: z.number().positive().optional(),
  deliveryDate: iso.optional(),
  deliveryAddress: z.string().optional(),
  paymentTermsDays: z.number().int().nonnegative().optional(),
  lines: z.array(lpoLineSchema).min(1),
  raisedByDisplay: z.string().optional(),
  approverUserId: z.string().uuid().optional(),
  approverDisplay: z.string().optional(),
  approvedAt: z.string().optional(),
  rejectionNote: z.string().optional(),
  status: z.enum(["draft", "submitted", "approved", "issued", "partially-received", "received", "invoiced", "closed", "cancelled"]).optional(),
  linkedBillId: z.string().uuid().optional(),
  linkedGrnIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
  attachmentFileId: z.string().uuid().optional(),
});

const grnLineSchema = z.object({
  id: z.string().optional(),
  lpoLineId: z.string().min(1),
  description: z.string().min(1),
  qtyOrdered: z.number().nonnegative(),
  qtyReceivedThis: z.number().nonnegative(),
  qtyReceivedToDate: z.number().nonnegative(),
  condition: z.enum(["good", "damaged", "short", "wrong-item"]).default("good"),
  remarks: z.string().optional(),
});

const grnSchema = z.object({
  reference: z.string().min(1).optional(),
  date: iso.default(today),
  lpoId: z.string().uuid(),
  supplierId: z.string().uuid(),
  receivedByDisplay: z.string().optional(),
  warehouseLocation: z.string().optional(),
  vehicleNumber: z.string().optional(),
  driverName: z.string().optional(),
  supplierDeliveryNote: z.string().optional(),
  lines: z.array(grnLineSchema).min(1),
  status: z.enum(["draft", "confirmed", "matched-to-bill"]).optional(),
  matchedBillId: z.string().uuid().optional(),
  notes: z.string().optional(),
  attachmentFileId: z.string().uuid().optional(),
});

function withComputedLpoTotals(input: z.infer<typeof lpoSchema>) {
  const lines = input.lines.map((line, idx) => {
    const amountExVat = money(line.qty * line.unitPrice);
    const vatAmount = money(amountExVat * (line.vatPct / 100));
    return {
      ...line,
      id: line.id || `l${idx + 1}`,
      amountExVat,
      vatAmount,
      amountIncVat: money(amountExVat + vatAmount),
    };
  });
  const subtotal = money(lines.reduce((sum, line) => sum + line.amountExVat, 0));
  const vatTotal = money(lines.reduce((sum, line) => sum + line.vatAmount, 0));
  return { lines, subtotal, vatTotal, total: money(subtotal + vatTotal) };
}

function mapLpo(row: any) {
  return {
    ...row,
    fxRate: row.fxRate == null ? undefined : Number(row.fxRate),
    subtotal: Number(row.subtotal ?? 0),
    vatTotal: Number(row.vatTotal ?? 0),
    total: Number(row.total ?? 0),
    linkedBillId: row.linkedBillId ?? undefined,
    linkedGrnIds: row.linkedGrnIds ?? [],
    attachmentUrl: undefined,
  };
}

function mapGrn(row: any) {
  return {
    ...row,
    matchedBillId: row.matchedBillId ?? undefined,
    attachmentUrl: undefined,
  };
}

async function nextReference(prefix: "LPO" | "GRN") {
  const year = new Date().getFullYear();
  const stamp = Date.now().toString().slice(-5);
  return `${prefix}-${year}-${stamp}`;
}

procurementRouter.get("/lpos", requirePerm("finance:read"), async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(purchaseOrders)
      .where(isNull(purchaseOrders.deletedAt))
      .orderBy(desc(purchaseOrders.date), desc(purchaseOrders.createdAt));
    res.json(rows.map(mapLpo));
  } catch (e) { next(e); }
});

procurementRouter.post("/lpos", requirePerm("finance:write"), async (req, res, next) => {
  try {
    const input = lpoSchema.parse(req.body);
    const totals = withComputedLpoTotals(input);
    const reference = input.reference || await nextReference("LPO");
    const inserted = await db.insert(purchaseOrders).values({
      ...input,
      reference,
      lines: totals.lines,
      subtotal: String(totals.subtotal),
      vatTotal: String(totals.vatTotal),
      total: String(totals.total),
      fxRate: numStrOrNull(input.fxRate),
      raisedByUserId: req.user?.sub,
      raisedByDisplay: input.raisedByDisplay || req.user?.email || "System",
      createdByUserId: req.user?.sub,
      updatedByUserId: req.user?.sub,
    } as any).returning();
    await writeAudit(req, { action: "create-lpo", entityType: "purchase-order", entityId: inserted[0].id, after: { reference, total: totals.total } });
    res.status(201).json(mapLpo(inserted[0]));
  } catch (e) { next(e); }
});

procurementRouter.patch("/lpos/:id", requirePerm("finance:write"), async (req, res, next) => {
  try {
    const input = lpoSchema.partial().parse(req.body);
    const before = (await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, req.params.id)).limit(1))[0];
    if (!before || before.deletedAt) throw new HttpError(404, "LPO not found");
    const nextValues: any = { ...input, updatedAt: new Date(), updatedByUserId: req.user?.sub };
    if (input.lines) {
      const totals = withComputedLpoTotals({ ...before, ...input, lines: input.lines } as any);
      nextValues.lines = totals.lines;
      nextValues.subtotal = String(totals.subtotal);
      nextValues.vatTotal = String(totals.vatTotal);
      nextValues.total = String(totals.total);
    }
    if (input.fxRate !== undefined) nextValues.fxRate = numStrOrNull(input.fxRate);
    const updated = await db.update(purchaseOrders).set(nextValues).where(eq(purchaseOrders.id, req.params.id)).returning();
    await writeAudit(req, { action: "update-lpo", entityType: "purchase-order", entityId: req.params.id, before, after: updated[0] });
    res.json(mapLpo(updated[0]));
  } catch (e) { next(e); }
});

procurementRouter.delete("/lpos/:id", requirePerm("finance:write"), async (req, res, next) => {
  try {
    const before = (await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, req.params.id)).limit(1))[0];
    if (!before || before.deletedAt) throw new HttpError(404, "LPO not found");
    await db.update(purchaseOrders).set({ deletedAt: new Date(), deletedByUserId: req.user?.sub, updatedByUserId: req.user?.sub }).where(eq(purchaseOrders.id, req.params.id));
    await writeAudit(req, { action: "delete-lpo", entityType: "purchase-order", entityId: req.params.id, before });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

procurementRouter.get("/grns", requirePerm("finance:read"), async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(goodsReceivedNotes)
      .where(isNull(goodsReceivedNotes.deletedAt))
      .orderBy(desc(goodsReceivedNotes.date), desc(goodsReceivedNotes.createdAt));
    res.json(rows.map(mapGrn));
  } catch (e) { next(e); }
});

procurementRouter.post("/grns", requirePerm("finance:write"), async (req, res, next) => {
  try {
    const input = grnSchema.parse(req.body);
    const reference = input.reference || await nextReference("GRN");
    const inserted = await db.insert(goodsReceivedNotes).values({
      ...input,
      reference,
      receivedByUserId: req.user?.sub,
      receivedByDisplay: input.receivedByDisplay || req.user?.email || "System",
      createdByUserId: req.user?.sub,
      updatedByUserId: req.user?.sub,
    } as any).returning();

    const lpo = (await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, input.lpoId)).limit(1))[0];
    if (lpo) {
      const existing = Array.isArray(lpo.linkedGrnIds) ? lpo.linkedGrnIds : [];
      await db.update(purchaseOrders).set({
        linkedGrnIds: Array.from(new Set([...existing, inserted[0].id])),
        status: input.status === "confirmed" ? "partially-received" : lpo.status,
        updatedAt: new Date(),
        updatedByUserId: req.user?.sub,
      } as any).where(eq(purchaseOrders.id, input.lpoId));
    }

    await writeAudit(req, { action: "create-grn", entityType: "goods-received-note", entityId: inserted[0].id, after: { reference, lpoId: input.lpoId } });
    res.status(201).json(mapGrn(inserted[0]));
  } catch (e) { next(e); }
});

procurementRouter.patch("/grns/:id", requirePerm("finance:write"), async (req, res, next) => {
  try {
    const input = grnSchema.partial().parse(req.body);
    const before = (await db.select().from(goodsReceivedNotes).where(eq(goodsReceivedNotes.id, req.params.id)).limit(1))[0];
    if (!before || before.deletedAt) throw new HttpError(404, "GRN not found");
    const updated = await db.update(goodsReceivedNotes).set({
      ...input,
      updatedAt: new Date(),
      updatedByUserId: req.user?.sub,
    } as any).where(eq(goodsReceivedNotes.id, req.params.id)).returning();
    await writeAudit(req, { action: "update-grn", entityType: "goods-received-note", entityId: req.params.id, before, after: updated[0] });
    res.json(mapGrn(updated[0]));
  } catch (e) { next(e); }
});

procurementRouter.delete("/grns/:id", requirePerm("finance:write"), async (req, res, next) => {
  try {
    const before = (await db.select().from(goodsReceivedNotes).where(eq(goodsReceivedNotes.id, req.params.id)).limit(1))[0];
    if (!before || before.deletedAt) throw new HttpError(404, "GRN not found");
    await db.update(goodsReceivedNotes).set({ deletedAt: new Date(), deletedByUserId: req.user?.sub, updatedByUserId: req.user?.sub }).where(eq(goodsReceivedNotes.id, req.params.id));
    await writeAudit(req, { action: "delete-grn", entityType: "goods-received-note", entityId: req.params.id, before });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

procurementRouter.post("/lpos/:id/link-bill", requirePerm("finance:write"), async (req, res, next) => {
  try {
    const body = z.object({ billId: z.string().uuid() }).parse(req.body);
    const before = (await db.select().from(purchaseOrders).where(and(eq(purchaseOrders.id, req.params.id), isNull(purchaseOrders.deletedAt))).limit(1))[0];
    if (!before) throw new HttpError(404, "LPO not found");
    const updated = await db.update(purchaseOrders).set({
      linkedBillId: body.billId,
      status: "invoiced",
      updatedAt: new Date(),
      updatedByUserId: req.user?.sub,
    } as any).where(eq(purchaseOrders.id, req.params.id)).returning();
    await writeAudit(req, { action: "link-lpo-bill", entityType: "purchase-order", entityId: req.params.id, before, after: updated[0] });
    res.json(mapLpo(updated[0]));
  } catch (e) { next(e); }
});
