import {
  pgTable, uuid, text, timestamp, date, integer, numeric, pgEnum, index, jsonb, boolean, primaryKey,
} from "drizzle-orm/pg-core";
import { employees } from "./hr.js";
import { users } from "./auth.js";

// ============================================================
// LEAVES
// ============================================================
export const leaveTypeEnum = pgEnum("leave_type", [
  "annual", "sick", "maternity", "paternity", "unpaid", "compassionate", "permission",
]);
export const leaveStatusEnum = pgEnum("leave_status", ["submitted", "approved", "rejected", "cancelled"]);

export const leaveRequests = pgTable(
  "leave_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    type: leaveTypeEnum("type").notNull(),
    fromDate: date("from_date").notNull(),
    toDate: date("to_date").notNull(),
    days: integer("days").notNull(),
    hours: numeric("hours", { precision: 4, scale: 2 }),   // temporary permission duration (decimal hours)
    startTime: text("start_time"),                          // permission window start "HH:MM" (within 08:50–18:30)
    endTime: text("end_time"),                              // permission window end "HH:MM"
    effectiveDate: date("effective_date"),                  // back-on-duty date after the leave
    status: leaveStatusEnum("status").notNull().default("submitted"),
    note: text("note"),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id, { onDelete: "set null" }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    employeeIdx: index("leave_requests_employee_idx").on(t.employeeId),
    statusIdx: index("leave_requests_status_idx").on(t.status),
    rangeIdx: index("leave_requests_range_idx").on(t.fromDate, t.toDate),
  }),
);

export const leaveBalances = pgTable(
  "leave_balances",
  {
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    leaveType: leaveTypeEnum("leave_type").notNull(),
    year: integer("year").notNull(),
    entitlement: numeric("entitlement", { precision: 6, scale: 2 }).notNull(),
    accrued: numeric("accrued", { precision: 6, scale: 2 }).notNull().default("0"),
    used: numeric("used", { precision: 6, scale: 2 }).notNull().default("0"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.employeeId, t.leaveType, t.year] }),
  }),
);

export const leaveHandovers = pgTable(
  "leave_handovers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leaveRequestId: uuid("leave_request_id").notNull().references(() => leaveRequests.id, { onDelete: "cascade" }),
    coverUserId: uuid("cover_user_id").references(() => users.id, { onDelete: "set null" }),
    taskId: uuid("task_id"),
    note: text("note"),
    status: text("status").notNull().default("pending"),       // pending|accepted|completed
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    leaveIdx: index("leave_handovers_leave_idx").on(t.leaveRequestId),
  }),
);

// ============================================================
// TRAINING
// ============================================================
export const trainingCategoryEnum = pgEnum("training_category", [
  "professional", "safety", "technical", "soft-skills", "compliance",
]);

export const trainingRecords = pgTable(
  "training_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    provider: text("provider"),
    category: trainingCategoryEnum("category").notNull(),
    issueDate: date("issue_date"),
    expiryDate: date("expiry_date"),
    costAed: numeric("cost_aed", { precision: 12, scale: 2 }),
    certificateFileId: uuid("certificate_file_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    employeeIdx: index("training_records_employee_idx").on(t.employeeId),
    expiryIdx: index("training_records_expiry_idx").on(t.expiryDate),
  }),
);

// ============================================================
// ASSETS
// ============================================================
export const assetTypeEnum = pgEnum("asset_type", [
  "laptop", "phone", "vehicle", "software", "tool", "uniform", "other",
]);
export const assetConditionEnum = pgEnum("asset_condition", ["new", "good", "fair", "damaged"]);

export const assetAssignments = pgTable(
  "asset_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    type: assetTypeEnum("type").notNull(),
    identifier: text("identifier").notNull(),
    description: text("description").notNull(),
    assignedDate: date("assigned_date").notNull(),
    returnedDate: date("returned_date"),
    condition: assetConditionEnum("condition"),
    estimatedValueAed: numeric("estimated_value_aed", { precision: 12, scale: 2 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    employeeIdx: index("asset_assignments_employee_idx").on(t.employeeId),
  }),
);

// ============================================================
// DISCIPLINARY
// ============================================================
export const disciplinaryTypeEnum = pgEnum("disciplinary_type", [
  "verbal-warning", "written-warning", "suspension", "final-warning", "termination",
]);

