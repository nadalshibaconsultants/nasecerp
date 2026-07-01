/**
 * Demo contractor baseline programme for Marina Heights Tower (post-contract).
 * 80 activities across an 18-month construction window, with 4 weeks of
 * overlaid progress already applied (some on-track, some slipping).
 *
 * In production this would be parsed from the contractor's P6 XER / MSP / Excel.
 * Here we hand-author it to demonstrate the full Timeline UX.
 */
import type { WBSNode, ProgrammeActivity, ProgrammeRevision, WeeklyUpdate } from "@/lib/timeline-utils";
import { addWorkingDays, fromISO, toISO } from "@/lib/timeline-utils";

const CONTRACT_START = "2025-11-15";

// =====================================================
// WBS HIERARCHY — 4 levels
// =====================================================
export const marinaWBS: WBSNode[] = [
  { id: "wbs-root", level: 0, code: "1", name: "Marina Heights Tower" },

  { id: "wbs-mob", parentId: "wbs-root", level: 1, code: "1.1", name: "Mobilization & Pre-Construction" },
  { id: "wbs-sub", parentId: "wbs-root", level: 1, code: "1.2", name: "Substructure" },
  { id: "wbs-sup", parentId: "wbs-root", level: 1, code: "1.3", name: "Superstructure" },
  { id: "wbs-fac", parentId: "wbs-root", level: 1, code: "1.4", name: "Façade" },
  { id: "wbs-mep1", parentId: "wbs-root", level: 1, code: "1.5", name: "MEP First Fix" },
  { id: "wbs-fin", parentId: "wbs-root", level: 1, code: "1.6", name: "Internal Finishes" },
  { id: "wbs-mep2", parentId: "wbs-root", level: 1, code: "1.7", name: "MEP Final Fix & Testing" },
  { id: "wbs-auth", parentId: "wbs-root", level: 1, code: "1.8", name: "Authority Inspections" },
  { id: "wbs-snag", parentId: "wbs-root", level: 1, code: "1.9", name: "Snagging & Handover" },

  // Level-2 sub-groups
  { id: "wbs-sub-pile", parentId: "wbs-sub", level: 2, code: "1.2.1", name: "Piling & Excavation" },
  { id: "wbs-sub-raft", parentId: "wbs-sub", level: 2, code: "1.2.2", name: "Raft & Basement" },
  { id: "wbs-sup-core", parentId: "wbs-sup", level: 2, code: "1.3.1", name: "Core & Shear Walls" },
  { id: "wbs-sup-floors", parentId: "wbs-sup", level: 2, code: "1.3.2", name: "Floor Plates" },
];

// =====================================================
// HELPERS
// =====================================================
function shift(startISO: string, workingDaysOffset: number): string {
  return toISO(addWorkingDays(fromISO(startISO), workingDaysOffset));
}
function span(startISO: string, durationWD: number): { baselineStart: string; baselineFinish: string } {
  const start = fromISO(startISO);
  const finish = addWorkingDays(start, Math.max(0, durationWD - 1));
  return { baselineStart: toISO(start), baselineFinish: toISO(finish) };
}

// =====================================================
// 80-ACTIVITY BASELINE
// =====================================================
type Seed = Omit<ProgrammeActivity, "totalFloat" | "isCritical">;
const a: Seed[] = [];

// --- 1.1 Mobilization (5 activities)
a.push({ id: "MH-1010", wbsId: "wbs-mob", name: "Site Set-up & Hoarding", ...span(CONTRACT_START, 12), duration: 12, predecessors: [], resource: "Civils Crew A" });
a.push({ id: "MH-1020", wbsId: "wbs-mob", name: "Insurance & Bonds Submission", ...span(CONTRACT_START, 5), duration: 5, predecessors: [], resource: "Contracts" });
a.push({ id: "MH-1030", wbsId: "wbs-mob", name: "Baseline Programme Submission & Approval", ...span(CONTRACT_START, 20), duration: 20, predecessors: ["MH-1020"], resource: "Planner" });
a.push({ id: "MH-1040", wbsId: "wbs-mob", name: "QA/QC & HSE Plan Approval", ...span(CONTRACT_START, 15), duration: 15, predecessors: ["MH-1020"], resource: "QA/QC" });
a.push({ id: "MH-1050", wbsId: "wbs-mob", name: "Mobilization Milestone", ...span(shift(CONTRACT_START, 20), 1), duration: 1, predecessors: ["MH-1030", "MH-1040"], isMilestone: true });

