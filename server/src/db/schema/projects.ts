import {
  pgTable, uuid, text, timestamp, date, integer, numeric, pgEnum, index, jsonb, boolean, primaryKey,
} from "drizzle-orm/pg-core";
import { users } from "./auth.js";
import { companies, branches, costCenters } from "./enterprise.js";

export const projectStageEnum = pgEnum("project_stage", ["pipeline", "pre-contract", "post-contract", "completed"]);
export const projectHealthEnum = pgEnum("project_health", ["on-track", "at-risk", "delayed"]);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
    costCenterId: uuid("cost_center_id").references(() => costCenters.id, { onDelete: "set null" }),
    code: text("code").notNull().unique(),
    nameEn: text("name_en").notNull(),
    nameAr: text("name_ar"),
    stage: projectStageEnum("stage").notNull().default("pipeline"),
    health: projectHealthEnum("health").notNull().default("on-track"),
    type: text("type"),
    plotNo: text("plot_no"),
    community: text("community"),
    emirate: text("emirate"),
    authority: text("authority"),
    client: text("client"),
    contractValue: numeric("contract_value", { precision: 16, scale: 2 }).default("0"),
    currency: text("currency").notNull().default("AED"),
    feeType: text("fee_type"),
    startDate: date("start_date"),
    targetCompletion: date("target_completion"),
    actualCompletion: date("actual_completion"),
    gfa: numeric("gfa", { precision: 14, scale: 2 }),
    plotArea: numeric("plot_area", { precision: 14, scale: 2 }),
    floors: integer("floors"),
    currentSubStage: integer("current_sub_stage").default(0),
    progress: numeric("progress", { precision: 5, scale: 2 }).default("0"),
    budgetConsumed: numeric("budget_consumed", { precision: 16, scale: 2 }).default("0"),
    hoursLogged: numeric("hours_logged", { precision: 12, scale: 2 }).default("0"),
    hoursPlanned: numeric("hours_planned", { precision: 12, scale: 2 }).default("0"),
    daysToDeadline: integer("days_to_deadline"),
    openRfis: integer("open_rfis").default(0),
    openNcrs: integer("open_ncrs").default(0),
    pendingApprovals: integer("pending_approvals").default(0),
    starred: boolean("starred").notNull().default(false),
    pmUserId: uuid("pm_user_id").references(() => users.id, { onDelete: "set null" }),
    designLeadUserId: uuid("design_lead_user_id").references(() => users.id, { onDelete: "set null" }),
    office: text("office"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    stageIdx: index("projects_stage_idx").on(t.stage),
    companyIdx: index("projects_company_idx").on(t.companyId),
    branchIdx: index("projects_branch_idx").on(t.branchId),
    costCenterIdx: index("projects_cost_center_idx").on(t.costCenterId),
    pmIdx: index("projects_pm_idx").on(t.pmUserId),
  }),
);

export const projectTeamMembers = pgTable(
  "project_team_members",
  {
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    roleOnProject: text("role_on_project"),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
    removedAt: timestamp("removed_at", { withTimezone: true }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.projectId, t.userId] }),
    userIdx: index("project_team_members_user_idx").on(t.userId),
  }),
);

export const projectStages = pgTable(
  "project_stages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    subStageCode: text("sub_stage_code").notNull(),                  // S1..S8 | G1..G5 | IFC | etc.
    label: text("label").notNull(),
    status: text("status").notNull().default("pending"),             // pending|active|done|skipped
    plannedStart: date("planned_start"),
    plannedEnd: date("planned_end"),
    actualStart: date("actual_start"),
    actualEnd: date("actual_end"),
    varianceReason: text("variance_reason"),
    progress: numeric("progress", { precision: 5, scale: 2 }).default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdx: index("project_stages_project_idx").on(t.projectId),
  }),
);

export const stageGateStatusEnum = pgEnum("stage_gate_status", ["in-review", "approved", "rejected", "withdrawn"]);

export const stageGateApprovals = pgTable(
  "stage_gate_approvals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    stageCode: text("stage_code").notNull(),
    gateCode: text("gate_code").notNull(),
    requesterUserId: uuid("requester_user_id").references(() => users.id, { onDelete: "set null" }),
    requesterDisplay: text("requester_display").notNull(),
    status: stageGateStatusEnum("status").notNull().default("in-review"),
    approvals: jsonb("approvals").notNull(),                         // ApproverSlot[]
    note: text("note"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdx: index("stage_gate_approvals_project_idx").on(t.projectId),
  }),
);

export const authoritySubmittalStatusEnum = pgEnum("authority_submittal_status", [
  "to-start", "in-progress", "approved", "rejected", "completed",
]);

export const authoritySubmittals = pgTable(
  "authority_submittals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    isGroupHeader: boolean("is_group_header").notNull().default(false),
    groupName: text("group_name"),
    name: text("name").notNull(),
    authority: text("authority"),
    status: authoritySubmittalStatusEnum("status").notNull().default("to-start"),
    milestoneStatus: authoritySubmittalStatusEnum("milestone_status"),
    startDate: date("start_date"),
    targetFinishDate: date("target_finish_date"),
    actualFinishDate: date("actual_finish_date"),
    remarks: text("remarks"),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdx: index("authority_submittals_project_idx").on(t.projectId),
    orderIdx: index("authority_submittals_order_idx").on(t.projectId, t.order),
  }),
);
