/**
 * Authority Submittals tracker — per-project log of every interaction
 * with UAE government / utility authorities (DDA, DEWA, ETISALAT, Du,
 * DCD, RTA, Empower / Tabreed, DM, Trakheesi).
 *
 * Mirrors the spreadsheet that consultants typically maintain. Each row
 * is one submittal/approval item. Status drives the colour-coding shown
 * in the UI.
 */
export type AuthoritySubmittalStatus =
  | "to-start"
  | "in-progress"
  | "approved"
  | "rejected"
  | "completed";

export type AuthorityKey =
  | "DDA" | "DEWA" | "ETISALAT" | "Du" | "DCD" | "RTA" | "Empower" | "DM" | "Trakheesi" | "Other";

export type AuthoritySubmittal = {
  id: string;
  projectId: string;
  /** When set, the row is rendered as a milestone-group separator (bold, grey background). */
  isGroupHeader?: boolean;
  /** When isGroupHeader is true, this row groups everything below until the next group. */
  groupName?: string;
  name: string;
  authority?: AuthorityKey;
  status: AuthoritySubmittalStatus;
  milestoneStatus?: AuthoritySubmittalStatus;
  startDate?: string;
  targetFinishDate?: string;
  actualFinishDate?: string;
  remarks?: string;
  order: number;
};

export const STATUS_LABEL: Record<AuthoritySubmittalStatus, string> = {
  "to-start": "To Start",
  "in-progress": "In-Progress",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
};

export const STATUS_CLASS: Record<AuthoritySubmittalStatus, string> = {
  "to-start": "bg-slate-100 text-slate-700 border-slate-300",
  "in-progress": "bg-yellow-100 text-yellow-800 border-yellow-300",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-300",
  rejected: "bg-red-100 text-red-800 border-red-300",
  completed: "bg-emerald-200 text-emerald-900 border-emerald-400",
};

export const AUTHORITY_LABEL: Record<AuthorityKey, string> = {
  DDA: "Dubai Development Authority (DDA)",
  DEWA: "Dubai Electricity & Water Authority (DEWA)",
  ETISALAT: "Etisalat",
  Du: "Du",
  DCD: "Dubai Civil Defense (DCD)",
  RTA: "Roads and Transport Authority (RTA)",
  Empower: "Empower / Tabreed (district cooling)",
  DM: "Dubai Municipality (DM)",
  Trakheesi: "Trakheesi",
  Other: "Other",
};
