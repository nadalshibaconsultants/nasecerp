import { Router } from "express";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  coaAccounts,
  customers,
  suppliers,
  arInvoices,
  arReceipts,
  apBills,
  supplierPayments,
  journalEntries,
  vatReturns,
  bankAccounts,
  bankTransactions,
  pettyCashFloats,
  pettyCashVouchers,
  fixedAssets,
  payrollRuns,
  corporateTaxReturns,
  bankReconciliations,
  retentionReleases,
} from "../../db/schema/index.js";
import { requireAuth } from "../../middleware/auth.js";
import { requirePerm } from "../../middleware/rbac.js";
import { writeAudit } from "../../middleware/audit.js";
import { HttpError } from "../../middleware/errors.js";
import { attachCrud, dateOrNull, numStrOrNull } from "../../lib/crud.js";
import { COA, postAutoJournal } from "../../lib/auto-journal.js";
import {
  projectItems,
  tasks,
  taskTimerSessions,
  users,
  employeeCompensation,
} from "../../db/schema/index.js";
import { requireAnyPerm } from "../../middleware/rbac.js";

export const financeRouter = Router();
financeRouter.use(requireAuth);

const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const num = z.number();
const VAT_RATES: Record<string, number> = {
  "STD-5": 0.05,
  "ZERO-RATED": 0,
  EXEMPT: 0,
  "OUT-OF-SCOPE": 0,
  "REVERSE-CHARGE": 0.05,
};

// Map money fields to numeric strings on insert
const coerceMoney = (val: any, keys: string[]) => {
  const out = { ...val };
  for (const k of keys)
    if (out[k] !== undefined) out[k] = out[k] == null ? null : String(out[k]);
  return out;
};

// ============================================================
// COA
// ============================================================
const coaCreate = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["asset", "liability", "equity", "income", "expense"]),
  subType: z.string(),
  parentCode: z.string().optional(),
  currency: z.string().optional(),
  vatApplicable: z.boolean().optional(),
  isControl: z.boolean().optional(),
  isBank: z.boolean().optional(),
  isCash: z.boolean().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
});

financeRouter.get(
  "/gl-accounts",
  requirePerm("finance:read"),
  async (req, res, next) => {
    try {
      const includeInactive = req.query.includeInactive === "true";
      const q = db.select().from(coaAccounts);
      const rows = includeInactive
        ? await q.orderBy(asc(coaAccounts.code))
        : await q
            .where(eq(coaAccounts.isActive, true))
            .orderBy(asc(coaAccounts.code));
      res.json(rows);
    } catch (e) {
      next(e);
    }
  }
);

attachCrud(financeRouter, "/gl-accounts", {
  table: coaAccounts,
  idColumn: coaAccounts.id,
  createSchema: coaCreate,
  updateSchema: coaCreate.partial(),
  perms: { read: "finance:read", write: "finance:write" },
  entityType: "gl-account",
});

// ============================================================
// Customers / Suppliers
// ============================================================
const customerSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  trnNumber: z.string().optional(),
  address: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  currency: z.string().default("AED"),
  creditLimit: num.optional(),
  paymentTermsDays: z.number().int().default(30),
  openingBalance: num.optional(),
  active: z.boolean().optional(),
  notes: z.string().optional(),
});
attachCrud(financeRouter, "/customers", {
  table: customers,
  idColumn: customers.id,
  createSchema: customerSchema,
  updateSchema: customerSchema.partial(),
  perms: { read: "finance:read", write: "finance:write" },
  entityType: "customer",
  beforeCreate: i => coerceMoney(i, ["creditLimit", "openingBalance"]),
  beforeUpdate: i => coerceMoney(i, ["creditLimit", "openingBalance"]),
});

const supplierSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  trnNumber: z.string().optional(),
  category: z.string().default("other"),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  iban: z.string().optional(),
  bankName: z.string().optional(),
  currency: z.string().default("AED"),
  paymentTermsDays: z.number().int().default(30),
  active: z.boolean().optional(),
  notes: z.string().optional(),
});
attachCrud(financeRouter, "/suppliers", {
  table: suppliers,
  idColumn: suppliers.id,
  createSchema: supplierSchema,
  updateSchema: supplierSchema.partial(),
  perms: { read: "finance:read", write: "finance:write" },
  entityType: "supplier",
});

// ============================================================
// Invoice / Bill helpers — verify VAT and totals
// ============================================================
function recomputeTotals(
  lines: Array<{ qty: number; unitPrice: number; vatCode: string }>
) {
  let subtotal = 0,
    vatTotal = 0;
  for (const ln of lines) {
    const ex = (ln.qty || 0) * (ln.unitPrice || 0);
    const vat = ex * (VAT_RATES[ln.vatCode] ?? 0);
    subtotal += ex;
    vatTotal += vat;
  }
  return { subtotal, vatTotal, total: subtotal + vatTotal };
}

const invoiceLine = z.object({
  id: z.string().optional(),
  description: z.string(),
  qty: z.number(),
  unitPrice: z.number(),
  vatCode: z.enum([
    "STD-5",
    "ZERO-RATED",
    "EXEMPT",
    "OUT-OF-SCOPE",
    "REVERSE-CHARGE",
  ]),
  projectId: z.string().optional(),
  stageCode: z.string().optional(),
  accountCode: z.string(),
  amountExVat: z.number().optional(),
  vatAmount: z.number().optional(),
  amountIncVat: z.number().optional(),
});

const arInvoiceSchema = z.object({
  number: z.string().min(1),
  customerId: z.string().uuid(),
  invoiceDate: iso,
  dueDate: iso,
  office: z.string(),
  currency: z.string().default("AED"),
  fxRate: num.optional(),
  projectId: z.string().uuid().nullable().optional(),
  poNumber: z.string().optional(),
  retentionPct: num.optional(),
  retentionAmount: num.optional(),
  lines: z.array(invoiceLine),
  amountPaid: num.optional(),
  status: z
    .enum(["draft", "sent", "partially-paid", "paid", "overdue", "cancelled"])
    .optional(),
  notes: z.string().optional(),
  attachmentFileId: z.string().uuid().optional(),
});

financeRouter.get(
  "/ar-invoices",
  requirePerm("finance:read"),
  async (_req, res, next) => {
    try {
      res.json(await db.select().from(arInvoices));
    } catch (e) {
      next(e);
    }
  }
);

