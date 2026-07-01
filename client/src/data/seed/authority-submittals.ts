/**
 * Default authority-submittals checklist applied to every project.
 * Mirrors the standard UAE consultant tracker.
 */
import type { AuthoritySubmittal } from "@/lib/authority/types";

const PROJECT_IDS = ["marina-heights", "al-wasl-tower", "jlt-commercial", "dubai-creek", "palm-villas", "business-bay-tower"];

type Row = Omit<AuthoritySubmittal, "id" | "projectId" | "order">;

// Template rows shared across all projects
const TEMPLATE: Row[] = [
  // ----- DDA Preliminary Submission group -----
  { isGroupHeader: true, groupName: "DDA Preliminary Submission (Concept)", name: "DDA Preliminary Submission (Concept)", authority: "DDA", status: "completed", milestoneStatus: "completed", startDate: "2025-11-11", actualFinishDate: "2026-02-10" },
  { name: "DDA Exceptions", authority: "DDA", status: "completed", milestoneStatus: "completed", startDate: "2026-01-20", actualFinishDate: "2026-02-11", remarks: "GFA, Parking Shortage, Parking Location Near Column & Podium Height" },
  { name: "DEWA (Water) NOC", authority: "DEWA", status: "completed", milestoneStatus: "completed", startDate: "2026-01-12", targetFinishDate: "2026-04-03", actualFinishDate: "2026-04-01" },
  { name: "DEWA (Elec) NOC", authority: "DEWA", status: "completed", milestoneStatus: "completed", startDate: "2025-12-10", actualFinishDate: "2025-12-11" },
  { name: "ETISALAT/DU (NOC)", authority: "ETISALAT", status: "in-progress", milestoneStatus: "in-progress", startDate: "2026-03-12", targetFinishDate: "2026-04-15", remarks: "Submitted to Du — Reminder sent dated on 16/04" },
  { name: "DCD (Dubai Civil Defense)", authority: "DCD", status: "in-progress", milestoneStatus: "in-progress", startDate: "2026-02-27", targetFinishDate: "2026-03-31", remarks: "NASEC to follow up with DCD" },
  { name: "Topography Survey", status: "completed", milestoneStatus: "completed", actualFinishDate: "2025-09-04" },
  { name: "Soil Report", status: "completed", milestoneStatus: "completed", actualFinishDate: "2026-02-23" },
  { name: "FIC Location", status: "completed", milestoneStatus: "completed", startDate: "2026-03-12", targetFinishDate: "2026-03-27", actualFinishDate: "2026-03-24" },
  { name: "RTA Gate Level", authority: "RTA", status: "completed", milestoneStatus: "completed", startDate: "2025-12-03", actualFinishDate: "2025-12-05" },
  { name: "RTA TIS Report", authority: "RTA", status: "in-progress", milestoneStatus: "in-progress", remarks: "To be appointed TIS Consultant" },
  { name: "RTA Access / Design NOC", authority: "RTA", status: "in-progress", milestoneStatus: "in-progress", startDate: "2026-03-17", targetFinishDate: "2026-05-10", remarks: "RTA Comments: TIS Report Required (29th March 2026)" },
  { name: "Empower NOC / ETS Room Design", authority: "Empower", status: "in-progress", milestoneStatus: "in-progress", startDate: "2026-03-23", targetFinishDate: "2026-04-15", remarks: "Hold until the commencement date of the contractor" },
  // ----- DDA Final Design Submission -----
  { isGroupHeader: true, groupName: "DDA Final Design Submission", name: "DDA Final Design Submission", authority: "DDA", status: "in-progress", milestoneStatus: "in-progress", startDate: "2026-02-27", targetFinishDate: "2026-04-27", remarks: "Submitted on 27th Feb 2026. With Ref. No. REQ-2564545" },
];

export const SEED_AUTHORITY_SUBMITTALS: AuthoritySubmittal[] = PROJECT_IDS.flatMap((pid) =>
  TEMPLATE.map((row, idx) => ({
    id: `auth-${pid}-${idx + 1}`,
    projectId: pid,
    order: idx + 1,
    ...row,
  }))
);
