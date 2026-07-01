/**
 * Finance automation core — UAE consultancy chart of accounts + automatic
 * double-entry journal generation. Every billing/payables/payroll event posts
 * its accounting entry here, so the GL, trial balance and P&L stay live
 * without manual journal vouchers.
 *
 * Idempotent: one journal per (source, sourceRefId) — re-running an event
 * never duplicates the entry.
 */
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { journalEntries, coaAccounts } from "../db/schema/index.js";
import { NASEC_COA_2026 } from "./coa-2026.js";

// ---- UAE engineering-consultancy chart of accounts ------------------------
export const COA = {
  // Assets
  CASH_ON_HAND: "1101000",
  PETTY_CASH: "1101001",
  BANK_MAIN: "1102000",
  ACCOUNTS_RECEIVABLE: "1103000",
  RETENTION_RECEIVABLE: "1103002",
  EMPLOYEE_ADVANCES: "1104000",
  SECURITY_DEPOSITS: "1105000",
  VAT_RECOVERABLE: "2201200",
  PREPAID_EXPENSES: "1205000",
  FIXED_ASSETS: "1200000",
  WIP: "1101100",
  ADVANCE_REVENUE: "2103000",      // client advances / deposits (deferred revenue liability)
  // Liabilities
  ACCOUNTS_PAYABLE: "2102000",
  EMPLOYEE_PAYABLES: "2105003",
  VAT_PAYABLE: "2201100",
  CORP_TAX_PAYABLE: "2104005",
  ACCRUED_EXPENSES: "2105000",
  CLIENT_RETENTIONS: "2101000",
  LOANS: "2200000",
  EOSB_PROVISION: "2104001",
  // Equity
  CAPITAL: "3100000",
  OWNER_DRAWINGS: "1206000",
  RETAINED_EARNINGS: "3200000",
  // Income
  REV_DESIGN: "4101001",
  REV_ARCHITECTURE: "4101001",
  REV_MEP: "4101004",
  REV_STRUCTURAL: "4101004",
  REV_SUPERVISION: "4101002",
  REV_PROJECT_MGMT: "4101004",
  REV_VARIATION: "4102000",
  REV_AUTHORITY: "4101003",
  // Expenses
  EXP_SALARIES: "5103001",
  EXP_RENT: "5102001",
  EXP_UTILITIES: "5102002",
  EXP_SOFTWARE: "5102021",
  EXP_VEHICLES: "5102006",
  EXP_CONSULTANCY: "5101007",
  EXP_MARKETING: "5102010",
  EXP_INSURANCE: "5101004",
  EXP_TRAVEL: "5102019",
  EXP_TRAINING: "5103008",
} as const;

const LEGACY_UAE_COA_CODES = [
  "1000",
  "1010",
  "1020",
  "1100",
  "1110",
  "1120",
  "1130",
  "1140",
  "1150",
  "1200",
  "1300",
  "2000",
  "2010",
  "2100",
  "2110",
  "2200",
  "2210",
  "2300",
  "2400",
  "3000",
  "3100",
  "3200",
  "4000",
  "4010",
  "4020",
  "4030",
  "4040",
  "4050",
  "4060",
  "4070",
  "5000",
  "5010",
  "5020",
  "5030",
  "5040",
  "5050",
  "5060",
  "5070",
  "5080",
  "5090",
];

/** Idempotently upserts the NASEC 2026 chart of accounts. */
export async function ensureUaeCoa(): Promise<void> {
  const values = NASEC_COA_2026.map(a => ({
    code: a.code,
    name: a.name,
    type: a.type,
    subType: a.subType,
    parentCode: a.parentCode ?? null,
    currency: a.currency ?? null,
    isBank: a.isBank ?? false,
    isCash: a.isCash ?? false,
    isControl: a.isControl ?? false,
    vatApplicable: a.vatApplicable ?? false,
    isActive: true,
  }));

  await db
    .insert(coaAccounts)
    .values(values as any)
    .onConflictDoNothing();

  for (const a of values) {
    await db
      .update(coaAccounts)
      .set(a as any)
      .where(eq(coaAccounts.code, a.code));
  }

  await db
    .update(coaAccounts)
    .set({
      isActive: false,
      notes:
        "Legacy pre-2026 seed account; retained for historical journal references.",
    })
    .where(inArray(coaAccounts.code, LEGACY_UAE_COA_CODES));

  console.log(
    `[finance] NASEC 2026 chart of accounts: upserted ${values.length} account(s)`
  );
}

// ---- Auto journal ----------------------------------------------------------
export type AutoJournalLine = {
  accountCode: string;
  debit: number;
  credit: number;
  description?: string;
  projectId?: string;
};

export async function postAutoJournal(opts: {
  reference: string;
  narration: string;
  source: string; // e.g. "ar-invoice", "payroll"
  sourceRefId: string; // the originating row id (idempotency key)
  date?: string; // YYYY-MM-DD, defaults to today
  office?: string;
  currency?: string;
  lines: AutoJournalLine[];
}): Promise<void> {
  const lines = opts.lines
    .filter(l => Math.abs(l.debit) > 0.004 || Math.abs(l.credit) > 0.004)
    .map(l => ({ ...l, debit: round2(l.debit), credit: round2(l.credit) }));
  if (lines.length < 2) return;

  const debits = round2(lines.reduce((a, l) => a + l.debit, 0));
  const credits = round2(lines.reduce((a, l) => a + l.credit, 0));
  if (Math.abs(debits - credits) > 0.01) {
    console.warn(
      `[auto-journal] unbalanced entry skipped (${opts.source}/${opts.sourceRefId}): DR ${debits} vs CR ${credits}`
    );
    return;
  }

  const dupe = await db
    .select({ id: journalEntries.id })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.source, opts.source),
        eq(journalEntries.sourceRefId, opts.sourceRefId)
      )
    )
    .limit(1);
  if (dupe[0]) return;

  await db.insert(journalEntries).values({
    reference: opts.reference,
    date: opts.date ?? new Date().toISOString().slice(0, 10),
    office: opts.office ?? "dubai",
    currency: opts.currency ?? "AED",
    source: opts.source,
    sourceRefId: opts.sourceRefId,
    narration: opts.narration,
    lines,
    status: "posted",
    postedAt: new Date(),
  } as any);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
