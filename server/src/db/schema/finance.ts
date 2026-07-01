import {
  pgTable, uuid, text, timestamp, date, integer, numeric, pgEnum, index, jsonb, boolean,
} from "drizzle-orm/pg-core";
import { users } from "./auth.js";
import { projects } from "./projects.js";
import { companies, branches, departments, costCenters } from "./enterprise.js";

const N16 = { precision: 16, scale: 2 } as const;
const N6  = { precision: 6, scale: 4 } as const;

// ============================================================
// Chart of Accounts
// ============================================================
export const accountTypeEnum = pgEnum("account_type", ["asset", "liability", "equity", "income", "expense"]);

export const coaAccounts = pgTable(
  "coa_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    type: accountTypeEnum("type").notNull(),
    subType: text("sub_type").notNull(),
    parentCode: text("parent_code"),
    currency: text("currency"),
    vatApplicable: boolean("vat_applicable").notNull().default(false),
    isControl: boolean("is_control").notNull().default(false),
    isBank: boolean("is_bank").notNull().default(false),
    isCash: boolean("is_cash").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    typeIdx: index("coa_accounts_type_idx").on(t.type),
    companyIdx: index("coa_accounts_company_idx").on(t.companyId),
  }),
);

// ============================================================
// Customers / Suppliers
// ============================================================
export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    trnNumber: text("trn_number"),
    address: text("address"),
    contactName: text("contact_name"),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    currency: text("currency").notNull().default("AED"),
    creditLimit: numeric("credit_limit", N16),
    paymentTermsDays: integer("payment_terms_days").notNull().default(30),
    openingBalance: numeric("opening_balance", N16),
    active: boolean("active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ companyIdx: index("customers_company_idx").on(t.companyId) }),
);

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    trnNumber: text("trn_number"),
    category: text("category").notNull().default("other"),
    contactName: text("contact_name"),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    iban: text("iban"),
    bankName: text("bank_name"),
    currency: text("currency").notNull().default("AED"),
    paymentTermsDays: integer("payment_terms_days").notNull().default(30),
    active: boolean("active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ companyIdx: index("suppliers_company_idx").on(t.companyId) }),
);

// ============================================================
// AR Invoices (lines stored as JSONB to match frontend shape)
// ============================================================
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft", "sent", "partially-paid", "paid", "overdue", "cancelled",
]);

export const arInvoices = pgTable(
  "ar_invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    costCenterId: uuid("cost_center_id").references(() => costCenters.id, { onDelete: "set null" }),
    number: text("number").notNull().unique(),
    customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "restrict" }),
    invoiceDate: date("invoice_date").notNull(),
    dueDate: date("due_date").notNull(),
    office: text("office").notNull(),
    currency: text("currency").notNull().default("AED"),
    fxRate: numeric("fx_rate", N6),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    poNumber: text("po_number"),
    retentionPct: numeric("retention_pct", N6),
    retentionAmount: numeric("retention_amount", N16),
    lines: jsonb("lines").notNull().default([]),
    subtotal: numeric("subtotal", N16).notNull().default("0"),
    vatTotal: numeric("vat_total", N16).notNull().default("0"),
    total: numeric("total", N16).notNull().default("0"),
    amountPaid: numeric("amount_paid", N16).notNull().default("0"),
    balance: numeric("balance", N16).notNull().default("0"),
    status: invoiceStatusEnum("status").notNull().default("draft"),
    notes: text("notes"),
    attachmentFileId: uuid("attachment_file_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    customerIdx: index("ar_invoices_customer_idx").on(t.customerId),
    companyIdx: index("ar_invoices_company_idx").on(t.companyId),
    costCenterIdx: index("ar_invoices_cost_center_idx").on(t.costCenterId),
    statusIdx: index("ar_invoices_status_idx").on(t.status),
    dueIdx: index("ar_invoices_due_idx").on(t.dueDate),
  }),
);

