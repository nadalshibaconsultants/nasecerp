import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { officeEnum } from "./auth.js";

export const officeConfig = pgTable("office_config", {
  office: officeEnum("office").primaryKey(),
  currency: text("currency").notNull(),
  taxRate: text("tax_rate").notNull(),
  labourRules: jsonb("labour_rules").notNull(),
  workingWeek: jsonb("working_week").notNull(),
  publicHolidays: jsonb("public_holidays").notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type OfficeConfig = typeof officeConfig.$inferSelect;