financeRouter.post(
  "/ar-invoices",
  requirePerm("finance:invoices:write"),
  async (req, res, next) => {
    try {
      const input = arInvoiceSchema.parse(req.body);
      const { subtotal, vatTotal, total } = recomputeTotals(input.lines);
      const balance = total - (input.amountPaid ?? 0);
      const inserted = await db
        .insert(arInvoices)
        .values({
          ...input,
          subtotal: String(subtotal),
          vatTotal: String(vatTotal),
          total: String(total),
          amountPaid: String(input.amountPaid ?? 0),
          balance: String(balance),
          fxRate: numStrOrNull(input.fxRate),
          retentionPct: numStrOrNull(input.retentionPct),
          retentionAmount: numStrOrNull(input.retentionAmount),
        } as any)
        .returning();
      await writeAudit(req, {
        action: "create-ar-invoice",
        entityType: "ar-invoice",
        entityId: inserted[0].id,
        after: { number: input.number, total },
      });
      // Auto journal: DR AR (+ retention split) / CR revenue + output VAT
      const retention = Number(input.retentionAmount ?? 0);
      await postAutoJournal({
        reference: `INV-${input.number}`,
        narration: `Client invoice ${input.number}`,
        source: "ar-invoice",
        sourceRefId: inserted[0].id,
        date: (input as any).invoiceDate ?? (input as any).date ?? undefined,
        office: (input as any).office,
        currency: input.currency,
        lines: [
          {
            accountCode: COA.ACCOUNTS_RECEIVABLE,
            debit: total - retention,
            credit: 0,
            description: `Invoice ${input.number}`,
            projectId: (input as any).projectId ?? undefined,
          },
          ...(retention > 0
            ? [
                {
                  accountCode: COA.RETENTION_RECEIVABLE,
                  debit: retention,
                  credit: 0,
                  description: "Retention withheld",
                },
              ]
            : []),
          {
            accountCode: COA.REV_DESIGN,
            debit: 0,
            credit: subtotal,
            description: "Consultancy revenue",
            projectId: (input as any).projectId ?? undefined,
          },
          {
            accountCode: COA.VAT_PAYABLE,
            debit: 0,
            credit: vatTotal,
            description: "Output VAT 5%",
          },
        ],
      });
      res.status(201).json(inserted[0]);
    } catch (e) {
      next(e);
    }
  }
);

financeRouter.patch(
  "/ar-invoices/:id",
  requirePerm("finance:invoices:write"),
  async (req, res, next) => {
    try {
      const input = arInvoiceSchema.partial().parse(req.body);
      const before = (
        await db
          .select()
          .from(arInvoices)
          .where(eq(arInvoices.id, req.params.id))
          .limit(1)
      )[0];
      if (!before) throw new HttpError(404, "Invoice not found");
      const next: any = { ...input, updatedAt: new Date() };
      if (input.lines) {
        const t = recomputeTotals(input.lines);
        next.subtotal = String(t.subtotal);
        next.vatTotal = String(t.vatTotal);
        next.total = String(t.total);
        const paid = input.amountPaid ?? Number(before.amountPaid);
        next.amountPaid = String(paid);
        next.balance = String(t.total - paid);
      } else if (input.amountPaid != null) {
        next.amountPaid = String(input.amountPaid);
        next.balance = String(Number(before.total) - input.amountPaid);
      }
      if (input.fxRate !== undefined) next.fxRate = numStrOrNull(input.fxRate);
      if (input.retentionPct !== undefined)
        next.retentionPct = numStrOrNull(input.retentionPct);
      if (input.retentionAmount !== undefined)
        next.retentionAmount = numStrOrNull(input.retentionAmount);
      const updated = await db
        .update(arInvoices)
        .set(next)
        .where(eq(arInvoices.id, req.params.id))
        .returning();
      await writeAudit(req, {
        action: "update-ar-invoice",
        entityType: "ar-invoice",
        entityId: req.params.id,
        before,
        after: updated[0],
      });
      res.json(updated[0]);
    } catch (e) {
      next(e);
    }
  }
);

