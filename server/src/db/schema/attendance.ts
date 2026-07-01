import {
  pgTable, uuid, text, timestamp, integer, numeric, pgEnum, index, boolean, jsonb, primaryKey,
} from "drizzle-orm/pg-core";
import { projects } from "./projects.js";
import { employees } from "./hr.js";
import { users } from "./auth.js";

export const punchTypeEnum = pgEnum("punch_type", ["in", "out"]);
export const geofenceCheckEnum = pgEnum("geofence_check", [
  "passed", "failed-out", "low-accuracy", "no-gps", "manual-override",
]);
export const punchDeviceEnum = pgEnum("punch_device", ["mobile-app", "web-simulator", "biometric-office"]);

export const geofences = pgTable(
  "geofences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    latitude: numeric("latitude", { precision: 10, scale: 7 }).notNull(),
    longitude: numeric("longitude", { precision: 10, scale: 7 }).notNull(),
    radiusM: integer("radius_m").notNull(),
    siteName: text("site_name"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdx: index("geofences_project_idx").on(t.projectId),
  }),
);

export const attendancePunches = pgTable(
  "attendance_punches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    geofenceId: uuid("geofence_id").references(() => geofences.id, { onDelete: "set null" }),
    type: punchTypeEnum("type").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    gpsLat: numeric("gps_lat", { precision: 10, scale: 7 }),
    gpsLng: numeric("gps_lng", { precision: 10, scale: 7 }),
    accuracyM: numeric("accuracy_m", { precision: 8, scale: 2 }),
    geofenceCheck: geofenceCheckEnum("geofence_check").notNull().default("passed"),
    device: punchDeviceEnum("device"),
    note: text("note"),
    overrideByUserId: uuid("override_by_user_id").references(() => users.id, { onDelete: "set null" }),
    overrideReason: text("override_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    employeeIdx: index("attendance_punches_employee_idx").on(t.employeeId),
    timestampIdx: index("attendance_punches_timestamp_idx").on(t.timestamp),
    employeeTsIdx: index("attendance_punches_employee_ts_idx").on(t.employeeId, t.timestamp),
  }),
);

// High-volume table — keep narrow. Partitioning by month is a Phase 12 ops task.
export const locationPings = pgTable(
  "location_pings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    latitude: numeric("latitude", { precision: 10, scale: 7 }).notNull(),
    longitude: numeric("longitude", { precision: 10, scale: 7 }).notNull(),
    accuracyM: numeric("accuracy_m", { precision: 8, scale: 2 }),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    batteryPct: integer("battery_pct"),
    deviceState: text("device_state"),
  },
  (t) => ({
    employeeIdx: index("location_pings_employee_idx").on(t.employeeId, t.timestamp),
    timestampIdx: index("location_pings_timestamp_idx").on(t.timestamp),
  }),
);

// Daily aggregation written by the attendance-rollup cron job.
export const attendanceDailyRollup = pgTable(
  "attendance_daily_rollup",
  {
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    day: text("day").notNull(),                                          // YYYY-MM-DD
    firstIn: timestamp("first_in", { withTimezone: true }),
    lastOut: timestamp("last_out", { withTimezone: true }),
    hours: numeric("hours", { precision: 6, scale: 2 }).notNull().default("0"),
    projectIds: jsonb("project_ids").default([]),
    punchCount: integer("punch_count").notNull().default(0),
    missingPunches: boolean("missing_punches").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.employeeId, t.day] }),
  }),
);
