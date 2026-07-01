/**
 * Timeline shared utilities
 * - UAE working-day calendar (Mon–Fri, public holidays skipped)
 * - Variance categorization
 * - SPI / CPI / float-consumption calculators
 * - Shared TypeScript types for Pre- and Post-Contract timelines
 */

// =====================================================
// UAE PUBLIC HOLIDAYS (2025–2027 — editable by admin)
// =====================================================
// Dates approximate / per UAE Cabinet announcements; system loads from
// a backing store in production. Stored as YYYY-MM-DD strings.
export const UAE_HOLIDAYS_2025_2027: { date: string; name: string }[] = [
  { date: "2025-01-01", name: "New Year's Day" },
  { date: "2025-03-31", name: "Eid Al Fitr" },
  { date: "2025-04-01", name: "Eid Al Fitr Holiday" },
  { date: "2025-04-02", name: "Eid Al Fitr Holiday" },
  { date: "2025-06-05", name: "Arafat Day" },
  { date: "2025-06-06", name: "Eid Al Adha" },
  { date: "2025-06-07", name: "Eid Al Adha Holiday" },
  { date: "2025-06-08", name: "Eid Al Adha Holiday" },
  { date: "2025-06-26", name: "Islamic New Year" },
  { date: "2025-09-04", name: "Prophet's Birthday (Mawlid)" },
  { date: "2025-12-01", name: "Commemoration Day" },
  { date: "2025-12-02", name: "National Day" },
  { date: "2025-12-03", name: "National Day Holiday" },
  { date: "2026-01-01", name: "New Year's Day" },
  { date: "2026-03-20", name: "Eid Al Fitr" },
  { date: "2026-03-21", name: "Eid Al Fitr Holiday" },
  { date: "2026-03-22", name: "Eid Al Fitr Holiday" },
  { date: "2026-05-26", name: "Arafat Day" },
  { date: "2026-05-27", name: "Eid Al Adha" },
  { date: "2026-05-28", name: "Eid Al Adha Holiday" },
  { date: "2026-05-29", name: "Eid Al Adha Holiday" },
  { date: "2026-06-16", name: "Islamic New Year" },
  { date: "2026-08-25", name: "Prophet's Birthday (Mawlid)" },
  { date: "2026-12-01", name: "Commemoration Day" },
  { date: "2026-12-02", name: "National Day" },
  { date: "2026-12-03", name: "National Day Holiday" },
  { date: "2027-01-01", name: "New Year's Day" },
  { date: "2027-03-10", name: "Eid Al Fitr" },
  { date: "2027-03-11", name: "Eid Al Fitr Holiday" },
  { date: "2027-03-12", name: "Eid Al Fitr Holiday" },
  { date: "2027-05-16", name: "Arafat Day" },
  { date: "2027-05-17", name: "Eid Al Adha" },
  { date: "2027-05-18", name: "Eid Al Adha Holiday" },
  { date: "2027-05-19", name: "Eid Al Adha Holiday" },
  { date: "2027-06-06", name: "Islamic New Year" },
  { date: "2027-08-15", name: "Prophet's Birthday (Mawlid)" },
  { date: "2027-12-01", name: "Commemoration Day" },
  { date: "2027-12-02", name: "National Day" },
  { date: "2027-12-03", name: "National Day Holiday" },
];

const HOLIDAY_SET = new Set(UAE_HOLIDAYS_2025_2027.map((h) => h.date));

