import type { TrainingRecord, AssetAssignment, DisciplinaryRecord, PerformanceReview, OnboardingRecord, IssuedLetter, AuditLogEntry } from "@/lib/hr/extra-types";

const today = new Date();
function iso(addDays: number) { return new Date(today.getTime() + addDays * 86_400_000).toISOString().slice(0, 10); }
function isoTs(addDays: number) { return new Date(today.getTime() + addDays * 86_400_000).toISOString(); }

export const SEED_TRAINING: TrainingRecord[] = [
  { id: "tr-1", employeeId: "emp-ahmed-mansoori", name: "PMP", provider: "PMI", category: "professional", issueDate: "2022-04-12", expiryDate: iso(450), costAED: 7500 },
  { id: "tr-2", employeeId: "emp-ahmed-mansoori", name: "Primavera P6 Advanced", provider: "Oracle", category: "technical", issueDate: "2023-09-01" },
  { id: "tr-3", employeeId: "emp-omar-shamsi", name: "OSHA 30-hour Construction", category: "safety", issueDate: "2024-02-15", expiryDate: iso(40), costAED: 1800 },
  { id: "tr-4", employeeId: "emp-deepak-sharma", name: "NEBOSH IGC", category: "safety", issueDate: "2023-06-20", expiryDate: iso(120), costAED: 3500 },
  { id: "tr-5", employeeId: "emp-deepak-sharma", name: "First Aid & CPR", category: "safety", issueDate: "2024-11-05", expiryDate: iso(20) },
  { id: "tr-6", employeeId: "emp-sara-khan", name: "Autodesk Revit Professional", category: "technical", issueDate: "2024-03-10", expiryDate: iso(280) },
  { id: "tr-7", employeeId: "emp-priya-nair", name: "LEED Green Associate", category: "professional", issueDate: "2024-08-22", expiryDate: iso(550) },
  { id: "tr-8", employeeId: "emp-noor-ahmadi", name: "ISO 9001 Lead Auditor", category: "compliance", issueDate: "2024-04-18", expiryDate: iso(220) },
];

export const SEED_ASSETS: AssetAssignment[] = [
  { id: "as-1", employeeId: "emp-ahmed-mansoori", type: "laptop", identifier: "DELL-XPS-NSC-001", description: "Dell XPS 15", assignedDate: "2024-01-10", condition: "good", estimatedValueAED: 9500 },
  { id: "as-2", employeeId: "emp-ahmed-mansoori", type: "phone", identifier: "+971501234567", description: "iPhone 14 Pro · NSC corporate line", assignedDate: "2024-01-10", condition: "good", estimatedValueAED: 4800 },
  { id: "as-3", employeeId: "emp-ahmed-mansoori", type: "vehicle", identifier: "DXB-A-12345", description: "Toyota Land Cruiser — pool vehicle", assignedDate: "2024-01-10", condition: "good", estimatedValueAED: 220000 },
  { id: "as-4", employeeId: "emp-james-wong", type: "laptop", identifier: "HP-ZBOOK-NSC-018", description: "HP ZBook G9", assignedDate: "2023-04-02", condition: "good", estimatedValueAED: 11000 },
  { id: "as-5", employeeId: "emp-priya-nair", type: "laptop", identifier: "MAC-PRO-NSC-022", description: "MacBook Pro 16 · M3", assignedDate: "2024-06-10", condition: "good", estimatedValueAED: 14500 },
  { id: "as-6", employeeId: "emp-sara-khan", type: "laptop", identifier: "DELL-PRECISION-NSC-031", description: "Dell Precision 5680", assignedDate: "2024-08-15", condition: "good", estimatedValueAED: 13500 },
  { id: "as-7", employeeId: "emp-omar-shamsi", type: "vehicle", identifier: "DXB-K-77123", description: "Nissan Patrol — Site Manager pool", assignedDate: "2023-12-01", condition: "good", estimatedValueAED: 240000 },
  { id: "as-8", employeeId: "emp-deepak-sharma", type: "uniform", identifier: "HSE-PPE-S010", description: "Full PPE kit (helmet, vest, boots, harness)", assignedDate: "2024-02-01", condition: "good", estimatedValueAED: 1500 },
];

export const SEED_DISCIPLINARY: DisciplinaryRecord[] = [
  { id: "dc-1", employeeId: "emp-mohammed-iqbal", date: iso(-9), type: "verbal-warning",
    reason: "Punched in outside geofence on 14-Apr-2026",
    detail: "Verbal coaching delivered. Repeat occurrence will trigger written warning.",
    issuedBy: "Fatima Al-Zaabi (HR Manager)", acknowledgedByEmployee: true },
];

