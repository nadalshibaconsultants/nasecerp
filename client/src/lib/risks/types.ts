/**
 * Risk Management — types aligned with ISO 31000:2018 and Dubai AEC practice.
 *
 * Dubai-relevant authorities & frameworks referenced:
 *  - Dubai Municipality (DM), Trakhees, Dubai Development Authority (DDA)
 *  - Civil Defense (DCD), DEWA, RTA, du/Etisalat, Empower/Tabreed, DLD, RERA
 *  - UAE Federal Authority for Building Standards
 *  - FIDIC contract suite (Red/Yellow/Silver Books)
 *  - RIBA Plan of Work / NASEC pre-contract & post-contract gates
 *  - LEED / Estidama / Dubai Green Building Regulations
 *  - ISO 31000 (risk management), ISO 45001 (HSE), ISO 19650 (BIM)
 */

export type RiskCategory =
  | "design"            // calculation, coordination, BIM clash, code compliance
  | "technical"         // construction methodology, materials, technology
  | "authority"         // DM/DCD/DEWA/Trakhees/DDA NOC & permit risk
  | "regulatory"        // building code, RERA, DLD, Federal law changes
  | "commercial"        // fees, payment, scope creep, currency, market
  | "contractual"       // FIDIC clauses, VOs, EOT, disputes, claims
  | "financial"         // budget overrun, cashflow, exchange rate, surety
  | "schedule"          // programme slip, dependencies, long-lead items
  | "hse"               // health, safety, public safety
  | "environmental"     // climate, sand/dust, marine, contamination
  | "sustainability"    // LEED/Estidama compliance, energy targets
  | "geotechnical"      // soil, groundwater, existing utilities
  | "stakeholder"       // client, neighbour, community, end-user
  | "third-party"       // subcontractor, vendor, supplier capacity
  | "resource"          // key staff loss, contractor capacity, equipment
  | "quality"           // QA/QC failures, rework, defects liability
  | "ip-data"           // IP, data protection, cybersecurity
  | "force-majeure"     // pandemic, war, civil unrest, extreme weather
  | "reputational";     // brand, social media, regulatory exposure

export const RISK_CATEGORY_LABEL: Record<RiskCategory, string> = {
  design: "Design",
  technical: "Technical",
  authority: "Authority / Permits",
  regulatory: "Regulatory / Legal",
  commercial: "Commercial",
  contractual: "Contractual",
  financial: "Financial",
  schedule: "Schedule",
  hse: "Health & Safety",
  environmental: "Environmental",
  sustainability: "Sustainability",
  geotechnical: "Geotechnical / Site",
  stakeholder: "Stakeholder",
  "third-party": "Third Party / Vendor",
  resource: "Resource / HR",
  quality: "Quality",
  "ip-data": "IP / Data / Cyber",
  "force-majeure": "Force Majeure",
  reputational: "Reputational",
};

// ISO 31000 / Dubai DM use 5x5 matrix
export type RiskLevel = 1 | 2 | 3 | 4 | 5;
export const PROB_LABELS: Record<RiskLevel, string> = {
  1: "Rare (≤5%)",
  2: "Unlikely (6–25%)",
  3: "Possible (26–50%)",
  4: "Likely (51–75%)",
  5: "Almost Certain (>75%)",
};
export const IMPACT_LABELS: Record<RiskLevel, string> = {
  1: "Insignificant",
  2: "Minor",
  3: "Moderate",
  4: "Major",
  5: "Catastrophic",
};

// Risk treatment strategy (ISO 31000)
export type RiskTreatment = "avoid" | "transfer" | "mitigate" | "accept";
export const TREATMENT_LABELS: Record<RiskTreatment, string> = {
  avoid: "Avoid",
  transfer: "Transfer",
  mitigate: "Mitigate (Reduce)",
  accept: "Accept (Tolerate)",
};

// Workflow status
export type RiskStatus =
  | "identified"   // logged but not yet assessed
  | "assessed"     // probability & impact scored
  | "treated"      // mitigation plan in place
  | "monitoring"   // active monitoring
  | "escalated"    // requires director / client involvement
  | "closed"       // closed out
  | "realised";    // risk became an issue

