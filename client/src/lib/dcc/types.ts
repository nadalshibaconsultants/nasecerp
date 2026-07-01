/**
 * Document & Drawing Control — ISO 19650 / BS 1192 aligned.
 * Covers: Drawing Register, Revisions, Transmittals, RFI / TQ exchange.
 */

export type DrawingDiscipline = "AR" | "ST" | "ME" | "EL" | "PL" | "FF" | "FP" | "LA" | "IN" | "CV" | "GE";
export const DISCIPLINE_LABELS_DCC: Record<DrawingDiscipline, string> = {
  AR: "Architectural", ST: "Structural", ME: "Mechanical", EL: "Electrical",
  PL: "Plumbing", FF: "Firefighting", FP: "Façade", LA: "Landscape",
  IN: "Interior", CV: "Civil", GE: "General",
};

export type DrawingStatus =
  | "WIP"          // work in progress
  | "S0"           // initial issue
  | "P01" | "P02" | "P03" | "P04" | "P05"   // preliminary
  | "C01" | "C02" | "C03"                    // construction
  | "AB"           // as-built
  | "void";

export type DrawingPurpose =
  | "for-information"
  | "for-coordination"
  | "for-comments"
  | "for-client-approval"
  | "for-authority"
  | "for-tender"
  | "for-construction"
  | "for-record";

export type Drawing = {
  id: string;
  projectId: string;
  drawingNumber: string;            // e.g. "AR-AWT-100"
  title: string;
  discipline: DrawingDiscipline;
  scale?: string;                    // "1:100"
  paperSize?: "A0" | "A1" | "A2" | "A3" | "A4";
  currentRev: string;                // "P03"
  currentStatus: DrawingStatus;
  preparedByDisplay?: string;
  checkedByDisplay?: string;
  approvedByDisplay?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DrawingRevision = {
  id: string;
  drawingId: string;
  rev: string;                       // "P03"
  status: DrawingStatus;
  purpose: DrawingPurpose;
  issuedDate: string;
  issuedByDisplay: string;
  changeNote: string;                // what changed in this rev
  fileUrl?: string;
  fileName?: string;
  size?: string;
  supersededBy?: string;             // next rev id
};

export type Transmittal = {
  id: string;
  reference: string;                 // "TR-AWT-2026-0042"
  projectId: string;
  date: string;
  fromCompany: string;
  toCompany: string;
  toContact?: string;
  purpose: DrawingPurpose;
  drawings: { drawingId: string; rev: string }[];
  coverNote: string;
  status: "draft" | "issued" | "acknowledged" | "rejected";
  issuedByDisplay?: string;
  issuedAt?: string;
  acknowledgedAt?: string;
  acknowledgedByDisplay?: string;
  attachmentUrl?: string;
};

// ===== RFI / TQ =====
export type RfiStatus =
  | "draft" | "open" | "awaiting-response" | "responded"
  | "closed" | "void";

export type RfiPriority = "low" | "medium" | "high" | "urgent";

export type RfiResponse = {
  id: string;
  respondedAt: string;
  respondedByDisplay: string;
  responseText: string;
  attachmentUrl?: string;
  attachmentFileName?: string;
};

export type Rfi = {
  id: string;
  reference: string;                 // "RFI-AWT-2026-0078"
  projectId: string;
  date: string;
  raisedByCompany: string;           // contractor / consultant / client
  raisedByDisplay: string;
  raisedToDiscipline?: DrawingDiscipline;
  raisedToDisplay?: string;
  subject: string;
  question: string;
  drawingRefs?: string[];            // drawing numbers
  specificationRefs?: string[];
  priority: RfiPriority;
  dueDate?: string;
  status: RfiStatus;
  responses: RfiResponse[];
  costImpact?: number;
  scheduleImpactDays?: number;
  closureNote?: string;
  closedAt?: string;
  closedByDisplay?: string;
  attachmentUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export function rfiAgeDays(rfi: Rfi): number {
  return Math.floor((Date.now() - new Date(rfi.date).getTime()) / 86_400_000);
}