// =====================================================
// DATE HELPERS — pure, UTC-anchored to avoid TZ drift
// =====================================================
export function toISO(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function fromISO(iso: string): Date {
  // Treat as UTC midnight to avoid local-tz off-by-one
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

export function addCalendarDays(date: Date, n: number): Date {
  const out = new Date(date.getTime());
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

export function isWeekend(date: Date): boolean {
  // UAE working week: Mon–Fri (1–5). Saturday=6, Sunday=0.
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

export function isHoliday(date: Date, extra: string[] = []): boolean {
  const iso = toISO(date);
  return HOLIDAY_SET.has(iso) || extra.includes(iso);
}

export function isWorkingDay(date: Date, extraHolidays: string[] = []): boolean {
  return !isWeekend(date) && !isHoliday(date, extraHolidays);
}

/**
 * Add `workingDays` to `start` (skipping weekends + holidays).
 * Returns the date that is `workingDays` working days AFTER start.
 * Day 0 is the start date itself (if it's a working day).
 */
export function addWorkingDays(start: Date, workingDays: number, extraHolidays: string[] = []): Date {
  if (workingDays <= 0) return new Date(start.getTime());
  let cursor = new Date(start.getTime());
  let added = 0;
  // Advance one calendar day at a time and count working days
  while (added < workingDays) {
    cursor = addCalendarDays(cursor, 1);
    if (isWorkingDay(cursor, extraHolidays)) added++;
  }
  return cursor;
}

/**
 * Number of working days between start (inclusive) and end (inclusive).
 */
export function workingDaysBetween(start: Date, end: Date, extraHolidays: string[] = []): number {
  if (end.getTime() < start.getTime()) return 0;
  let cursor = new Date(start.getTime());
  let count = 0;
  while (cursor.getTime() <= end.getTime()) {
    if (isWorkingDay(cursor, extraHolidays)) count++;
    cursor = addCalendarDays(cursor, 1);
  }
  return count;
}

/**
 * Given a working-day-duration starting from `start` (inclusive of start when working),
 * compute the end date (last working day of the activity).
 */
export function endDateFromDuration(start: Date, durationWorkingDays: number, extraHolidays: string[] = []): Date {
  if (durationWorkingDays <= 0) return new Date(start.getTime());
  // Walk forward day-by-day; consume one working day each working day until satisfied.
  let cursor = new Date(start.getTime());
  let consumed = 0;
  // If start itself is a working day, it counts as day 1.
  if (isWorkingDay(cursor, extraHolidays)) consumed = 1;
  while (consumed < durationWorkingDays) {
    cursor = addCalendarDays(cursor, 1);
    if (isWorkingDay(cursor, extraHolidays)) consumed++;
  }
  return cursor;
}

/** Next working day on or after `date`. */
export function nextWorkingDay(date: Date, extraHolidays: string[] = []): Date {
  let cursor = new Date(date.getTime());
  while (!isWorkingDay(cursor, extraHolidays)) cursor = addCalendarDays(cursor, 1);
  return cursor;
}

// =====================================================
// PROJECT-TYPE MULTIPLIERS — Pre-Contract design defaults
// =====================================================
export type ProjectTypeKey =
  | "villa"
  | "tower"
  | "mixed-use"
  | "master-plan"
  | "fit-out"
  | "renovation"
  | "standard";

export const PROJECT_TYPE_MULTIPLIERS: Record<ProjectTypeKey, { label: string; multiplier: number; note: string }> = {
  villa: { label: "Villa", multiplier: 0.7, note: "Faster — small scale, fewer disciplines" },
  tower: { label: "High-rise Tower", multiplier: 1.5, note: "Slower — coordination, structural complexity, authority load" },
  "mixed-use": { label: "Mixed-Use / Hospitality", multiplier: 1.0, note: "Standard NASEC defaults" },
  "master-plan": { label: "Master Plan", multiplier: 1.8, note: "Significantly longer — multi-stakeholder, infrastructure scope" },
  "fit-out": { label: "Interior Fit-out", multiplier: 0.6, note: "Faster — shell-given, narrower scope" },
  renovation: { label: "Renovation / As-built", multiplier: 1.2, note: "Variable — discovery work and existing-condition surveys" },
  standard: { label: "Standard", multiplier: 1.0, note: "No multiplier" },
};

/**
 * Best-guess mapping from existing project.type strings (free-text in projectDatabase)
 * to a ProjectTypeKey. Falls back to "standard".
 */
export function guessProjectTypeKey(typeText: string): ProjectTypeKey {
  const t = (typeText || "").toLowerCase();
  if (t.includes("villa")) return "villa";
  if (t.includes("master")) return "master-plan";
  if (t.includes("fit") || t.includes("interior")) return "fit-out";
  if (t.includes("renovation") || t.includes("as-built")) return "renovation";
  if (t.includes("tower") || t.includes("high")) return "tower";
  if (t.includes("mixed") || t.includes("hospital")) return "mixed-use";
  return "standard";
}

// =====================================================
// PRE-CONTRACT STAGE LIBRARY (firm-wide defaults — editable by PM)
// =====================================================
export type StageKind = "stage" | "gate";

export type PreStageDefault = {
  code: string;
  name: string;
  kind: StageKind;
  defaultWorkingDays: number;
  fixed: boolean; // true for gates whose duration is contractually fixed
  note?: string;
};

export const PRE_CONTRACT_DEFAULTS: PreStageDefault[] = [
  { code: "S1", name: "Data Collection & Design Brief", kind: "stage", defaultWorkingDays: 15, fixed: false },
  { code: "G1", name: "Client Acceptance Gate", kind: "gate", defaultWorkingDays: 10, fixed: true, note: "Per Consultancy Agreement — 10 WD" },
  { code: "S2", name: "Concept Design", kind: "stage", defaultWorkingDays: 25, fixed: false },
  { code: "G2", name: "Client Approval Gate", kind: "gate", defaultWorkingDays: 20, fixed: true },
  { code: "S3", name: "Schematic Design + BODR", kind: "stage", defaultWorkingDays: 35, fixed: false },
  { code: "G3", name: "Client Approval Gate", kind: "gate", defaultWorkingDays: 20, fixed: true },
  { code: "S4", name: "Draft Detailed Design + Tender Documents", kind: "stage", defaultWorkingDays: 40, fixed: false },
  { code: "G4", name: "Client Approval Gate", kind: "gate", defaultWorkingDays: 20, fixed: true },
  { code: "S5", name: "Final Detailed Design + Tender Documents", kind: "stage", defaultWorkingDays: 20, fixed: false },
  { code: "G5", name: "Client Approval Gate", kind: "gate", defaultWorkingDays: 20, fixed: true },
  { code: "S6", name: "Prequalification of Contractors", kind: "stage", defaultWorkingDays: 20, fixed: false },
  { code: "S7", name: "Tender Services", kind: "stage", defaultWorkingDays: 40, fixed: false },
  { code: "S8", name: "Post-Contract & Supervision", kind: "stage", defaultWorkingDays: 0, fixed: false, note: "Driven by construction programme — Part B" },
];

// Authority parallel-track defaults (run alongside main timeline)
export type AuthorityDefault = {
  id: string;
  name: string;
  triggeredBy: string; // gate code
  runsParallelWith: string; // stage code
  defaultWorkingDays: number;
};

export const AUTHORITY_DEFAULTS: AuthorityDefault[] = [
  { id: "auth-prelim", name: "Authority Preliminary Design Approval", triggeredBy: "G2", runsParallelWith: "S3", defaultWorkingDays: 15 },
  { id: "auth-final", name: "NOCs + Final Building Permit", triggeredBy: "G4", runsParallelWith: "S5", defaultWorkingDays: 30 },
];

// =====================================================
// VARIANCE CATEGORIES
// =====================================================
export type VarianceCause =
  | "internal"
  | "client"
  | "authority"
  | "scope"
  | "force-majeure"
  | "positive";

export const VARIANCE_LABELS: Record<VarianceCause, { label: string; color: string; description: string }> = {
  internal: { label: "Internal delay", color: "bg-red-100 text-red-700 border-red-200", description: "Design team behind schedule — own cost" },
  client: { label: "Client delay", color: "bg-amber-100 text-amber-700 border-amber-200", description: "Late approvals at gates — recoverable / extension warranted" },
  authority: { label: "Authority delay", color: "bg-purple-100 text-purple-700 border-purple-200", description: "Slow NOC turnaround — force majeure-adjacent" },
  scope: { label: "Scope change", color: "bg-blue-100 text-blue-700 border-blue-200", description: "Variation orders adding work — commercial recovery" },
  "force-majeure": { label: "Force majeure", color: "bg-gray-100 text-gray-700 border-gray-200", description: "External uncontrollable events" },
  positive: { label: "Ahead of schedule", color: "bg-emerald-100 text-emerald-700 border-emerald-200", description: "Saved time — schedule recovery" },
};

// =====================================================
// COMPUTED PRE-CONTRACT TIMELINE TYPES
// =====================================================
export type StageStatus = "not-started" | "in-progress" | "complete" | "overdue";

export type ComputedStage = {
  code: string;
  name: string;
  kind: StageKind;
  fixed: boolean;
  durationWD: number;
  plannedStart: string; // ISO
  plannedEnd: string;
  baselineStart?: string;
  baselineEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  percentComplete: number;
  status: StageStatus;
  varianceCause?: VarianceCause;
  varianceNote?: string;
};

export type ComputedAuthority = {
  id: string;
  name: string;
  triggeredBy: string;
  runsParallelWith: string;
  durationWD: number;
  plannedStart: string;
  plannedEnd: string;
  status: "not-started" | "submitted" | "under-review" | "approved";
  baselineStart?: string;
  baselineEnd?: string;
  actualEnd?: string;
};

export type PreContractTimeline = {
  projectId: string;
  startDate: string; // ISO
  projectTypeKey: ProjectTypeKey;
  stages: ComputedStage[];
  authority: ComputedAuthority[];
  baselineSavedAt?: string;
  baselineRevision: number;
  rebaselineHistory: { savedAt: string; reason: string; revision: number }[];
};

// =====================================================
// PRE-CONTRACT COMPUTATION
// =====================================================
export type PreStageInput = PreStageDefault & {
  durationWD: number; // possibly overridden
  status?: StageStatus;
  percentComplete?: number;
  actualStart?: string;
  actualEnd?: string;
  varianceCause?: VarianceCause;
  varianceNote?: string;
  baselineStart?: string;
  baselineEnd?: string;
};

/**
 * Compute the planned start/end of every stage and gate, walking forward
 * from `startDate` and respecting actuals where present.
 *
 * Rule:
 *  - Each stage starts on the next working day after the prior item ends.
 *  - If an item has actualEnd, downstream items use actualEnd as predecessor.
 *  - If an item is in-progress / not-complete, its plannedEnd is endDateFromDuration.
 */
export function computePreContractTimeline(opts: {
  projectId: string;
  startDate: string;
  projectTypeKey: ProjectTypeKey;
  stages: PreStageInput[];
  authority: { id: string; durationWD: number; status?: ComputedAuthority["status"]; submittedDate?: string; approvedDate?: string }[];
  extraHolidays?: string[];
}): PreContractTimeline {
  const extra = opts.extraHolidays || [];
  const today = startOfDayUTC(new Date());

  let cursor = nextWorkingDay(fromISO(opts.startDate), extra);
  const out: ComputedStage[] = [];
  const stageEndByCode: Record<string, string> = {};
  const stageStartByCode: Record<string, string> = {};

  for (const s of opts.stages) {
    const plannedStart = toISO(cursor);
    const plannedEnd = s.durationWD > 0
      ? toISO(endDateFromDuration(cursor, s.durationWD, extra))
      : plannedStart;

    // Determine status
    let status: StageStatus = s.status || "not-started";
    if (status === "not-started" && s.actualEnd) status = "complete";
    if (status === "not-started" && s.actualStart && !s.actualEnd) status = "in-progress";
    if (status !== "complete" && fromISO(plannedEnd) < today && !s.actualEnd) {
      status = "overdue";
    }

    out.push({
      code: s.code,
      name: s.name,
      kind: s.kind,
      fixed: s.fixed,
      durationWD: s.durationWD,
      plannedStart,
      plannedEnd,
      baselineStart: s.baselineStart,
      baselineEnd: s.baselineEnd,
      actualStart: s.actualStart,
      actualEnd: s.actualEnd,
      percentComplete: typeof s.percentComplete === "number" ? s.percentComplete : status === "complete" ? 100 : status === "in-progress" ? 35 : 0,
      status,
      varianceCause: s.varianceCause,
      varianceNote: s.varianceNote,
    });

    stageStartByCode[s.code] = plannedStart;
    stageEndByCode[s.code] = s.actualEnd || plannedEnd;

    // Advance cursor: next stage starts the working day AFTER this item ends
    const baseEnd = s.actualEnd ? fromISO(s.actualEnd) : fromISO(plannedEnd);
    cursor = nextWorkingDay(addCalendarDays(baseEnd, 1), extra);
  }

  // Compute authority parallel rows
  const auth: ComputedAuthority[] = opts.authority.map((a) => {
    const def = AUTHORITY_DEFAULTS.find((d) => d.id === a.id);
    if (!def) {
      return {
        id: a.id, name: a.id, triggeredBy: "—", runsParallelWith: "—",
        durationWD: a.durationWD, plannedStart: opts.startDate, plannedEnd: opts.startDate,
        status: a.status || "not-started",
      };
    }
    // Authority track triggers off the gate END date
    const triggerEnd = stageEndByCode[def.triggeredBy] || opts.startDate;
    const start = nextWorkingDay(addCalendarDays(fromISO(triggerEnd), 1), extra);
    const end = endDateFromDuration(start, a.durationWD, extra);
    return {
      id: def.id,
      name: def.name,
      triggeredBy: def.triggeredBy,
      runsParallelWith: def.runsParallelWith,
      durationWD: a.durationWD,
      plannedStart: toISO(start),
      plannedEnd: a.approvedDate || toISO(end),
      status: a.status || "not-started",
      actualEnd: a.approvedDate,
    };
  });

  return {
    projectId: opts.projectId,
    startDate: opts.startDate,
    projectTypeKey: opts.projectTypeKey,
    stages: out,
    authority: auth,
    baselineRevision: 0,
    rebaselineHistory: [],
  };
}

export function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// =====================================================
// POST-CONTRACT TYPES — contractor baseline programme
// =====================================================
export type WBSNode = {
  id: string;
  parentId?: string;
  level: number; // 0 = project root
  code: string; // e.g. "1.2.3"
  name: string;
};

export type ProgrammeActivity = {
  id: string; // Activity ID, e.g. "MH-A1010"
  wbsId: string; // points to WBSNode.id
  name: string;
  baselineStart: string; // ISO
  baselineFinish: string;
  duration: number; // working days
  predecessors: string[]; // activity IDs (FS by default for demo)
  resource?: string;
  isMilestone?: boolean;
  isCritical?: boolean;
  totalFloat: number; // working days
  budgetCost?: number; // AED
  // Progress-overlay fields (filled from weekly updates)
  actualStart?: string;
  actualFinish?: string;
  percentComplete?: number;
  remainingDuration?: number;
  forecastFinish?: string;
  earnedValue?: number;
  actualCost?: number;
};

export type ProgrammeRevision = {
  revision: number; // 0 = baseline, 1, 2 …
  label: string; // "Rev 0 — Baseline", "Rev 1 — Post-EOT-1"
  issuedBy: string;
  issuedByPerson?: string;
  issueDate: string;
  effectiveDate?: string;
  status: "submitted" | "under-review" | "approved" | "rejected";
  reviewedBy?: string[];
  approvedBy?: string;
  fileFormat: "P6 XER" | "MS Project" | "Excel" | "PDF";
  fileName: string;
  changeNote?: string;
  isActive: boolean;
};

export type WBSMapping = {
  wbsId: string;
  subStageIndex: number; // index into postContractStages
  confirmed: boolean;
};

export type PostContractTimeline = {
  projectId: string;
  contractStart: string;
  contractFinish: string;
  revisions: ProgrammeRevision[];
  activeRevision: number;
  wbs: WBSNode[];
  activities: ProgrammeActivity[];
  mappings: WBSMapping[];
  weeklyUpdates: WeeklyUpdate[];
};

export type WeeklyUpdate = {
  id: string;
  weekEnding: string;
  submittedBy: string;
  submittedDate: string;
  status: "submitted" | "under-review" | "approved" | "rejected";
  spi: number;
  cpi?: number;
  criticalSlippageDays: number;
  note?: string;
  activitiesUpdated: number;
};

// =====================================================
// SPI / CPI / FLOAT CALCULATORS
// =====================================================

/**
 * SPI = Earned Value / Planned Value.
 * For schedule-only (no $ loaded), we approximate with %-complete weighted by duration:
 *    EV ≈ Σ (duration × actual %)
 *    PV ≈ Σ (duration × planned %)  where planned % is computed against today.
 */
export function computeSPI(activities: ProgrammeActivity[], asOf = new Date()): number {
  const today = startOfDayUTC(asOf);
  let ev = 0;
  let pv = 0;
  for (const a of activities) {
    const start = fromISO(a.baselineStart);
    const finish = fromISO(a.baselineFinish);
    const totalSpan = Math.max(1, (finish.getTime() - start.getTime()) / 86_400_000);
    let plannedPct = 0;
    if (today.getTime() <= start.getTime()) plannedPct = 0;
    else if (today.getTime() >= finish.getTime()) plannedPct = 1;
    else plannedPct = (today.getTime() - start.getTime()) / 86_400_000 / totalSpan;
    const actualPct = (a.percentComplete || 0) / 100;
    ev += a.duration * actualPct;
    pv += a.duration * plannedPct;
  }
  if (pv <= 0) return 1.0;
  return Number((ev / pv).toFixed(2));
}

export function computeCPI(activities: ProgrammeActivity[]): number | null {
  let ev = 0;
  let ac = 0;
  let any = false;
  for (const a of activities) {
    if (typeof a.budgetCost === "number" && typeof a.actualCost === "number") {
      any = true;
      const pct = (a.percentComplete || 0) / 100;
      ev += a.budgetCost * pct;
      ac += a.actualCost;
    }
  }
  if (!any || ac <= 0) return null;
  return Number((ev / ac).toFixed(2));
}

export function computeCriticalSlippage(activities: ProgrammeActivity[], asOf = new Date()): number {
  const today = startOfDayUTC(asOf);
  let maxSlip = 0;
  for (const a of activities.filter((x) => x.isCritical)) {
    const planned = fromISO(a.baselineFinish);
    if (a.actualFinish) {
      const actual = fromISO(a.actualFinish);
      const slipDays = Math.round((actual.getTime() - planned.getTime()) / 86_400_000);
      if (slipDays > maxSlip) maxSlip = slipDays;
    } else if ((a.percentComplete || 0) < 100 && today.getTime() > planned.getTime()) {
      const slipDays = Math.round((today.getTime() - planned.getTime()) / 86_400_000);
      if (slipDays > maxSlip) maxSlip = slipDays;
    }
  }
  return maxSlip;
}

// =====================================================
// CRITICAL PATH — simple longest-path solver via predecessors (FS only)
// =====================================================
export function markCriticalPath(activities: ProgrammeActivity[]): ProgrammeActivity[] {
  // Topological order
  const byId = new Map(activities.map((a) => [a.id, a]));
  const inDeg = new Map<string, number>(activities.map((a) => [a.id, 0]));
  for (const a of activities) {
    for (const p of a.predecessors) {
      if (byId.has(p)) inDeg.set(a.id, (inDeg.get(a.id) || 0) + 1);
    }
  }
  const queue: string[] = [];
  inDeg.forEach((v, k) => { if (v === 0) queue.push(k); });
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const a of activities) {
      if (a.predecessors.includes(id)) {
        inDeg.set(a.id, (inDeg.get(a.id) || 0) - 1);
        if ((inDeg.get(a.id) || 0) === 0) queue.push(a.id);
      }
    }
  }

  // Forward pass: earliest finish in days from baseline
  const earliestFinish = new Map<string, number>();
  for (const id of order) {
    const a = byId.get(id)!;
    const predFinishes = a.predecessors.map((p) => earliestFinish.get(p) || 0);
    const start = predFinishes.length ? Math.max(...predFinishes) : 0;
    earliestFinish.set(id, start + a.duration);
  }
  // Project finish = max
  const finishMax = Math.max(0, ...Array.from(earliestFinish.values()));

  // Backward pass: latest finish
  const latestFinish = new Map<string, number>();
  const reverseOrder = [...order].reverse();
  for (const id of reverseOrder) {
    const a = byId.get(id)!;
    const successors = activities.filter((x) => x.predecessors.includes(id));
    if (successors.length === 0) {
      latestFinish.set(id, finishMax);
    } else {
      const latestStartOfSucc = successors.map((s) => (latestFinish.get(s.id) || finishMax) - s.duration);
      latestFinish.set(id, Math.min(...latestStartOfSucc));
    }
  }

  // Float = LF - EF; critical iff float ≤ 0
  return activities.map((a) => {
    const ef = earliestFinish.get(a.id) || 0;
    const lf = latestFinish.get(a.id) || ef;
    const tf = lf - ef;
    return { ...a, totalFloat: Math.max(0, tf), isCritical: tf <= 0 };
  });
}