export const STATUS_LABELS: Record<RiskStatus, string> = {
  identified: "Identified",
  assessed: "Assessed",
  treated: "Treated",
  monitoring: "Monitoring",
  escalated: "Escalated",
  closed: "Closed",
  realised: "Realised (became Issue)",
};

// Project stage at which the risk is most relevant
export type RiskPhase = "pre-contract" | "post-contract" | "both";

export type MitigationAction = {
  id: string;
  description: string;
  ownerUserId?: string;
  ownerDisplay?: string;
  dueDate?: string;
  completedAt?: string;
  status: "open" | "in-progress" | "done" | "blocked";
  evidenceFileUrl?: string;
  evidenceFileName?: string;
  costAED?: number;          // budgeted cost of action
  notes?: string;
};

export type RiskReview = {
  id: string;
  reviewedAt: string;
  reviewedBy: string;
  prevStatus: RiskStatus;
  newStatus: RiskStatus;
  prevScore: number;          // residual score before review
  newScore: number;
  note?: string;
};

export type ProjectRisk = {
  id: string;
  projectId: string;
  code: string;               // e.g. RSK-AWT-001
  title: string;
  description: string;

  category: RiskCategory;
  phase: RiskPhase;
  stageRef?: string;          // optional NASEC stage (e.g. "S3", "G4")
  authorityRef?: string;      // e.g. "Dubai Municipality", "DCD"

  // Inherent risk = before treatment
  inherentProbability: RiskLevel;
  inherentImpact: RiskLevel;

  // Residual risk = after treatment (set when treatment is in place)
  residualProbability?: RiskLevel;
  residualImpact?: RiskLevel;

  treatment: RiskTreatment;
  treatmentRationale?: string;

  // Cost / impact estimates
  costImpactAED?: number;     // potential cost impact if realised
  scheduleImpactDays?: number;

  // Ownership & accountability
  ownerUserId?: string;
  ownerDisplay?: string;
  raisedByUserId?: string;
  raisedByDisplay?: string;
  raisedAt: string;

  // Trigger conditions & KRIs (Key Risk Indicators)
  triggerConditions?: string;
  earlyWarningSigns?: string;
  contingencyPlan?: string;

  // Linked items
  linkedTaskIds?: string[];
  linkedDocumentIds?: string[];
  linkedSubmittalIds?: string[];

  // Workflow
  status: RiskStatus;
  reviewFrequency: "weekly" | "fortnightly" | "monthly" | "stage-gate" | "ad-hoc";
  nextReviewDate?: string;
  lastReviewedAt?: string;

  // Sub-records
  actions: MitigationAction[];
  reviews: RiskReview[];

  closedAt?: string;
  closureReason?: string;
  lessonsLearned?: string;

  createdAt: string;
  updatedAt: string;
};

// ---- Helpers
export function inherentScore(r: Pick<ProjectRisk, "inherentProbability" | "inherentImpact">): number {
  return r.inherentProbability * r.inherentImpact;
}

export function residualScore(r: Pick<ProjectRisk, "inherentProbability" | "inherentImpact" | "residualProbability" | "residualImpact">): number {
  const p = r.residualProbability ?? r.inherentProbability;
  const i = r.residualImpact ?? r.inherentImpact;
  return p * i;
}

// Heat-map zones (Dubai DM 5x5)
export type RiskZone = "low" | "moderate" | "high" | "extreme";
export function riskZone(score: number): RiskZone {
  if (score >= 15) return "extreme";   // 15, 16, 20, 25
  if (score >= 8) return "high";       // 8, 9, 10, 12
  if (score >= 4) return "moderate";   // 4, 5, 6
  return "low";                          // 1, 2, 3
}

export function riskZoneColor(z: RiskZone): string {
  return ({
    low: "bg-emerald-100 text-emerald-700 border-emerald-200",
    moderate: "bg-amber-100 text-amber-700 border-amber-200",
    high: "bg-orange-100 text-orange-700 border-orange-300",
    extreme: "bg-red-200 text-red-800 border-red-400",
  } as const)[z];
}

// Escalation threshold per Dubai AEC practice — extreme risks go to Director
export function escalationLevel(z: RiskZone): "team" | "pm" | "director" | "client-board" {
  switch (z) {
    case "low": return "team";
    case "moderate": return "pm";
    case "high": return "director";
    case "extreme": return "client-board";
  }
}
