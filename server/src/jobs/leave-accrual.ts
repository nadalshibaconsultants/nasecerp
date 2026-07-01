// Monthly leave accrual. Runs on the 1st of each month.
// Ensures every active employee has leave_balances rows for the current year
// across all 6 leave types, and accrues 1/12th of the annual entitlement on
// each run. Sick/maternity/paternity/compassionate/unpaid are accrued at full
// entitlement on Jan 1 to match local labour conventions.
import { sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { employees, leaveBalances, officeConfig } from "../db/schema/index.js";

type Office = "dubai" | "cairo";

function pickEntitlement(office: Office, rules: any): Record<string, number> {
  // Falls back to sensible defaults if office_config is missing
  const defaults = {
    dubai: { annual: 30, sick: 90, maternity: 60, paternity: 5, unpaid: 365, compassionate: 5 },
    cairo: { annual: 21, sick: 180, maternity: 90, paternity: 1, unpaid: 365, compassionate: 3 },
  } as const;
  const d = defaults[office];
  return {
    annual: rules?.annualLeaveDays ?? d.annual,
    sick: rules?.sickLeaveDays ?? d.sick,
    maternity: rules?.maternityLeaveDays ?? d.maternity,
    paternity: rules?.paternityLeaveDays ?? d.paternity,
    unpaid: d.unpaid,
    compassionate: rules?.compassionateLeaveDays ?? d.compassionate,
  };
}

export async function runLeaveAccrualJob() {
  console.log("[job:leave-accrual] starting...");
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1; // 1-12
  const isJanuary = month === 1;

  const offices = await db.select().from(officeConfig);
  const cfgByOffice: Record<string, any> = {};
  for (const o of offices) cfgByOffice[o.office] = o.labourRules;

  const emps = await db.select().from(employees);
  let touched = 0;

  for (const e of emps) {
    if (e.status !== "active" && e.status !== "probation") continue;
    const ent = pickEntitlement(e.office as Office, cfgByOffice[e.office]);
    for (const [type, annual] of Object.entries(ent)) {
      const monthlyAccrual = type === "annual" ? annual / 12 : 0;
      // Upsert balance row for this (employee,type,year)
      await db.execute(sql`
        INSERT INTO leave_balances (employee_id, leave_type, year, entitlement, accrued, used)
        VALUES (${e.id}, ${type}, ${year}, ${annual}, ${isJanuary && type !== "annual" ? annual : monthlyAccrual}, 0)
        ON CONFLICT (employee_id, leave_type, year) DO UPDATE
          SET accrued = leave_balances.accrued + ${monthlyAccrual},
              entitlement = ${annual},
              updated_at = now()
      `);
      touched++;
    }
  }
  console.log(`[job:leave-accrual] rows touched: ${touched}`);
}
