/**
 * Pre-Contract Stage-Gate Approval — three-signature internal sign-off
 * required before a stage's deliverable can be sent to the client (gate).
 *
 *  - LA  = Lead Architect  (role: design-lead)
 *  - PM  = Project Manager (role: pm; preferably the project's named PM)
 *  - DM  = Design Manager  (role: director)
 *
 * The record is one per project + stage. When all three slots are "approved",
 * the stage is marked Ready-for-Gate. If any slot rejects, the stage is
 * Rejected and the requester must revise + resubmit.
 */
export type ApproverKind = "LA" | "PM" | "DM";

export type ApproverDecision = "pending" | "approved" | "rejected";

export type ApproverSlot = {
  kind: ApproverKind;
  /** Required role tag for who can act on this slot. */
  role: "design-lead" | "pm" | "director";
  status: ApproverDecision;
  note?: string;
  decidedByUserId?: string;
  decidedByDisplay?: string;
  decidedAt?: string;
};

export type StageGateApproval = {
  id: string;
  projectId: string;
  /** Stage being signed off (e.g. "S2") — the gate the stage feeds into is implied (G2). */
  stageCode: string;
  /** The implied gate code. */
  gateCode: string;
  requesterUserId: string;
  requesterDisplay: string;
  status: "in-review" | "approved" | "rejected" | "withdrawn";
  approvals: ApproverSlot[];
  note?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export const APPROVER_LABEL: Record<ApproverKind, string> = {
  LA: "Lead Architect (LA)",
  PM: "Project Manager (PM)",
  DM: "Design Manager (DM)",
};

export const APPROVER_ROLE: Record<ApproverKind, "design-lead" | "pm" | "director"> = {
  LA: "design-lead",
  PM: "pm",
  DM: "director",
};

/** Convenience: which gate does each stage feed into? */
export const STAGE_TO_GATE: Record<string, string> = {
  S1: "G1", S2: "G2", S3: "G3", S4: "G4", S5: "G5",
};

export function isAllApproved(g: StageGateApproval): boolean {
  return g.approvals.length === 3 && g.approvals.every((a) => a.status === "approved");
}
export function isAnyRejected(g: StageGateApproval): boolean {
  return g.approvals.some((a) => a.status === "rejected");
}
