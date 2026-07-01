import {
  pgTable, uuid, text, timestamp, date, integer, numeric, pgEnum, index, jsonb, boolean,
} from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { users } from "./auth.js";

// ============================================================
// RISKS — ISO 31000 model
// ============================================================
export const riskStatusEnum = pgEnum("risk_status", [
  "identified", "assessed", "treated", "monitoring", "escalated", "closed", "realised",
]);
export const riskTreatmentEnum = pgEnum("risk_treatment", ["avoid", "transfer", "mitigate", "accept"]);

export const projectRisks = pgTable(
  "project_risks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),

    category: text("category").notNull(),
    phase: text("phase").notNull(),
    stageRef: text("stage_ref"),
    authorityRef: text("authority_ref"),

    inherentProbability: integer("inherent_probability").notNull(),
    inherentImpact: integer("inherent_impact").notNull(),
    residualProbability: integer("residual_probability"),
    residualImpact: integer("residual_impact"),

    treatment: riskTreatmentEnum("treatment").notNull(),
    treatmentRationale: text("treatment_rationale"),

    costImpactAed: numeric("cost_impact_aed", { precision: 16, scale: 2 }),
    scheduleImpactDays: integer("schedule_impact_days"),

    ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "set null" }),
    ownerDisplay: text("owner_display"),
    raisedByUserId: uuid("raised_by_user_id").references(() => users.id, { onDelete: "set null" }),
    raisedByDisplay: text("raised_by_display"),
    raisedAt: timestamp("raised_at", { withTimezone: true }).notNull().defaultNow(),

    triggerConditions: text("trigger_conditions"),
    earlyWarningSigns: text("early_warning_signs"),
    contingencyPlan: text("contingency_plan"),

    linkedTaskIds: jsonb("linked_task_ids").default([]),
    linkedDocumentIds: jsonb("linked_document_ids").default([]),
    linkedSubmittalIds: jsonb("linked_submittal_ids").default([]),

    status: riskStatusEnum("status").notNull().default("identified"),
    reviewFrequency: text("review_frequency").notNull().default("monthly"),
    nextReviewDate: date("next_review_date"),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),

    actions: jsonb("actions").notNull().default([]),
    reviews: jsonb("reviews").notNull().default([]),

    closedAt: timestamp("closed_at", { withTimezone: true }),
    closureReason: text("closure_reason"),
    lessonsLearned: text("lessons_learned"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdx: index("project_risks_project_idx").on(t.projectId),
    statusIdx: index("project_risks_status_idx").on(t.status),
  }),
);

// ============================================================
// DOCUMENT FOLDERS
// ============================================================
export const docFolders = pgTable(
  "doc_folders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    order: integer("order").notNull().default(0),
    code: text("code"),
    name: text("name").notNull(),
    accessRoles: jsonb("access_roles").default([]),
    retention: text("retention"),
    indicator: text("indicator"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdx: index("doc_folders_project_idx").on(t.projectId),
    parentIdx: index("doc_folders_parent_idx").on(t.parentId),
  }),
);

// ============================================================
// PROJECT DOCUMENTS (DocumentFile in frontend)
// ============================================================
export const docStatusEnum = pgEnum("doc_status", [
  "draft", "for-approval", "final", "stamped", "superseded",
]);

export const projectDocuments = pgTable(
  "project_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    folderId: uuid("folder_id").notNull().references(() => docFolders.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category"),
    status: docStatusEnum("status").notNull().default("draft"),
    version: text("version").notNull().default("v1.0"),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, { onDelete: "set null" }),
    uploadedByDisplay: text("uploaded_by_display"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    sizeBytes: integer("size_bytes").notNull().default(0),
    mimeType: text("mime_type"),
    fileStoreId: uuid("file_store_id"),
    notes: text("notes"),
  },
  (t) => ({
    folderIdx: index("project_documents_folder_idx").on(t.folderId),
    projectIdx: index("project_documents_project_idx").on(t.projectId),
    statusIdx: index("project_documents_status_idx").on(t.status),
  }),
);

// ============================================================
// DRAWINGS
// ============================================================
export const drawings = pgTable(
  "drawings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    drawingNumber: text("drawing_number").notNull(),
    title: text("title").notNull(),
    discipline: text("discipline").notNull(),
    scale: text("scale"),
    paperSize: text("paper_size"),
    currentRev: text("current_rev").notNull().default("P01"),
    currentStatus: text("current_status").notNull(),
    preparedByDisplay: text("prepared_by_display"),
    checkedByDisplay: text("checked_by_display"),
    approvedByDisplay: text("approved_by_display"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    revisions: jsonb("revisions").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdx: index("drawings_project_idx").on(t.projectId),
    numberIdx: index("drawings_number_idx").on(t.projectId, t.drawingNumber),
  }),
);

// ============================================================
// RFIs
// ============================================================
export const rfiStatusEnum = pgEnum("rfi_status", [
  "draft", "open", "awaiting-response", "responded", "closed", "void",
]);
export const rfiPriorityEnum = pgEnum("rfi_priority", ["low", "medium", "high", "urgent"]);

export const rfis = pgTable(
  "rfis",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reference: text("reference").notNull(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    raisedByCompany: text("raised_by_company").notNull(),
    raisedByDisplay: text("raised_by_display").notNull(),
    raisedToDiscipline: text("raised_to_discipline"),
    raisedToDisplay: text("raised_to_display"),
    subject: text("subject").notNull(),
    question: text("question").notNull(),
    drawingRefs: jsonb("drawing_refs").default([]),
    specificationRefs: jsonb("specification_refs").default([]),
    priority: rfiPriorityEnum("priority").notNull().default("medium"),
    dueDate: date("due_date"),
    status: rfiStatusEnum("status").notNull().default("draft"),
    responses: jsonb("responses").notNull().default([]),
    costImpact: numeric("cost_impact", { precision: 16, scale: 2 }),
    scheduleImpactDays: integer("schedule_impact_days"),
    closureNote: text("closure_note"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedByDisplay: text("closed_by_display"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdx: index("rfis_project_idx").on(t.projectId),
    statusIdx: index("rfis_status_idx").on(t.status),
    refIdx: index("rfis_reference_idx").on(t.reference),
  }),
);

// Generic per-project items (Quality NCR/IR/MAR/WIR, HSE incidents/toolbox/
// inspections, Meetings, transmittals…). One table keyed by `kind`; the full
// record minus id/projectId/kind/timestamps lives in `data` (jsonb).
export const projectItems = pgTable(
  "project_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    data: jsonb("data").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    kindIdx: index("project_items_kind_idx").on(t.kind),
    projIdx: index("project_items_project_idx").on(t.projectId),
    projectKindIdx: index("project_items_project_kind_idx").on(t.projectId, t.kind),
  }),
);