// --- 1.2.1 Piling & Excavation (8 activities)
a.push({ id: "MH-2010", wbsId: "wbs-sub-pile", name: "Site Survey & Setting Out", ...span(shift(CONTRACT_START, 10), 5), duration: 5, predecessors: ["MH-1010"] });
a.push({ id: "MH-2020", wbsId: "wbs-sub-pile", name: "Bulk Excavation", ...span(shift(CONTRACT_START, 18), 25), duration: 25, predecessors: ["MH-2010", "MH-1050"], resource: "Earthworks" });
a.push({ id: "MH-2030", wbsId: "wbs-sub-pile", name: "Shoring & Dewatering", ...span(shift(CONTRACT_START, 25), 30), duration: 30, predecessors: ["MH-2020"], resource: "Specialist" });
a.push({ id: "MH-2040", wbsId: "wbs-sub-pile", name: "Test Piles & Load Testing", ...span(shift(CONTRACT_START, 22), 12), duration: 12, predecessors: ["MH-2010"] });
a.push({ id: "MH-2050", wbsId: "wbs-sub-pile", name: "Working Piles — Group A", ...span(shift(CONTRACT_START, 35), 30), duration: 30, predecessors: ["MH-2040"], resource: "Piling Rig 1" });
a.push({ id: "MH-2060", wbsId: "wbs-sub-pile", name: "Working Piles — Group B", ...span(shift(CONTRACT_START, 40), 28), duration: 28, predecessors: ["MH-2040"], resource: "Piling Rig 2" });
a.push({ id: "MH-2070", wbsId: "wbs-sub-pile", name: "Pile Cap Excavation & PCC", ...span(shift(CONTRACT_START, 65), 18), duration: 18, predecessors: ["MH-2050", "MH-2060"] });
a.push({ id: "MH-2080", wbsId: "wbs-sub-pile", name: "Substructure Waterproofing", ...span(shift(CONTRACT_START, 80), 15), duration: 15, predecessors: ["MH-2070"] });

// --- 1.2.2 Raft & Basement (6 activities)
a.push({ id: "MH-3010", wbsId: "wbs-sub-raft", name: "Raft Reinforcement", ...span(shift(CONTRACT_START, 88), 20), duration: 20, predecessors: ["MH-2080"], resource: "Steel Fixers" });
a.push({ id: "MH-3020", wbsId: "wbs-sub-raft", name: "Raft Concrete Pour", ...span(shift(CONTRACT_START, 105), 8), duration: 8, predecessors: ["MH-3010"], resource: "Concrete Crew" });
a.push({ id: "MH-3030", wbsId: "wbs-sub-raft", name: "Basement B2 Walls & Slab", ...span(shift(CONTRACT_START, 115), 22), duration: 22, predecessors: ["MH-3020"] });
a.push({ id: "MH-3040", wbsId: "wbs-sub-raft", name: "Basement B1 Walls & Slab", ...span(shift(CONTRACT_START, 135), 22), duration: 22, predecessors: ["MH-3030"] });
a.push({ id: "MH-3050", wbsId: "wbs-sub-raft", name: "Substructure MEP Embeds", ...span(shift(CONTRACT_START, 120), 30), duration: 30, predecessors: ["MH-3030"] });
a.push({ id: "MH-3060", wbsId: "wbs-sub-raft", name: "Substructure Completion Milestone", ...span(shift(CONTRACT_START, 158), 1), duration: 1, predecessors: ["MH-3040", "MH-3050"], isMilestone: true });

