import type { LeaveRequest } from "@/lib/attendance/types";
import type { Employee } from "@/lib/hr/types";
import { OFFICES } from "@/lib/office/configs";

export type LeaveType = LeaveRequest["type"];

export function entitlementForOffice(office: "dubai" | "cairo"): Record<LeaveType, number> {
  const o = OFFICES[office];
  return {
    annual: o.leaveAnnualDays,
    sick: o.leaveSickDays,
    maternity: o.leaveMaternityDays,
    paternity: o.leavePaternityDays,
    unpaid: 365,
    compassionate: o.leaveCompassionateDays,
    permission: 0, // hourly — deducted from the annual balance
  };
}

// Backwards-compatible default — uses Dubai entitlement when no office context
export const ENTITLEMENT_DAYS = entitlementForOffice("dubai");

export function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(fromISO + "T00:00:00Z").getTime();
  const b = new Date(toISO + "T00:00:00Z").getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000) + 1);
}

export function leaveBalance(employee: Employee | string, requests: LeaveRequest[], officeOverride?: "dubai" | "cairo") {
  const empId = typeof employee === "string" ? employee : employee.id;
  const office = officeOverride || (typeof employee === "string" ? "dubai" : (employee.office || "dubai"));
  const entitled = entitlementForOffice(office);
  const types: LeaveType[] = ["annual", "sick", "maternity", "paternity", "unpaid", "compassionate"];
  const out = {} as Record<LeaveType, { entitled: number; taken: number; pending: number; remaining: number }>;
  // Temporary permissions (1–3h) deduct from the annual balance at the
  // 08:50–18:30 working-day rate (9h40m).
  const WORK_DAY_HOURS = 9 + 40 / 60;
  const permission = requests.filter((r) => r.employeeId === empId && r.type === "permission");
  const permTakenDays = permission.filter((r) => r.status === "approved").reduce((a, r) => a + Number(r.hours ?? 0), 0) / WORK_DAY_HOURS;
  const permPendingDays = permission.filter((r) => r.status === "submitted").reduce((a, r) => a + Number(r.hours ?? 0), 0) / WORK_DAY_HOURS;
  for (const t of types) {
    const my = requests.filter((r) => r.employeeId === empId && r.type === t);
    let taken = my.filter((r) => r.status === "approved").reduce((a, r) => a + daysBetween(r.fromDate, r.toDate), 0);
    let pending = my.filter((r) => r.status === "submitted").reduce((a, r) => a + daysBetween(r.fromDate, r.toDate), 0);
    if (t === "annual") {
      taken = Math.round((taken + permTakenDays) * 100) / 100;
      pending = Math.round((pending + permPendingDays) * 100) / 100;
    }
    out[t] = { entitled: entitled[t], taken, pending, remaining: Math.max(0, Math.round((entitled[t] - taken) * 100) / 100) };
  }
  return out;
}
