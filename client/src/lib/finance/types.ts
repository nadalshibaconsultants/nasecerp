/**
 * Finance & Accounting — full schema for a UAE/AEC consultancy.
 *
 * Covers: General Ledger, AR, AP, Petty Cash, Banking, Office Expenses,
 * Recurring Bills (DEWA / Etisalat / Tabreed / Salik / Ejari), Insurance
 * register (Medical / Workmen's / PI / CAR / Vehicle), Fixed Assets with
 * depreciation, Subscriptions & Memberships, Trade License & Government
 * fees, VAT (UAE FTA), Corporate Tax (UAE 9%), WPS, Budgets, Recurring
 * journals. All entities are multi-office, multi-currency aware.
 */

export type Currency = "AED" | "EGP" | "USD" | "EUR" | "GBP";
export type OfficeCode = "dubai" | "cairo";

// ---------- Chart of Accounts ----------
export type AccountType =
  | "asset"
  | "liability"
  | "equity"
  | "income"
  | "expense";
export type AccountSubType =
  | "current-asset"
  | "non-current-asset"
  | "fixed-asset"
  | "current-liability"
  | "non-current-liability"
  | "equity"
  | "retained-earnings"
  | "revenue"
  | "other-income"
  | "cogs"
  | "operating-expense"
  | "admin-expense"
  | "finance-expense";

export type GLAccount = {
  id: string;
  code: string; // e.g. "1101001"
  name: string;
  type: AccountType;
  subType: AccountSubType;
  parentCode?: string; // for hierarchy
  currency?: Currency; // home currency for bank/cash accounts
  vatApplicable?: boolean;
  isControl?: boolean; // AR/AP control accounts
  isBank?: boolean;
  isCash?: boolean;
  isActive: boolean;
  notes?: string;
  createdAt: string;
};

// ---------- General Ledger Journal ----------
export type JournalLine = {
  id: string;
  accountCode: string;
  description?: string;
  debit: number;
  credit: number;
  projectId?: string;
  departmentId?: string;
  vatCode?: VatCode;
};

export type JournalEntry = {
  id: string;
  reference: string; // "JE-2026-00045"
  date: string; // YYYY-MM-DD
  office: OfficeCode;
  currency: Currency;
  fxRate?: number;
  source:
    | "manual"
    | "ar-invoice"
    | "ap-bill"
    | "payment"
    | "payroll"
    | "depreciation"
    | "petty-cash"
    | "bank"
    | "recurring"
    | "vat"
    | "year-end";
  sourceRefId?: string;
  narration: string;
  lines: JournalLine[];
  status: "draft" | "posted" | "void";
  postedAt?: string;
  postedBy?: string;
  reversalOf?: string;
  attachmentUrl?: string;
  createdAt: string;
  updatedAt: string;
};

// ---------- VAT (UAE FTA) ----------
export type VatCode =
  | "STD-5"
  | "ZERO-RATED"
  | "EXEMPT"
  | "OUT-OF-SCOPE"
  | "REVERSE-CHARGE";
export const VAT_RATES: Record<VatCode, number> = {
  "STD-5": 0.05,
  "ZERO-RATED": 0,
  EXEMPT: 0,
  "OUT-OF-SCOPE": 0,
  "REVERSE-CHARGE": 0.05,
};

export type VatReturn = {
  id: string;
  periodLabel: string; // "Q1 2026 (Jan-Mar)"
  periodStart: string;
  periodEnd: string;
  outputVatStandard: number; // 5%
  outputVatZero: number;
  outputVatExempt: number;
  inputVatStandard: number;
  inputVatReverseCharge: number;
  netVatPayable: number; // output - input
  status: "draft" | "filed" | "paid";
  filedDate?: string;
  paymentRef?: string;
  notes?: string;
};

