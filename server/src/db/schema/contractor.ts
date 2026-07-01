import {
  pgTable, uuid, text, timestamp, date, integer, pgEnum, index, jsonb, boolean,
} from "drizzle-orm/pg-core";
import { users } from "./auth.js";
import { projects } from "./projects.js";
import { companies } from "./enterprise.js";

export const contractorStatusEnum = pgEnum("contractor_status", ["active", "invited", "suspended"]);
export const submittalStatusEnum = pgEnum("submittal_status", [
  "draft", "submitted", "under-review", "code-a", "code-b", "code-c", "code-d",
  "revise-and-resubmit", "rejected", "closed", "overdue",
]);
export const submittalPriorityEnum = pgEnum("submittal_priority", ["Normal", "Urgent"]);

export const contractorCompanies = pgTable(
  "contractor_companies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    tradeLicense: text("trade_license").notNull(),
    type: text("type").notNull(),                                       // "Main Contractor" | "Subcontractor" | etc.
    trades: jsonb("trades").notNull().default([]),
    status: contractorStatusEnum("status").notNull().default("invited"),
    allowedTypes: jsonb("allowed_types").notNull().default([]),         // SubmittalTypeCode[]
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ companyIdx: index("contractor_companies_company_idx").on(t.companyId) }),
);

export const contractorUsers = pgTable(
  "contractor_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").notNull().references(() => contractorCompanies.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),     // platform user account
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: text("role").notNull(),                                       // "Admin" | "Engineer" | "Coordinator"
    avatar: text("avatar"),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    companyIdx: index("contractor_users_company_idx").on(t.companyId),
    emailIdx: index("contractor_users_email_idx").on(t.email),
  }),
);

export const submittals = pgTable(
  "submittals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ref: text("ref").notNull().unique(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    projectCode: text("project_code"),
    projectName: text("project_name"),
    contractorCompanyId: uuid("contractor_company_id").notNull().references(() => contractorCompanies.id, { onDelete: "restrict" }),
    contractorUserId: uuid("contractor_user_id").references(() => contractorUsers.id, { onDelete: "set null" }),
    type: text("type").notNull(),                                       // SubmittalTypeCode
    discipline: text("discipline").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    dateSubmitted: timestamp("date_submitted", { withTimezone: true }).notNull().defaultNow(),
    slaDeadline: timestamp("sla_deadline", { withTimezone: true }).notNull(),
    status: submittalStatusEnum("status").notNull().default("submitted"),
    contractorUserDisplay: text("contractor_user_display"),             // display name shown in the portal
    revision: integer("revision").notNull().default(0),
    primaryReviewer: jsonb("primary_reviewer").notNull(),               // SiteRoleCode | SiteRoleCode[]
    approver: text("approver").notNull(),
    watchers: jsonb("watchers").notNull().default([]),
    attachmentFileIds: jsonb("attachment_file_ids").notNull().default([]),
    location: text("location"),
    priority: submittalPriorityEnum("priority").notNull().default("Normal"),
    responseDate: timestamp("response_date", { withTimezone: true }),
    responseByUserId: uuid("response_by_user_id").references(() => users.id, { onDelete: "set null" }),
    responseBy: text("response_by"),
    comments: text("comments"),
    fromPortal: boolean("from_portal").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    companyIdx: index("submittals_company_idx").on(t.contractorCompanyId),
    projectIdx: index("submittals_project_idx").on(t.projectId),
    statusIdx: index("submittals_status_idx").on(t.status),
    slaIdx: index("submittals_sla_idx").on(t.slaDeadline),
  }),
);

export const submittalRevisions = pgTable(
  "submittal_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submittalId: uuid("submittal_id").notNull().references(() => submittals.id, { onDelete: "cascade" }),
    revision: integer("revision").notNull(),
    status: submittalStatusEnum("status").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewerUserId: uuid("reviewer_user_id").references(() => users.id, { onDelete: "set null" }),
    comments: text("comments"),
    attachmentFileIds: jsonb("attachment_file_ids").default([]),
  },
  (t) => ({
    submittalIdx: index("submittal_revisions_submittal_idx").on(t.submittalId),
  }),
);

export const submittalMessages = pgTable(
  "submittal_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submittalId: uuid("submittal_id").notNull().references(() => submittals.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "set null" }),
    authorDisplay: text("author_display").notNull(),
    authorRole: text("author_role").notNull(),                          // "contractor" | "consultant"
    body: text("body").notNull(),
    attachmentFileId: uuid("attachment_file_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    submittalIdx: index("submittal_messages_submittal_idx").on(t.submittalId, t.createdAt),
  }),
);
