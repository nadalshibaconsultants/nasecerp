/**
 * Automated journal posting — derives a complete journal stream from
 * AR invoices, AR receipts, AP bills, supplier payments, plus any manual
 * journals. This is what makes the three statements (P&L / BS / CF) work
 * in real time without users having to post journals manually.
 *
 * The synthesised journals are NOT written back to storage; they are
 * computed on demand and merged with stored journals. This keeps the
 * stored data the canonical source while delivering full statements.
 */
import type {
  JournalEntry,
  JournalLine,
  ARInvoice,
  APBill,
  Receipt as ARReceipt,
  SupplierPayment,
  BankAccount,
} from "./types";

const COA = {
  ACCOUNTS_RECEIVABLE: "1103000",
  ACCOUNTS_PAYABLE: "2102000",
  VAT_RECOVERABLE: "2201200",
  VAT_PAYABLE: "2201100",
  BANK_MAIN: "1102000",
  ADVANCE_REVENUE: "2103000",
} as const;

function line(
  accountCode: string,
  debit: number,
  credit: number,
  description: string,
  projectId?: string
): JournalLine {
  return {
    id: `jl-${Math.random().toString(36).slice(2)}`,
    accountCode,
    description,
    debit,
    credit,
    projectId,
  };
}

function makeEntry(opts: {
  id: string;
  reference: string;
  date: string;
  office: JournalEntry["office"];
  currency: JournalEntry["currency"];
  source: JournalEntry["source"];
  sourceRefId?: string;
  narration: string;
  lines: JournalLine[];
}): JournalEntry {
  return {
    ...opts,
    status: "posted",
    postedAt: opts.date + "T00:00:00Z",
    postedBy: "auto-posted",
    createdAt: opts.date + "T00:00:00Z",
    updatedAt: opts.date + "T00:00:00Z",
  };
}

// AR Invoice -> Dr AR, Cr Revenue, Cr Output VAT
export function postArInvoice(inv: ARInvoice): JournalEntry {
  const lines: JournalLine[] = [];
  // Dr AR control
  lines.push(
    line(
      COA.ACCOUNTS_RECEIVABLE,
      inv.total,
      0,
      `AR - ${inv.number}`,
      inv.projectId
    )
  );
  // Cr revenue per line
  for (const l of inv.lines) {
    lines.push(
      line(
        l.accountCode,
        0,
        l.amountExVat,
        l.description,
        l.projectId || inv.projectId
      )
    );
  }
  // Cr output VAT
  if (inv.vatTotal > 0)
    lines.push(
      line(COA.VAT_PAYABLE, 0, inv.vatTotal, `Output VAT - ${inv.number}`)
    );
  return makeEntry({
    id: `je-ar-${inv.id}`,
    reference: `JE-AR-${inv.number}`,
    date: inv.invoiceDate,
    office: inv.office,
    currency: inv.currency,
    source: "ar-invoice",
    sourceRefId: inv.id,
    narration: `AR invoice ${inv.number}`,
    lines,
  });
}

// AP Bill -> Dr Expense, Dr Input VAT, Cr AP
export function postApBill(bill: APBill): JournalEntry {
  const lines: JournalLine[] = [];
  for (const l of bill.lines) {
    lines.push(
      line(l.accountCode, l.amountExVat, 0, l.description, l.projectId)
    );
  }
  if (bill.vatTotal > 0)
    lines.push(
      line(COA.VAT_RECOVERABLE, bill.vatTotal, 0, `Input VAT - ${bill.number}`)
    );
  lines.push(line(COA.ACCOUNTS_PAYABLE, 0, bill.total, `AP - ${bill.number}`));
  return makeEntry({
    id: `je-ap-${bill.id}`,
    reference: `JE-AP-${bill.internalRef}`,
    date: bill.billDate,
    office: bill.office,
    currency: bill.currency,
    source: "ap-bill",
    sourceRefId: bill.id,
    narration: `AP bill ${bill.number} / ${bill.internalRef}`,
    lines,
  });
}