// ============================================================
// AR Receipts
// ============================================================
export const arReceipts = pgTable(
  "ar_receipts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    reference: text("reference").notNull(),
    date: date("date").notNull(),
    customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "restrict" }),
    invoiceIds: jsonb("invoice_ids").notNull().default([]),
    bankAccountId: uuid("bank_account_id"),
    amount: numeric("amount", N16).notNull(),
    currency: text("currency").notNull().default("AED"),
    paymentMethod: text("payment_method").notNull(),
    chequeNumber: text("cheque_number"),
    chequeBank: text("cheque_bank"),
    reference2: text("reference2"),
    notes: text("notes"),
    status: text("status").notNull().default("received"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ companyIdx: index("ar_receipts_company_idx").on(t.companyId) }),
);

// ============================================================
// AP Bills
// ============================================================
export const apBillStatusEnum = pgEnum("ap_bill_status", [
  "draft", "approved", "partially-paid", "paid", "overdue", "rejected",
]);

export const apBills = pgTable(
  "ap_bills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    costCenterId: uuid("cost_center_id").references(() => costCenters.id, { onDelete: "set null" }),
    number: text("number").notNull(),
    internalRef: text("internal_ref").notNull().unique(),
    supplierId: uuid("supplier_id").notNull().references(() => suppliers.id, { onDelete: "restrict" }),
    billDate: date("bill_date").notNull(),
    dueDate: date("due_date").notNull(),
    office: text("office").notNull(),
    currency: text("currency").notNull().default("AED"),
    fxRate: numeric("fx_rate", N6),
    poNumber: text("po_number"),
    lines: jsonb("lines").notNull().default([]),
    subtotal: numeric("subtotal", N16).notNull().default("0"),
    vatTotal: numeric("vat_total", N16).notNull().default("0"),
    total: numeric("total", N16).notNull().default("0"),
    amountPaid: numeric("amount_paid", N16).notNull().default("0"),
    balance: numeric("balance", N16).notNull().default("0"),
    status: apBillStatusEnum("status").notNull().default("draft"),
    approverUserId: uuid("approver_user_id").references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    attachmentFileId: uuid("attachment_file_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    supplierIdx: index("ap_bills_supplier_idx").on(t.supplierId),
    companyIdx: index("ap_bills_company_idx").on(t.companyId),
    costCenterIdx: index("ap_bills_cost_center_idx").on(t.costCenterId),
    statusIdx: index("ap_bills_status_idx").on(t.status),
    dueIdx: index("ap_bills_due_idx").on(t.dueDate),
  }),
);

export const supplierPayments = pgTable(
  "supplier_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    reference: text("reference").notNull(),
    date: date("date").notNull(),
    supplierId: uuid("supplier_id").notNull().references(() => suppliers.id, { onDelete: "restrict" }),
    billIds: jsonb("bill_ids").notNull().default([]),
    bankAccountId: uuid("bank_account_id"),
    amount: numeric("amount", N16).notNull(),
    currency: text("currency").notNull().default("AED"),
    paymentMethod: text("payment_method").notNull(),
    chequeNumber: text("cheque_number"),
    status: text("status").notNull().default("pending"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ companyIdx: index("supplier_payments_company_idx").on(t.companyId) }),
);

// ============================================================
// Journals
// ============================================================
export const journalStatusEnum = pgEnum("journal_status", ["draft", "posted", "void"]);

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    costCenterId: uuid("cost_center_id").references(() => costCenters.id, { onDelete: "set null" }),
    reference: text("reference").notNull(),
    date: date("date").notNull(),
    office: text("office").notNull(),
    currency: text("currency").notNull().default("AED"),
    fxRate: numeric("fx_rate", N6),
    source: text("source").notNull().default("manual"),
    sourceRefId: text("source_ref_id"),
    narration: text("narration").notNull(),
    lines: jsonb("lines").notNull().default([]),                        // JournalLine[]
    status: journalStatusEnum("status").notNull().default("draft"),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    postedByUserId: uuid("posted_by_user_id").references(() => users.id, { onDelete: "set null" }),
    reversalOf: uuid("reversal_of"),
    attachmentFileId: uuid("attachment_file_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    dateIdx: index("journal_entries_date_idx").on(t.date),
    companyIdx: index("journal_entries_company_idx").on(t.companyId),
    costCenterIdx: index("journal_entries_cost_center_idx").on(t.costCenterId),
    statusIdx: index("journal_entries_status_idx").on(t.status),
  }),
);

