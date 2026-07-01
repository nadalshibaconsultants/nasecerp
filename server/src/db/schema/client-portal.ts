// Client Portal — project-scoped access + login/session logs.
// Client accounts themselves live in the `users` table with role='client';
// these tables add which projects each client may see and a session log.
import { pgTable, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./auth.js";
import { projects } from "./projects.js";

export const clientProjectAccess = pgTable(
  "client_project_access",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientUserId: uuid("client_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("viewer"), // 'admin' | 'viewer'
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("client_project_access_uniq").on(t.clientUserId, t.projectId),
    projectIdx: index("client_project_access_project_idx").on(t.projectId),
  }),
);

export const clientLoginLogs = pgTable(
  "client_login_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientUserId: uuid("client_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    ipAddress: text("ip_address"),
    device: text("device"),
    loginTime: timestamp("login_time", { withTimezone: true }).notNull().defaultNow(),
    logoutTime: timestamp("logout_time", { withTimezone: true }),
  },
  (t) => ({
    userIdx: index("client_login_logs_user_idx").on(t.clientUserId, t.loginTime),
  }),
);
