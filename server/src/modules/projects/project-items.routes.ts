// Generic CRUD for per-project sub-items (Quality, HSE, Meetings, transmittals…).
// One table keyed by `kind`; rows are returned with `data` spread to the top
// level so the frontend sees the full record (id, projectId, ...fields).
import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import { projectItems } from "../../db/schema/index.js";
import { requireAuth } from "../../middleware/auth.js";
import { requirePerm } from "../../middleware/rbac.js";
import { writeAudit } from "../../middleware/audit.js";
import { HttpError } from "../../middleware/errors.js";

export const projectItemsRouter = Router();
projectItemsRouter.use(requireAuth);

function spread(row: any) {
  return { ...(row.data || {}), id: row.id, projectId: row.projectId, kind: row.kind, createdAt: row.createdAt, updatedAt: row.updatedAt };
}

// LIST — by kind (the frontend filters by projectId client-side).
projectItemsRouter.get("/", requirePerm("projects:read"), async (req, res, next) => {
  try {
    const kind = String(req.query.kind || "");
    if (!kind) throw new HttpError(400, "kind query param required");
    const rows = await db.select().from(projectItems).where(eq(projectItems.kind, kind));
    res.json(rows.map(spread));
  } catch (e) { next(e); }
});

const createSchema = z.object({
  kind: z.string().min(1),
  projectId: z.string().uuid().nullable().optional(),
}).passthrough();

projectItemsRouter.post("/", requirePerm("projects:read"), async (req, res, next) => {
  try {
    const parsed = createSchema.parse(req.body);
    const { kind, projectId, ...data } = parsed as any;
    const inserted = await db.insert(projectItems).values({ kind, projectId: projectId ?? null, data } as any).returning();
    await writeAudit(req, { action: "create-project-item", entityType: kind, entityId: inserted[0].id });
    res.status(201).json(spread(inserted[0]));
  } catch (e) { next(e); }
});

projectItemsRouter.patch("/:id", requirePerm("projects:read"), async (req, res, next) => {
  try {
    const before = (await db.select().from(projectItems).where(eq(projectItems.id, req.params.id)).limit(1))[0];
    if (!before) throw new HttpError(404, "Item not found");
    const { kind, projectId, id, createdAt, updatedAt, ...patch } = req.body || {};
    const updated = await db.update(projectItems)
      .set({ data: { ...(before.data as any), ...patch }, projectId: projectId !== undefined ? projectId : before.projectId, updatedAt: new Date() })
      .where(eq(projectItems.id, req.params.id)).returning();
    res.json(spread(updated[0]));
  } catch (e) { next(e); }
});

projectItemsRouter.delete("/:id", requirePerm("projects:read"), async (req, res, next) => {
  try {
    const deleted = await db.delete(projectItems).where(eq(projectItems.id, req.params.id)).returning();
    if (!deleted[0]) throw new HttpError(404, "Item not found");
    res.json({ ok: true });
  } catch (e) { next(e); }
});