// ============================================================
// VAT
// ============================================================
export const vatReturns = pgTable(
  "vat_returns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    periodLabel: text("period_label").notNull(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    outputVatStandard: numeric("output_vat_standard", N16).notNull().default("0"),
    outputVatZero: numeric("output_vat_zero", N16).notNull().default("0"),
    outputVatExempt: numeric("output_vat_exempt", N16).notNull().default("0"),
    inputVatStandard: numeric("input_vat_standard", N16).notNull().default("0"),
    inputVatReverseCharge: numeric("input_vat_reverse_charge", N16).notNull().default("0"),
    netVatPayable: numeric("net_vat_payable", N16).notNull().default("0"),
    status: text("status").notNull().default("draft"),
    filedDate: date("filed_date"),
    paymentRef: text("payment_ref"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ companyIdx: index("vat_returns_company_idx").on(t.companyId) }),
);

// ============================================================
// Banking
// ============================================================
export const bankAccounts = pgTable(
  "bank_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    bankName: text("bank_name").notNull(),
    iban: text("iban").notNull(),
    accountNumber: text("account_number").notNull(),
    swift: text("swift"),
    branch: text("branch"),
    currency: text("currency").notNull().default("AED"),
    office: text("office").notNull(),
    openingBalance: numeric("opening_balance", N16).notNull().default("0"),
    openingDate: date("opening_date").notNull(),
    glAccountCode: text("gl_account_code").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    companyIdx: index("bank_accounts_company_idx").on(t.companyId),
    branchIdx: index("bank_accounts_branch_idx").on(t.branchId),
  }),
);

export const bankTransactions = pgTable(
  "bank_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bankAccountId: uuid("bank_account_id").notNull().references(() => bankAccounts.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    description: text("description").notNull(),
    debit: numeric("debit", N16).notNull().default("0"),
    credit: numeric("credit", N16).notNull().default("0"),
    balance: numeric("balance", N16),
    reference: text("reference"),
    reconciled: boolean("reconciled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    accountIdx: index("bank_transactions_account_idx").on(t.bankAccountId, t.date),
  }),
);

// ============================================================
// Petty Cash
// ============================================================
export const pettyCashFloats = pgTable(
  "petty_cash_floats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    office: text("office").notNull(),
    custodianUserId: uuid("custodian_user_id").references(() => users.id, { onDelete: "set null" }),
    currency: text("currency").notNull().default("AED"),
    balance: numeric("balance", N16).notNull().default("0"),
    cap: numeric("cap", N16).notNull().default("0"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ companyIdx: index("petty_cash_floats_company_idx").on(t.companyId) }),
);

export const pettyCashVouchers = pgTable(
  "petty_cash_vouchers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    floatId: uuid("float_id").notNull().references(() => pettyCashFloats.id, { onDelete: "cascade" }),
    voucherNumber: text("voucher_number").notNull(),
    date: date("date").notNull(),
    direction: text("direction").notNull(),                  // "in" | "out"
    amount: numeric("amount", N16).notNull(),
    description: text("description").notNull(),
    accountCode: text("account_code"),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    paidToFrom: text("paid_to_from"),
    receiptFileId: uuid("receipt_file_id"),
    approverUserId: uuid("approver_user_id").references(() => users.id, { onDelete: "set null" }),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    floatIdx: index("petty_cash_vouchers_float_idx").on(t.floatId, t.date),
  }),
);

// ============================================================
// Fixed Assets
// ============================================================
export const fixedAssets = pgTable(
  "fixed_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    acquiredDate: date("acquired_date").notNull(),
    cost: numeric("cost", N16).notNull(),
    depreciationMethod: text("depreciation_method").notNull().default("straight-line"),
    usefulLifeMonths: integer("useful_life_months").notNull(),
    accumulatedDepreciation: numeric("accumulated_depreciation", N16).notNull().default("0"),
    currentValue: numeric("current_value", N16).notNull(),
    location: text("location"),
    status: text("status").notNull().default("active"),
    custodianUserId: uuid("custodian_user_id").references(() => users.id, { onDelete: "set null" }),
    serialNumber: text("serial_number"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ companyIdx: index("fixed_assets_company_idx").on(t.companyId) }),
);

