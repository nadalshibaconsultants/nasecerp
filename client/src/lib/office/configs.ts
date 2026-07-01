import type { OfficeConfig, OfficeId } from "./types";
import { UAE_HOLIDAYS_2025_2027 } from "@/lib/timeline-utils";

const EG_HOLIDAYS_2025_2027 = [
  { date: "2025-01-01", name: "New Year" }, { date: "2025-01-07", name: "Coptic Christmas" },
  { date: "2025-01-25", name: "Police Day / Revolution Day" }, { date: "2025-04-20", name: "Easter Sunday" },
  { date: "2025-04-21", name: "Sham El-Nessim" }, { date: "2025-04-25", name: "Sinai Liberation" },
  { date: "2025-05-01", name: "Labour Day" }, { date: "2025-03-30", name: "Eid Al-Fitr" },
  { date: "2025-03-31", name: "Eid Al-Fitr" }, { date: "2025-04-01", name: "Eid Al-Fitr" },
  { date: "2025-06-06", name: "Eid Al-Adha" }, { date: "2025-06-07", name: "Eid Al-Adha" },
  { date: "2025-06-08", name: "Eid Al-Adha" }, { date: "2025-06-26", name: "Islamic New Year" },
  { date: "2025-06-30", name: "June 30 Revolution" }, { date: "2025-07-23", name: "Revolution Day" },
  { date: "2025-09-04", name: "Prophet's Birthday" }, { date: "2025-10-06", name: "Armed Forces Day" },
  { date: "2026-01-01", name: "New Year" }, { date: "2026-01-07", name: "Coptic Christmas" },
  { date: "2026-01-25", name: "Police Day" }, { date: "2026-03-20", name: "Eid Al-Fitr" },
  { date: "2026-03-21", name: "Eid Al-Fitr" }, { date: "2026-03-22", name: "Eid Al-Fitr" },
  { date: "2026-04-12", name: "Easter Sunday" }, { date: "2026-04-13", name: "Sham El-Nessim" },
  { date: "2026-04-25", name: "Sinai Liberation" }, { date: "2026-05-01", name: "Labour Day" },
  { date: "2026-05-27", name: "Eid Al-Adha" }, { date: "2026-05-28", name: "Eid Al-Adha" },
  { date: "2026-05-29", name: "Eid Al-Adha" }, { date: "2026-06-16", name: "Islamic New Year" },
  { date: "2026-06-30", name: "June 30 Revolution" }, { date: "2026-07-23", name: "Revolution Day" },
  { date: "2026-08-25", name: "Prophet's Birthday" }, { date: "2026-10-06", name: "Armed Forces Day" },
];

export const OFFICES: Record<OfficeId, OfficeConfig> = {
  dubai: {
    id: "dubai", name: "Dubai", countryName: "United Arab Emirates", flag: "🇦🇪",
    currency: "AED",
    workingWeek: "mon-fri", hoursPerDay: 8,
    leaveAnnualDays: 30, leaveSickDays: 90, leaveMaternityDays: 60, leavePaternityDays: 5, leaveCompassionateDays: 5,
    gratuityFirstYearsDays: 21, gratuityLaterYearsDays: 30, gratuityCapMonths: 24,
    hasIncomeTax: false, socialInsuranceEmployeePct: 0, socialInsuranceEmployerPct: 0,
    themeBg: "bg-amber-50", themeRing: "ring-amber-300", themeAccent: "bg-amber-500",
    publicHolidays: UAE_HOLIDAYS_2025_2027,
  },
  cairo: {
    id: "cairo", name: "Cairo", countryName: "Egypt", flag: "🇪🇬",
    currency: "EGP",
    workingWeek: "sun-thu", hoursPerDay: 8,
    leaveAnnualDays: 21, leaveSickDays: 180, leaveMaternityDays: 90, leavePaternityDays: 1, leaveCompassionateDays: 3,
    gratuityFirstYearsDays: 30, gratuityLaterYearsDays: 30, gratuityCapMonths: 0,
    hasIncomeTax: true, socialInsuranceEmployeePct: 11, socialInsuranceEmployerPct: 18.75,
    themeBg: "bg-emerald-50", themeRing: "ring-emerald-300", themeAccent: "bg-emerald-500",
    publicHolidays: EG_HOLIDAYS_2025_2027,
  },
};

export function officeForId(id: OfficeId): OfficeConfig { return OFFICES[id]; }

export function isOfficeWeekend(date: Date, office: OfficeConfig): boolean {
  const d = date.getUTCDay();
  if (office.workingWeek === "mon-fri") return d === 0 || d === 6;
  if (office.workingWeek === "sun-thu") return d === 5 || d === 6;
  return false;
}
export function isOfficeHoliday(date: Date, office: OfficeConfig): boolean {
  const iso = date.toISOString().slice(0, 10);
  return office.publicHolidays.some((h) => h.date === iso);
}
export function isOfficeWorkingDay(date: Date, office: OfficeConfig): boolean {
  return !isOfficeWeekend(date, office) && !isOfficeHoliday(date, office);
}
export function workingDaysInMonthForOffice(year: number, monthIndex0: number, office: OfficeConfig): number {
  let count = 0;
  const last = new Date(Date.UTC(year, monthIndex0 + 1, 0));
  for (let d = 1; d <= last.getUTCDate(); d++) {
    const dt = new Date(Date.UTC(year, monthIndex0, d));
    if (isOfficeWorkingDay(dt, office)) count++;
  }
  return count;
}

export function formatMoney(amount: number, currency: "AED" | "EGP"): string {
  return `${currency} ${Math.round(amount).toLocaleString()}`;
}

// Singleton: the active office in the UI (admin/HR/finance can switch)
export const ACTIVE_OFFICE_KEY = "nasec-active-office";
