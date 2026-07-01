import { pgTable, bigserial, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    actorUserId: uuid("actor_user_id"),
    actorRole: text("actor_role"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    ip: text("ip"),
    userAgent: text("user_agent"),
  },
  (t) => ({
    atIdx: index("audit_log_at_idx").on(t.at),
    actorIdx: index("audit_log_actor_idx").on(t.actorUserId),
    entityIdx: index("audit_log_entity_idx").on(t.entityType, t.entityId),
  }),
);

export type AuditEntry = typeof auditLog.$inferSelect;
export type NewAuditEntry = typeof auditLog.$inferInsert;
