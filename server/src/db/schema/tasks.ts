import {
  pgTable, uuid, text, timestamp, date, integer, pgEnum, index, jsonb, numeric,
} from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { users } from "./auth.js";

export const taskStatusEnum = pgEnum("task_status", ["todo", "in-progress", "blocked", "done"]);
export const taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high", "urgent"]);
export const taskCategoryEnum = pgEnum("task_category", [
  "design", "review", "meeting", "submission", "site", "admin", "client", "other",
]);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatusEnum("status").notNull().default("todo"),
    priority: taskPriorityEnum("priority").notNull().default("medium"),
    category: taskCategoryEnum("category").notNull().default("other"),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
    assigneeUserId: uuid("assignee_user_id").references(() => users.id, { onDelete: "set null" }),
    // Full set of assignees (a task can be assigned to many people). The single
    // assigneeUserId above is kept as the "primary" for back-compat / sorting.
    assigneeUserIds: jsonb("assignee_user_ids").$type<string[]>().notNull().default([]),
    reporterUserId: uuid("reporter_user_id").references(() => users.id, { onDelete: "set null" }),
    dueDate: date("due_date"),
    tags: jsonb("tags").default([]),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdx: index("tasks_project_idx").on(t.projectId),
    assigneeIdx: index("tasks_assignee_idx").on(t.assigneeUserId),
    statusIdx: index("tasks_status_idx").on(t.status),
    dueIdx: index("tasks_due_idx").on(t.dueDate),
  }),
);

export const taskTimerSessions = pgTable(
  "task_timer_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationSec: integer("duration_sec"),
    note: text("note"),
  },
  (t) => ({
    userIdx: index("task_timer_sessions_user_idx").on(t.userId),
    taskIdx: index("task_timer_sessions_task_idx").on(t.taskId),
    activeIdx: index("task_timer_sessions_active_idx").on(t.userId, t.endedAt),
  }),
);

export const timesheetStatusEnum = pgEnum("timesheet_status", ["draft", "submitted", "approved", "rejected"]);

export const timesheets = pgTable(
  "timesheets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    weekStartDate: date("week_start_date").notNull(),
    weekEndDate: date("week_end_date").notNull(),
    status: timesheetStatusEnum("status").notNull().default("draft"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    hours: jsonb("hours").notNull().default({}),                     // { "2026-05-19": { taskId: hours, ... }, ... }
    totalHours: numeric("total_hours", { precision: 8, scale: 2 }).notNull().default("0"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userWeekIdx: index("timesheets_user_week_idx").on(t.userId, t.weekStartDate),
    statusIdx: index("timesheets_status_idx").on(t.status),
  }),
);

// Per-task group chat (WhatsApp-style). kind: text | image | file | voice.
export const taskMessages = pgTable(
  "task_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    authorDisplay: text("author_display"),
    kind: text("kind").notNull().default("text"),       // text | image | file | voice
    body: text("body"),                                  // text content or caption
    fileStoreId: uuid("file_store_id"),                  // → files table (image/file/voice)
    fileName: text("file_name"),
    mimeType: text("mime_type"),
    durationSec: integer("duration_sec"),                // for voice notes
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    taskIdx: index("task_messages_task_idx").on(t.taskId, t.createdAt),
  }),
);
