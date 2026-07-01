import {
  pgTable, uuid, text, timestamp, date, integer, numeric, pgEnum, index, jsonb, primaryKey, boolean,
} from "drizzle-orm/pg-core";
import { officeEnum } from "./auth.js";
import { companies, branches, departments } from "./enterprise.js";

export const employmentStatusEnum = pgEnum("employment_status", [
  "active", "probation", "on-leave", "suspended", "terminated", "resigned",
]);

export const contractTypeEnum = pgEnum("contract_type", [
  "limited", "unlimited", "part-time", "freelance", "consultant",
]);

export const employeeDocumentTypeEnum = pgEnum("employee_document_type", [
  "passport", "emirates-id", "visa", "labour-card", "driving-licence",
  "qualification", "experience-cert", "medical", "other",
]);

export const employees = pgTable(
  "employees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    code: text("code").notNull().unique(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    arabicName: text("arabic_name"),
    gender: text("gender"),                                 // 'M' | 'F'
    dob: date("dob"),
    nationality: text("nationality"),
    maritalStatus: text("marital_status"),
    email: text("email").notNull().unique(),
    phone: text("phone"),
    emergencyPhone: text("emergency_phone"),
    emergencyContactName: text("emergency_contact_name"),
    homeAddress: text("home_address"),
    photoUrl: text("photo_url"),

    office: officeEnum("office").notNull(),
    jobTitle: text("job_title").notNull(),
    department: text("department").notNull(),
    managerEmployeeId: uuid("manager_employee_id"),
    status: employmentStatusEnum("status").notNull().default("active"),
    joinDate: date("join_date").notNull(),
    endDate: date("end_date"),
    workLocation: text("work_location"),

    contractType: contractTypeEnum("contract_type").notNull().default("unlimited"),
    contractEndDate: date("contract_end_date"),
    probationEndDate: date("probation_end_date"),

    // Identity (top-level for ease of querying expiry alerts)
    passportNo: text("passport_no"),
    passportExpiry: date("passport_expiry"),
    emiratesIdNo: text("emirates_id_no"),
    emiratesIdExpiry: date("emirates_id_expiry"),
    visaNo: text("visa_no"),
    visaExpiry: date("visa_expiry"),
    visaSponsor: text("visa_sponsor"),
    labourCardNo: text("labour_card_no"),
    labourCardExpiry: date("labour_card_expiry"),

    assignedProjectId: uuid("assigned_project_id"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    officeIdx: index("employees_office_idx").on(t.office),
    companyIdx: index("employees_company_idx").on(t.companyId),
    branchIdx: index("employees_branch_idx").on(t.branchId),
    departmentRefIdx: index("employees_department_ref_idx").on(t.departmentId),
    statusIdx: index("employees_status_idx").on(t.status),
    managerIdx: index("employees_manager_idx").on(t.managerEmployeeId),
    departmentIdx: index("employees_department_idx").on(t.department),
    passportExpiryIdx: index("employees_passport_expiry_idx").on(t.passportExpiry),
    visaExpiryIdx: index("employees_visa_expiry_idx").on(t.visaExpiry),
    eidExpiryIdx: index("employees_eid_expiry_idx").on(t.emiratesIdExpiry),
    labourCardExpiryIdx: index("employees_labour_card_expiry_idx").on(t.labourCardExpiry),
  }),
);

export const employeeCompensation = pgTable("employee_compensation", {
  employeeId: uuid("employee_id").primaryKey().references(() => employees.id, { onDelete: "cascade" }),
  basic: numeric("basic", { precision: 14, scale: 2 }).notNull().default("0"),
  housing: numeric("housing", { precision: 14, scale: 2 }).notNull().default("0"),
  transport: numeric("transport", { precision: 14, scale: 2 }).notNull().default("0"),
  food: numeric("food", { precision: 14, scale: 2 }).notNull().default("0"),
  other: numeric("other", { precision: 14, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("AED"),
  effectiveFrom: date("effective_from"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const employeeBankDetails = pgTable("employee_bank_details", {
  employeeId: uuid("employee_id").primaryKey().references(() => employees.id, { onDelete: "cascade" }),
  bankName: text("bank_name"),
  iban: text("iban"),
  accountNo: text("account_no"),
  swift: text("swift"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const employeeDocuments = pgTable(
  "employee_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    type: employeeDocumentTypeEnum("type").notNull(),
    number: text("number"),
    issueDate: date("issue_date"),
    expiryDate: date("expiry_date"),
    fileId: uuid("file_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    employeeIdx: index("employee_documents_employee_idx").on(t.employeeId),
    expiryIdx: index("employee_documents_expiry_idx").on(t.expiryDate),
  }),
);

export const dependents = pgTable(
  "dependents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    relation: text("relation").notNull(),                    // spouse|son|daughter|father|mother|other
    dob: date("dob"),
    passportNo: text("passport_no"),
    visaSponsor: text("visa_sponsor"),                       // company|self|spouse
    visaExpiry: date("visa_expiry"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    employeeIdx: index("dependents_employee_idx").on(t.employeeId),
  }),
);

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;

// Generic HR self-service items (kind + jsonb), e.g. salary-increment requests.
// Owned by the submitting user (data.ownerUserId); HR reviews and decides.
export const hrItems = pgTable(
  "hr_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kind: text("kind").notNull(),
    data: jsonb("data").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    kindIdx: index("hr_items_kind_idx").on(t.kind),
  }),
);