// ============================================================
// Corporate Tax Returns (UAE 9%)
// ============================================================
export const corporateTaxReturns = pgTable(
  "corporate_tax_returns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    taxYear: integer("tax_year").notNull(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    office: text("office").notNull(),
    accountingProfit: numeric("accounting_profit", N16).notNull().default("0"),
    nonDeductibleExpenses: numeric("non_deductible_expenses", N16).notNull().default("0"),
    exemptIncome: numeric("exempt_income", N16).notNull().default("0"),
    taxableIncome: numeric("taxable_income", N16).notNull().default("0"),
    smallBusinessRelief: boolean("small_business_relief").notNull().default(false),
    taxRate: numeric("tax_rate", { precision: 5, scale: 4 }).notNull().default("0.09"),
    ctPayable: numeric("ct_payable", N16).notNull().default("0"),
    quarterlyProvisions: jsonb("quarterly_provisions").notNull().default([]),
    status: text("status").notNull().default("draft"),
    filedDate: date("filed_date"),
    paymentRef: text("payment_ref"),
    journalId: uuid("journal_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    companyIdx: index("corp_tax_returns_company_idx").on(t.companyId),
    yearIdx: index("corp_tax_returns_year_idx").on(t.taxYear),
  }),
);

// ============================================================
// Bank Reconciliations
// ============================================================
export const bankReconciliations = pgTable(
  "bank_reconciliations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    reference: text("reference").notNull(),
    bankAccountId: uuid("bank_account_id").notNull().references(() => bankAccounts.id, { onDelete: "cascade" }),
    statementDate: date("statement_date").notNull(),
    statementClosingBalance: numeric("statement_closing_balance", N16).notNull(),
    glBookBalance: numeric("gl_book_balance", N16).notNull().default("0"),
    outstandingDeposits: numeric("outstanding_deposits", N16).notNull().default("0"),
    outstandingPayments: numeric("outstanding_payments", N16).notNull().default("0"),
    adjustedBankBalance: numeric("adjusted_bank_balance", N16).notNull().default("0"),
    difference: numeric("difference", N16).notNull().default("0"),
    lines: jsonb("lines").notNull().default([]),           // BankReconciliationLine[]
    status: text("status").notNull().default("open"),
    reconciledBy: text("reconciled_by"),
    reconciledAt: timestamp("reconciled_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    accountIdx: index("bank_recon_account_idx").on(t.bankAccountId, t.statementDate),
    companyIdx: index("bank_recon_company_idx").on(t.companyId),
  }),
);

// ============================================================
// Retention Releases
// ============================================================
export const retentionReleases = pgTable(
  "retention_releases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    reference: text("reference").notNull(),
    type: text("type").notNull(),                         // "receivable" | "payable"
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    counterpartyId: uuid("counterparty_id").notNull(),    // customer or supplier
    counterpartyName: text("counterparty_name").notNull(),
    originalInvoiceId: uuid("original_invoice_id"),
    originalBillId: uuid("original_bill_id"),
    retentionAmountHeld: numeric("retention_amount_held", N16).notNull(),
    releaseAmount: numeric("release_amount", N16).notNull(),
    releaseDate: date("release_date").notNull(),
    bankAccountId: uuid("bank_account_id"),
    paymentMethod: text("payment_method"),
    glAccountFrom: text("gl_account_from").notNull(),
    glAccountTo: text("gl_account_to").notNull(),
    journalId: uuid("journal_id"),
    status: text("status").notNull().default("pending"),
    approvedBy: text("approved_by"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    companyIdx: index("retention_releases_company_idx").on(t.companyId),
    typeIdx: index("retention_releases_type_idx").on(t.type),
    projectIdx: index("retention_releases_project_idx").on(t.projectId),
  }),
);

// Generic finance sub-items (cheques, recurring/utility expenses, insurance
// policies & claims, subscriptions, govt fees, budgets, WPS runs, departments).
// One table keyed by `kind`; the full record lives in `data` (jsonb). Mirrors
// project_items so these become multi-user like AR/AP/Banking.
export const financeItems = pgTable(
  "finance_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    kind: text("kind").notNull(),
    data: jsonb("data").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    kindIdx: index("finance_items_kind_idx").on(t.kind),
    companyKindIdx: index("finance_items_company_kind_idx").on(t.companyId, t.kind),
  }),
);
