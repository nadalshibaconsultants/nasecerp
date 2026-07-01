/**
 * Documents data model — hierarchical folder structure per project.
 *
 * Top-level folders mirror the standard AEC consultancy taxonomy:
 *   01. Authority Approvals  → sub-folders per authority (Trakheesi, DM, DDA, Civil Defence, DEWA, RTA, Etisalat/du, Empower/Tabreed, Other NOCs)
 *   02. Site Documents
 *   03. Client Approvals
 *   04. Drawings
 *   05. Contracts & Commercial
 *   06. Reports & Studies
 *   07. RFIs & Submittals
 *   08. Extra / Miscellaneous
 *
 * A DocumentFile lives in a folder. It carries version, status,
 * access-role list, retention, uploader, file size + ref to bytes in filesStore.
 */
import type { Role } from "@/lib/auth/types";

export type DocFolder = {
  id: string;
  projectId: string;
  parentId?: string;       // undefined for top-level
  order: number;           // sort order within the parent
  code?: string;           // "01", "02", etc. for top-level
  name: string;
  /** Roles permitted to read this folder. Empty = public to project team. */
  accessRoles?: Role[];
  /** Retention policy label. */
  retention?: "Permanent" | "10 years" | "5 years" | "Project lifetime";
  /** Indicator dot color: green=ok, amber=in-progress, red=blocked/missing */
  indicator?: "ok" | "warn" | "alert";
};

export type DocStatus = "draft" | "for-approval" | "final" | "stamped" | "superseded";

export type DocumentFile = {
  id: string;
  folderId: string;
  projectId: string;
  name: string;             // shown title; can include extension
  category?: string;        // optional category tag (e.g. "Drawing", "Letter")
  status: DocStatus;
  version: string;          // "v1.0", "v2.0", "Rev A"
  uploadedByUserId: string;
  uploadedByDisplay?: string;
  uploadedAt: string;
  sizeBytes: number;
  mimeType?: string;
  fileStoreId?: string;     // ID into filesStore for the actual bytes (optional — files may be reference-only)
  notes?: string;
  // Cross-link to original DocumentRecord if migrated from the old store
  legacyRefId?: string;
};

export const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  draft: "Draft",
  "for-approval": "For Approval",
  final: "Final",
  stamped: "Stamped",
  superseded: "Superseded",
};

export const DOC_STATUS_CLASS: Record<DocStatus, string> = {
  draft: "bg-blue-100 text-blue-700 border-blue-200",
  "for-approval": "bg-amber-100 text-amber-800 border-amber-200",
  final: "bg-emerald-100 text-emerald-800 border-emerald-200",
  stamped: "bg-purple-100 text-purple-800 border-purple-200",
  superseded: "bg-slate-100 text-slate-600 border-slate-200",
};

export const INDICATOR_DOT: Record<NonNullable<DocFolder["indicator"]>, string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  alert: "bg-red-500",
};
