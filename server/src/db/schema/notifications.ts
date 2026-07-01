import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./auth.js";

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    severity: text("severity").notNull().default("info"),       // info | warning | critical
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    sourceEntityType: text("source_entity_type"),
    sourceEntityId: text("source_entity_id"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("notifications_user_idx").on(t.userId, t.readAt),
  }),
);

export type Notification = typeof notifications.$inferSelect;
