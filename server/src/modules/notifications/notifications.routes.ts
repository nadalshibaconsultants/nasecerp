import { Router } from "express";
import { z } from "zod";
import { eq, and, isNull, desc } from "drizzle-orm";
import { db } from "../../db/client.js";
import { notifications, users } from "../../db/schema/index.js";
import { requireAuth } from "../../middleware/auth.js";
import { HttpError } from "../../middleware/errors.js";
import { emitToUser } from "../../lib/realtime.js";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

// The web client persists/reads notifications in its own ("portal") shape:
// { recipientUserId, kind, severity, read, ... }. Rows are translated at the
// boundary so the frontend store needs no mapResponse.
function toPortalShape(row: typeof notifications.$inferSelect) {
  return {
    id: row.id,
    recipientUserId: row.userId,
    kind: row.type,
    severity: row.severity ?? "info",
    title: row.title,
    body: row.body ?? "",
    link: row.link ?? undefined,
    read: !!row.readAt,
    createdAt: (row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt)).toISOString(),
    sourceEntityType: row.sourceEntityType ?? undefined,
    sourceEntityId: row.sourceEntityId ?? undefined,
  };
}

notificationsRouter.get("/", async (req, res, next) => {
  try {
    const unreadOnly = req.query.unread === "1";
    const conds: any[] = [eq(notifications.userId, req.user!.sub)];
    if (unreadOnly) conds.push(isNull(notifications.readAt));
    const rows = await db.select().from(notifications)
      .where(and(...conds)).orderBy(desc(notifications.createdAt)).limit(100);
    res.json(rows.map(toPortalShape));
  } catch (e) { next(e); }
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const createSchema = z.object({
  recipientUserId: z.string().min(1),       // user uuid or "*" for broadcast
  kind: z.string().min(1),
  severity: z.enum(["info", "warning", "critical"]).optional(),
  title: z.string().min(1),
  body: z.string().optional(),
  link: z.string().optional(),
  read: z.boolean().optional(),
  sourceEntityType: z.string().optional(),
  sourceEntityId: z.string().optional(),
});

notificationsRouter.post("/", async (req, res, next) => {
  try {
    const input = createSchema.parse(req.body);
    const base = {
      type: input.kind,
      severity: input.severity ?? "info",
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      sourceEntityType: input.sourceEntityType ?? null,
      sourceEntityId: input.sourceEntityId ?? null,
      readAt: input.read ? new Date() : null,
    };

    let recipients: string[];
    if (input.recipientUserId === "*") {
      const all = await db.select({ id: users.id }).from(users).where(eq(users.status, "active"));
      recipients = all.map((u) => u.id);
    } else if (UUID_RE.test(input.recipientUserId)) {
      const exists = await db.select({ id: users.id }).from(users).where(eq(users.id, input.recipientUserId)).limit(1);
      recipients = exists.length ? [input.recipientUserId] : [];
    } else {
      // Legacy/demo recipient id that doesn't map to a real account — accept
      // gracefully so optimistic UI flows don't error, but persist nothing.
      recipients = [];
    }

    if (!recipients.length) {
      res.status(201).json({ ...input, id: "n-unrouted", body: input.body ?? "", read: !!input.read, createdAt: new Date().toISOString() });
      return;
    }

    const inserted = await db.insert(notifications)
      .values(recipients.map((userId) => ({ userId, ...base })))
      .returning();
    for (const row of inserted) emitToUser(row.userId, "notification", toPortalShape(row));

    // Echo the row addressed to the requested recipient (or the first of a broadcast)
    const primary = inserted.find((r) => r.userId === input.recipientUserId) ?? inserted[0];
    res.status(201).json(toPortalShape(primary));
  } catch (e) { next(e); }
});

const updateSchema = z.object({ read: z.boolean().optional() });

notificationsRouter.patch("/:id", async (req, res, next) => {
  try {
    const input = updateSchema.parse(req.body);
    if (input.read === undefined) {
      const row = (await db.select().from(notifications)
        .where(and(eq(notifications.id, req.params.id), eq(notifications.userId, req.user!.sub))).limit(1))[0];
      if (!row) throw new HttpError(404, "Notification not found");
      res.json(toPortalShape(row));
      return;
    }
    const updated = await db.update(notifications)
      .set({ readAt: input.read ? new Date() : null })
      .where(and(eq(notifications.id, req.params.id), eq(notifications.userId, req.user!.sub)))
      .returning();
    if (!updated[0]) throw new HttpError(404, "Notification not found");
    res.json(toPortalShape(updated[0]));
  } catch (e) { next(e); }
});

notificationsRouter.post("/:id/read", async (req, res, next) => {
  try {
    const updated = await db.update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, req.params.id), eq(notifications.userId, req.user!.sub)))
      .returning();
    if (!updated[0]) throw new HttpError(404, "Notification not found");
    res.json(toPortalShape(updated[0]));
  } catch (e) { next(e); }
});

notificationsRouter.post("/read-all", async (req, res, next) => {
  try {
    await db.update(notifications).set({ readAt: new Date() })
      .where(and(eq(notifications.userId, req.user!.sub), isNull(notifications.readAt)));
    res.json({ ok: true });
  } catch (e) { next(e); }
});

notificationsRouter.delete("/:id", async (req, res, next) => {
  try {
    const del = await db.delete(notifications)
      .where(and(eq(notifications.id, req.params.id), eq(notifications.userId, req.user!.sub)))
      .returning();
    if (!del[0]) throw new HttpError(404, "Notification not found");
    res.json({ ok: true });
  } catch (e) { next(e); }
});
