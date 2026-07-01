/**
 * Lessons Learnt Design Checklist
 *
 * A company-wide checklist that every Lead Architect must verify on a
 * pre-contract project before the gate at the end of Schematic Design
 * (G3 Client Approval after S3). The Project Manager then verifies the
 * Lead's responses.
 *
 *  - Items live in a single global store (lessonItemsStore) — every project
 *    sees the same list.
 *  - Responses live in per-project records (lessonResponsesStore).
 *  - PM and Lead Architect can ADD new items at any time (auto-appears in
 *    every project); items cannot be deleted, only deactivated by Director.
 *  - The G3 gate is blocked until every active item has a response and the
 *    PM has verified them.
 */
export type LessonDiscipline =
  | "arch" | "str" | "mep-plumbing" | "electrical" | "general"
  | "facade" | "sustainability" | "bim" | "authority" | "commercial" | "hse";

export const DISCIPLINE_LABELS: Record<LessonDiscipline, string> = {
  arch: "Architecture",
  str: "Structural",
  "mep-plumbing": "Mechanical / Plumbing",
  electrical: "Electrical",
  general: "General / Coordination",
  facade: "Façade & Envelope",
  sustainability: "Sustainability (LEED / Estidama)",
  bim: "BIM & Coordination",
  authority: "Authority & Permits (DM, DCD, DEWA)",
  commercial: "Commercial & Cost",
  hse: "HSE / Safety",
};

export const DISCIPLINE_ORDER: LessonDiscipline[] = [
  "arch", "str", "mep-plumbing", "electrical", "facade",
  "bim", "sustainability", "authority", "commercial", "hse", "general",
];

export type LessonItem = {
  id: string;
  discipline: LessonDiscipline;
  itemNumber?: number;            // legacy numbering from the checklist
  text: string;
  problemSource?: string;         // e.g. "M.Wolf", "Al Satwa"
  recommendedAction?: string;
  isActive: boolean;              // deactivated items hide but never delete
  isCore: boolean;                // seeded from the original checklist
  addedByUserId?: string;
  addedByDisplay?: string;
  addedAt: string;
  deactivatedByUserId?: string;
  deactivatedAt?: string;
  notes?: string;
};

export type LessonResponseStatus = "pending" | "complied" | "not-complied" | "not-applicable";

export const STATUS_LABELS: Record<LessonResponseStatus, string> = {
  pending: "Pending",
  complied: "Complied",
  "not-complied": "Not Complied",
  "not-applicable": "Not Applicable",
};

export const STATUS_COLOR: Record<LessonResponseStatus, string> = {
  pending: "bg-slate-100 text-slate-700 border-slate-300",
  complied: "bg-emerald-100 text-emerald-700 border-emerald-300",
  "not-complied": "bg-red-100 text-red-700 border-red-300",
  "not-applicable": "bg-blue-100 text-blue-700 border-blue-300",
};

export type LessonResponse = {
  id: string;
  projectId: string;
  lessonItemId: string;
  status: LessonResponseStatus;
  evidenceNote?: string;
  evidenceFileUrl?: string;
  evidenceFileName?: string;
  respondedByUserId?: string;
  respondedByDisplay?: string;
  respondedAt?: string;
  // PM verification step
  pmVerified: boolean;
  pmVerifiedByUserId?: string;
  pmVerifiedByDisplay?: string;
  pmVerifiedAt?: string;
  pmNote?: string;
  // Director override (only if PM rejects but director approves)
  directorOverride?: boolean;
  directorOverrideBy?: string;
  directorOverrideAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type GateReadiness = {
  totalActiveItems: number;
  responded: number;
  pendingResponses: number;
  pmVerified: number;
  pendingPmVerification: number;
  complied: number;
  notComplied: number;
  notApplicable: number;
  ready: boolean;          // true only when ALL items responded AND PM verified
  blockReasons: string[];
};

export function computeReadiness(
  items: LessonItem[],
  responses: LessonResponse[]
): GateReadiness {
  const active = items.filter((i) => i.isActive);
  const byItem = new Map(responses.map((r) => [r.lessonItemId, r]));
  let responded = 0, pmVerified = 0, complied = 0, notComplied = 0, notApplicable = 0;
  for (const it of active) {
    const r = byItem.get(it.id);
    if (r && r.status !== "pending") {
      responded++;
      if (r.pmVerified || r.directorOverride) pmVerified++;
      if (r.status === "complied") complied++;
      if (r.status === "not-complied") notComplied++;
      if (r.status === "not-applicable") notApplicable++;
    }
  }
  const pendingResponses = active.length - responded;
  const pendingPmVerification = responded - pmVerified;
  const blockReasons: string[] = [];
  if (pendingResponses > 0) blockReasons.push(`${pendingResponses} item(s) awaiting Lead Architect response`);
  if (pendingPmVerification > 0) blockReasons.push(`${pendingPmVerification} item(s) awaiting PM verification`);
  if (notComplied > 0) blockReasons.push(`${notComplied} item(s) marked Not Complied — must be resolved or director-overridden`);
  return {
    totalActiveItems: active.length,
    responded, pendingResponses, pmVerified, pendingPmVerification,
    complied, notComplied, notApplicable,
    ready: blockReasons.length === 0 && active.length > 0,
    blockReasons,
  };
}
