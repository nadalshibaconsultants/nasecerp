/**
 * Quality Module — ISO 9001 / Dubai supervision practice.
 * NCR, IR, MAR, WIR.
 */
export type QualityStatus =
  | "draft" | "submitted" | "under-review" | "approved" | "approved-with-comments"
  | "rejected" | "rejected-resubmit" | "closed" | "void";

// Non-Conformance Report
export type NCR = {
  id: string;
  reference: string;                 // "NCR-AWT-2026-0011"
  projectId: string;
  date: string;
  raisedByDisplay: string;
  contractorCompany?: string;
  location: string;                  // building/floor/grid
  discipline: string;
  description: string;
  rootCause?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  rectifiedDate?: string;
  rectifiedByDisplay?: string;
  costAED?: number;
  status: QualityStatus;
  attachmentUrls?: string[];
  closedAt?: string;
  closedByDisplay?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

// Inspection Request (Site)
export type InspectionRequest = {
  id: string;
  reference: string;                 // "IR-AWT-2026-0234"
  projectId: string;
  date: string;
  inspectionDate: string;
  raisedByContractor: string;
  location: string;
  scopeDescription: string;
  discipline: string;
  consultantSupervisor?: string;
  result: "pending" | "passed" | "passed-with-comments" | "failed";
  comments?: string;
  rejectionReason?: string;
  resubmittalRequired?: boolean;
  resubmittalDueDate?: string;
  status: QualityStatus;
  attachmentUrls?: string[];
  createdAt: string;
  updatedAt: string;
};

// Material Approval Request
export type MAR = {
  id: string;
  reference: string;                 // "MAR-AWT-2026-0089"
  projectId: string;
  date: string;
  raisedByContractor: string;
  materialDescription: string;
  manufacturer: string;
  modelOrBrand?: string;
  countryOfOrigin?: string;
  catalogueRef?: string;
  certificationRef?: string;         // LPCB BR 135, UL, ISO etc.
  intendedLocation?: string;
  specReference?: string;
  compliesWithSpec: boolean;
  alternativeProposed?: boolean;
  result: "pending" | "approved" | "approved-with-comments" | "rejected";
  consultantComments?: string;
  status: QualityStatus;
  approvedByDisplay?: string;
  approvedAt?: string;
  validityDate?: string;
  attachmentUrls?: string[];
  createdAt: string;
  updatedAt: string;
};

// Work Inspection Request (closing-stage inspection)
export type WIR = {
  id: string;
  reference: string;                 // "WIR-AWT-2026-0156"
  projectId: string;
  date: string;
  inspectionDate: string;
  raisedByContractor: string;
  workDescription: string;
  buildingArea: string;
  inspectorDisplay?: string;
  result: "pending" | "approved" | "approved-with-comments" | "rejected";
  rejectionReason?: string;
  comments?: string;
  punchlistItems?: string[];
  status: QualityStatus;
  createdAt: string;
  updatedAt: string;
};
