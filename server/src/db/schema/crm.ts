import { pgTable, uuid, text, timestamp, date, integer, numeric, pgEnum, index } from "drizzle-orm/pg-core";
import { users } from "./auth.js";
import { projects } from "./projects.js";
import { companies } from "./enterprise.js";

export const leadStageEnum = pgEnum("lead_stage", ["new", "qualified", "proposal", "negotiation", "won", "lost"]);
export const leadSourceEnum = pgEnum("lead_source", ["referral", "website", "tender", "cold", "event", "existing-client", "other"]);
export const leadActivityTypeEnum = pgEnum("lead_activity_type", [
  "call", "email", "meeting", "note", "stage-change", "proposal-sent",
]);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    companyName: text("company_name").notNull(),
    contactName: text("contact_name").notNull(),
    contactRole: text("contact_role"),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    industry: text("industry"),
    source: leadSourceEnum("source").notNull().default("other"),
    stage: leadStageEnum("stage").notNull().default("new"),
    estimatedValueAed: numeric("estimated_value_aed", { precision: 16, scale: 2 }).notNull().default("0"),
    probability: integer("probability").notNull().default(20),
    expectedCloseDate: date("expected_close_date"),
    ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    stageIdx: index("leads_stage_idx").on(t.stage),
    companyIdx: index("leads_company_idx").on(t.companyId),
    ownerIdx: index("leads_owner_idx").on(t.ownerUserId),
  }),
);

export const leadActivities = pgTable(
  "lead_activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
    type: leadActivityTypeEnum("type").notNull(),
    by: text("by").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    summary: text("summary").notNull(),
    detail: text("detail"),
  },
  (t) => ({
    leadIdx: index("lead_activities_lead_idx").on(t.leadId, t.at),
  }),
);

export const leadConversions = pgTable(
  "lead_conversions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    convertedAt: timestamp("converted_at", { withTimezone: true }).notNull().defaultNow(),
    byUserId: uuid("by_user_id").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => ({
    leadIdx: index("lead_conversions_lead_idx").on(t.leadId),
  }),
);
