export type TrainingRecord = {
  id: string;
  employeeId: string;
  name: string;
  provider?: string;
  category: "professional" | "safety" | "technical" | "soft-skills" | "compliance";
  issueDate?: string;
  expiryDate?: string;
  costAED?: number;
  certificateUrl?: string;
  notes?: string;
};

export type AssetAssignment = {
  id: string;
  employeeId: string;
  type: "laptop" | "phone" | "vehicle" | "software" | "tool" | "uniform" | "other";
  identifier: string;
  description: string;
  assignedDate: string;
  returnedDate?: string;
  condition?: "new" | "good" | "fair" | "damaged";
  estimatedValueAED?: number;
  notes?: string;
};

export type DisciplinaryRecord = {
  id: string;
  employeeId: string;
  date: string;
  type: "verbal-warning" | "written-warning" | "suspension" | "final-warning" | "termination";
  reason: string;
  detail?: string;
  issuedBy: string;
  acknowledgedByEmployee: boolean;
  attachedDocs?: string[];
};

export type PerformanceReview = {
  id: string;
  employeeId: string;
  period: string;
  reviewerId: string;
  date: string;
  scores: { dimension: string; score: number; max: number; comment?: string }[];
  overallRating: number;
  managerComments: string;
  employeeComments?: string;
  status: "draft" | "submitted" | "acknowledged";
};

export type OnboardingStepStatus = "pending" | "in-progress" | "complete" | "skipped";
export type OnboardingStep = {
  key: string;
  label: string;
  status: OnboardingStepStatus;
  completedAt?: string;
  note?: string;
};
export type OnboardingRecord = {
  id: string;
  employeeId: string;
  startedAt: string;
  expectedJoinDate: string;
  status: "in-progress" | "complete" | "abandoned";
  steps: OnboardingStep[];
};

export type IssuedLetter = {
  id: string;
  employeeId: string;
  type: "noc" | "salary-certificate" | "experience-letter" | "employment-contract" | "termination" | "warning";
  issueDate: string;
  issuedBy: string;
  reference: string;
  fileName?: string;
  recipient?: string;
  contentSnapshot?: string;
  requestStatus?: "submitted" | "approved" | "rejected" | "issued";
  requestedAt?: string;
  requestedBy?: string;
  requestNote?: string;
  approvedBy?: string;
  approvedAt?: string;
};

export type AuditLogEntry = {
  id: string;
  timestamp: string;
  actor: string;
  module: "hr" | "attendance" | "payroll" | "letters" | "training" | "assets" | "leave" | "disciplinary" | "performance" | "projects";
  action: "create" | "update" | "delete" | "approve" | "reject" | "issue" | "view" | "edit";
  subject: string;
  detail?: string;
};