// ---------- Customers & AR ----------
export type Customer = {
  id: string;
  code: string;
  name: string;
  trnNumber?: string; // UAE Tax Registration Number
  address?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  currency: Currency;
  creditLimit?: number;
  paymentTermsDays: number;
  openingBalance?: number;
  active: boolean;
  notes?: string;
};

export type ARInvoiceLine = {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  vatCode: VatCode;
  projectId?: string;
  stageCode?: string; // e.g. "S3", "G2"
  accountCode: string; // revenue account
  amountExVat: number;
  vatAmount: number;
  amountIncVat: number;
};

export type ARInvoice = {
  id: string;
  number: string;
  customerId: string;
  invoiceDate: string;
  dueDate: string;
  office: OfficeCode;
  currency: Currency;
  fxRate?: number;
  projectId?: string;
  poNumber?: string;
  retentionPct?: number;
  retentionAmount?: number;
  lines: ARInvoiceLine[];
  subtotal: number;
  vatTotal: number;
  total: number;
  amountPaid: number;
  balance: number;
  status:
    | "draft"
    | "sent"
    | "partially-paid"
    | "paid"
    | "overdue"
    | "cancelled";
  notes?: string;
  attachmentUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type Receipt = {
  id: string;
  reference: string;
  date: string;
  customerId: string;
  invoiceIds: string[]; // can be applied to multiple invoices
  bankAccountId: string;
  amount: number;
  currency: Currency;
  paymentMethod:
    | "bank-transfer"
    | "cheque"
    | "cash"
    | "credit-card"
    | "lpo-direct";
  projectId?: string;          // which project the payment relates to
  advancePayment?: boolean;    // true = advance/deposit (cr Advance Revenue 2103000), false = AR settlement
  chequeNumber?: string;
  chequeBank?: string;
  reference2?: string;
  notes?: string;
  status: "received" | "deposited" | "cleared" | "bounced";
};

// ---------- Suppliers & AP ----------
export type Supplier = {
  id: string;
  code: string;
  name: string;
  trnNumber?: string;
  category: SupplierCategory;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  iban?: string;
  bankName?: string;
  currency: Currency;
  paymentTermsDays: number;
  active: boolean;
  notes?: string;
};

export type SupplierCategory =
  | "subconsultant"
  | "subcontractor"
  | "office-supplies"
  | "it-services"
  | "professional-services"
  | "utility"
  | "telecom"
  | "insurance"
  | "landlord"
  | "government"
  | "training"
  | "travel"
  | "marketing"
  | "courier"
  | "other";

export type APBillLine = {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  vatCode: VatCode;
  accountCode: string; // expense account
  projectId?: string;
  departmentId?: string;
  amountExVat: number;
  vatAmount: number;
  amountIncVat: number;
};

export type APBill = {
  id: string;
  number: string; // supplier's invoice number
  internalRef: string; // our reference "BILL-2026-00123"
  supplierId: string;
  billDate: string;
  dueDate: string;
  office: OfficeCode;
  currency: Currency;
  fxRate?: number;
  poNumber?: string;
  lines: APBillLine[];
  subtotal: number;
  vatTotal: number;
  total: number;
  amountPaid: number;
  balance: number;
  status:
    | "draft"
    | "approved"
    | "partially-paid"
    | "paid"
    | "overdue"
    | "rejected";
  approverUserId?: string;
  approvedAt?: string;
  attachmentUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type SupplierPayment = {
  id: string;
  reference: string;
  date: string;
  supplierId: string;
  billIds: string[];
  bankAccountId: string;
  amount: number;
  currency: Currency;
  paymentMethod: "bank-transfer" | "cheque" | "cash" | "wps";
  chequeNumber?: string;
  status: "pending" | "issued" | "cleared" | "bounced";
  notes?: string;
};

// ---------- Banking ----------
export type BankAccount = {
  id: string;
  code: string;
  name: string; // "Emirates NBD - AED Current"
  bankName: string;
  iban: string;
  accountNumber: string;
  swift?: string;
  branch?: string;
  currency: Currency;
  office: OfficeCode;
  openingBalance: number;
  openingDate: string;
  glAccountCode: string; // GL account
  isActive: boolean;
  notes?: string;
};

export type BankTransaction = {
  id: string;
  bankAccountId: string;
  date: string;
  description: string;
  debit: number; // money in
  credit: number; // money out
  balance?: number;
  reference?: string;
  reconciled: boolean;
  reconciledDate?: string;
  linkedJournalId?: string;
  source: "bank-statement" | "manual" | "cheque" | "transfer";
};

export type ChequeRegister = {
  id: string;
  chequeNumber: string;
  bankAccountId: string;
  date: string;
  payee: string;
  amount: number;
  currency: Currency;
  purpose: string;
  status:
    | "drawn"
    | "issued"
    | "presented"
    | "cleared"
    | "bounced"
    | "cancelled"
    | "stopped";
  presentedDate?: string;
  clearedDate?: string;
  linkedPaymentId?: string;
  notes?: string;
};

// ---------- Petty Cash ----------
export type PettyCashFloat = {
  id: string;
  office: OfficeCode;
  custodianUserId?: string;
  custodianDisplay: string;
  floatAmount: number;
  currentBalance: number;
  currency: Currency;
  glAccountCode: string;
  isActive: boolean;
  notes?: string;
};

export type PettyCashVoucher = {
  id: string;
  voucherNumber: string;
  floatId: string;
  date: string;
  type: "expense" | "replenishment" | "advance" | "refund";
  payee: string;
  amount: number;
  vatCode?: VatCode;
  vatAmount?: number;
  description: string;
  expenseAccountCode?: string;
  projectId?: string;
  departmentId?: string;
  receiptAttached: boolean;
  receiptUrl?: string;
  receiptFileName?: string;
  approverUserId?: string;
  approvedAt?: string;
  status: "submitted" | "approved" | "rejected" | "paid";
  notes?: string;
};

// ---------- Recurring Expenses / Utility Bills ----------
export type RecurringExpenseKind =
  | "dewa-electricity"
  | "dewa-water"
  | "etisalat-telecom"
  | "du-telecom"
  | "tabreed-cooling"
  | "empower-cooling"
  | "salik-toll"
  | "ejari-rent"
  | "office-cleaning"
  | "internet"
  | "software-subscription"
  | "membership"
  | "courier"
  | "parking"
  | "fuel"
  | "tradeline-renewal"
  | "other";

export type RecurringExpense = {
  id: string;
  kind: RecurringExpenseKind;
  description: string;
  supplierId?: string;
  accountNumber?: string; // e.g. DEWA account number
  meterNumber?: string;
  premise?: string; // location / unit
  office: OfficeCode;
  frequency: "monthly" | "quarterly" | "biannual" | "annual";
  averageAmount: number;
  currency: Currency;
  glAccountCode: string;
  paymentMethod: "auto-debit" | "manual" | "cheque" | "online";
  nextDueDate?: string;
  isActive: boolean;
  notes?: string;
};

export type UtilityBill = {
  id: string;
  recurringExpenseId: string;
  billNumber?: string;
  periodStart: string;
  periodEnd: string;
  billDate: string;
  dueDate: string;
  unitsConsumed?: number; // kWh, m3, GB...
  unitOfMeasure?: string;
  unitRate?: number;
  amountExVat: number;
  vatAmount: number;
  amountIncVat: number;
  status: "received" | "paid" | "overdue" | "disputed";
  paidDate?: string;
  paymentRef?: string;
  attachmentUrl?: string;
};

// ---------- Insurance ----------
export type InsuranceType =
  | "medical-employee" // mandatory UAE
  | "workmens-compensation" // mandatory UAE
  | "group-life"
  | "professional-indemnity" // mandatory for engineering consultancies
  | "public-liability"
  | "office-contents"
  | "office-cyber"
  | "vehicle-fleet"
  | "vehicle-individual"
  | "car-project" // Contractors All Risks per project
  | "key-person"
  | "directors-officers"
  | "travel-business";

export const INSURANCE_LABELS: Record<InsuranceType, string> = {
  "medical-employee": "Employee Medical Insurance",
  "workmens-compensation": "Workmen's Compensation",
  "group-life": "Group Life",
  "professional-indemnity": "Professional Indemnity (PI)",
  "public-liability": "Public Liability",
  "office-contents": "Office Contents & Property",
  "office-cyber": "Cyber Liability",
  "vehicle-fleet": "Vehicle Fleet",
  "vehicle-individual": "Individual Vehicle",
  "car-project": "Project CAR (Contractors All Risks)",
  "key-person": "Key Person",
  "directors-officers": "Directors & Officers (D&O)",
  "travel-business": "Business Travel",
};

export type InsurancePolicy = {
  id: string;
  policyNumber: string;
  type: InsuranceType;
  insurerName: string;
  brokerName?: string;
  office: OfficeCode;
  projectId?: string; // for project CAR
  vehicleId?: string;
  insuredItems?: string; // free text — e.g. "All 26 staff"
  coverageAED: number;
  sumInsured?: number;
  premiumAED: number;
  premiumPaidAED: number;
  installmentSchedule?: { dueDate: string; amount: number; paid: boolean }[];
  effectiveFrom: string;
  expiryDate: string;
  renewalReminder?: number; // days before expiry
  deductibleAED?: number;
  claimsThisYear?: number;
  claimsRatio?: number;
  glAccountCode: string;
  status: "active" | "expired" | "cancelled" | "claim-pending";
  notes?: string;
  attachmentUrl?: string;
};

export type InsuranceClaim = {
  id: string;
  policyId: string;
  claimNumber?: string;
  claimDate: string;
  description: string;
  claimAmount: number;
  amountReceived?: number;
  receivedDate?: string;
  status:
    | "submitted"
    | "under-review"
    | "approved"
    | "rejected"
    | "paid"
    | "appealed";
  notes?: string;
};

// ---------- Fixed Assets ----------
export type AssetCategory =
  | "furniture"
  | "office-equipment"
  | "computers-it"
  | "vehicles"
  | "machinery"
  | "land"
  | "building"
  | "leasehold-improvements"
  | "software-license"
  | "other";

export type DepreciationMethod =
  | "straight-line"
  | "declining-balance"
  | "units-of-production";

export type FixedAsset = {
  id: string;
  assetTag: string; // "NSC-FA-0042"
  description: string;
  category: AssetCategory;
  office: OfficeCode;
  serialNumber?: string;
  acquisitionDate: string;
  acquisitionCostAED: number;
  supplier?: string;
  invoiceRef?: string;
  usefulLifeYears: number;
  residualValueAED: number;
  depreciationMethod: DepreciationMethod;
  custodianEmployeeId?: string;
  location?: string;
  glAssetAccount: string;
  glAccumDepreciationAccount: string;
  glDepreciationExpenseAccount: string;
  disposalDate?: string;
  disposalAmount?: number;
  status:
    | "active"
    | "under-repair"
    | "disposed"
    | "written-off"
    | "transferred";
  notes?: string;
};

// ---------- Subscriptions & Memberships ----------
export type SubscriptionKind =
  | "software"
  | "professional-body"
  | "magazine"
  | "business-club"
  | "saas"
  | "other";

export type Subscription = {
  id: string;
  name: string;
  vendor: string;
  kind: SubscriptionKind;
  seats?: number;
  costAED: number;
  frequency: "monthly" | "quarterly" | "annual" | "perpetual";
  renewalDate?: string;
  autoRenew: boolean;
  paidVia: "credit-card" | "invoice" | "subscription-portal";
  glAccountCode: string;
  office?: OfficeCode; // optional — some are company-wide
  contractRef?: string;
  isActive: boolean;
  notes?: string;
};

// ---------- Trade License & Government ----------
export type GovernmentFee = {
  id: string;
  authority:
    | "DED"
    | "MOHRE"
    | "GDRFA"
    | "Trakhees"
    | "DM"
    | "Dubai-Customs"
    | "FTA"
    | "DLD"
    | "Other";
  type: string; // "Trade License Renewal", "Visa Renewal", "Establishment Card"
  reference?: string;
  amountAED: number;
  paidDate: string;
  validFrom?: string;
  expiryDate?: string;
  paidBy: string;
  glAccountCode: string;
  status: "paid" | "pending" | "overdue";
  attachmentUrl?: string;
  notes?: string;
};

// ---------- Budget ----------
export type BudgetLine = {
  id: string;
  accountCode: string;
  janAmount?: number;
  febAmount?: number;
  marAmount?: number;
  aprAmount?: number;
  mayAmount?: number;
  junAmount?: number;
  julAmount?: number;
  augAmount?: number;
  sepAmount?: number;
  octAmount?: number;
  novAmount?: number;
  decAmount?: number;
  annualTotal: number;
  notes?: string;
};

export type Budget = {
  id: string;
  year: number;
  office: OfficeCode;
  currency: Currency;
  lines: BudgetLine[];
  approvedBy?: string;
  approvedAt?: string;
  status: "draft" | "approved" | "locked";
  notes?: string;
};

// ---------- Departments / Cost Centres ----------
export type Department = {
  id: string;
  code: string;
  name: string;
  managerEmployeeId?: string;
  office?: OfficeCode;
  isActive: boolean;
};

// ---------- WPS (Wage Protection System) ----------
export type WpsRun = {
  id: string;
  reference: string;
  payPeriod: string; // "2026-04"
  office: OfficeCode;
  totalEmployees: number;
  totalAmountAED: number;
  bankAccountId: string;
  fileGeneratedAt?: string;
  fileUrl?: string;
  status:
    | "draft"
    | "generated"
    | "submitted-to-bank"
    | "processed"
    | "rejected";
  rejectionReason?: string;
  processedDate?: string;
};

// ---------- Payroll ----------
export type PayrollEmployee = {
  employeeId: string;
  employeeCode: string;
  displayName: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  mobileAllowance: number;
  otherAllowances: number;
  grossSalary: number;
  loanDeduction: number;
  advanceDeduction: number;
  absenceDeduction: number;
  otherDeductions: number;
  netSalary: number;
  gratuityAccrual: number; // monthly gratuity provision (UAE Labour Law)
  bankIban: string;
  notes?: string;
};

export type PayrollRun = {
  id: string;
  reference: string; // "PAY-2026-04"
  payPeriod: string; // "2026-04"
  office: OfficeCode;
  currency: Currency;
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalGratuityAccrual: number;
  bankAccountId: string;
  employees: PayrollEmployee[];
  journalId?: string; // auto-posted GL journal
  wpsRunId?: string; // linked WPS bank file
  status: "draft" | "approved" | "posted" | "paid";
  approvedBy?: string;
  approvedAt?: string;
  processedAt?: string;
  notes?: string;
  createdAt: string;
};

// ---------- End of Service / Gratuity ----------
export type GratuityCalc = {
  employeeId: string;
  displayName: string;
  joinDate: string;
  calculationDate: string;
  yearsOfService: number;
  lastBasicSalary: number;
  gratuityEntitlementAED: number; // UAE: 21 days/yr up to 5yrs, 30 days/yr thereafter
  accruedToDate: number; // posted journal balance
  outstandingProvision: number;
};

// ---------- Corporate Tax (UAE 9%) ----------
export type CorporateTaxReturn = {
  id: string;
  taxYear: number; // e.g. 2024
  periodStart: string;
  periodEnd: string;
  office: OfficeCode;
  accountingProfit: number;
  nonDeductibleExpenses: number; // e.g. fines, entertainment > 50%
  exemptIncome: number; // qualifying dividends, etc.
  taxableIncome: number;
  smallBusinessRelief: boolean; // revenue < AED 3M
  taxRate: number; // 9% standard, 0% if SBR
  ctPayable: number;
  quarterlyProvisions: { quarter: string; amount: number; paid: boolean }[];
  status: "draft" | "filed" | "paid";
  filedDate?: string;
  paymentRef?: string;
  journalId?: string;
  notes?: string;
  createdAt: string;
};

// ---------- Bank Reconciliation ----------
export type BankReconciliationLine = {
  id: string;
  date: string;
  description: string;
  amount: number; // positive = debit (in), negative = credit (out)
  source: "bank-statement" | "gl-journal";
  matched: boolean;
  matchedToId?: string;
};

export type BankReconciliation = {
  id: string;
  reference: string; // "REC-ENBD-2026-04"
  bankAccountId: string;
  statementDate: string;
  statementClosingBalance: number;
  glBookBalance: number;
  outstandingDeposits: number;
  outstandingPayments: number;
  adjustedBankBalance: number;
  difference: number; // should be 0 when balanced
  lines: BankReconciliationLine[];
  status: "open" | "reconciled" | "reviewed";
  reconciledBy?: string;
  reconciledAt?: string;
  notes?: string;
  createdAt: string;
};

// ---------- Retention Release ----------
export type RetentionReleaseType = "receivable" | "payable";

export type RetentionRelease = {
  id: string;
  reference: string; // "RR-2026-001"
  type: RetentionReleaseType;
  projectId?: string;
  projectName?: string;
  counterpartyId: string; // customerId or supplierId
  counterpartyName: string;
  originalInvoiceId?: string; // AR invoice that held the retention
  originalBillId?: string; // AP bill with retention withheld
  retentionAmountHeld: number;
  releaseAmount: number;
  releaseDate: string;
  bankAccountId?: string;
  paymentMethod?: string;
  glAccountFrom: string; // Retention Receivable or Retention Payable
  glAccountTo: string; // AR / AP Control or Bank
  journalId?: string;
  status: "pending" | "approved" | "posted" | "paid";
  approvedBy?: string;
  notes?: string;
  createdAt: string;
};

// ---------- Project Billing Schedule ----------
export type BillingMilestone = {
  id: string;
  stageCode: string; // "S1", "S2", "S3"
  description: string;
  percentageOfFee: number;
  plannedDate: string;
  invoicedDate?: string;
  invoiceId?: string;
  amountAED: number;
  status: "pending" | "submitted" | "invoiced" | "paid";
};

export type ProjectBillingSchedule = {
  id: string;
  projectId: string;
  projectName: string;
  customerId: string;
  contractValueAED: number;
  currency: Currency;
  retentionPct: number;
  milestones: BillingMilestone[];
  totalInvoiced: number;
  totalCollected: number;
  totalRetentionHeld: number;
  notes?: string;
  createdAt: string;
};

// ---------- Helpers ----------
export function aging(date: string, today: Date = new Date()): number {
  return Math.floor((today.getTime() - new Date(date).getTime()) / 86_400_000);
}

export function agingBucket(
  days: number
): "current" | "1-30" | "31-60" | "61-90" | "90+" {
  if (days <= 0) return "current";
  if (days <= 30) return "1-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

export function computeMonthlyDepreciation(asset: FixedAsset): number {
  const depreciableCost = asset.acquisitionCostAED - asset.residualValueAED;
  const monthsLife = asset.usefulLifeYears * 12;
  if (asset.depreciationMethod === "straight-line") {
    return depreciableCost / monthsLife;
  }
  // declining balance — approximation, monthly factor of 2/life
  if (asset.depreciationMethod === "declining-balance") {
    const annual = asset.acquisitionCostAED * (2 / asset.usefulLifeYears);
    return annual / 12;
  }
  return 0;
}
