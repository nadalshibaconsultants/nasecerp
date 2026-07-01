import { Router } from "express";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import { auditLog } from "../../db/schema/index.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireAnyPerm } from "../../middleware/rbac.js";
import { writeAudit } from "../../middleware/audit.js";

export const auditRouter = Router();
auditRouter.use(requireAuth);

const clientAuditSchema = z.object({
  timestamp: z.string().optional(),
  actor: z.string().optional(),
  module: z.string().min(1),
  action: z.string().min(1),
  subject: z.string().min(1),
  detail: z.string().optional(),
});

auditRouter.get("/", requireAnyPerm("hr:read", "reports:read", "settings:read"), async (_req, res, next) => {
  try {
    const rows = await db.select().from(auditLog).orderBy(desc(auditLog.at)).limit(500);
    res.json(rows.map(toAuditDto));
  } catch (e) { next(e); }
});

auditRouter.post("/", async (req, res, next) => {
  try {
    const input = clientAuditSchema.parse(req.body);
    await writeAudit(req, {
      action: input.action,
      entityType: input.module,
      after: {
        subject: input.subject,
        detail: input.detail,
        actor: input.actor,
        timestamp: input.timestamp,
      },
    });
    res.status(201).json({
      id: `client-${Date.now()}`,
      timestamp: input.timestamp ?? new Date().toISOString(),
      actor: input.actor ?? req.user?.role ?? "System",
      module: input.module,
      action: input.action,
      subject: input.subject,
      detail: input.detail,
    });
  } catch (e) { next(e); }
});

function toAuditDto(row: typeof auditLog.$inferSelect) {
  const after = row.after as any;
  return {
    id: String(row.id),
    timestamp: row.at?.toISOString?.() ?? String(row.at),
    actor: after?.actor ?? row.actorRole ?? row.actorUserId ?? "System",
    module: row.entityType,
    action: normalizeAction(row.action),
    subject: after?.subject ?? `${row.action} · ${row.entityType}${row.entityId ? ` · ${row.entityId}` : ""}`,
    detail: after?.detail ?? detailFromPayload(after),
  };
}

function normalizeAction(action: string) {
  if (action.startsWith("create")) return "create";
  if (action.startsWith("update")) return "update";
  if (action.startsWith("delete") || action.startsWith("cancel")) return "delete";
  if (action.startsWith("approve") || action.startsWith("post") || action.startsWith("finalize")) return "approve";
  if (action.startsWith("reject")) return "reject";
  if (action.startsWith("issue")) return "issue";
  return action;
}

function detailFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return undefined;
  try { return JSON.stringify(payload); } catch { return undefined; }
}
