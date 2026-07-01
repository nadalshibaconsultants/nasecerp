import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  pgEnum,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { companies } from "./enterprise.js";

export const roleEnum = pgEnum("role", [
  "director",
  "hr-manager",
  "finance-manager",
  "accountant",
  "pm",
  "design-lead",
  "site-engineer",
  "bd-manager",
  "employee",
  "contractor",
  "client",
]);

export const officeEnum = pgEnum("office", ["dubai", "cairo"]);

export const userStatusEnum = pgEnum("user_status", [
  "active",
  "disabled",
  "pending",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    role: roleEnum("role").notNull().default("employee"),
    office: officeEnum("office"),
    status: userStatusEnum("status").notNull().default("active"),
    employeeId: uuid("employee_id"),
    // Per-user permission grants added on top of the role's defaults — lets a
    // Director give any user access to extra modules. See lib/permissions.ts.
    extraPermissions: jsonb("extra_permissions")
      .$type<string[]>()
      .notNull()
      .default([]),
    avatarColor: text("avatar_color"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  t => ({
    emailIdx: index("users_email_idx").on(t.email),
    companyIdx: index("users_company_idx").on(t.companyId),
    roleIdx: index("users_role_idx").on(t.role),
  })
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    userAgent: text("user_agent"),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  t => ({
    userIdx: index("refresh_tokens_user_idx").on(t.userId),
    hashIdx: index("refresh_tokens_hash_idx").on(t.tokenHash),
  })
);

export const passwordResets = pgTable("password_resets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
