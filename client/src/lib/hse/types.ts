/**
 * HSE — UAE OSHAD / ISO 45001 aligned.
 */
export type IncidentSeverity = "near-miss" | "first-aid" | "medical-treatment" | "lost-time" | "major" | "fatality";
export const SEVERITY_COLOR: Record<IncidentSeverity, string> = {
  "near-miss": "bg-blue-100 text-blue-700",
  "first-aid": "bg-emerald-100 text-emerald-700",
  "medical-treatment": "bg-amber-100 text-amber-700",
  "lost-time": "bg-orange-100 text-orange-700",
  "major": "bg-red-100 text-red-700",
  "fatality": "bg-red-200 text-red-900",
};

export type Incident = {
  id: string;
  reference: string;                 // "INC-2026-0042"
  projectId?: string;
  date: string;
  time?: string;
  location: string;
  severity: IncidentSeverity;
  involvedPersons?: string;
  injuredEmployeeId?: string;
  injuredDescription?: string;
  bodyPart?: string;
  natureOfInjury?: string;
  immediateAction: string;
  rootCauseAnalysis?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  reportedToDM?: boolean;            // DM Site Safety section
  reportedToDCD?: boolean;
  reportedToMOHRE?: boolean;
  investigatorDisplay?: string;
  status: "open" | "under-investigation" | "actions-pending" | "closed";
  closedAt?: string;
  attachmentUrls?: string[];
  createdAt: string;
  updatedAt: string;
};

export type ToolboxTalk = {
  id: string;
  reference: string;
  projectId?: string;
  date: string;
  duration: number;                  // minutes
  topic: string;
  presenter: string;
  attendeesCount: number;
  attendeeEmployeeIds?: string[];
  keyPoints: string;
  signatureSheetUrl?: string;
  createdAt: string;
};

export type SafetyInspection = {
  id: string;
  reference: string;
  projectId?: string;
  date: string;
  inspectorDisplay: string;
  location: string;
  totalFindings: number;
  criticalFindings: number;
  rectifiedCount: number;
  pendingCount: number;
  score?: number;                    // 0-100
  reportUrl?: string;
  status: "draft" | "issued" | "under-rectification" | "closed";
  createdAt: string;
  updatedAt: string;
};

export type PPEKind =
  | "hard-hat" | "safety-shoes" | "high-vis-vest" | "safety-goggles"
  | "gloves" | "ear-protection" | "respirator" | "harness" | "coverall" | "other";

export type PPEIssuance = {
  id: string;
  employeeId: string;
  ppeKind: PPEKind;
  issuedDate: string;
  size?: string;
  serialNo?: string;
  expiryDate?: string;
  returnedDate?: string;
  notes?: string;
};
