// Maps DB rows (snake-ish, separate compensation/bank tables) to the shape the
// frontend Employee type expects (single object with nested salary/bank/etc.).
import type { Employee as DbEmployee } from "../../db/schema/index.js";

export type FrontendEmployee = {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  arabicName?: string;
  gender?: "M" | "F";
  dob?: string;
  nationality?: string;
  maritalStatus?: string;
  email: string;
  phone?: string;
  emergencyPhone?: string;
  emergencyContactName?: string;
  homeAddress?: string;
  photoUrl?: string;

  office: "dubai" | "cairo";
  jobTitle: string;
  department: string;
  managerEmployeeId?: string;
  status: string;
  joinDate: string;
  endDate?: string;
  workLocation?: string;
  contractType: string;
  contractEndDate?: string;
  probationEndDate?: string;

  passportNo?: string;
  passportExpiry?: string;
  emiratesIdNo?: string;
  emiratesIdExpiry?: string;
  visaNo?: string;
  visaExpiry?: string;
  visaSponsor?: string;
  labourCardNo?: string;
  labourCardExpiry?: string;
  assignedProjectId?: string;

  salary: { basic: number; housing: number; transport: number; food: number; other: number };
  bank?: { bankName?: string; iban?: string; accountNo?: string; swift?: string };

  createdAt: string;
  updatedAt: string;
};

type CompRow = { basic: string; housing: string; transport: string; food: string; other: string } | null;
type BankRow = { bankName: string | null; iban: string | null; accountNo: string | null; swift: string | null } | null;

const dateStr = (d: Date | string | null | undefined): string | undefined => {
  if (!d) return undefined;
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
};

const n = (s: string | null | undefined): number => Number(s ?? 0) || 0;

export function toFrontendEmployee(e: DbEmployee, comp?: CompRow, bank?: BankRow): FrontendEmployee {
  return {
    id: e.id,
    code: e.code,
    firstName: e.firstName,
    lastName: e.lastName,
    arabicName: e.arabicName ?? undefined,
    gender: (e.gender as "M" | "F" | null) ?? undefined,
    dob: dateStr(e.dob),
    nationality: e.nationality ?? undefined,
    maritalStatus: e.maritalStatus ?? undefined,
    email: e.email,
    phone: e.phone ?? undefined,
    emergencyPhone: e.emergencyPhone ?? undefined,
    emergencyContactName: e.emergencyContactName ?? undefined,
    homeAddress: e.homeAddress ?? undefined,
    photoUrl: e.photoUrl ?? undefined,
    office: e.office as "dubai" | "cairo",
    jobTitle: e.jobTitle,
    department: e.department,
    managerEmployeeId: e.managerEmployeeId ?? undefined,
    status: e.status,
    joinDate: dateStr(e.joinDate)!,
    endDate: dateStr(e.endDate),
    workLocation: e.workLocation ?? undefined,
    contractType: e.contractType,
    contractEndDate: dateStr(e.contractEndDate),
    probationEndDate: dateStr(e.probationEndDate),
    passportNo: e.passportNo ?? undefined,
    passportExpiry: dateStr(e.passportExpiry),
    emiratesIdNo: e.emiratesIdNo ?? undefined,
    emiratesIdExpiry: dateStr(e.emiratesIdExpiry),
    visaNo: e.visaNo ?? undefined,
    visaExpiry: dateStr(e.visaExpiry),
    visaSponsor: e.visaSponsor ?? undefined,
    labourCardNo: e.labourCardNo ?? undefined,
    labourCardExpiry: dateStr(e.labourCardExpiry),
    assignedProjectId: e.assignedProjectId ?? undefined,
    salary: comp ? {
      basic: n(comp.basic),
      housing: n(comp.housing),
      transport: n(comp.transport),
      food: n(comp.food),
      other: n(comp.other),
    } : { basic: 0, housing: 0, transport: 0, food: 0, other: 0 },
    bank: bank ? {
      bankName: bank.bankName ?? undefined,
      iban: bank.iban ?? undefined,
      accountNo: bank.accountNo ?? undefined,
      swift: bank.swift ?? undefined,
    } : undefined,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}
