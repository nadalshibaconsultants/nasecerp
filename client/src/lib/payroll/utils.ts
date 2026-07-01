/**
 * Payroll preview from attendance — office-aware.
 *  - UAE (Dubai): no PIT, optional pension, OT 1.25× hourly.
 *  - Egypt (Cairo): progressive PIT, social insurance 11% employee + 18.75% employer.
 */
import type { AttendanceDay } from "@/lib/attendance/types";
import type { Employee, SalaryBreakdown } from "@/lib/hr/types";
import { grossSalary } from "@/lib/hr/types";
import { workingDaysInMonthForOffice, OFFICES } from "@/lib/office/configs";
import type { OfficeId } from "@/lib/office/types";

export type PayrollLine = {
  employeeId: string;
  office: OfficeId;
  currency: "AED" | "EGP";
  year: number;
  monthIndex0: number;
  basic: number; housing: number; transport: number; food: number; other: number;
  grossBeforeAdjustments: number;
  workingDaysInMonth: number;
  daysPresent: number; daysAbsent: number; daysLeave: number; daysWeekendOrHoliday: number;
  totalNormalHours: number;
  totalOvertimeHours: number;
  hourlyRate: number;
  overtimeRate: number;
  absenceDeduction: number;
  overtimePay: number;
  socialInsuranceDeduction: number;
  incomeTaxDeduction: number;
  netPay: number;
};

// Egyptian PIT 2024 brackets (annual, EGP). Approximation for monthly preview.
function egyptianMonthlyPIT(annualTaxableEGP: number): number {
  const brackets = [
    { upTo: 40_000, rate: 0 },
    { upTo: 55_000, rate: 0.10 },
    { upTo: 70_000, rate: 0.15 },
    { upTo: 200_000, rate: 0.20 },
    { upTo: 400_000, rate: 0.225 },
    { upTo: 1_200_000, rate: 0.25 },
    { upTo: Infinity, rate: 0.275 },
  ];
  let tax = 0; let prev = 0;
  for (const b of brackets) {
    if (annualTaxableEGP > prev) {
      const taxableInBand = Math.min(annualTaxableEGP, b.upTo) - prev;
      tax += taxableInBand * b.rate;
      prev = b.upTo;
    } else break;
  }
  return tax / 12;
}

export function monthlyPayroll(employee: Employee, monthDays: AttendanceDay[], year: number, monthIndex0: number): PayrollLine {
  const office = OFFICES[employee.office || "dubai"];
  const wd = workingDaysInMonthForOffice(year, monthIndex0, office);
  const inMonth = monthDays.filter((d) => d.employeeId === employee.id);

  const present = inMonth.filter((d) => d.status === "present" || d.status === "partial").length;
  const absent = inMonth.filter((d) => d.status === "absent").length;
  const leave = inMonth.filter((d) => d.status === "leave").length;
  const weHol = inMonth.filter((d) => d.status === "weekend" || d.status === "holiday").length;

  const totalNormalMin = inMonth.reduce((a, d) => a + d.normalMinutes, 0);
  const totalOTMin = inMonth.reduce((a, d) => a + d.overtimeMinutes, 0);

  const sb: SalaryBreakdown = employee.salary;
  const gross = grossSalary(sb);

  const hourlyRate = wd > 0 ? gross / (wd * office.hoursPerDay) : 0;
  const overtimeRate = hourlyRate * 1.25;
  const dailyBasic = wd > 0 ? sb.basic / wd : 0;
  const absenceDeduction = absent * dailyBasic;
  const overtimePay = (totalOTMin / 60) * overtimeRate;

  // Social insurance
  const insurableBase = sb.basic + sb.housing + sb.transport;
  const socialInsuranceDeduction = (office.socialInsuranceEmployeePct / 100) * insurableBase;

  // Income tax (Egypt only)
  let incomeTax = 0;
  if (office.hasIncomeTax) {
    const monthlyTaxable = gross - socialInsuranceDeduction;
    const annualTaxable = monthlyTaxable * 12;
    incomeTax = egyptianMonthlyPIT(annualTaxable);
  }

  return {
    employeeId: employee.id,
    office: office.id,
    currency: office.currency,
    year, monthIndex0,
    basic: sb.basic, housing: sb.housing, transport: sb.transport, food: sb.food, other: sb.other,
    grossBeforeAdjustments: gross,
    workingDaysInMonth: wd,
    daysPresent: present, daysAbsent: absent, daysLeave: leave, daysWeekendOrHoliday: weHol,
    totalNormalHours: Number((totalNormalMin / 60).toFixed(2)),
    totalOvertimeHours: Number((totalOTMin / 60).toFixed(2)),
    hourlyRate: Number(hourlyRate.toFixed(2)),
    overtimeRate: Number(overtimeRate.toFixed(2)),
    absenceDeduction: Number(absenceDeduction.toFixed(2)),
    overtimePay: Number(overtimePay.toFixed(2)),
    socialInsuranceDeduction: Number(socialInsuranceDeduction.toFixed(2)),
    incomeTaxDeduction: Number(incomeTax.toFixed(2)),
    netPay: Number((gross - absenceDeduction + overtimePay - socialInsuranceDeduction - incomeTax).toFixed(2)),
  };
}

export type ProjectLaborSlice = {
  projectId: string;
  totalHours: number;
  totalLaborCostAED: number;
};

export function projectLaborCosts(opts: {
  employees: Employee[]; days: AttendanceDay[]; year: number; monthIndex0: number;
}): ProjectLaborSlice[] {
  const acc = new Map<string, { hours: number; cost: number }>();
  for (const d of opts.days) {
    if (!d.projectId) continue;
    const emp = opts.employees.find((e) => e.id === d.employeeId);
    if (!emp) continue;
    const office = OFFICES[emp.office || "dubai"];
    const wd = workingDaysInMonthForOffice(opts.year, opts.monthIndex0, office);
    const gross = grossSalary(emp.salary);
    const hourlyRate = wd > 0 ? gross / (wd * office.hoursPerDay) : 0;
    const hours = (d.normalMinutes + d.overtimeMinutes) / 60;
    const cost = (d.normalMinutes / 60) * hourlyRate + (d.overtimeMinutes / 60) * hourlyRate * 1.25;
    const cur = acc.get(d.projectId) || { hours: 0, cost: 0 };
    acc.set(d.projectId, { hours: cur.hours + hours, cost: cur.cost + cost });
  }
  return Array.from(acc.entries()).map(([projectId, v]) => ({
    projectId,
    totalHours: Number(v.hours.toFixed(1)),
    totalLaborCostAED: Number(v.cost.toFixed(0)),
  })).sort((a, b) => b.totalLaborCostAED - a.totalLaborCostAED);
}
