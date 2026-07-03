import { Router } from "express";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  payrollRuns, payslips, employees, employeeCompensation, files, officeConfig,
} from "../../db/schema/index.js";
import { requireAuth } from "../../middleware/auth.js";
import { requirePerm } from "../../middleware/rbac.js";
import { writeAudit } from "../../middleware/audit.js";
import { HttpError } from "../../middleware/errors.js";
import { generatePayslipPdf } from "../../lib/pdf.js";
import { storage, fileKey } from "../../lib/storage.js";
import { COA, postAutoJournal } from "../../lib/auto-journal.js";

export const payrollRouter = Router();
payrollRouter.use(requireAuth);

const createRunSchema = z.object({
  office: z.enum(["dubai", "cairo"]),
  periodYear: z.number().int(),
  periodMonth: z.number().int().min(1).max(12),
  employeeIds: z.array(z.string().uuid()).optional(), // omit = all active employees in office
});

function calcDeductions(office: "dubai" | "cairo", gross: number, basic: number): { items: Array<[string, number]>; total: number } {
  const items: Array<[string, number]> = [];
  if (office === "cairo") {
    const si = Math.min(basic, gross) * 0.11;
    items.push(["Social Insurance (11%)", si]);
    // Egypt PIT brackets (simplified)
    const annual = gross * 12;
    let pit = 0;
    const brackets: Array<[number, number]> = [
      [30000, 0.0], [45000, 0.10], [60000, 0.15],
      [200000, 0.20], [400000, 0.225], [Infinity, 0.25],
    ];
    let prev = 0;
    for (const [cap, rate] of brackets) {
      if (annual <= prev) break;
      const slab = Math.min(annual, cap) - prev;
      pit += slab * rate;
      prev = cap;
      if (annual <= cap) break;
    }
    items.push(["Income Tax (annual basis)", pit / 12]);
  }
  // Dubai: no PIT, no SI (private sector expat default)
  const total = items.reduce((a, [, v]) => a + v, 0);
  return { items, total };
}

payrollRouter.get("/runs", requirePerm("hr:payroll:read"), async (_req, res, next) => {
  try { res.json(await db.select().from(payrollRuns)); } catch (e) { next(e); }
});

payrollRouter.get("/runs/:id", requirePerm("hr:payroll:read"), async (req, res, next) => {
  try {
    const run = (await db.select().from(payrollRuns).where(eq(payrollRuns.id, req.params.id)).limit(1))[0];
    if (!run) throw new HttpError(404, "Run not found");
    const slips = await db.select().from(payslips).where(eq(payslips.payrollRunId, run.id));
    res.json({ run, payslips: slips });
  } catch (e) { next(e); }
});

payrollRouter.post("/runs", requirePerm("hr:payroll:write"), async (req, res, next) => {
  try {
    const input = createRunSchema.parse(req.body);

    // Duplicate check only applies to full-office runs (not targeted sub-runs)
    const isFullRun = !input.employeeIds || input.employeeIds.length === 0;
    if (isFullRun) {
      const dup = await db.select().from(payrollRuns).where(and(
        eq(payrollRuns.office, input.office),
        eq(payrollRuns.periodYear, input.periodYear),
        eq(payrollRuns.periodMonth, input.periodMonth),
      )).limit(1);
      if (dup[0] && dup[0].status !== "void") throw new HttpError(409, "Run already exists for this period");
    }

    let empRows = await db.select().from(employees).where(eq(employees.office, input.office));
    if (!isFullRun) {
      empRows = empRows.filter((e) => input.employeeIds!.includes(e.id));
    }
    const compRows = await db.select().from(employeeCompensation);
    const compMap = new Map(compRows.map((c) => [c.employeeId, c]));

    const cfg = (await db.select().from(officeConfig).where(eq(officeConfig.office, input.office)).limit(1))[0];
    const currency = cfg?.currency ?? (input.office === "dubai" ? "AED" : "EGP");

    const run = (await db.insert(payrollRuns).values({
      office: input.office,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
      status: "draft",
      runByUserId: req.user!.sub,
    }).returning())[0];

    let totalGross = 0, totalDed = 0, totalNet = 0, count = 0;
    for (const e of empRows) {
      if (e.status !== "active" && e.status !== "probation") continue;
      const c = compMap.get(e.id);
      if (!c) continue;
      const basic = Number(c.basic);
      const allowances = Number(c.housing) + Number(c.transport) + Number(c.food) + Number(c.other);
      const gross = basic + allowances;
      const { items: dedItems, total: ded } = calcDeductions(input.office, gross, basic);
      const net = gross - ded;
      totalGross += gross; totalDed += ded; totalNet += net; count++;

      await db.insert(payslips).values({
        payrollRunId: run.id,
        employeeId: e.id,
        gross: String(gross.toFixed(2)),
        deductions: { items: dedItems, total: ded },
        net: String(net.toFixed(2)),
        currency,
      });
    }

    await db.update(payrollRuns).set({
      totals: { gross: totalGross, deductions: totalDed, net: totalNet, count },
    }).where(eq(payrollRuns.id, run.id));

    await writeAudit(req, { action: "create-payroll-run", entityType: "payroll-run", entityId: run.id, after: { office: input.office, period: `${input.periodYear}-${input.periodMonth}`, count } });
    res.status(201).json({ ...run, totals: { gross: totalGross, deductions: totalDed, net: totalNet, count } });
  } catch (e) { next(e); }
});

