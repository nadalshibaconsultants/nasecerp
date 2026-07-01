/**
 * Leave Handover — when an employee goes on leave, the Design Manager
 * appoints other team members to cover their open tasks. Each task can
 * go to a different cover; the handover record is reviewed and approved
 * by the DM before tasks are actually reassigned. On the employee's
 * return the handover can revert (tasks go back to the original owner).
 */
export type HandoverStatus =
  | "draft"        // being prepared
  | "submitted"    // waiting for DM approval
  | "approved"     // approved, tasks reassigned
  | "rejected"     // DM rejected — needs revision
  | "active"       // employee on leave, cover is in effect
  | "completed";   // employee back, tasks reverted (if requested)

export type CoverAssignment = {
  taskId: string;
  coverUserId: string;
  note?: string;
};

export type LeaveHandover = {
  id: string;
  leaveRequestId?: string;          // optional link back to the leave request
  employeeUserId: string;           // user going on leave
  employeeDisplay?: string;
  fromDate: string;
  toDate: string;
  coverAssignments: CoverAssignment[];
  status: HandoverStatus;
  decisionNote?: string;
  approverUserId?: string;
  approverDisplay?: string;
  decidedAt?: string;
  revertOnReturn: boolean;
  createdAt: string;
  updatedAt: string;
  activatedAt?: string;
  completedAt?: string;
};
