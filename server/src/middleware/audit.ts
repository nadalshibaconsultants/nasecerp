import type { Request } from "express";
import { db } from "../db/client.js";
import { auditLog } from "../db/schema/index.js";

export async function writeAudit(req: Request, opts: {
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}) {
  try {
    await db.insert(auditLog).values({
      actorUserId: req.user?.sub ?? null,
      actorRole: req.user?.role ?? null,
      action: opts.action,
      entityType: opts.entityType,
      entityId: opts.entityId ?? null,
      before: opts.before as any,
      after: opts.after as any,
      ip: req.ip ?? null,
      userAgent: req.header("user-agent") ?? null,
    });
  } catch (err) {
    console.error("[audit] write failed", err);
  }
}