payrollRouter.post("/runs/:id/finalize", requirePerm("hr:payroll:write"), async (req, res, next) => {
  try {
    const run = (await db.select().from(payrollRuns).where(eq(payrollRuns.id, req.params.id)).limit(1))[0];
    if (!run) throw new HttpError(404, "Run not found");
    if (run.status !== "draft") throw new HttpError(409, `Cannot finalize a ${run.status} run`);

    // Generate PDF payslips
    const slips = await db.select().from(payslips).where(eq(payslips.payrollRunId, run.id));
    const empMap = new Map((await db.select().from(employees)).map((e) => [e.id, e]));

    for (const slip of slips) {
      const e = empMap.get(slip.employeeId);
      if (!e) continue;
      const c = (await db.select().from(employeeCompensation).where(eq(employeeCompensation.employeeId, e.id)).limit(1))[0];
      if (!c) continue;
      const ded = (slip.deductions as any)?.items ?? [];
      const pdf = await generatePayslipPdf({
        employee: { name: `${e.firstName} ${e.lastName}`, code: e.code, jobTitle: e.jobTitle, department: e.department, office: e.office },
        period: { year: run.periodYear, month: run.periodMonth },
        gross: Number(slip.gross),
        net: Number(slip.net),
        currency: slip.currency,
        earnings: ([
          ["Basic", Number(c.basic)],
          ["Housing", Number(c.housing)],
          ["Transport", Number(c.transport)],
          ["Food", Number(c.food)],
          ["Other", Number(c.other)],
        ] as Array<[string, number]>).filter(([, v]) => v > 0),
        deductions: ded,
      });

      const fileRow = (await db.insert(files).values({
        originalName: `payslip-${e.code}-${run.periodYear}-${String(run.periodMonth).padStart(2, "0")}.pdf`,
        mime: "application/pdf",
        sizeBytes: pdf.length,
        storagePath: "pending", sha256: "pending",
        scope: "letter", scopeId: slip.id,
        uploadedByUserId: req.user!.sub,
      }).returning())[0];
      const key = fileKey("letter", fileRow.id, fileRow.originalName);
      const stored = await storage.put(key, pdf, "application/pdf");
      await db.update(files).set({ storagePath: stored.storagePath, sha256: stored.sha256 }).where(eq(files.id, fileRow.id));
      await db.update(payslips).set({ fileId: fileRow.id }).where(eq(payslips.id, slip.id));
    }

    await db.update(payrollRuns).set({ status: "approved" }).where(eq(payrollRuns.id, run.id));
    await writeAudit(req, { action: "finalize-payroll", entityType: "payroll-run", entityId: run.id });

    // Auto journal: DR Salaries (gross) / CR Employee Payables (net) + accruals
    const totGross = slips.reduce((a: number, sl: any) => a + Number(sl.gross ?? 0), 0);
    const totNet = slips.reduce((a: number, sl: any) => a + Number(sl.net ?? 0), 0);
    await postAutoJournal({
      reference: `PAYROLL-${run.periodYear}-${String(run.periodMonth).padStart(2, "0")}`,
      narration: `Payroll ${run.periodYear}-${String(run.periodMonth).padStart(2, "0")} (${slips.length} employees)`,
      source: "payroll-run", sourceRefId: run.id,
      lines: [
        { accountCode: COA.EXP_SALARIES, debit: totGross, credit: 0, description: "Gross payroll" },
        { accountCode: COA.EMPLOYEE_PAYABLES, debit: 0, credit: totNet, description: "Net pay due" },
        { accountCode: COA.ACCRUED_EXPENSES, debit: 0, credit: Math.round((totGross - totNet) * 100) / 100, description: "Deductions/accruals" },
      ],
    });
    res.json({ ok: true, payslips: slips.length });
  } catch (e) { next(e); }
});

payrollRouter.get("/payslips/me", requirePerm("self:read"), async (req, res, next) => {
  try {
    if (!req.user?.employeeId) return res.json([]);
    const rows = await db.select().from(payslips).where(eq(payslips.employeeId, req.user.employeeId));
    res.json(rows);
  } catch (e) { next(e); }
});
