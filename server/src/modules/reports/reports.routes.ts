// Cross-module aggregation endpoints. These return pre-computed KPI shapes
// the frontend ReportsModule and per-page dashboards consume directly. All
// queries are executed under the caller's RLS context so visibility matches
// the rest of the system.
import { Router } from "express";
import { sql, and, gte, lte, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  projects, tasks, leads, leaveRequests, attendanceDailyRollup,
  payrollRuns, arInvoices, apBills, journalEntries,
} from "../../db/schema/index.js";
import { requireAuth } from "../../middleware/auth.js";
import { requirePerm } from "../../middleware/rbac.js";

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

// -------------------- Top-level dashboard --------------------
reportsRouter.get("/dashboard", requirePerm("reports:read"), async (_req, res, next) => {
  try {
    const [
      projectCount, openTasks, overdueTasks, openLeads, wonLeads, pendingLeaves,
    ] = await Promise.all([
      db.execute(sql`SELECT count(*)::int AS n FROM projects WHERE stage <> 'completed'`),
      db.execute(sql`SELECT count(*)::int AS n FROM tasks WHERE status <> 'done'`),
      db.execute(sql`SELECT count(*)::int AS n FROM tasks WHERE status <> 'done' AND due_date < current_date`),
      db.execute(sql`SELECT count(*)::int AS n, coalesce(sum(estimated_value_aed),0)::numeric AS v FROM leads WHERE stage NOT IN ('won','lost')`),
      db.execute(sql`SELECT count(*)::int AS n, coalesce(sum(estimated_value_aed),0)::numeric AS v FROM leads WHERE stage = 'won' AND created_at > now() - interval '90 days'`),
      db.execute(sql`SELECT count(*)::int AS n FROM leave_requests WHERE status = 'submitted'`),
    ]);

    const arOpen = await db.execute(sql`
      SELECT coalesce(sum(balance),0)::numeric AS v, count(*)::int AS n
      FROM ar_invoices WHERE status NOT IN ('paid', 'cancelled')
    `);
    const apOpen = await db.execute(sql`
      SELECT coalesce(sum(balance),0)::numeric AS v, count(*)::int AS n
      FROM ap_bills WHERE status NOT IN ('paid', 'rejected')
    `);

    res.json({
      projects: { active: (projectCount as any).rows[0].n },
      tasks: { open: (openTasks as any).rows[0].n, overdue: (overdueTasks as any).rows[0].n },
      crm: {
        openLeads: (openLeads as any).rows[0].n,
        openPipelineAed: Number((openLeads as any).rows[0].v),
        wonLast90Days: { count: (wonLeads as any).rows[0].n, valueAed: Number((wonLeads as any).rows[0].v) },
      },
      hr: { pendingLeaves: (pendingLeaves as any).rows[0].n },
      finance: {
        arOpen: { count: (arOpen as any).rows[0].n, valueAed: Number((arOpen as any).rows[0].v) },
        apOpen: { count: (apOpen as any).rows[0].n, valueAed: Number((apOpen as any).rows[0].v) },
      },
    });
  } catch (e) { next(e); }
});

// -------------------- Project P&L --------------------
reportsRouter.get("/projects/:id/pnl", requirePerm("reports:read"), async (req, res, next) => {
  try {
    // Revenue: sum of AR invoice totals for this project. Cost: sum of AP bill lines + payroll allocated by hours_logged.
    const id = req.params.id;
    const revenue = await db.execute(sql`
      SELECT coalesce(sum(total),0)::numeric AS v
      FROM ar_invoices WHERE project_id = ${id} AND status <> 'cancelled'
    `);
    const cost = await db.execute(sql`
      SELECT coalesce(sum(total),0)::numeric AS v
      FROM ap_bills WHERE status <> 'rejected'
        AND lines @> jsonb_build_array(jsonb_build_object('projectId', ${id}::text))
    `);
    const proj = (await db.select().from(projects).where(eq(projects.id, id)).limit(1))[0];
    const contract = Number(proj?.contractValue ?? 0);
    const rev = Number((revenue as any).rows[0].v);
    const cst = Number((cost as any).rows[0].v);
    res.json({
      projectId: id,
      contractValueAed: contract,
      invoicedAed: rev,
      directCostAed: cst,
      grossMarginAed: rev - cst,
      grossMarginPct: rev > 0 ? Math.round(((rev - cst) / rev) * 100) : 0,
      percentInvoiced: contract > 0 ? Math.round((rev / contract) * 100) : 0,
    });
  } catch (e) { next(e); }
});