// --- 1.3.1 Core & Shear Walls (10 activities)
a.push({ id: "MH-4010", wbsId: "wbs-sup-core", name: "Core Wall Setting Out", ...span(shift(CONTRACT_START, 158), 5), duration: 5, predecessors: ["MH-3060"] });
for (let i = 1; i <= 9; i++) {
  const offset = 163 + (i - 1) * 12;
  a.push({
    id: `MH-41${(i * 10).toString().padStart(2, "0")}`,
    wbsId: "wbs-sup-core",
    name: `Core Wall — Lift ${i} (Levels ${(i - 1) * 5 + 1}–${i * 5})`,
    ...span(shift(CONTRACT_START, offset), 12),
    duration: 12,
    predecessors: i === 1 ? ["MH-4010"] : [`MH-41${((i - 1) * 10).toString().padStart(2, "0")}`],
    resource: "Climbing Formwork",
  });
}

// --- 1.3.2 Floor Plates (12 activities — odd & even floors interleaved)
for (let i = 1; i <= 12; i++) {
  const startOffset = 175 + (i - 1) * 9;
  a.push({
    id: `MH-42${(i * 10).toString().padStart(2, "0")}`,
    wbsId: "wbs-sup-floors",
    name: `Floor Plate — Levels ${(i - 1) * 4 + 1}–${i * 4}`,
    ...span(shift(CONTRACT_START, startOffset), 14),
    duration: 14,
    predecessors: i === 1 ? ["MH-4110"] : [`MH-42${((i - 1) * 10).toString().padStart(2, "0")}`],
    resource: i % 2 === 0 ? "Concrete Crew B" : "Concrete Crew A",
  });
}

// --- 1.4 Façade (8 activities)
a.push({ id: "MH-5010", wbsId: "wbs-fac", name: "Façade Mock-up & Approval", ...span(shift(CONTRACT_START, 200), 30), duration: 30, predecessors: ["MH-4220"], resource: "Façade Sub" });
a.push({ id: "MH-5020", wbsId: "wbs-fac", name: "Unitized Curtain Wall — Levels 1–10", ...span(shift(CONTRACT_START, 235), 35), duration: 35, predecessors: ["MH-5010"] });
a.push({ id: "MH-5030", wbsId: "wbs-fac", name: "Unitized Curtain Wall — Levels 11–20", ...span(shift(CONTRACT_START, 260), 35), duration: 35, predecessors: ["MH-5020"] });
a.push({ id: "MH-5040", wbsId: "wbs-fac", name: "Unitized Curtain Wall — Levels 21–30", ...span(shift(CONTRACT_START, 285), 35), duration: 35, predecessors: ["MH-5030"] });
a.push({ id: "MH-5050", wbsId: "wbs-fac", name: "Unitized Curtain Wall — Levels 31–45", ...span(shift(CONTRACT_START, 310), 38), duration: 38, predecessors: ["MH-5040"] });
a.push({ id: "MH-5060", wbsId: "wbs-fac", name: "Stone Cladding — Podium", ...span(shift(CONTRACT_START, 250), 40), duration: 40, predecessors: ["MH-5010"] });
a.push({ id: "MH-5070", wbsId: "wbs-fac", name: "Skylight & Atrium Glazing", ...span(shift(CONTRACT_START, 320), 25), duration: 25, predecessors: ["MH-5050"] });
a.push({ id: "MH-5080", wbsId: "wbs-fac", name: "Façade Watertightness Test", ...span(shift(CONTRACT_START, 355), 10), duration: 10, predecessors: ["MH-5070", "MH-5060"], isMilestone: true });

// --- 1.5 MEP First Fix (10 activities)
const mepFirst = [
  ["HVAC Risers Installation", 30, 230],
  ["Plumbing & Drainage Risers", 28, 232],
  ["Fire-fighting Risers", 25, 235],
  ["Electrical Busbar & Risers", 28, 236],
  ["Low-voltage Containment", 26, 240],
  ["Slab Conduits & Sleeves — Levels 1–15", 32, 195],
  ["Slab Conduits & Sleeves — Levels 16–30", 32, 240],
  ["Slab Conduits & Sleeves — Levels 31–45", 32, 285],
  ["BMS Containment", 30, 245],
  ["First-fix Inspection Milestone", 1, 320],
];
mepFirst.forEach((m, idx) => {
  const [name, d, off] = m as [string, number, number];
  a.push({
    id: `MH-6${(10 + idx * 10).toString().padStart(3, "0")}`,
    wbsId: "wbs-mep1",
    name,
    ...span(shift(CONTRACT_START, off), d),
    duration: d,
    predecessors: idx === 0 ? ["MH-3060"] : [`MH-6${((idx) * 10).toString().padStart(3, "0")}`],
    resource: "MEP Sub",
    isMilestone: idx === mepFirst.length - 1,
  });
});

