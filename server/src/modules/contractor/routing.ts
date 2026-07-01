// Auto-routing engine: maps (discipline, submittalType) → primary reviewer + approver.
// Mirrors the lookup the frontend uses (lib/contractor/lookup.ts).
type SiteRole = "PM" | "RE" | "QA-QC" | "HSE" | "Architect" | "Structural-Eng" | "MEP-Eng" | "Specialist-Eng";

const TYPE_REVIEWER: Record<string, SiteRole | SiteRole[]> = {
  "MAT": ["QA-QC", "Architect"],
  "SHOP": ["Architect", "Structural-Eng", "MEP-Eng"],
  "MOCKUP": "Architect",
  "METHOD": ["QA-QC", "HSE"],
  "MIR": "QA-QC",
  "WIR": "QA-QC",
  "HSE-PERMIT": "HSE",
  "RFI": ["Architect", "Structural-Eng", "MEP-Eng"],
  "SAMPLE": "Architect",
  "CERT": "QA-QC",
};

const DISCIPLINE_OVERRIDE: Record<string, SiteRole> = {
  "Architecture": "Architect",
  "Structural": "Structural-Eng",
  "MEP": "MEP-Eng",
  "Civil": "Structural-Eng",
  "HSE": "HSE",
  "QA-QC": "QA-QC",
  "Interior": "Architect",
};

export function pickReviewer(discipline: string, type: string): SiteRole | SiteRole[] {
  const fromDisc = DISCIPLINE_OVERRIDE[discipline];
  const fromType = TYPE_REVIEWER[type];
  if (fromDisc) return fromDisc;
  return fromType ?? "PM";
}

export function pickApprover(_discipline: string, type: string): SiteRole {
  // High-level: PM approves everything except HSE permits (HSE) and MIR/WIR (RE)
  if (type === "HSE-PERMIT") return "HSE";
  if (type === "MIR" || type === "WIR") return "RE";
  return "PM";
}

// SLA hours (UAE working time) by submittal type
const SLA_HOURS: Record<string, number> = {
  "MAT": 72, "SHOP": 120, "MOCKUP": 48, "METHOD": 72,
  "MIR": 24, "WIR": 24, "HSE-PERMIT": 24,
  "RFI": 48, "SAMPLE": 72, "CERT": 48,
};

export function computeSlaDeadline(type: string, submittedAt: Date, priority: "Normal" | "Urgent"): Date {
  const hours = (SLA_HOURS[type] ?? 72) * (priority === "Urgent" ? 0.5 : 1);
  return new Date(submittedAt.getTime() + hours * 3600 * 1000);
}