// -------------------- Attendance summary --------------------
reportsRouter.get("/attendance/summary", requirePerm("reports:read"), async (req, res, next) => {
  try {
    const { from, to, employeeId } = req.query as Record<string, string>;
    const today = new Date().toISOString().slice(0, 10);
    const fromDate = from ?? today.slice(0, 7) + "-01";
    const toDate = to ?? today;
    const conds: any[] = [gte(attendanceDailyRollup.day, fromDate), lte(attendanceDailyRollup.day, toDate)];
    if (employeeId) conds.push(eq(attendanceDailyRollup.employeeId, employeeId));
    const rows = await db.select().from(attendanceDailyRollup).where(and(...conds));
    const totalHours = rows.reduce((a, r) => a + Number(r.hours), 0);
    const daysWorked = rows.filter((r) => Number(r.hours) > 0).length;
    const missing = rows.filter((r) => r.missingPunches).length;
    res.json({
      from: fromDate, to: toDate,
      totalHours: Math.round(totalHours * 100) / 100,
      daysWorked,
      avgHoursPerDay: daysWorked > 0 ? Math.round((totalHours / daysWorked) * 100) / 100 : 0,
      missingPunchDays: missing,
      rows,
    });
  } catch (e) { next(e); }
});

// -------------------- Payroll summary --------------------
reportsRouter.get("/payroll/summary", requirePerm("hr:payroll:read"), async (req, res, next) => {
  try {
    const { year } = req.query as Record<string, string>;
    const conds: any[] = [];
    if (year) conds.push(eq(payrollRuns.periodYear, Number(year)));
    const runs = conds.length
      ? await db.select().from(payrollRuns).where(and(...conds))
      : await db.select().from(payrollRuns);
    const totals = runs.reduce((acc, r) => {
      const t = (r.totals as any) ?? {};
      acc.gross += Number(t.gross ?? 0);
      acc.deductions += Number(t.deductions ?? 0);
      acc.net += Number(t.net ?? 0);
      acc.headcount += Number(t.count ?? 0);
      return acc;
    }, { gross: 0, deductions: 0, net: 0, headcount: 0 });
    res.json({ runs: runs.length, ...totals });
  } catch (e) { next(e); }
});

// -------------------- CRM pipeline --------------------
reportsRouter.get("/crm/pipeline", requirePerm("crm:read"), async (_req, res, next) => {
  try {
    const rows = await db.execute(sql`
      SELECT stage,
             count(*)::int AS leads,
             coalesce(sum(estimated_value_aed),0)::numeric AS value,
             coalesce(sum(estimated_value_aed * probability / 100.0),0)::numeric AS weighted
      FROM leads
      GROUP BY stage
    `);
    const byStage = (rows as any).rows.map((r: any) => ({
      stage: r.stage, leads: r.leads, valueAed: Number(r.value), weightedAed: Number(r.weighted),
    }));
    const totals = byStage.reduce((a: any, r: any) => ({
      leads: a.leads + r.leads,
      valueAed: a.valueAed + r.valueAed,
      weightedAed: a.weightedAed + r.weightedAed,
    }), { leads: 0, valueAed: 0, weightedAed: 0 });
    res.json({ byStage, totals });
  } catch (e) { next(e); }
});

// -------------------- AR / AP aging --------------------
reportsRouter.get("/finance/aging", requirePerm("finance:read"), async (req, res, next) => {
  try {
    const { type } = req.query as Record<string, string>;
    const table = type === "ap" ? "ap_bills" : "ar_invoices";
    const rows = await db.execute(sql.raw(`
      SELECT
        CASE
          WHEN current_date - due_date <= 0 THEN 'current'
          WHEN current_date - due_date BETWEEN 1 AND 30 THEN '1-30'
          WHEN current_date - due_date BETWEEN 31 AND 60 THEN '31-60'
          WHEN current_date - due_date BETWEEN 61 AND 90 THEN '61-90'
          ELSE '90+'
        END AS bucket,
        count(*)::int AS n,
        coalesce(sum(balance),0)::numeric AS amount
      FROM ${table}
      WHERE status NOT IN ('paid', '${type === "ap" ? "rejected" : "cancelled"}')
      GROUP BY 1
    `));
    res.json((rows as any).rows.map((r: any) => ({ bucket: r.bucket, count: r.n, amountAed: Number(r.amount) })));
  } catch (e) { next(e); }
});