// --- 1.6 Internal Finishes (10 activities)
const finishes = [
  ["Block Work — Levels 1–15", 35, 240],
  ["Block Work — Levels 16–30", 35, 285],
  ["Block Work — Levels 31–45", 35, 330],
  ["Plastering & Screed — Levels 1–15", 30, 280],
  ["Plastering & Screed — Levels 16–30", 30, 320],
  ["Plastering & Screed — Levels 31–45", 30, 360],
  ["Painting & Wall Finishes", 45, 360],
  ["Floor & Wall Tiling — Wet Areas", 50, 350],
  ["Joinery & Built-in Furniture", 45, 380],
  ["Final Cleaning Pre-Snag", 15, 420],
];
finishes.forEach((f, idx) => {
  const [name, d, off] = f as [string, number, number];
  a.push({
    id: `MH-7${(10 + idx * 10).toString().padStart(3, "0")}`,
    wbsId: "wbs-fin",
    name,
    ...span(shift(CONTRACT_START, off), d),
    duration: d,
    predecessors: idx === 0 ? ["MH-4220"] : [`MH-7${((idx) * 10).toString().padStart(3, "0")}`],
  });
});

// --- 1.7 MEP Final Fix & Testing (6 activities)
a.push({ id: "MH-8010", wbsId: "wbs-mep2", name: "MEP Final Fix — Levels 1–22", ...span(shift(CONTRACT_START, 360), 35), duration: 35, predecessors: ["MH-7020"] });
a.push({ id: "MH-8020", wbsId: "wbs-mep2", name: "MEP Final Fix — Levels 23–45", ...span(shift(CONTRACT_START, 385), 35), duration: 35, predecessors: ["MH-7030"] });
a.push({ id: "MH-8030", wbsId: "wbs-mep2", name: "Cooling & Heating Commissioning", ...span(shift(CONTRACT_START, 410), 25), duration: 25, predecessors: ["MH-8020"] });
a.push({ id: "MH-8040", wbsId: "wbs-mep2", name: "Fire & Life-safety T&C", ...span(shift(CONTRACT_START, 420), 25), duration: 25, predecessors: ["MH-8020"] });
a.push({ id: "MH-8050", wbsId: "wbs-mep2", name: "BMS Integration & Tuning", ...span(shift(CONTRACT_START, 425), 25), duration: 25, predecessors: ["MH-8040"] });
a.push({ id: "MH-8060", wbsId: "wbs-mep2", name: "MEP T&C Completion Milestone", ...span(shift(CONTRACT_START, 455), 1), duration: 1, predecessors: ["MH-8050"], isMilestone: true });

// --- 1.8 Authority Inspections (4 activities)
a.push({ id: "MH-9010", wbsId: "wbs-auth", name: "Civil Defence Inspection", ...span(shift(CONTRACT_START, 460), 10), duration: 10, predecessors: ["MH-8060"] });
a.push({ id: "MH-9020", wbsId: "wbs-auth", name: "DEWA Final Inspection & Energization", ...span(shift(CONTRACT_START, 462), 12), duration: 12, predecessors: ["MH-8060"] });
a.push({ id: "MH-9030", wbsId: "wbs-auth", name: "DM Building Completion Inspection", ...span(shift(CONTRACT_START, 475), 8), duration: 8, predecessors: ["MH-9010", "MH-9020"] });
a.push({ id: "MH-9040", wbsId: "wbs-auth", name: "Building Completion Certificate", ...span(shift(CONTRACT_START, 485), 1), duration: 1, predecessors: ["MH-9030"], isMilestone: true });