financeRouter.delete(
  "/ar-invoices/:id",
  requirePerm("finance:write"),
  async (req, res, next) => {
    try {
      const deleted = await db
        .delete(arInvoices)
        .where(eq(arInvoices.id, req.params.id))
        .returning();
      if (!deleted[0]) throw new HttpError(404, "Invoice not found");
      await writeAudit(req, {
        action: "delete-ar-invoice",
        entityType: "ar-invoice",
        entityId: req.params.id,
      });
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }
);

// ============================================================
// AP Bills — same shape as AR
// ============================================================
const apBillSchema = z.object({
  number: z.string().min(1),
  internalRef: z.string().min(1),
  supplierId: z.string().uuid(),
  billDate: iso,
  dueDate: iso,
  office: z.string(),
  currency: z.string().default("AED"),
  fxRate: num.optional(),
  poNumber: z.string().optional(),
  lines: z.array(invoiceLine),
  amountPaid: num.optional(),
  status: z
    .enum([
      "draft",
      "approved",
      "partially-paid",
      "paid",
      "overdue",
      "rejected",
    ])
    .optional(),
  approverUserId: z.string().uuid().optional(),
  attachmentFileId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

financeRouter.get(
  "/ap-bills",
  requirePerm("finance:read"),
  async (_req, res, next) => {
    try {
      res.json(await db.select().from(apBills));
    } catch (e) {
      next(e);
    }
  }
);

financeRouter.post(
  "/ap-bills",
  requirePerm("finance:write"),
  async (req, res, next) => {
    try {
      const input = apBillSchema.parse(req.body);
      const { subtotal, vatTotal, total } = recomputeTotals(input.lines);
      const balance = total - (input.amountPaid ?? 0);
      const inserted = await db
        .insert(apBills)
        .values({
          ...input,
          subtotal: String(subtotal),
          vatTotal: String(vatTotal),
          total: String(total),
          amountPaid: String(input.amountPaid ?? 0),
          balance: String(balance),
          fxRate: numStrOrNull(input.fxRate),
        } as any)
        .returning();
      await writeAudit(req, {
        action: "create-ap-bill",
        entityType: "ap-bill",
        entityId: inserted[0].id,
        after: { internalRef: input.internalRef, total },
      });
      // Auto journal: DR expense + input VAT / CR accounts payable
      await postAutoJournal({
        reference: `BILL-${input.number}`,
        narration: `Vendor bill ${input.number}`,
        source: "ap-bill",
        sourceRefId: inserted[0].id,
        date: input.billDate,
        office: input.office,
        currency: input.currency,
        lines: [
          {
            accountCode: COA.EXP_CONSULTANCY,
            debit: subtotal,
            credit: 0,
            description: `Bill ${input.number}`,
            projectId: (input as any).projectId ?? undefined,
          },
          {
            accountCode: COA.VAT_RECOVERABLE,
            debit: vatTotal,
            credit: 0,
            description: "Input VAT 5%",
          },
          {
            accountCode: COA.ACCOUNTS_PAYABLE,
            debit: 0,
            credit: total,
            description: `Payable to supplier`,
          },
        ],
      });
      res.status(201).json(inserted[0]);
    } catch (e) {
      next(e);
    }
  }
);

financeRouter.patch(
  "/ap-bills/:id",
  requirePerm("finance:write"),
  async (req, res, next) => {
    try {
      const input = apBillSchema.partial().parse(req.body);
      const before = (
        await db
          .select()
          .from(apBills)
          .where(eq(apBills.id, req.params.id))
          .limit(1)
      )[0];
      if (!before) throw new HttpError(404, "Bill not found");
      const next: any = { ...input, updatedAt: new Date() };
      if (input.lines) {
        const t = recomputeTotals(input.lines);
        next.subtotal = String(t.subtotal);
        next.vatTotal = String(t.vatTotal);
        next.total = String(t.total);
        const paid = input.amountPaid ?? Number(before.amountPaid);
        next.amountPaid = String(paid);
        next.balance = String(t.total - paid);
      } else if (input.amountPaid != null) {
        next.amountPaid = String(input.amountPaid);
        next.balance = String(Number(before.total) - input.amountPaid);
      }
      if (input.fxRate !== undefined) next.fxRate = numStrOrNull(input.fxRate);
      const updated = await db
        .update(apBills)
        .set(next)
        .where(eq(apBills.id, req.params.id))
        .returning();
      res.json(updated[0]);
    } catch (e) {
      next(e);
    }
  }
);

financeRouter.delete(
  "/ap-bills/:id",
  requirePerm("finance:write"),
  async (req, res, next) => {
    try {
      const deleted = await db
        .delete(apBills)
        .where(eq(apBills.id, req.params.id))
        .returning();
      if (!deleted[0]) throw new HttpError(404, "Bill not found");
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }
);

// ============================================================
// AR Receipts / Supplier Payments — simple CRUD via helper
// ============================================================
const receiptSchema = z.object({
  reference: z.string(),
  date: iso,
  customerId: z.string().uuid(),
  invoiceIds: z.array(z.string()),
  bankAccountId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  amount: num,
  currency: z.string().default("AED"),
  paymentMethod: z.string(),
  advancePayment: z.boolean().optional().default(false),
  chequeNumber: z.string().optional(),
  chequeBank: z.string().optional(),
  reference2: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
});
attachCrud(financeRouter, "/ar-receipts", {
  table: arReceipts,
  idColumn: arReceipts.id,
  createSchema: receiptSchema,
  updateSchema: receiptSchema.partial(),
  perms: { read: "finance:read", write: "finance:invoices:write" },
  entityType: "ar-receipt",
  beforeCreate: i => coerceMoney(i, ["amount"]),
  beforeUpdate: i => coerceMoney(i, ["amount"]),
  afterCreate: async row => {
    const isAdvance = (row as any).advancePayment === true;
    await postAutoJournal({
      reference: `RCP-${row.reference}`,
      narration: isAdvance
        ? `Client advance receipt ${row.reference}`
        : `Client receipt ${row.reference}`,
      source: "ar-receipt",
      sourceRefId: row.id,
      date: row.date,
      currency: row.currency,
      lines: [
        {
          accountCode: COA.BANK_MAIN,
          debit: Number(row.amount),
          credit: 0,
          description: `${row.paymentMethod} – ${row.reference}`,
          projectId: (row as any).projectId ?? undefined,
        },
        {
          accountCode: isAdvance ? COA.ADVANCE_REVENUE : COA.ACCOUNTS_RECEIVABLE,
          debit: 0,
          credit: Number(row.amount),
          description: isAdvance
            ? `Advance from client – ${row.reference}`
            : `Settles invoice(s): ${(row as any).invoiceIds?.join(", ") || row.reference}`,
          projectId: (row as any).projectId ?? undefined,
        },
      ],
    });
  },
});

const supPaymentSchema = z.object({
  reference: z.string(),
  date: iso,
  supplierId: z.string().uuid(),
  billIds: z.array(z.string()),
  bankAccountId: z.string().uuid().optional(),
  amount: num,
  currency: z.string().default("AED"),
  paymentMethod: z.string(),
  chequeNumber: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});
attachCrud(financeRouter, "/supplier-payments", {
  table: supplierPayments,
  idColumn: supplierPayments.id,
  createSchema: supPaymentSchema,
  updateSchema: supPaymentSchema.partial(),
  perms: { read: "finance:read", write: "finance:write" },
  entityType: "supplier-payment",
  beforeCreate: i => coerceMoney(i, ["amount"]),
  beforeUpdate: i => coerceMoney(i, ["amount"]),
  afterCreate: async row => {
    await postAutoJournal({
      reference: `PAY-${row.reference}`,
      narration: `Supplier payment ${row.reference}`,
      source: "supplier-payment",
      sourceRefId: row.id,
      date: row.date,
      currency: row.currency,
      lines: [
        {
          accountCode: COA.ACCOUNTS_PAYABLE,
          debit: Number(row.amount),
          credit: 0,
          description: "Settles vendor bill(s)",
        },
        {
          accountCode: COA.BANK_MAIN,
          debit: 0,
          credit: Number(row.amount),
          description: row.paymentMethod ?? "Bank transfer",
        },
      ],
    });
  },
});

// ============================================================
// Journal Entries — enforce balance (sum debit == sum credit)
// ============================================================
const journalLine = z.object({
  id: z.string().optional(),
  accountCode: z.string(),
  description: z.string().optional(),
  debit: z.number(),
  credit: z.number(),
  projectId: z.string().optional(),
  departmentId: z.string().optional(),
  vatCode: z.string().optional(),
});

const journalSchema = z.object({
  reference: z.string(),
  date: iso,
  office: z.string(),
  currency: z.string().default("AED"),
  fxRate: num.optional(),
  source: z.string().default("manual"),
  sourceRefId: z.string().optional(),
  narration: z.string(),
  lines: z.array(journalLine).min(2),
  status: z.enum(["draft", "posted", "void"]).optional(),
  reversalOf: z.string().uuid().optional(),
  attachmentFileId: z.string().uuid().optional(),
});

function assertBalanced(lines: Array<{ debit: number; credit: number }>) {
  const debit = lines.reduce((a, l) => a + (l.debit || 0), 0);
  const credit = lines.reduce((a, l) => a + (l.credit || 0), 0);
  if (Math.abs(debit - credit) > 0.01) {
    throw new HttpError(
      400,
      `Journal not balanced: debit ${debit.toFixed(2)} vs credit ${credit.toFixed(2)}`
    );
  }
}

financeRouter.get(
  "/journal-entries",
  requirePerm("finance:read"),
  async (_req, res, next) => {
    try {
      res.json(await db.select().from(journalEntries));
    } catch (e) {
      next(e);
    }
  }
);

financeRouter.post(
  "/journal-entries",
  requirePerm("finance:write"),
  async (req, res, next) => {
    try {
      const input = journalSchema.parse(req.body);
      assertBalanced(input.lines);
      const inserted = await db
        .insert(journalEntries)
        .values({
          ...input,
          fxRate: numStrOrNull(input.fxRate),
        } as any)
        .returning();
      await writeAudit(req, {
        action: "create-journal",
        entityType: "journal",
        entityId: inserted[0].id,
        after: { reference: input.reference },
      });
      res.status(201).json(inserted[0]);
    } catch (e) {
      next(e);
    }
  }
);

financeRouter.patch(
  "/journal-entries/:id",
  requirePerm("finance:write"),
  async (req, res, next) => {
    try {
      const input = journalSchema.partial().parse(req.body);
      if (input.lines) assertBalanced(input.lines);
      const next: any = { ...input, updatedAt: new Date() };
      if (input.fxRate !== undefined) next.fxRate = numStrOrNull(input.fxRate);
      const updated = await db
        .update(journalEntries)
        .set(next)
        .where(eq(journalEntries.id, req.params.id))
        .returning();
      if (!updated[0]) throw new HttpError(404, "Journal not found");
      res.json(updated[0]);
    } catch (e) {
      next(e);
    }
  }
);

financeRouter.post(
  "/journal-entries/:id/post",
  requirePerm("finance:write"),
  async (req, res, next) => {
    try {
      const before = (
        await db
          .select()
          .from(journalEntries)
          .where(eq(journalEntries.id, req.params.id))
          .limit(1)
      )[0];
      if (!before) throw new HttpError(404, "Journal not found");
      if (before.status !== "draft")
        throw new HttpError(409, `Cannot post a ${before.status} journal`);
      assertBalanced((before.lines as any[]) ?? []);
      const updated = await db
        .update(journalEntries)
        .set({
          status: "posted",
          postedAt: new Date(),
          postedByUserId: req.user!.sub,
        })
        .where(eq(journalEntries.id, req.params.id))
        .returning();
      await writeAudit(req, {
        action: "post-journal",
        entityType: "journal",
        entityId: req.params.id,
      });
      res.json(updated[0]);
    } catch (e) {
      next(e);
    }
  }
);

financeRouter.delete(
  "/journal-entries/:id",
  requirePerm("finance:write"),
  async (req, res, next) => {
    try {
      const before = (
        await db
          .select()
          .from(journalEntries)
          .where(eq(journalEntries.id, req.params.id))
          .limit(1)
      )[0];
      if (!before) throw new HttpError(404, "Journal not found");
      if (before.status === "posted")
        throw new HttpError(
          409,
          "Cannot delete a posted journal — void it instead"
        );
      await db
        .delete(journalEntries)
        .where(eq(journalEntries.id, req.params.id));
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }
);

// ============================================================
// VAT returns
// ============================================================
const vatSchema = z.object({
  periodLabel: z.string(),
  periodStart: iso,
  periodEnd: iso,
  outputVatStandard: num.optional(),
  outputVatZero: num.optional(),
  outputVatExempt: num.optional(),
  inputVatStandard: num.optional(),
  inputVatReverseCharge: num.optional(),
  netVatPayable: num.optional(),
  status: z.string().optional(),
  filedDate: iso.optional(),
  paymentRef: z.string().optional(),
  notes: z.string().optional(),
});
// ============================================================
// Project Budget Control — budget vs actual vs committed + alerts
//   budget    = PM-defined category lines (project-items kind "budget-line")
//   actual    = vendor bill lines for the project (ex-VAT) + labour cost
//               (timer sessions × employee hourly rate from gross salary)
//   committed = unpaid share of those vendor bill lines (still owed)
// ============================================================
const WORK_HOURS_PER_MONTH = 22 * (9 + 40 / 60); // 22 working days × 9h40m

financeRouter.get(
  "/projects/:id/budget-control",
  requireAnyPerm("finance:read", "projects:read"),
  async (req, res, next) => {
    try {
      const projectId = req.params.id;

      // ---- Budget lines
      const items = await db
        .select()
        .from(projectItems)
        .where(eq(projectItems.kind, "budget-line"));
      const budgetLines = items
        .filter((r: any) => r.projectId === projectId)
        .map((r: any) => ({
          id: r.id,
          category: (r.data as any)?.category ?? "Miscellaneous",
          amount: Number((r.data as any)?.amount ?? 0),
        }));
      const budget = budgetLines.reduce((a, l) => a + l.amount, 0);

      // ---- Vendor cost (bill lines tagged with this project)
      const bills = await db.select().from(apBills);
      let vendorActual = 0,
        committed = 0;
      for (const b of bills as any[]) {
        if (b.status === "rejected") continue;
        const total = Number(b.total ?? 0) || 1;
        const unpaidShare = Math.max(
          0,
          Math.min(1, Number(b.balance ?? 0) / total)
        );
        for (const l of (b.lines as any[]) ?? []) {
          if (l.projectId !== projectId) continue;
          const ex = Number(
            l.amountExVat ?? Number(l.qty ?? 0) * Number(l.unitPrice ?? 0)
          );
          vendorActual += ex;
          committed += ex * unpaidShare;
        }
      }

      // ---- Labour cost from timer sessions
      const sessions = await db
        .select({
          durationSec: taskTimerSessions.durationSec,
          userId: taskTimerSessions.userId,
          taskProject: tasks.projectId,
        })
        .from(taskTimerSessions)
        .innerJoin(tasks, eq(taskTimerSessions.taskId, tasks.id))
        .where(eq(tasks.projectId, projectId));
      const userRows = await db
        .select({ id: users.id, employeeId: users.employeeId })
        .from(users);
      const empOf = new Map(userRows.map(u => [u.id, u.employeeId]));
      const comps = await db.select().from(employeeCompensation);
      const grossOf = new Map(
        comps.map((c: any) => [
          c.employeeId,
          Number(c.basic ?? 0) +
            Number(c.housing ?? 0) +
            Number(c.transport ?? 0) +
            Number(c.food ?? 0) +
            Number(c.other ?? 0),
        ])
      );
      let laborCost = 0,
        laborHours = 0;
      for (const sRow of sessions) {
        const hours = Number(sRow.durationSec ?? 0) / 3600;
        if (!hours) continue;
        laborHours += hours;
        const empId = empOf.get(sRow.userId);
        const gross = empId ? (grossOf.get(empId) ?? 0) : 0;
        laborCost += hours * (gross / WORK_HOURS_PER_MONTH);
      }

      // ---- Revenue side
      const invoices = (await db.select().from(arInvoices)).filter(
        (i: any) => i.projectId === projectId && i.status !== "cancelled"
      );
      const invoiced = invoices.reduce(
        (a: number, i: any) => a + Number(i.subtotal ?? 0),
        0
      );
      const collected = invoices.reduce(
        (a: number, i: any) => a + Number(i.amountPaid ?? 0),
        0
      );
      const outstanding = invoices.reduce(
        (a: number, i: any) => a + Number(i.balance ?? 0),
        0
      );

      const r2 = (n: number) => Math.round(n * 100) / 100;
      const actual = r2(vendorActual + laborCost);
      const remaining = r2(budget - actual);
      const margin =
        invoiced > 0 ? r2(((invoiced - actual) / invoiced) * 100) : null;

      // ---- Alerts
      const alerts: {
        kind: string;
        severity: "critical" | "warning";
        message: string;
      }[] = [];
      if (budget > 0 && actual > budget)
        alerts.push({
          kind: "budget-overrun",
          severity: "critical",
          message: `Budget overrun: actual cost AED ${actual.toLocaleString()} exceeds budget AED ${budget.toLocaleString()}`,
        });
      else if (budget > 0 && actual > budget * 0.8)
        alerts.push({
          kind: "budget-nearing",
          severity: "warning",
          message: `Budget 80% consumed (AED ${actual.toLocaleString()} of ${budget.toLocaleString()})`,
        });
      if (margin !== null && margin < 20)
        alerts.push({
          kind: "low-margin",
          severity: margin < 0 ? "critical" : "warning",
          message: `Low margin: ${margin}% on invoiced work`,
        });
      if (actual > invoiced)
        alerts.push({
          kind: "unbilled-work",
          severity: "warning",
          message: `Unbilled work: AED ${r2(actual - invoiced).toLocaleString()} of cost not yet invoiced`,
        });

      res.json({
        projectId,
        budgetLines,
        totals: {
          budget: r2(budget),
          actual,
          committed: r2(committed),
          remaining,
        },
        breakdown: {
          vendorCost: r2(vendorActual),
          laborCost: r2(laborCost),
          laborHours: r2(laborHours),
        },
        revenue: {
          invoiced: r2(invoiced),
          collected: r2(collected),
          outstanding: r2(outstanding),
          marginPct: margin,
        },
        alerts,
      });
    } catch (e) {
      next(e);
    }
  }
);

// Live UAE VAT computation for a period — output VAT from client invoices,
// input VAT from vendor bills, net payable/refundable. Feeds the VAT return.
financeRouter.get(
  "/vat/compute",
  requirePerm("finance:read"),
  async (req, res, next) => {
    try {
      const from = String(
        req.query.from || `${new Date().getUTCFullYear()}-01-01`
      );
      const to = String(req.query.to || new Date().toISOString().slice(0, 10));
      const invoices = await db.select().from(arInvoices);
      const bills = await db.select().from(apBills);
      const inRange = (d: any) => {
        const x = String(d);
        return x >= from && x <= to;
      };
      const sales = invoices.filter(
        (i: any) => inRange(i.invoiceDate ?? i.date) && i.status !== "cancelled"
      );
      const purchases = bills.filter(
        (b: any) => inRange(b.billDate) && b.status !== "rejected"
      );
      const outputVat = sales.reduce(
        (a: number, i: any) => a + Number(i.vatTotal ?? 0),
        0
      );
      const inputVat = purchases.reduce(
        (a: number, b: any) => a + Number(b.vatTotal ?? 0),
        0
      );
      const taxableSales = sales.reduce(
        (a: number, i: any) => a + Number(i.subtotal ?? 0),
        0
      );
      const taxablePurchases = purchases.reduce(
        (a: number, b: any) => a + Number(b.subtotal ?? 0),
        0
      );
      res.json({
        from,
        to,
        taxableSales: Math.round(taxableSales * 100) / 100,
        outputVat: Math.round(outputVat * 100) / 100,
        taxablePurchases: Math.round(taxablePurchases * 100) / 100,
        inputVat: Math.round(inputVat * 100) / 100,
        netVat: Math.round((outputVat - inputVat) * 100) / 100,
        invoiceCount: sales.length,
        billCount: purchases.length,
      });
    } catch (e) {
      next(e);
    }
  }
);

attachCrud(financeRouter, "/vat-returns", {
  table: vatReturns,
  idColumn: vatReturns.id,
  createSchema: vatSchema,
  updateSchema: vatSchema.partial(),
  perms: { read: "finance:read", write: "finance:write" },
  entityType: "vat-return",
  beforeCreate: i =>
    coerceMoney({ ...i, filedDate: dateOrNull(i.filedDate) }, [
      "outputVatStandard",
      "outputVatZero",
      "outputVatExempt",
      "inputVatStandard",
      "inputVatReverseCharge",
      "netVatPayable",
    ]),
  beforeUpdate: i =>
    coerceMoney(
      {
        ...i,
        filedDate:
          i.filedDate !== undefined ? dateOrNull(i.filedDate) : undefined,
      },
      [
        "outputVatStandard",
        "outputVatZero",
        "outputVatExempt",
        "inputVatStandard",
        "inputVatReverseCharge",
        "netVatPayable",
      ]
    ),
});

// ============================================================
// Banking
// ============================================================
const bankAcctSchema = z.object({
  code: z.string(),
  name: z.string(),
  bankName: z.string(),
  iban: z.string(),
  accountNumber: z.string(),
  swift: z.string().optional(),
  branch: z.string().optional(),
  currency: z.string().default("AED"),
  office: z.string(),
  openingBalance: num,
  openingDate: iso,
  glAccountCode: z.string(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
});
attachCrud(financeRouter, "/bank-accounts", {
  table: bankAccounts,
  idColumn: bankAccounts.id,
  createSchema: bankAcctSchema,
  updateSchema: bankAcctSchema.partial(),
  perms: { read: "finance:read", write: "finance:write" },
  entityType: "bank-account",
  beforeCreate: i => coerceMoney(i, ["openingBalance"]),
  beforeUpdate: i => coerceMoney(i, ["openingBalance"]),
});

const bankTxnSchema = z.object({
  bankAccountId: z.string().uuid(),
  date: iso,
  description: z.string(),
  debit: num.default(0),
  credit: num.default(0),
  balance: num.optional(),
  reference: z.string().optional(),
  reconciled: z.boolean().optional(),
});
attachCrud(financeRouter, "/bank-transactions", {
  table: bankTransactions,
  idColumn: bankTransactions.id,
  createSchema: bankTxnSchema,
  updateSchema: bankTxnSchema.partial(),
  perms: { read: "finance:read", write: "finance:write" },
  entityType: "bank-transaction",
  beforeCreate: i => coerceMoney(i, ["debit", "credit", "balance"]),
  beforeUpdate: i => coerceMoney(i, ["debit", "credit", "balance"]),
});

// ============================================================
// Petty cash
// ============================================================
const floatSchema = z.object({
  name: z.string(),
  office: z.string(),
  custodianUserId: z.string().uuid().optional(),
  currency: z.string().default("AED"),
  balance: num.optional(),
  cap: num.optional(),
  isActive: z.boolean().optional(),
});
attachCrud(financeRouter, "/petty-cash-floats", {
  table: pettyCashFloats,
  idColumn: pettyCashFloats.id,
  createSchema: floatSchema,
  updateSchema: floatSchema.partial(),
  perms: { read: "finance:read", write: "finance:write" },
  entityType: "petty-cash-float",
  beforeCreate: i => coerceMoney(i, ["balance", "cap"]),
  beforeUpdate: i => coerceMoney(i, ["balance", "cap"]),
});

const voucherSchema = z.object({
  floatId: z.string().uuid(),
  voucherNumber: z.string(),
  date: iso,
  direction: z.enum(["in", "out"]),
  amount: num,
  description: z.string(),
  accountCode: z.string().optional(),
  projectId: z.string().uuid().optional(),
  paidToFrom: z.string().optional(),
  receiptFileId: z.string().uuid().optional(),
  status: z.string().optional(),
});
attachCrud(financeRouter, "/petty-cash-vouchers", {
  table: pettyCashVouchers,
  idColumn: pettyCashVouchers.id,
  createSchema: voucherSchema,
  updateSchema: voucherSchema.partial(),
  perms: { read: "finance:read", write: "finance:write" },
  entityType: "petty-cash-voucher",
  beforeCreate: (i, req) => ({
    ...coerceMoney(i, ["amount"]),
    approverUserId: req.user!.sub,
  }),
  beforeUpdate: i => coerceMoney(i, ["amount"]),
});

// ============================================================
// Fixed assets
// ============================================================
const assetSchema = z.object({
  code: z.string(),
  name: z.string(),
  category: z.string(),
  acquiredDate: iso,
  cost: num,
  depreciationMethod: z.string().default("straight-line"),
  usefulLifeMonths: z.number().int(),
  accumulatedDepreciation: num.optional(),
  currentValue: num,
  location: z.string().optional(),
  status: z.string().optional(),
  custodianUserId: z.string().uuid().optional(),
  serialNumber: z.string().optional(),
  notes: z.string().optional(),
});
attachCrud(financeRouter, "/fixed-assets", {
  table: fixedAssets,
  idColumn: fixedAssets.id,
  createSchema: assetSchema,
  updateSchema: assetSchema.partial(),
  perms: { read: "finance:read", write: "finance:write" },
  entityType: "fixed-asset",
  beforeCreate: i =>
    coerceMoney(i, ["cost", "accumulatedDepreciation", "currentValue"]),
  beforeUpdate: i =>
    coerceMoney(i, ["cost", "accumulatedDepreciation", "currentValue"]),
});

// ============================================================
// Depreciation — post monthly depreciation for all active assets
// ============================================================
financeRouter.post(
  "/fixed-assets/post-depreciation",
  requirePerm("finance:write"),
  async (req, res, next) => {
    try {
      const { month, office } = z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/),
        office: z.string(),
      }).parse(req.body);

      const allAssets = await db.select().from(fixedAssets);
      const active = allAssets.filter(
        a => a.status === "active" && (!office || (a as any).office === office)
      );
      if (!active.length) {
        return res.json({ message: "No active assets found", lines: [] });
      }

      const lines = active.map(a => {
        const cost = Number(a.cost);
        const months = a.usefulLifeMonths || 36;
        const monthly = cost / months;
        return {
          accountCode: "5102018",   // Depreciation Expense
          description: `Monthly depreciation — ${a.name} (${a.code})`,
          debit: monthly,
          credit: 0,
          assetId: a.id,
        };
      });
      const accumLines = active.map(a => {
        const cost = Number(a.cost);
        const months = a.usefulLifeMonths || 36;
        const monthly = cost / months;
        return {
          accountCode: "1303000",   // Accumulated Depreciation
          description: `Accum. depreciation — ${a.name}`,
          debit: 0,
          credit: monthly,
        };
      });

      const totalDep = lines.reduce((s, l) => s + l.debit, 0);
      const journalLines = [...lines, ...accumLines];
      const [posted] = await db.insert(journalEntries).values({
        reference: `DEP-${month}`,
        date: `${month}-01`,
        office,
        currency: "AED",
        source: "depreciation",
        sourceRefId: `depreciation-${month}`,
        narration: `Monthly depreciation run — ${month}`,
        lines: journalLines,
        status: "posted",
        postedAt: new Date(),
        postedByUserId: req.user!.sub,
      } as any).returning();

      await writeAudit(req, {
        action: "post-depreciation",
        entityType: "journal",
        entityId: posted.id,
        after: { month, assets: active.length, totalDep: totalDep.toFixed(2) },
      });

      res.status(201).json({ journal: posted, assetsProcessed: active.length, totalDepreciation: totalDep });
    } catch (e) {
      next(e);
    }
  }
);

// ============================================================
// Payroll Runs (uses existing hr-workflow payroll_runs table)
// totals JSONB stores: { gross, deductions, net, gratuity, currency, reference, employees[] }
// ============================================================
const payrollRunSchema = z.object({
  payPeriod: z.string().regex(/^\d{4}-\d{2}$/),  // "2026-04"
  office: z.string(),
  status: z.enum(["draft", "approved", "paid", "void"]).default("draft"),
  totals: z.object({
    gross: z.number().default(0),
    deductions: z.number().default(0),
    net: z.number().default(0),
    gratuity: z.number().default(0),
    count: z.number().int().default(0),
    currency: z.string().default("AED"),
    reference: z.string().optional(),
    employees: z.array(z.any()).optional(),
  }),
});

financeRouter.get(
  "/payroll-runs",
  requirePerm("finance:read"),
  async (_req, res, next) => {
    try {
      res.json(await db.select().from(payrollRuns));
    } catch (e) {
      next(e);
    }
  }
);

financeRouter.post(
  "/payroll-runs",
  requirePerm("finance:write"),
  async (req, res, next) => {
    try {
      const input = payrollRunSchema.parse(req.body);
      const [year, month] = input.payPeriod.split("-").map(Number);
      const [inserted] = await db.insert(payrollRuns).values({
        office: input.office,
        periodYear: year,
        periodMonth: month,
        status: input.status,
        runByUserId: req.user!.sub,
        totals: input.totals,
      } as any).returning();

      // Auto-post salary journal when status is 'approved'
      if (input.status === "approved") {
        const { gross, deductions, net, gratuity, currency } = input.totals;
        const journalLines = [
          { accountCode: "5101001", description: "Salaries & Allowances", debit: gross, credit: 0 },
          ...(gratuity > 0 ? [
            { accountCode: "5101010", description: "Gratuity Provision", debit: gratuity, credit: 0 },
            { accountCode: "2201010", description: "Employee End of Service Provision", debit: 0, credit: gratuity },
          ] : []),
          { accountCode: "2101001", description: "Salaries Payable", debit: 0, credit: net },
          ...(deductions > 0 ? [
            { accountCode: "2101005", description: "Payroll Deductions Clearing", debit: 0, credit: deductions },
          ] : []),
        ];
        await postAutoJournal({
          reference: `PAY-${input.payPeriod}`,
          narration: `Payroll run — ${input.payPeriod} (${input.totals.count} employees)`,
          source: "payroll",
          sourceRefId: inserted.id,
          date: `${input.payPeriod}-01`,
          office: input.office,
          currency: currency || "AED",
          lines: journalLines,
        });
      }

      await writeAudit(req, {
        action: "create-payroll-run",
        entityType: "payroll-run",
        entityId: inserted.id,
        after: { period: input.payPeriod, totalNet: input.totals.net },
      });
      res.status(201).json(inserted);
    } catch (e) {
      next(e);
    }
  }
);

financeRouter.patch(
  "/payroll-runs/:id",
  requirePerm("finance:write"),
  async (req, res, next) => {
    try {
      const input = payrollRunSchema.partial().parse(req.body);
      const patch: any = {};
      if (input.status !== undefined) patch.status = input.status;
      if (input.totals !== undefined) patch.totals = input.totals;
      const [updated] = await db.update(payrollRuns)
        .set(patch)
        .where(eq(payrollRuns.id, req.params.id))
        .returning();
      if (!updated) throw new HttpError(404, "Payroll run not found");
      res.json(updated);
    } catch (e) {
      next(e);
    }
  }
);

// ============================================================
// Corporate Tax Returns (UAE 9%)
// ============================================================
const corpTaxSchema = z.object({
  taxYear: z.number().int(),
  periodStart: iso,
  periodEnd: iso,
  office: z.string(),
  accountingProfit: z.number().default(0),
  nonDeductibleExpenses: z.number().default(0),
  exemptIncome: z.number().default(0),
  smallBusinessRelief: z.boolean().default(false),
  quarterlyProvisions: z.array(z.object({
    quarter: z.string(),
    amount: z.number(),
    paid: z.boolean().default(false),
  })).default([]),
  status: z.enum(["draft", "filed", "paid"]).default("draft"),
  filedDate: iso.optional(),
  paymentRef: z.string().optional(),
  notes: z.string().optional(),
});

financeRouter.get(
  "/corporate-tax-returns",
  requirePerm("finance:read"),
  async (_req, res, next) => {
    try {
      res.json(await db.select().from(corporateTaxReturns));
    } catch (e) {
      next(e);
    }
  }
);

financeRouter.post(
  "/corporate-tax-returns",
  requirePerm("finance:write"),
  async (req, res, next) => {
    try {
      const input = corpTaxSchema.parse(req.body);
      const taxableIncome = Math.max(
        0,
        input.accountingProfit + input.nonDeductibleExpenses - input.exemptIncome
      );
      const taxRate = input.smallBusinessRelief ? 0 : 0.09;
      const ctPayable = taxableIncome * taxRate;

      const [inserted] = await db.insert(corporateTaxReturns).values({
        ...input,
        taxableIncome: String(taxableIncome),
        taxRate: String(taxRate),
        ctPayable: String(ctPayable),
        accountingProfit: String(input.accountingProfit),
        nonDeductibleExpenses: String(input.nonDeductibleExpenses),
        exemptIncome: String(input.exemptIncome),
      } as any).returning();

      await writeAudit(req, {
        action: "create-ct-return",
        entityType: "corporate-tax-return",
        entityId: inserted.id,
        after: { taxYear: input.taxYear, taxableIncome, ctPayable },
      });
      res.status(201).json(inserted);
    } catch (e) {
      next(e);
    }
  }
);

financeRouter.patch(
  "/corporate-tax-returns/:id",
  requirePerm("finance:write"),
  async (req, res, next) => {
    try {
      const input = corpTaxSchema.partial().parse(req.body);
      const patch: any = { ...input, updatedAt: new Date() };
      if (input.accountingProfit !== undefined || input.nonDeductibleExpenses !== undefined || input.exemptIncome !== undefined) {
        const row = (await db.select().from(corporateTaxReturns).where(eq(corporateTaxReturns.id, req.params.id)))[0];
        if (!row) throw new HttpError(404, "CT return not found");
        const profit = input.accountingProfit ?? Number(row.accountingProfit);
        const nonDed = input.nonDeductibleExpenses ?? Number(row.nonDeductibleExpenses);
        const exempt = input.exemptIncome ?? Number(row.exemptIncome);
        const sbr = input.smallBusinessRelief ?? row.smallBusinessRelief;
        const taxableIncome = Math.max(0, profit + nonDed - exempt);
        const taxRate = sbr ? 0 : 0.09;
        patch.taxableIncome = String(taxableIncome);
        patch.taxRate = String(taxRate);
        patch.ctPayable = String(taxableIncome * taxRate);
      }
      const [updated] = await db.update(corporateTaxReturns)
        .set(patch).where(eq(corporateTaxReturns.id, req.params.id)).returning();
      if (!updated) throw new HttpError(404, "CT return not found");
      res.json(updated);
    } catch (e) {
      next(e);
    }
  }
);

// ============================================================
// Bank Reconciliations
// ============================================================
const bankReconSchema = z.object({
  reference: z.string(),
  bankAccountId: z.string().uuid(),
  statementDate: iso,
  statementClosingBalance: z.number(),
  glBookBalance: z.number().default(0),
  outstandingDeposits: z.number().default(0),
  outstandingPayments: z.number().default(0),
  lines: z.array(z.object({
    id: z.string(),
    date: z.string(),
    description: z.string(),
    amount: z.number(),
    source: z.enum(["bank-statement", "gl-journal"]),
    matched: z.boolean().default(false),
    matchedToId: z.string().optional(),
  })).default([]),
  status: z.enum(["open", "reconciled", "reviewed"]).default("open"),
  notes: z.string().optional(),
});

financeRouter.get(
  "/bank-reconciliations",
  requirePerm("finance:read"),
  async (_req, res, next) => {
    try {
      res.json(await db.select().from(bankReconciliations));
    } catch (e) {
      next(e);
    }
  }
);

financeRouter.post(
  "/bank-reconciliations",
  requirePerm("finance:write"),
  async (req, res, next) => {
    try {
      const input = bankReconSchema.parse(req.body);
      const adjustedBankBalance =
        input.statementClosingBalance + input.outstandingDeposits - input.outstandingPayments;
      const difference = adjustedBankBalance - input.glBookBalance;

      const [inserted] = await db.insert(bankReconciliations).values({
        ...input,
        statementClosingBalance: String(input.statementClosingBalance),
        glBookBalance: String(input.glBookBalance),
        outstandingDeposits: String(input.outstandingDeposits),
        outstandingPayments: String(input.outstandingPayments),
        adjustedBankBalance: String(adjustedBankBalance),
        difference: String(difference),
      } as any).returning();

      await writeAudit(req, {
        action: "create-bank-reconciliation",
        entityType: "bank-reconciliation",
        entityId: inserted.id,
        after: { reference: input.reference, difference },
      });
      res.status(201).json(inserted);
    } catch (e) {
      next(e);
    }
  }
);

financeRouter.patch(
  "/bank-reconciliations/:id",
  requirePerm("finance:write"),
  async (req, res, next) => {
    try {
      const input = bankReconSchema.partial().parse(req.body);
      const patch: any = { ...input };
      if (input.statementClosingBalance !== undefined || input.outstandingDeposits !== undefined || input.outstandingPayments !== undefined || input.glBookBalance !== undefined) {
        const row = (await db.select().from(bankReconciliations).where(eq(bankReconciliations.id, req.params.id)))[0];
        if (!row) throw new HttpError(404, "Reconciliation not found");
        const bankBal = input.statementClosingBalance ?? Number(row.statementClosingBalance);
        const deposits = input.outstandingDeposits ?? Number(row.outstandingDeposits);
        const payments = input.outstandingPayments ?? Number(row.outstandingPayments);
        const bookBal = input.glBookBalance ?? Number(row.glBookBalance);
        const adjusted = bankBal + deposits - payments;
        patch.adjustedBankBalance = String(adjusted);
        patch.difference = String(adjusted - bookBal);
        if (input.status === "reconciled") patch.reconciledBy = req.user!.sub;
        if (input.status === "reconciled") patch.reconciledAt = new Date();
      }
      const [updated] = await db.update(bankReconciliations)
        .set(patch).where(eq(bankReconciliations.id, req.params.id)).returning();
      if (!updated) throw new HttpError(404, "Reconciliation not found");
      res.json(updated);
    } catch (e) {
      next(e);
    }
  }
);

// ============================================================
// Retention Releases
// ============================================================
const retentionReleaseSchema = z.object({
  reference: z.string(),
  type: z.enum(["receivable", "payable"]),
  projectId: z.string().uuid().optional(),
  counterpartyId: z.string().uuid(),
  counterpartyName: z.string(),
  originalInvoiceId: z.string().uuid().optional(),
  originalBillId: z.string().uuid().optional(),
  retentionAmountHeld: z.number(),
  releaseAmount: z.number(),
  releaseDate: iso,
  bankAccountId: z.string().uuid().optional(),
  paymentMethod: z.string().optional(),
  glAccountFrom: z.string(),
  glAccountTo: z.string(),
  status: z.enum(["pending", "approved", "posted", "paid"]).default("pending"),
  notes: z.string().optional(),
});

financeRouter.get(
  "/retention-releases",
  requirePerm("finance:read"),
  async (_req, res, next) => {
    try {
      res.json(await db.select().from(retentionReleases));
    } catch (e) {
      next(e);
    }
  }
);

financeRouter.post(
  "/retention-releases",
  requirePerm("finance:invoices:write"),
  async (req, res, next) => {
    try {
      const input = retentionReleaseSchema.parse(req.body);
      const [inserted] = await db.insert(retentionReleases).values({
        ...input,
        retentionAmountHeld: String(input.retentionAmountHeld),
        releaseAmount: String(input.releaseAmount),
        bankAccountId: input.bankAccountId ?? null,
        projectId: input.projectId ?? null,
        originalInvoiceId: input.originalInvoiceId ?? null,
        originalBillId: input.originalBillId ?? null,
      } as any).returning();

      // Auto-post journal when posted
      if (input.status === "posted") {
        await postAutoJournal({
          reference: `RR-${input.reference}`,
          narration: `Retention release — ${input.counterpartyName}`,
          source: "manual",
          sourceRefId: `retention-${inserted.id}`,
          date: input.releaseDate,
          office: "dubai",
          currency: "AED",
          lines: [
            { accountCode: input.glAccountTo, description: "Retention released to", debit: input.releaseAmount, credit: 0 },
            { accountCode: input.glAccountFrom, description: "Retention balance reduction", debit: 0, credit: input.releaseAmount },
          ],
        });
      }

      await writeAudit(req, {
        action: "create-retention-release",
        entityType: "retention-release",
        entityId: inserted.id,
        after: { reference: input.reference, amount: input.releaseAmount, type: input.type },
      });
      res.status(201).json(inserted);
    } catch (e) {
      next(e);
    }
  }
);

financeRouter.patch(
  "/retention-releases/:id",
  requirePerm("finance:write"),
  async (req, res, next) => {
    try {
      const input = retentionReleaseSchema.partial().parse(req.body);
      const [updated] = await db.update(retentionReleases)
        .set({ ...input } as any)
        .where(eq(retentionReleases.id, req.params.id))
        .returning();
      if (!updated) throw new HttpError(404, "Retention release not found");
      res.json(updated);
    } catch (e) {
      next(e);
    }
  }
);