export const disciplinaryActions = pgTable(
  "disciplinary_actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    type: disciplinaryTypeEnum("type").notNull(),
    reason: text("reason").notNull(),
    detail: text("detail"),
    issuedByUserId: uuid("issued_by_user_id").references(() => users.id, { onDelete: "set null" }),
    acknowledgedByEmployee: boolean("acknowledged_by_employee").notNull().default(false),
    attachedFileIds: jsonb("attached_file_ids").default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    employeeIdx: index("disciplinary_actions_employee_idx").on(t.employeeId),
  }),
);

// ============================================================
// REVIEWS
// ============================================================
export const reviewStatusEnum = pgEnum("review_status", ["draft", "submitted", "acknowledged"]);

export const performanceReviews = pgTable(
  "performance_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    period: text("period").notNull(),                             // e.g. "2025-Q4"
    reviewerUserId: uuid("reviewer_user_id").references(() => users.id, { onDelete: "set null" }),
    date: date("date").notNull(),
    scores: jsonb("scores").notNull(),                           // [{dimension,score,max,comment}]
    overallRating: numeric("overall_rating", { precision: 4, scale: 2 }).notNull(),
    managerComments: text("manager_comments").notNull(),
    employeeComments: text("employee_comments"),
    status: reviewStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    employeeIdx: index("performance_reviews_employee_idx").on(t.employeeId),
  }),
);

// ============================================================
// ONBOARDING
// ============================================================
export const onboardingStatusEnum = pgEnum("onboarding_status", ["in-progress", "complete", "abandoned"]);

export const onboardingChecklists = pgTable(
  "onboarding_checklists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    expectedJoinDate: date("expected_join_date").notNull(),
    status: onboardingStatusEnum("status").notNull().default("in-progress"),
    steps: jsonb("steps").notNull(),                             // [{key,label,status,completedAt,note}]
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    employeeIdx: index("onboarding_checklists_employee_idx").on(t.employeeId),
  }),
);

// ============================================================
// PAYROLL
// ============================================================
export const payrollRunStatusEnum = pgEnum("payroll_run_status", ["draft", "approved", "paid", "void"]);

export const payrollRuns = pgTable(
  "payroll_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    office: text("office").notNull(),
    periodYear: integer("period_year").notNull(),
    periodMonth: integer("period_month").notNull(),
    status: payrollRunStatusEnum("status").notNull().default("draft"),
    runByUserId: uuid("run_by_user_id").references(() => users.id, { onDelete: "set null" }),
    runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
    totals: jsonb("totals"),                                     // {gross, deductions, net, count}
  },
  (t) => ({
    periodIdx: index("payroll_runs_period_idx").on(t.office, t.periodYear, t.periodMonth),
  }),
);

export const payslips = pgTable(
  "payslips",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    payrollRunId: uuid("payroll_run_id").notNull().references(() => payrollRuns.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    gross: numeric("gross", { precision: 14, scale: 2 }).notNull(),
    deductions: jsonb("deductions").notNull(),                   // {socialInsurance, pit, other}
    net: numeric("net", { precision: 14, scale: 2 }).notNull(),
    currency: text("currency").notNull(),
    fileId: uuid("file_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    runIdx: index("payslips_run_idx").on(t.payrollRunId),
    employeeIdx: index("payslips_employee_idx").on(t.employeeId),
  }),
);

// ============================================================
// LETTERS
// ============================================================
export const letterTypeEnum = pgEnum("letter_type", [
  "noc", "salary-certificate", "experience-letter", "employment-contract", "termination", "warning",
]);

export const lettersIssued = pgTable(
  "letters_issued",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    type: letterTypeEnum("type").notNull(),
    reference: text("reference").notNull(),
    recipient: text("recipient"),
    issueDate: date("issue_date").notNull().defaultNow(),
    issuedByUserId: uuid("issued_by_user_id").references(() => users.id, { onDelete: "set null" }),
    fileId: uuid("file_id"),
    payload: jsonb("payload"),                                    // snapshot of fields used
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    employeeIdx: index("letters_issued_employee_idx").on(t.employeeId),
    typeIdx: index("letters_issued_type_idx").on(t.type),
  }),
);