// AR Receipt -> Dr Bank, Cr AR (regular) OR Cr Advance Revenue (deposit/advance)
export function postArReceipt(
  rcp: ARReceipt,
  bank?: BankAccount
): JournalEntry {
  const bankAccount = bank?.glAccountCode || COA.BANK_MAIN;
  const isAdvance = (rcp as any).advancePayment === true;
  const creditAccount = isAdvance ? COA.ADVANCE_REVENUE : COA.ACCOUNTS_RECEIVABLE;
  const creditDesc = isAdvance
    ? `Advance from client – ${rcp.reference}`
    : `Settle AR ${rcp.invoiceIds.join(",") || rcp.reference}`;
  return makeEntry({
    id: `je-rcp-${rcp.id}`,
    reference: `JE-RCP-${rcp.reference}`,
    date: rcp.date,
    office: bank?.office || "dubai",
    currency: rcp.currency,
    source: "payment",
    sourceRefId: rcp.id,
    narration: isAdvance
      ? `Client advance receipt ${rcp.reference}`
      : `Client receipt ${rcp.reference}`,
    lines: [
      line(bankAccount, rcp.amount, 0, `Receipt ${rcp.reference}`, (rcp as any).projectId),
      line(creditAccount, 0, rcp.amount, creditDesc, (rcp as any).projectId),
    ],
  });
}

// Supplier Payment -> Dr AP, Cr Bank
export function postSupplierPayment(
  p: SupplierPayment,
  bank?: BankAccount
): JournalEntry {
  const bankAccount = bank?.glAccountCode || COA.BANK_MAIN;
  return makeEntry({
    id: `je-pay-${p.id}`,
    reference: `JE-PAY-${p.reference}`,
    date: p.date,
    office: bank?.office || "dubai",
    currency: p.currency,
    source: "payment",
    sourceRefId: p.id,
    narration: `Supplier payment ${p.reference}`,
    lines: [
      line(
        COA.ACCOUNTS_PAYABLE,
        p.amount,
        0,
        `Settle AP ${p.billIds.join(",") || "(direct)"}`
      ),
      line(bankAccount, 0, p.amount, `Payment ${p.reference}`),
    ],
  });
}

// Compose full journal stream from all sources.
// Stored journals (from the backend) take precedence — we only synthesise
// a journal for a given source record if no stored journal already references
// that record (checked via sourceRefId). This prevents double-counting when
// the backend has already written the auto-journal to the DB.
export function synthesiseJournals(opts: {
  manual: JournalEntry[];
  arInvoices: ARInvoice[];
  apBills: APBill[];
  receipts: ARReceipt[];
  payments: SupplierPayment[];
  banks: BankAccount[];
}): JournalEntry[] {
  const bankById = new Map(opts.banks.map(b => [b.id, b]));
  // Build a set of source record IDs already covered by stored journals
  const coveredRefIds = new Set(
    opts.manual.filter(j => j.sourceRefId).map(j => j.sourceRefId as string)
  );
  const out: JournalEntry[] = [...opts.manual];
  for (const inv of opts.arInvoices) {
    if (inv.status === "draft" || inv.status === "cancelled") continue;
    if (!coveredRefIds.has(inv.id)) out.push(postArInvoice(inv));
  }
  for (const b of opts.apBills) {
    if (b.status === "draft" || b.status === "rejected") continue;
    if (!coveredRefIds.has(b.id)) out.push(postApBill(b));
  }
  for (const r of opts.receipts)
    if (!coveredRefIds.has(r.id)) out.push(postArReceipt(r, bankById.get(r.bankAccountId)));
  for (const p of opts.payments)
    if (!coveredRefIds.has(p.id)) out.push(postSupplierPayment(p, bankById.get(p.bankAccountId)));
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
