/**
 * HR / Employee type definitions — full UAE-relevant schema.
 */

export type Department =
  | "Architecture" | "Structural" | "MEP" | "BIM" | "Project Management"
  | "Site Supervision" | "QA/QC" | "HSE" | "HR" | "Finance" | "Procurement"
  | "IT" | "Admin" | "Business Development";

export const DEPARTMENTS: Department[] = [
  "Architecture", "Structural", "MEP", "BIM", "Project Management",
  "Site Supervision", "QA/QC", "HSE", "HR", "Finance", "Procurement",
  "IT", "Admin", "Business Development",
];

export type EmploymentStatus = "active" | "probation" | "on-leave" | "suspended" | "terminated" | "resigned";

export type ContractType = "limited" | "unlimited" | "part-time" | "freelance" | "consultant";

export type DocumentType = "passport" | "emirates-id" | "visa" | "labour-card" | "driving-licence" | "qualification" | "experience-cert" | "medical" | "other";

export type EmployeeDocument = {
  id: string;
  type: DocumentType;
  number?: string;
  issueDate?: string;       // ISO
  expiryDate?: string;      // ISO  (drives expiry alerts)
  fileUrl?: string;         // for future file-upload iteration
  fileName?: string;
  notes?: string;
};

export type Dependent = {
  name: string;
  relation: "spouse" | "son" | "daughter" | "father" | "mother" | "other";
  dob?: string;
  passportNo?: string;
  visaSponsor?: "company" | "self" | "spouse";
  visaExpiry?: string;
};

export type SalaryBreakdown = {
  basic: number;
  housing: number;
  transport: number;
  food: number;
  other: number;
  // Derived: gross = sum of all components
};

export type BankDetails = {
  bankName?: string;
  iban?: string;
  accountNo?: string;
  swift?: string;
};

export type Employee = {
  id: string;
  code: string;             // e.g. NSC-EMP-0023
  // Personal
  firstName: string;
  lastName: string;
  arabicName?: string;
  gender: "M" | "F";
  dob?: string;
  nationality: string;
  maritalStatus?: "single" | "married" | "divorced" | "widowed";
  email: string;
  phone: string;
  emergencyPhone?: string;
  emergencyContactName?: string;
  homeAddress?: string;
  photoUrl?: string;
  // Employment
  office: "dubai" | "cairo";
  jobTitle: string;
  department: Department;
  managerEmployeeId?: string;
  status: EmploymentStatus;
  joinDate: string;          // ISO
  endDate?: string;          // for terminations / contract expiry
  workLocation?: "Office" | "Site" | "Hybrid";
  // Contract & salary
  contractType: ContractType;
  contractEndDate?: string;
  probationEndDate?: string;
  salary: SalaryBreakdown;
  // Identity
  passportNo?: string;
  passportExpiry?: string;
  emiratesIdNo?: string;
  emiratesIdExpiry?: string;
  visaNo?: string;
  visaExpiry?: string;
  visaSponsor?: "company" | "spouse" | "father" | "self";
  labourCardNo?: string;
  labourCardExpiry?: string;
  // Family / payment
  dependents?: Dependent[];
  bank?: BankDetails;
  documents?: EmployeeDocument[];
  // Site assignment (which project's geofence they're currently linked to)
  assignedProjectId?: string;
  // Internal
  createdAt: string;
  updatedAt: string;
};

export function grossSalary(s: SalaryBreakdown | null | undefined): number {
  if (!s) return 0;
  return (s.basic || 0) + (s.housing || 0) + (s.transport || 0) + (s.food || 0) + (s.other || 0);
}

// ---- Document expiry helpers
export type ExpiryStatus = "valid" | "warning" | "critical" | "expired" | "unknown";

export function expiryStatus(iso?: string): ExpiryStatus {
  if (!iso) return "unknown";
  const today = new Date();
  const exp = new Date(iso + "T00:00:00Z");
  const days = Math.round((exp.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return "expired";
  if (days <= 30) return "critical";
  if (days <= 60) return "warning";
  return "valid";
}

export function expiryColorClass(s: ExpiryStatus): string {
  return ({
    valid: "bg-emerald-100 text-emerald-700 border-emerald-200",
    warning: "bg-amber-100 text-amber-700 border-amber-200",
    critical: "bg-red-100 text-red-700 border-red-200",
    expired: "bg-red-200 text-red-800 border-red-300",
    unknown: "bg-slate-100 text-slate-600 border-slate-200",
  } as const)[s];
}