// --- 1.9 Snagging & Handover (5 activities)
a.push({ id: "MH-9510", wbsId: "wbs-snag", name: "Consultant Snag List Issuance", ...span(shift(CONTRACT_START, 460), 12), duration: 12, predecessors: ["MH-7100"] });
a.push({ id: "MH-9520", wbsId: "wbs-snag", name: "Contractor Snag Rectification", ...span(shift(CONTRACT_START, 475), 25), duration: 25, predecessors: ["MH-9510"] });
a.push({ id: "MH-9530", wbsId: "wbs-snag", name: "De-snag & Re-inspection", ...span(shift(CONTRACT_START, 500), 12), duration: 12, predecessors: ["MH-9520"] });
a.push({ id: "MH-9540", wbsId: "wbs-snag", name: "Handover Documentation Pack", ...span(shift(CONTRACT_START, 510), 10), duration: 10, predecessors: ["MH-9530", "MH-9040"] });
a.push({ id: "MH-9550", wbsId: "wbs-snag", name: "Substantial Completion / TOC", ...span(shift(CONTRACT_START, 522), 1), duration: 1, predecessors: ["MH-9540"], isMilestone: true });

// =====================================================
// PROGRESS OVERLAY (4 weeks of contractor weekly updates already applied).
// "Today" reference for the demo: project is ~5–6 months in.
// We simulate that early activities are complete or in progress; later are not.
// =====================================================
const TODAY = "2026-05-08"; // matches env

function applyProgress(act: Seed): ProgrammeActivity {
  const base: ProgrammeActivity = { ...act, totalFloat: 0, isCritical: false };
  const finish = fromISO(act.baselineFinish);
  const today = fromISO(TODAY);
  const start = fromISO(act.baselineStart);

  if (finish.getTime() < today.getTime()) {
    // Should be complete by now
    base.actualStart = act.baselineStart;
    // Add small slip on a handful of mid-programme activities to make the demo realistic
    const slipIds = ["MH-3030", "MH-3040", "MH-3050", "MH-4110", "MH-4120"];
    if (slipIds.includes(act.id)) {
      // 5–8 working-day slip on these
      const slip = act.id === "MH-3030" ? 8 : 5;
      base.actualFinish = toISO(addWorkingDays(finish, slip));
      base.percentComplete = 100;
    } else {
      base.actualFinish = act.baselineFinish;
      base.percentComplete = 100;
    }
  } else if (start.getTime() <= today.getTime()) {
    // In progress
    const totalDays = Math.max(1, (finish.getTime() - start.getTime()) / 86_400_000);
    const elapsed = Math.max(0, (today.getTime() - start.getTime()) / 86_400_000);
    let pct = Math.round((elapsed / totalDays) * 100);
    // Inject some under/over performance for visual variety
    if (act.id.startsWith("MH-42")) pct = Math.max(5, pct - 10);
    if (act.id.startsWith("MH-50")) pct = Math.max(0, pct - 15);
    if (act.id.startsWith("MH-60")) pct = Math.min(100, pct + 8);
    base.actualStart = act.baselineStart;
    base.percentComplete = Math.min(99, Math.max(1, pct));
    base.remainingDuration = Math.max(1, Math.round(act.duration * (1 - base.percentComplete / 100)));
    // Forecast finish drifts based on progress vs plan
    const drift = Math.round((100 - base.percentComplete) / 100 * act.duration * 1.05);
    base.forecastFinish = toISO(addWorkingDays(fromISO(TODAY), drift));
  } else {
    base.percentComplete = 0;
  }
  return base;
}

const seeded = a.map(applyProgress);

// Critical-path solving + float calculation handled by markCriticalPath()
// at consumption time (in the Post-Contract Timeline component).
export const marinaActivities: ProgrammeActivity[] = seeded;