export const SEED_REVIEWS: PerformanceReview[] = [
  { id: "rv-1", employeeId: "emp-ahmed-mansoori", period: "FY2025", reviewerId: "emp-aisha-marzooqi", date: "2025-12-18",
    scores: [
      { dimension: "Project delivery", score: 5, max: 5, comment: "Marina Heights ahead on programme." },
      { dimension: "Team leadership", score: 4, max: 5 },
      { dimension: "Client management", score: 5, max: 5 },
      { dimension: "Technical depth", score: 4, max: 5 },
      { dimension: "Commercial awareness", score: 4, max: 5 },
    ],
    overallRating: 4.4, managerComments: "Strong year — promote to Senior PM.", status: "acknowledged" },
  { id: "rv-2", employeeId: "emp-james-wong", period: "FY2025", reviewerId: "emp-ahmed-mansoori", date: "2025-12-22",
    scores: [
      { dimension: "Technical depth", score: 5, max: 5 },
      { dimension: "Quality of deliverables", score: 5, max: 5 },
      { dimension: "Team contribution", score: 4, max: 5 },
      { dimension: "Communication", score: 3, max: 5, comment: "Could improve client-facing presentations." },
    ],
    overallRating: 4.25, managerComments: "Excellent technical work.", status: "acknowledged" },
];

export const SEED_ONBOARDING: OnboardingRecord[] = [
  { id: "ob-hassan", employeeId: "emp-hassan-saadi", startedAt: isoTs(-95), expectedJoinDate: iso(-90),
    status: "in-progress",
    steps: [
      { key: "offer", label: "Offer letter signed", status: "complete", completedAt: isoTs(-100) },
      { key: "docs", label: "Personal documents collected", status: "complete", completedAt: isoTs(-92) },
      { key: "visa", label: "Visa application", status: "complete", completedAt: isoTs(-85) },
      { key: "eid", label: "Emirates ID issued", status: "complete", completedAt: isoTs(-65) },
      { key: "labour", label: "Labour card issued", status: "complete", completedAt: isoTs(-60) },
      { key: "bank", label: "Bank account opened", status: "complete", completedAt: isoTs(-50) },
      { key: "assets", label: "Laptop & access provisioned", status: "complete", completedAt: isoTs(-89) },
      { key: "induction", label: "HSE & company induction", status: "complete", completedAt: isoTs(-89) },
      { key: "probation", label: "Probation tracker (90d)", status: "in-progress" },
    ] },
];

export const SEED_LETTERS: IssuedLetter[] = [
  { id: "lt-1", employeeId: "emp-priya-nair", type: "salary-certificate", issueDate: iso(-15),
    issuedBy: "Fatima Al-Zaabi", reference: "NSC/HR/SC/2026/014", recipient: "Emirates NBD",
    fileName: "NSC-SalaryCert-PriyaNair-Apr2026.pdf" },
  { id: "lt-2", employeeId: "emp-james-wong", type: "noc", issueDate: iso(-7),
    issuedBy: "Fatima Al-Zaabi", reference: "NSC/HR/NOC/2026/021", recipient: "Singapore Embassy",
    fileName: "NSC-NOC-JamesWong-May2026.pdf" },
];

export const SEED_AUDIT: AuditLogEntry[] = [
  { id: "au-1", timestamp: isoTs(-10), actor: "Fatima Al-Zaabi (HR Manager)", module: "letters", action: "issue", subject: "Salary Certificate · Priya Nair", detail: "Reference NSC/HR/SC/2026/014 · Recipient: Emirates NBD" },
  { id: "au-2", timestamp: isoTs(-7), actor: "Fatima Al-Zaabi (HR Manager)", module: "letters", action: "issue", subject: "NOC · James Wong", detail: "Reference NSC/HR/NOC/2026/021" },
  { id: "au-3", timestamp: isoTs(-9), actor: "Fatima Al-Zaabi (HR Manager)", module: "disciplinary", action: "create", subject: "Verbal warning · Mohammed Iqbal", detail: "Out-of-geofence punch on 14-Apr" },
  { id: "au-4", timestamp: isoTs(-5), actor: "Ahmed Al-Mansoori (PM)", module: "leave", action: "approve", subject: "Annual leave · Priya Nair", detail: "3 days approved" },
];
