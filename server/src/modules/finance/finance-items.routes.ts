// Generic CRUD for finance sub-items (cheques, recurring/utility expenses,
// insurance, subscriptions, govt fees, budgets, WPS, departments). One table
// keyed by `kind`; rows returned with `data` spread to the top level.
import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import { financeItems } from "../../db/schema/index.js";
import { requireAuth } from "../../middleware/auth.js";
import { requirePerm } from "../../middleware/rbac.js";
import { writeAudit } from "../../middleware/audit.js";
import { HttpError } from "../../middleware/errors.js";

export const financeItemsRouter = Router();
financeItemsRouter.use(requireAuth);

function spread(row: any) {
  return { ...(row.data || {}), id: row.id, kind: row.kind, createdAt: row.createdAt, updatedAt: row.updatedAt };
}

financeItemsRouter.get("/", requirePerm("finance:read"), async (req, res, next) => {
  try {
    const kind = String(req.query.kind || "");
    if (!kind) throw new HttpError(400, "kind query param required");
    const rows = await db.select().from(financeItems).where(eq(financeItems.kind, kind));
    res.json(rows.map(spread));
  } catch (e) { next(e); }
});

const createSchema = z.object({ kind: z.string().min(1) }).passthrough();

financeItemsRouter.post("/", requirePerm("finance:write"), async (req, res, next) => {
  try {
    const parsed = createSchema.parse(req.body);
    const { kind, ...data } = parsed as any;
    const inserted = await db.insert(financeItems).values({ kind, data } as any).returning();
    await writeAudit(req, { action: "create-finance-item", entityType: kind, entityId: inserted[0].id });
    res.status(201).json(spread(inserted[0]));
  } catch (e) { next(e); }
});

financeItemsRouter.patch("/:id", requirePerm("finance:write"), async (req, res, next) => {
  try {
    const before = (await db.select().from(financeItems).where(eq(financeItems.id, req.params.id)).limit(1))[0];
    if (!before) throw new HttpError(404, "Item not found");
    const { kind, id, createdAt, updatedAt, ...patch } = req.body || {};
    const updated = await db.update(financeItems)
      .set({ data: { ...(before.data as any), ...patch }, updatedAt: new Date() })
      .where(eq(financeItems.id, req.params.id)).returning();
    res.json(spread(updated[0]));
  } catch (e) { next(e); }
});

financeItemsRouter.delete("/:id", requirePerm("finance:write"), async (req, res, next) => {
  try {
    const deleted = await db.delete(financeItems).where(eq(financeItems.id, req.params.id)).returning();
    if (!deleted[0]) throw new HttpError(404, "Item not found");
    res.json({ ok: true });
  } catch (e) { next(e); }
});
