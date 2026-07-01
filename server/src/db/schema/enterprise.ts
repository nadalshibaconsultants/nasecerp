import {
  pgTable, uuid, text, timestamp, date, numeric, boolean, index, uniqueIndex,
} from "drizzle-orm/pg-core";

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    legalName: text("legal_name"),
    country: text("country").notNull().default("AE"),
    baseCurrency: text("base_currency").notNull().default("AED"),
    taxRegistrationNo: text("tax_registration_no"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    codeIdx: uniqueIndex("companies_code_uq").on(t.code),
  }),
);

export const branches = pgTable(
  "branches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    country: text("country").notNull(),
    city: text("city"),
    currency: text("currency").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    companyIdx: index("branches_company_idx").on(t.companyId),
    codeUq: uniqueIndex("branches_company_code_uq").on(t.companyId, t.code),
  }),
);

export const departments = pgTable(
  "departments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    managerUserId: uuid("manager_user_id"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    companyIdx: index("departments_company_idx").on(t.companyId),
    branchIdx: index("departments_branch_idx").on(t.branchId),
    codeUq: uniqueIndex("departments_company_code_uq").on(t.companyId, t.code),
  }),
);

export const costCenters = pgTable(
  "cost_centers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    companyIdx: index("cost_centers_company_idx").on(t.companyId),
    departmentIdx: index("cost_centers_department_idx").on(t.departmentId),
    codeUq: uniqueIndex("cost_centers_company_code_uq").on(t.companyId, t.code),
  }),
);

export const currencies = pgTable("currencies", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  symbol: text("symbol"),
  decimals: numeric("decimals", { precision: 2, scale: 0 }).notNull().default("2"),
  active: boolean("active").notNull().default(true),
});

export const exchangeRates = pgTable(
  "exchange_rates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
    fromCurrency: text("from_currency").notNull().references(() => currencies.code, { onDelete: "restrict" }),
    toCurrency: text("to_currency").notNull().references(() => currencies.code, { onDelete: "restrict" }),
    rateDate: date("rate_date").notNull(),
    rate: numeric("rate", { precision: 18, scale: 8 }).notNull(),
    source: text("source"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    rateUq: uniqueIndex("exchange_rates_company_pair_date_uq").on(t.companyId, t.fromCurrency, t.toCurrency, t.rateDate),
  }),
);

export const fiscalYears = pgTable(
  "fiscal_years",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    companyIdx: index("fiscal_years_company_idx").on(t.companyId),
    labelUq: uniqueIndex("fiscal_years_company_label_uq").on(t.companyId, t.label),
  }),
);

export const fiscalPeriods = pgTable(
  "fiscal_periods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fiscalYearId: uuid("fiscal_year_id").notNull().references(() => fiscalYears.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    periodNo: numeric("period_no", { precision: 2, scale: 0 }).notNull(),
    label: text("label").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    status: text("status").notNull().default("open"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedByUserId: uuid("closed_by_user_id"),
  },
  (t) => ({
    companyIdx: index("fiscal_periods_company_idx").on(t.companyId),
    yearIdx: index("fiscal_periods_year_idx").on(t.fiscalYearId),
    periodUq: uniqueIndex("fiscal_periods_year_period_uq").on(t.fiscalYearId, t.periodNo),
  }),
);
