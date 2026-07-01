export type OfficeId = "dubai" | "cairo";
export type WorkingWeek = "mon-fri" | "sun-thu";

export type OfficeConfig = {
  id: OfficeId;
  name: string;
  countryName: string;
  flag: string;
  currency: "AED" | "EGP";
  workingWeek: WorkingWeek;
  hoursPerDay: number;
  leaveAnnualDays: number;
  leaveSickDays: number;
  leaveMaternityDays: number;
  leavePaternityDays: number;
  leaveCompassionateDays: number;
  gratuityFirstYearsDays: number;
  gratuityLaterYearsDays: number;
  gratuityCapMonths: number;
  hasIncomeTax: boolean;
  socialInsuranceEmployeePct: number;
  socialInsuranceEmployerPct: number;
  themeBg: string;
  themeRing: string;
  themeAccent: string;
  publicHolidays: { date: string; name: string }[];
};