// =====================================================
// REVISIONS — Rev 0 (active baseline) + Rev 1 (submitted, under review)
// =====================================================
export const marinaRevisions: ProgrammeRevision[] = [
  {
    revision: 0,
    label: "Rev 0 — Baseline Programme",
    issuedBy: "ABC Construction LLC",
    issuedByPerson: "Mr. Khaled Hassan (Planning Manager)",
    issueDate: "2025-11-28",
    effectiveDate: "2025-12-15",
    status: "approved",
    reviewedBy: ["SM (Site Mechanical)", "SS (Site Structural)", "BIM Coordinator"],
    approvedBy: "PM — Eng. Ahmed Al-Mansoori",
    fileFormat: "P6 XER",
    fileName: "MHT-Baseline-Rev0.xer",
    isActive: true,
    changeNote: "Initial approved baseline programme per Sub-Clause 8.3.",
  },
  {
    revision: 1,
    label: "Rev 1 — Post EOT-1 Submission",
    issuedBy: "ABC Construction LLC",
    issuedByPerson: "Mr. Khaled Hassan (Planning Manager)",
    issueDate: "2026-04-22",
    status: "under-review",
    reviewedBy: ["SM (Site Mechanical)", "SS (Site Structural)"],
    fileFormat: "P6 XER",
    fileName: "MHT-Programme-Rev1.xer",
    isActive: false,
    changeNote: "Submitted following EOT-1 for raft pour delays. Tower core start shifted +8 WD; downstream floor plates rescheduled. No change to TOC date — float consumed.",
  },
];

// =====================================================
// WEEKLY UPDATES — last 4 weeks of contractor reports
// =====================================================
export const marinaWeeklyUpdates: WeeklyUpdate[] = [
  { id: "wu-2026-04-17", weekEnding: "2026-04-17", submittedBy: "ABC Construction LLC", submittedDate: "2026-04-19", status: "approved", spi: 0.96, criticalSlippageDays: 4, activitiesUpdated: 18, note: "Raft pour completed 5 WD late due to concrete supplier shortage." },
  { id: "wu-2026-04-24", weekEnding: "2026-04-24", submittedBy: "ABC Construction LLC", submittedDate: "2026-04-27", status: "approved", spi: 0.94, criticalSlippageDays: 6, activitiesUpdated: 22, note: "Basement B2 walls behind plan; mitigation crew added on weekend." },
  { id: "wu-2026-05-01", weekEnding: "2026-05-01", submittedBy: "ABC Construction LLC", submittedDate: "2026-05-03", status: "approved", spi: 0.93, criticalSlippageDays: 8, activitiesUpdated: 24, note: "Core lift 1 starts shifted; EOT-1 in preparation." },
  { id: "wu-2026-05-08", weekEnding: "2026-05-08", submittedBy: "ABC Construction LLC", submittedDate: "2026-05-09", status: "submitted", spi: 0.94, criticalSlippageDays: 8, activitiesUpdated: 19, note: "Recovery underway; core lift 2 setting-out commenced ahead of plan." },
];

// =====================================================
// EOT, VO, NCR linkage for the demo
// =====================================================
export type LinkedDocument = {
  ref: string;
  type: "EOT" | "VO" | "NCR" | "IR" | "WIR" | "SVR";
  title: string;
  raisedDate: string;
  status: string;
  affectedActivities: string[];
  scheduleImpactWD: number;
  costImpactAED?: number;
};

export const marinaLinkedDocs: LinkedDocument[] = [
  {
    ref: "EOT-001",
    type: "EOT",
    title: "Concrete supplier shortage — raft & basement walls",
    raisedDate: "2026-04-25",
    status: "Under Review",
    affectedActivities: ["MH-3020", "MH-3030", "MH-3040", "MH-4110"],
    scheduleImpactWD: 8,
    costImpactAED: 0,
  },
  {
    ref: "VO-014",
    type: "VO",
    title: "Façade mock-up specification upgrade — anti-glare coating",
    raisedDate: "2026-03-12",
    status: "Approved",
    affectedActivities: ["MH-5010", "MH-5020"],
    scheduleImpactWD: 3,
    costImpactAED: 285000,
  },
  {
    ref: "NCR-008",
    type: "NCR",
    title: "Pile cap rebar cover non-conformance — Group B zone",
    raisedDate: "2026-02-08",
    status: "Closed",
    affectedActivities: ["MH-2070"],
    scheduleImpactWD: 0,
  },
];

export const MARINA_DEMO = {
  contractStart: CONTRACT_START,
  contractFinish: "2027-06-30",
  wbs: marinaWBS,
  activities: marinaActivities,
  revisions: marinaRevisions,
  weeklyUpdates: marinaWeeklyUpdates,
  linkedDocs: marinaLinkedDocs,
};
