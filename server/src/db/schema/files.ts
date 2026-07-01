import { pgTable, uuid, text, timestamp, integer, pgEnum, index, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./auth.js";
import { companies } from "./enterprise.js";

export const fileScopeEnum = pgEnum("file_scope", [
  "hr",
  "project",
  "finance",
  "crm",
  "letter",
  "contractor",
  "other",
]);

export const fileAclPrincipalEnum = pgEnum("file_acl_principal", ["role", "user", "project", "employee"]);
export const fileAclPermEnum = pgEnum("file_acl_permission", ["read", "write", "delete"]);

export const files = pgTable(
  "files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    originalName: text("original_name").notNull(),
    mime: text("mime").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storagePath: text("storage_path").notNull(),
    sha256: text("sha256").notNull(),
    scope: fileScopeEnum("scope").notNull(),
    scopeId: uuid("scope_id"),
    entityType: text("entity_type"),                              // employee|project|training|asset|drawing|contract|boq|snag|ir|wir|other
    entityId: text("entity_id"),                                  // free-form id (may be uuid or string id from legacy data)
    category: text("category"),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, { onDelete: "set null" }),
    uploadedByDisplay: text("uploaded_by_display"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    scopeIdx: index("files_scope_idx").on(t.scope, t.scopeId),
    companyIdx: index("files_company_idx").on(t.companyId),
    entityIdx: index("files_entity_idx").on(t.entityType, t.entityId),
    sha256Idx: index("files_sha256_idx").on(t.sha256),
  }),
);

export const fileAcl = pgTable(
  "file_acl",
  {
    fileId: uuid("file_id").notNull().references(() => files.id, { onDelete: "cascade" }),
    principalType: fileAclPrincipalEnum("principal_type").notNull(),
    principalId: text("principal_id").notNull(),
    permission: fileAclPermEnum("permission").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.fileId, t.principalType, t.principalId, t.permission] }),
  }),
);

export type FileRow = typeof files.$inferSelect;
