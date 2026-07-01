import { createCollection, createSingleton, createApiCollection } from "./store";
import type { Employee } from "./hr/types";
import type { Geofence, AttendancePunch, LeaveRequest } from "./attendance/types";
import type { LocationPing } from "./attendance/presence";
import type { TrainingRecord, AssetAssignment, DisciplinaryRecord, PerformanceReview, OnboardingRecord, IssuedLetter, AuditLogEntry } from "./hr/extra-types";
import type { User, Session } from "./auth/types";
import type { StoredFile } from "./files/types";
import type { Notification } from "./notifications/types";
import type { Project } from "./projects/types";
import type { Lead, LeadActivity } from "./crm/types";
import type { Task } from "./tasks/types";
import type { TaskTimerSession, ActiveTimer } from "./timer/types";
import type { StageGateApproval } from "./projects/stage-approval";
import type { LeaveHandover } from "./handover/types";
import type { ProjectRisk } from "./risks/types";
import type { LessonItem, LessonResponse } from "./lessons/types";
import { SEED_LESSON_ITEMS } from "@/data/seed/lessons";
import type { Drawing, DrawingRevision, Transmittal, Rfi } from "./dcc/types";
import type { NCR, InspectionRequest, MAR, WIR } from "./quality/types";
import type { Incident, ToolboxTalk, SafetyInspection, PPEIssuance } from "./hse/types";
import type { LPO, GRN } from "./procurement/types";
import {
  SEED_DRAWINGS, SEED_DRAWING_REVISIONS, SEED_TRANSMITTALS, SEED_RFIS,
  SEED_NCRS, SEED_IRS, SEED_MARS, SEED_WIRS,
  SEED_INCIDENTS, SEED_TOOLBOX_TALKS, SEED_SAFETY_INSPECTIONS, SEED_PPE_ISSUANCES,
  SEED_LPOS, SEED_GRNS,
} from "@/data/seed/tier1";
import type {
  GLAccount, JournalEntry, VatReturn, Customer, ARInvoice, Receipt as ARReceipt,
  Supplier, APBill, SupplierPayment, BankAccount, BankTransaction, ChequeRegister,
  PettyCashFloat, PettyCashVoucher, RecurringExpense, UtilityBill,
  InsurancePolicy, InsuranceClaim, FixedAsset, Subscription as FinSubscription,
  GovernmentFee, Budget, Department as FinDepartment, WpsRun,
  PayrollRun, CorporateTaxReturn, BankReconciliation, RetentionRelease,
} from "./finance/types";
import { SEED_COA } from "./finance/coa";
import {
  SEED_DEPARTMENTS, SEED_CUSTOMERS, SEED_SUPPLIERS, SEED_BANK_ACCOUNTS,
  SEED_BANK_TRANSACTIONS, SEED_CHEQUES, SEED_PETTY_CASH_FLOATS, SEED_PETTY_VOUCHERS,
  SEED_RECURRING_EXPENSES, SEED_UTILITY_BILLS, SEED_INSURANCE_POLICIES,
  SEED_INSURANCE_CLAIMS, SEED_FIXED_ASSETS, SEED_SUBSCRIPTIONS,
  SEED_GOVERNMENT_FEES, SEED_AR_INVOICES, SEED_AP_BILLS, SEED_BUDGETS,
  SEED_WPS_RUNS, SEED_JOURNAL_ENTRIES, SEED_VAT_RETURNS, SEED_SUPPLIER_PAYMENTS,
  SEED_RECEIPTS,
} from "@/data/seed/finance";
import { SEED_RISKS } from "@/data/seed/risks";
import type { AuthoritySubmittal } from "./authority/types";
import { SEED_AUTHORITY_SUBMITTALS } from "@/data/seed/authority-submittals";
import type { DocFolder, DocumentFile } from "./documents/types";
import { SEED_FOLDERS, SEED_DOC_FILES } from "@/data/seed/documents";
import { DEMO_CONTRACTORS, DEMO_SUBMITTALS, DEMO_CONSULTANT_ISSUED } from "./contractor-portal-data";
import type { ContractorCompany, PortalSubmittal, ConsultantIssuedItem } from "./contractor-portal-data";
import type { SubmittalComment } from "./contractor/comments";
import { SEED_TASKS } from "@/data/seed/tasks";
import { SEED_LEADS, SEED_LEAD_ACTIVITIES } from "@/data/seed/crm";
import { SEED_PROJECTS } from "@/data/seed/projects";
import { SEED_EMPLOYEES } from "@/data/seed/employees";
import { SEED_GEOFENCES, OFFICE_GEOFENCE } from "@/data/seed/geofences";
import { SEED_PUNCHES, SEED_LEAVES } from "@/data/seed/punches";
import { SEED_LOCATIONS } from "@/data/seed/locations";
import { SEED_TRAINING, SEED_ASSETS, SEED_DISCIPLINARY, SEED_REVIEWS, SEED_ONBOARDING, SEED_LETTERS, SEED_AUDIT } from "@/data/seed/hr-extras";
import { SEED_USERS } from "@/data/seed/users";

export type DesignDeliverable = {
  id: string;
  projectId: string;
  name: string;
  status: "complete" | "in-progress" | "pending";
  assignee: string;
  dueDate: string;
  stageCode?: string;
  order?: number;
};

const SEED_DESIGN_DELIVERABLES: DesignDeliverable[] = [
  { id: "dd-awt-001", projectId: "al-wasl-tower", name: "Trakheesi concept submission package", status: "in-progress", assignee: "Ahmed M.", dueDate: "2026-05-20", stageCode: "S2", order: 1 },
  { id: "dd-awt-002", projectId: "al-wasl-tower", name: "Civil Defence concept NOC", status: "pending", assignee: "James W.", dueDate: "2026-05-25", stageCode: "S2", order: 2 },
  { id: "dd-awt-003", projectId: "al-wasl-tower", name: "DM concept approval drawings", status: "in-progress", assignee: "Ahmed M.", dueDate: "2026-05-18", stageCode: "S2", order: 3 },
  { id: "dd-awt-004", projectId: "al-wasl-tower", name: "NOC list compilation", status: "complete", assignee: "Priya S.", dueDate: "2026-05-10", stageCode: "S2", order: 4 },
  { id: "dd-awt-005", projectId: "al-wasl-tower", name: "SD report (final)", status: "complete", assignee: "James W.", dueDate: "2026-05-05", stageCode: "S2", order: 5 },
  { id: "dd-awt-006", projectId: "al-wasl-tower", name: "3D views & renders", status: "complete", assignee: "Ahmed M.", dueDate: "2026-04-28", stageCode: "S2", order: 6 },
  { id: "dd-awt-007", projectId: "al-wasl-tower", name: "Material palette board", status: "complete", assignee: "Sarah J.", dueDate: "2026-04-20", stageCode: "S2", order: 7 },
];

// Shared payload shapers used by the createApiCollection() calls below. Declared
// here (before first use) because `const` bindings are not hoisted — referencing
// them after a later `const` line throws a temporal-dead-zone ReferenceError at
// module load and blanks the whole app.
const stripMeta = (e: any) => { const { createdAt, updatedAt, ...rest } = e; return rest; };
const stripIdAndMeta = (e: any) => { const { id, createdAt, updatedAt, ...rest } = e; return rest; };

const toNumber = (v: unknown) => v == null || v === "" ? undefined : Number(v);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isoDateOrUndefined = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
const uuidOrUndefined = (v: unknown) => typeof v === "string" && UUID_RE.test(v) ? v : undefined;

const mapTraining = (r: any): TrainingRecord => ({
  ...r,
  costAED: toNumber(r.costAED ?? r.costAed),
});
const trainingToApi = (r: any) => {
  const { id, createdAt, updatedAt, costAED, certificateUrl, ...rest } = r;
  return { ...rest, costAed: costAED };
};

const mapAsset = (r: any): AssetAssignment => ({
  ...r,
  estimatedValueAED: toNumber(r.estimatedValueAED ?? r.estimatedValueAed),
});
const assetToApi = (r: any) => {
  const { id, createdAt, updatedAt, estimatedValueAED, ...rest } = r;
  return { ...rest, estimatedValueAed: estimatedValueAED };
};

const mapDisciplinary = (r: any): DisciplinaryRecord => ({
  ...r,
  issuedBy: r.issuedBy ?? r.issuedByUserId ?? "System",
  attachedDocs: r.attachedDocs ?? r.attachedFileIds ?? [],
});
const disciplinaryToApi = (r: any) => {
  const { id, createdAt, updatedAt, issuedBy, attachedDocs, ...rest } = r;
  return { ...rest, attachedFileIds: attachedDocs ?? [] };
};

const mapReview = (r: any): PerformanceReview => ({
  ...r,
  reviewerId: r.reviewerId ?? r.reviewerUserId ?? "",
  overallRating: Number(r.overallRating ?? 0),
});
const reviewToApi = (r: any) => {
  const { id, createdAt, updatedAt, reviewerId, ...rest } = r;
  return { ...rest, reviewerUserId: reviewerId || undefined };
};

const mapLetter = (r: any): IssuedLetter => ({
  ...r,
  issuedBy: r.issuedBy ?? r.issuedByUserId ?? "System",
  fileName: r.fileName ?? (r.fileId ? `${r.reference}.pdf` : undefined),
  contentSnapshot: r.contentSnapshot ?? (r.payload ? JSON.stringify(r.payload) : undefined),
  requestStatus: r.requestStatus ?? r.payload?.status ?? (r.fileId ? "issued" : undefined),
  requestedAt: r.requestedAt ?? r.payload?.requestedAt,
  requestedBy: r.requestedBy ?? r.payload?.requestedBy ?? r.payload?.requestedByUserId,
  requestNote: r.requestNote ?? r.payload?.note,
  approvedBy: r.approvedBy ?? r.payload?.approvedBy,
  approvedAt: r.approvedAt ?? r.payload?.approvedAt,
});
const letterToApi = (r: any) => {
  const { id, createdAt, updatedAt, issuedBy, fileName, contentSnapshot, issueDate, reference, ...rest } = r;
  return rest;
};

const mapAudit = (r: any): AuditLogEntry => ({
  id: String(r.id),
  timestamp: r.timestamp ?? r.at ?? new Date().toISOString(),
  actor: r.actor ?? r.actorRole ?? r.actorUserId ?? "System",
  module: r.module ?? r.entityType ?? "hr",
  action: normalizeAuditAction(r.action),
  subject: r.subject ?? [r.entityType, r.entityId].filter(Boolean).join(" · ") ?? r.action,
  detail: r.detail ?? (r.after ? JSON.stringify(r.after) : undefined),
});
const auditToApi = (r: any) => {
  const { id, timestamp, actor, module, action, subject, detail } = r;
  return { timestamp, actor, module, action, subject, detail };
};

const mapProject = (p: any): Project => ({
  ...p,
  name: p.nameEn,
  startDate: p.startDate ?? "—",
  targetCompletion: p.targetCompletion ?? "—",
  contractValue: Number(p.contractValue ?? 0),
  gfa: Number(p.gfa ?? 0),
  plotArea: Number(p.plotArea ?? 0),
  progress: Number(p.progress ?? 0),
  budgetConsumed: Number(p.budgetConsumed ?? 0),
  hoursLogged: Number(p.hoursLogged ?? 0),
  hoursPlanned: Number(p.hoursPlanned ?? 0),
  daysToDeadline: Number(p.daysToDeadline ?? 0),
  openRFIs: Number(p.openRFIs ?? p.openRfis ?? 0),
  openNCRs: Number(p.openNCRs ?? p.openNcrs ?? 0),
  pendingApprovals: Number(p.pendingApprovals ?? 0),
  starred: !!p.starred,
});

const projectToApi = (p: any) => {
  const {
    createdAt,
    updatedAt,
    teamUserIds,
    name,
    openRFIs,
    openNCRs,
    startDate,
    targetCompletion,
    pmUserId,
    designLeadUserId,
    ...rest
  } = p;
  const body = {
    ...rest,
    id: uuidOrUndefined(p.id),
    startDate: isoDateOrUndefined(startDate),
    targetCompletion: isoDateOrUndefined(targetCompletion),
    pmUserId: uuidOrUndefined(pmUserId),
    designLeadUserId: uuidOrUndefined(designLeadUserId),
    openRfis: Number(openRFIs ?? p.openRfis ?? 0),
    openNcrs: Number(openNCRs ?? p.openNcrs ?? 0),
  };
  for (const key of Object.keys(body)) {
    if (body[key] == null || body[key] === "") {
      delete body[key];
    }
  }
  return body;
};

function normalizeAuditAction(action: string): AuditLogEntry["action"] {
  const last = action?.split("-")[0] as AuditLogEntry["action"];
  if (["create", "update", "delete", "approve", "reject", "issue", "view", "edit"].includes(last)) return last;
  if (action?.startsWith("issue")) return "issue";
  if (action?.startsWith("approve")) return "approve";
  if (action?.startsWith("reject")) return "reject";
  return "update";
}

// Generic backend-backed per-project collection keyed by `kind`, served by
// /api/v1/project-items. Same Collection<T> surface as createCollection, so
// Quality/HSE/Meetings/transmittal data is now multi-user like risks/drawings.
function itemCollection<T extends { id: string }>(kind: string, fallback?: T[]) {
  return createApiCollection<T>(
    `project-item-${kind}`,
    { list: `/project-items?kind=${kind}`, create: `/project-items`, update: (id) => `/project-items/${id}`, remove: (id) => `/project-items/${id}` },
    {
      fallback,
      beforeCreate: (e: any) => { const { id, createdAt, updatedAt, ...rest } = e; return { ...rest, kind }; },
      beforeUpdate: (e: any) => { const { id, createdAt, updatedAt, ...rest } = e; return rest; },
    },
  );
}

// Same generic pattern for finance sub-items, served by /api/v1/finance-items
// (finance:read/write). Makes cheques/recurring/utility/insurance/subscriptions/
// govt-fees/budgets/WPS/departments multi-user like AR/AP/Banking.
function financeItemCollection<T extends { id: string }>(kind: string, fallback?: T[]) {
  return createApiCollection<T>(
    `finance-item-${kind}`,
    { list: `/finance-items?kind=${kind}`, create: `/finance-items`, update: (id) => `/finance-items/${id}`, remove: (id) => `/finance-items/${id}` },
    {
      fallback,
      beforeCreate: (e: any) => { const { id, createdAt, updatedAt, ...rest } = e; return { ...rest, kind }; },
      beforeUpdate: (e: any) => { const { id, createdAt, updatedAt, ...rest } = e; return rest; },
    },
  );
}

// Phase 1: employees now live on the real backend. Same Collection<T> surface
// so all HR pages keep working without changes. SEED_EMPLOYEES is kept only as
// an offline fallback if the API is unreachable on first load.
export const employeesStore = createApiCollection<Employee>(
  "employees",
  {
    list: "/hr/employees",
    create: "/hr/employees",
    update: (id) => `/hr/employees/${id}`,
    remove: (id) => `/hr/employees/${id}`,
  },
  {
    fallback: SEED_EMPLOYEES,
    beforeCreate: (e) => {
      // Keep a client-generated UUID when present so Add Employee uploads can
      // attach files before the final save. Strip nested read-only collections.
      const { createdAt, updatedAt, documents, dependents, ...rest } = e as any;
      return rest;
    },
    beforeUpdate: (e) => {
      const { id, createdAt, updatedAt, documents, dependents, ...rest } = e as any;
      return rest;
    },
  },
);
// Phase 6: attendance domain on the real backend.
// Geofences echo {center:{lat,lng}, radiusM} for compatibility.
export const geofencesStore = createApiCollection<Geofence>(
  "geofences",
  { list: "/attendance/geofences", create: "/attendance/geofences", update: (id) => `/attendance/geofences/${id}`, remove: (id) => `/attendance/geofences/${id}` },
  { fallback: [OFFICE_GEOFENCE, ...SEED_GEOFENCES], beforeCreate: stripIdAndMeta, beforeUpdate: stripMeta },
);
export const punchesStore = createApiCollection<AttendancePunch>(
  "attendance-punches",
  { list: "/attendance/punches", create: "/attendance/punches", update: (id) => `/attendance/punches/${id}`, remove: (id) => `/attendance/punches/${id}` },
  { fallback: SEED_PUNCHES, beforeCreate: stripIdAndMeta, beforeUpdate: stripMeta },
);
// Phase 2: HR workflow tables move to the real backend. Same Collection<T> surface.
export const leavesStore = createApiCollection<LeaveRequest>(
  "leaves",
  { list: "/hr/leaves", create: "/hr/leaves", update: (id) => `/hr/leaves/${id}`, remove: (id) => `/hr/leaves/${id}` },
  { fallback: SEED_LEAVES, beforeCreate: stripIdAndMeta, beforeUpdate: stripMeta },
);
// Location pings: high-volume. Generic CRUD via API; mobile app should use
// /attendance/locations/batch to flush queued pings in one POST.
export const locationsStore = createApiCollection<LocationPing>(
  "locations",
  { list: "/attendance/locations", create: "/attendance/locations/batch", update: (id) => `/attendance/locations/${id}`, remove: (id) => `/attendance/locations/${id}` },
  {
    fallback: SEED_LOCATIONS,
    // Batch endpoint expects { pings: [...] } — for one-off pushes wrap as a 1-element batch
    beforeCreate: (p: any) => ({ pings: [stripIdAndMeta(p)] }),
    beforeUpdate: stripMeta,
  },
);
export const trainingStore = createApiCollection<TrainingRecord>(
  "training",
  { list: "/hr/training", create: "/hr/training", update: (id) => `/hr/training/${id}`, remove: (id) => `/hr/training/${id}` },
  { fallback: SEED_TRAINING, mapResponse: mapTraining, beforeCreate: trainingToApi, beforeUpdate: trainingToApi },
);
export const assetsStore = createApiCollection<AssetAssignment>(
  "assets",
  { list: "/hr/assets", create: "/hr/assets", update: (id) => `/hr/assets/${id}`, remove: (id) => `/hr/assets/${id}` },
  { fallback: SEED_ASSETS, mapResponse: mapAsset, beforeCreate: assetToApi, beforeUpdate: assetToApi },
);
export const disciplinaryStore = createApiCollection<DisciplinaryRecord>(
  "disciplinary",
  { list: "/hr/disciplinary", create: "/hr/disciplinary", update: (id) => `/hr/disciplinary/${id}`, remove: (id) => `/hr/disciplinary/${id}` },
  { fallback: SEED_DISCIPLINARY, mapResponse: mapDisciplinary, beforeCreate: disciplinaryToApi, beforeUpdate: disciplinaryToApi },
);
export const reviewsStore = createApiCollection<PerformanceReview>(
  "performance-reviews",
  { list: "/hr/reviews", create: "/hr/reviews", update: (id) => `/hr/reviews/${id}`, remove: (id) => `/hr/reviews/${id}` },
  { fallback: SEED_REVIEWS, mapResponse: mapReview, beforeCreate: reviewToApi, beforeUpdate: reviewToApi },
);
export const onboardingStore = createApiCollection<OnboardingRecord>(
  "onboarding",
  { list: "/hr/onboarding", create: "/hr/onboarding", update: (id) => `/hr/onboarding/${id}`, remove: (id) => `/hr/onboarding/${id}` },
  { fallback: SEED_ONBOARDING, beforeCreate: stripIdAndMeta, beforeUpdate: stripMeta },
);
export const lettersStore = createApiCollection<IssuedLetter>(
  "hr-letters",
  { list: "/hr/letters", create: "/hr/letters", update: (id) => `/hr/letters/${id}`, remove: (id) => `/hr/letters/${id}` },
  { fallback: SEED_LETTERS, mapResponse: mapLetter, beforeCreate: letterToApi, beforeUpdate: letterToApi },
);
export const auditStore = createApiCollection<AuditLogEntry>(
  "audit-log",
  { list: "/audit", create: "/audit", update: (id) => `/audit/${id}`, remove: (id) => `/audit/${id}` },
  { fallback: SEED_AUDIT, mapResponse: mapAudit, beforeCreate: auditToApi, beforeUpdate: auditToApi },
);
export const usersStore = createApiCollection<User>(
  "users",
  {
    list: "/admin/users",
    create: "/auth/register",
    update: (id) => `/admin/users/${id}`,
    remove: (id) => `/admin/users/${id}`,
  },
  {
    fallback: SEED_USERS,
    mapResponse: (u: any) => ({
      id: u.id,
      username: u.email,
      displayName: u.displayName,
      role: u.role,
      office: u.office,
      employeeId: u.employeeId ?? undefined,
      active: u.status === "active",
      avatarColor: u.avatarColor ?? undefined,
      extraPermissions: u.extraPermissions ?? [],
      lastLoginAt: u.lastLoginAt ?? undefined,
    }),
    beforeCreate: (u: User) => ({
      email: u.username,
      password: u.passwordHash || "password",
      displayName: u.displayName,
      role: u.role,
      office: u.role === "contractor" ? undefined : "dubai",
      employeeId: u.employeeId || undefined,
      status: u.active ? "active" : "disabled",
      avatarColor: u.avatarColor || undefined,
    }),
    beforeUpdate: (u: User) => {
      const { id, username, active, lastLoginAt, createdAt, updatedAt, passwordHash, ...rest } = u as any;
      const body: any = {
        ...rest,
        email: username,
        status: active ? "active" : "disabled",
      };
      if (passwordHash && passwordHash !== "password") {
        body.password = passwordHash;
      }
      return body;
    },
  }
);
export const docFoldersStore = createApiCollection<DocFolder>(
  "doc-folders",
  { list: "/projects/doc-folders", create: "/projects/doc-folders", update: (id) => `/projects/doc-folders/${id}`, remove: (id) => `/projects/doc-folders/${id}` },
  { fallback: SEED_FOLDERS, beforeCreate: stripIdAndMeta, beforeUpdate: stripMeta },
);
export const documentsStore = createApiCollection<DocumentFile>(
  "documents",
  { list: "/projects/documents", create: "/projects/documents", update: (id) => `/projects/documents/${id}`, remove: (id) => `/projects/documents/${id}` },
  { fallback: SEED_DOC_FILES, beforeCreate: stripIdAndMeta, beforeUpdate: stripMeta },
);
// Phase 3: project-scoped stores move to API. Approvals + authority-submittals
// live at /api/v1/projects/approvals and /authority-submittals respectively.
export const authoritySubmittalsStore = createApiCollection<AuthoritySubmittal>(
  "authority-submittals",
  {
    list: "/projects/authority-submittals",
    create: "/projects/authority-submittals",
    update: (id) => `/projects/authority-submittals/${id}`,
    remove: (id) => `/projects/authority-submittals/${id}`,
  },
  { fallback: SEED_AUTHORITY_SUBMITTALS, beforeCreate: stripIdAndMeta, beforeUpdate: stripMeta },
);
export const stageApprovalsStore = createApiCollection<StageGateApproval>(
  "stage-gate-approvals",
  {
    list: "/projects/approvals",
    create: "/projects/approvals",
    update: (id) => `/projects/approvals/${id}`,
    remove: (id) => `/projects/approvals/${id}`,
  },
  { beforeCreate: stripMeta, beforeUpdate: stripMeta },
);
export const leaveHandoversStore = createCollection<LeaveHandover>("leave-handovers", []);
export const risksStore = createApiCollection<ProjectRisk>(
  "project-risks",
  { list: "/projects/risks", create: "/projects/risks", update: (id) => `/projects/risks/${id}`, remove: (id) => `/projects/risks/${id}` },
  { fallback: SEED_RISKS, beforeCreate: stripIdAndMeta, beforeUpdate: stripMeta },
);
export const lessonItemsStore = createCollection<LessonItem>("lesson-items", SEED_LESSON_ITEMS);
export const lessonResponsesStore = createCollection<LessonResponse>("lesson-responses", []);

// ===== Tier 1 modules: DCC, Quality, HSE, Procurement =====
export const drawingsStore = createApiCollection<Drawing>(
  "drawings",
  { list: "/projects/drawings", create: "/projects/drawings", update: (id) => `/projects/drawings/${id}`, remove: (id) => `/projects/drawings/${id}` },
  { fallback: SEED_DRAWINGS, beforeCreate: stripIdAndMeta, beforeUpdate: stripMeta },
);
// Drawing revisions are stored as JSONB on the parent drawing — kept as local collection for now
export const drawingRevisionsStore = itemCollection<DrawingRevision>("drawing-revision", SEED_DRAWING_REVISIONS);
export const transmittalsStore = itemCollection<Transmittal>("transmittal", SEED_TRANSMITTALS);
export const rfisStore = createApiCollection<Rfi>(
  "rfis",
  { list: "/projects/rfis", create: "/projects/rfis", update: (id) => `/projects/rfis/${id}`, remove: (id) => `/projects/rfis/${id}` },
  { fallback: SEED_RFIS, beforeCreate: stripIdAndMeta, beforeUpdate: stripMeta },
);

export const ncrsStore = itemCollection<NCR>("ncr", SEED_NCRS);
export const inspectionRequestsStore = itemCollection<InspectionRequest>("ir", SEED_IRS);
export const marsStore = itemCollection<MAR>("mar", SEED_MARS);
export const wirsStore = itemCollection<WIR>("wir", SEED_WIRS);

export const incidentsStore = itemCollection<Incident>("incident", SEED_INCIDENTS);
export const toolboxTalksStore = itemCollection<ToolboxTalk>("toolbox", SEED_TOOLBOX_TALKS);
export const safetyInspectionsStore = itemCollection<SafetyInspection>("inspection", SEED_SAFETY_INSPECTIONS);
export const ppeIssuancesStore = itemCollection<PPEIssuance>("ppe", SEED_PPE_ISSUANCES);

const procurementApi = (path: string) => ({
  list: `/procurement/${path}`, create: `/procurement/${path}`,
  update: (id: string) => `/procurement/${path}/${id}`,
  remove: (id: string) => `/procurement/${path}/${id}`,
});
const mapLpo = (r: any): LPO => ({
  ...r,
  subtotal: Number(r.subtotal ?? 0),
  vatTotal: Number(r.vatTotal ?? r.vat_total ?? 0),
  total: Number(r.total ?? 0),
  lines: r.lines ?? [],
  linkedGrnIds: r.linkedGrnIds ?? r.linked_grn_ids ?? [],
});
const lpoToApi = (r: any) => {
  const { id, createdAt, updatedAt, attachmentUrl, subtotal, vatTotal, total, ...rest } = r;
  return rest;
};
const mapGrn = (r: any): GRN => ({
  ...r,
  lines: r.lines ?? [],
});
const grnToApi = (r: any) => {
  const { id, createdAt, updatedAt, attachmentUrl, ...rest } = r;
  return rest;
};

export const lposStore = createApiCollection<LPO>("lpos", procurementApi("lpos"),
  { fallback: SEED_LPOS, mapResponse: mapLpo, beforeCreate: lpoToApi, beforeUpdate: lpoToApi });
export const grnsStore = createApiCollection<GRN>("grns", procurementApi("grns"),
  { fallback: SEED_GRNS, mapResponse: mapGrn, beforeCreate: grnToApi, beforeUpdate: grnToApi });

// ===== Finance & Accounting stores (Phase 8) =====
const finApi = (path: string) => ({
  list: `/finance/${path}`, create: `/finance/${path}`,
  update: (id: string) => `/finance/${path}/${id}`,
  remove: (id: string) => `/finance/${path}/${id}`,
});
export const glAccountsStore = createApiCollection<GLAccount>("gl-accounts", finApi("gl-accounts"),
  { fallback: SEED_COA, beforeCreate: stripIdAndMeta, beforeUpdate: stripMeta });
export const journalEntriesStore = createApiCollection<JournalEntry>("journal-entries", finApi("journal-entries"),
  { fallback: SEED_JOURNAL_ENTRIES, beforeCreate: stripIdAndMeta, beforeUpdate: stripMeta });
export const vatReturnsStore = financeItemCollection<VatReturn>("vat-return", SEED_VAT_RETURNS);
export const customersStore = createApiCollection<Customer>("customers", finApi("customers"),
  { fallback: SEED_CUSTOMERS, beforeCreate: stripIdAndMeta, beforeUpdate: stripMeta });
export const arInvoicesStore = createApiCollection<ARInvoice>("ar-invoices", finApi("ar-invoices"),
  { fallback: SEED_AR_INVOICES, beforeCreate: stripIdAndMeta, beforeUpdate: stripMeta });
export const arReceiptsStore = createApiCollection<ARReceipt>("ar-receipts", finApi("ar-receipts"),
  { fallback: SEED_RECEIPTS, beforeCreate: stripIdAndMeta, beforeUpdate: stripMeta });
export const suppliersStore = createApiCollection<Supplier>("suppliers", finApi("suppliers"),
  { fallback: SEED_SUPPLIERS, beforeCreate: stripIdAndMeta, beforeUpdate: stripMeta });
export const apBillsStore = createApiCollection<APBill>("ap-bills", finApi("ap-bills"),
  { fallback: SEED_AP_BILLS, beforeCreate: stripIdAndMeta, beforeUpdate: stripMeta });
export const supplierPaymentsStore = createApiCollection<SupplierPayment>("supplier-payments", finApi("supplier-payments"),
  { fallback: SEED_SUPPLIER_PAYMENTS, beforeCreate: stripIdAndMeta, beforeUpdate: stripMeta });
export const bankAccountsStore = createApiCollection<BankAccount>("bank-accounts", finApi("bank-accounts"),
  { fallback: SEED_BANK_ACCOUNTS, beforeCreate: stripIdAndMeta, beforeUpdate: stripMeta });
export const bankTransactionsStore = createApiCollection<BankTransaction>("bank-transactions", finApi("bank-transactions"),
  { fallback: SEED_BANK_TRANSACTIONS, beforeCreate: stripIdAndMeta, beforeUpdate: stripMeta });
export const chequesStore = financeItemCollection<ChequeRegister>("cheque", SEED_CHEQUES);
export const pettyCashFloatsStore = financeItemCollection<PettyCashFloat>("petty-float", SEED_PETTY_CASH_FLOATS);
export const pettyCashVouchersStore = financeItemCollection<PettyCashVoucher>("petty-voucher", SEED_PETTY_VOUCHERS);
export const recurringExpensesStore = financeItemCollection<RecurringExpense>("recurring", SEED_RECURRING_EXPENSES);
export const utilityBillsStore = financeItemCollection<UtilityBill>("utility-bill", SEED_UTILITY_BILLS);
export const insurancePoliciesStore = financeItemCollection<InsurancePolicy>("insurance-policy", SEED_INSURANCE_POLICIES);
export const insuranceClaimsStore = financeItemCollection<InsuranceClaim>("insurance-claim", SEED_INSURANCE_CLAIMS);
export const fixedAssetsStore = financeItemCollection<FixedAsset>("fixed-asset", SEED_FIXED_ASSETS);
export const subscriptionsStore = financeItemCollection<FinSubscription>("subscription", SEED_SUBSCRIPTIONS);
export const governmentFeesStore = financeItemCollection<GovernmentFee>("govt-fee", SEED_GOVERNMENT_FEES);
export const budgetsStore = financeItemCollection<Budget>("budget", SEED_BUDGETS);
export const departmentsStore = financeItemCollection<FinDepartment>("department", SEED_DEPARTMENTS);
export const wpsRunsStore = financeItemCollection<WpsRun>("wps-run", SEED_WPS_RUNS);
export const payrollRunsStore = financeItemCollection<PayrollRun>("payroll-run");
export const corporateTaxReturnsStore = financeItemCollection<CorporateTaxReturn>("corporate-tax-return");
export const bankReconciliationsStore = financeItemCollection<BankReconciliation>("bank-reconciliation");
export const retentionReleasesStore = financeItemCollection<RetentionRelease>("retention-release");
export const tasksStore = createApiCollection<Task>(
  "tasks",
  { list: "/tasks", create: "/tasks", update: (id) => `/tasks/${id}`, remove: (id) => `/tasks/${id}` },
  { fallback: SEED_TASKS, beforeCreate: stripIdAndMeta, beforeUpdate: stripMeta },
);
// Phase 10: contractor portal stores hit the backend.
export const contractorsStore = createApiCollection<ContractorCompany>(
  "contractors",
  { list: "/contractor/companies", create: "/contractor/companies", update: (id) => `/contractor/companies/${id}`, remove: (id) => `/contractor/companies/${id}` },
  { fallback: DEMO_CONTRACTORS, beforeCreate: (c: any) => { const { id, users, ...rest } = c; return rest; }, beforeUpdate: (c: any) => { const { id, users, ...rest } = c; return rest; } },
);
// Contractor-company membership records (links auth users to companies).
// Read-mostly: used by lib/contractor/lookup.ts to resolve the signed-in
// contractor's company. Writes go through ContractorAccessTab (staff only).
export type ContractorUserLink = { id: string; companyId: string; userId?: string | null; name: string; email: string; role: string; avatar?: string | null };
export const contractorUsersStore = createApiCollection<ContractorUserLink>(
  "contractor-users",
  { list: "/contractor/users", create: "/contractor/users", update: (id) => `/contractor/users/${id}`, remove: (id) => `/contractor/users/${id}` },
  { beforeCreate: stripIdAndMeta, beforeUpdate: stripMeta },
);
export const submittalsStore = createApiCollection<PortalSubmittal>(
  "submittals",
  { list: "/contractor/submittals", create: "/contractor/submittals", update: (id) => `/contractor/submittals/${id}`, remove: (id) => `/contractor/submittals/${id}` },
  { fallback: DEMO_SUBMITTALS, beforeCreate: stripIdAndMeta, beforeUpdate: stripMeta },
);
// Submittal messages are scoped to a submittal — surfaced via dedicated
// /contractor/submittals/:id/messages endpoints; this collection lists all
// messages the current user can see (used by inbox aggregations).
export const submittalCommentsStore = createCollection<SubmittalComment>("submittal-comments", []);
export const consultantIssuedStore = createCollection<ConsultantIssuedItem>("consultant-issued", DEMO_CONSULTANT_ISSUED);
export const leadsStore = createApiCollection<Lead>(
  "leads",
  { list: "/crm/leads", create: "/crm/leads", update: (id) => `/crm/leads/${id}`, remove: (id) => `/crm/leads/${id}` },
  { fallback: SEED_LEADS, beforeCreate: stripIdAndMeta, beforeUpdate: stripMeta },
);
export const leadActivitiesStore = createApiCollection<LeadActivity>(
  "lead-activities",
  { list: "/crm/lead-activities", create: "/crm/lead-activities", update: (id) => `/crm/lead-activities/${id}`, remove: (id) => `/crm/lead-activities/${id}` },
  { fallback: SEED_LEAD_ACTIVITIES, beforeCreate: stripIdAndMeta, beforeUpdate: stripMeta },
);
export const projectsStore = createApiCollection<Project>(
  "projects",
  {
    list: "/projects",
    create: "/projects",
    update: (id) => `/projects/${id}`,
    remove: (id) => `/projects/${id}`,
  },
  {
    mapResponse: mapProject,
    beforeCreate: projectToApi,
    beforeUpdate: projectToApi,
  },
);
// Read receipts for client-derived alerts (doc expiries, overdue tasks, …).
// Derived alerts are computed on the fly and never exist on the server, so
// their read state is kept locally per device — same behaviour as the
// original localStorage backend.
export const notificationReadFlagsStore = createCollection<{ id: string; readAt: string }>("notification-read-flags", []);
// Phase 11: notifications served from /api/v1/notifications. Realtime updates
// arrive via socket.io ("notification" event) — components that want live
// updates should call useRealtime("notification", ...) and re-fetch.
export const notificationsStore = createApiCollection<Notification>(
  "notifications",
  {
    list: "/notifications",
    create: "/notifications",
    update: (id) => `/notifications/${id}`,
    remove: (id) => `/notifications/${id}`,
  },
  { beforeCreate: stripIdAndMeta, beforeUpdate: stripMeta },
);
// Phase 9: files live on the backend. Uploads now go through
// lib/files/api.ts (multipart). This collection exposes the user-visible
// list for legacy callers that just want to enumerate or remove files.
// Direct .put() of a StoredFile is no longer supported — use uploadFile().
export const filesStore = createApiCollection<StoredFile>(
  "files",
  {
    list: "/files",
    create: "/files",
    update: (id) => `/files/${id}`,
    remove: (id) => `/files/${id}`,
  },
  {
    beforeCreate: (f: any) => {
      console.warn("[filesStore] .put() ignored — use uploadFile() from lib/files/api.ts");
      return { entityType: f.entityType, entityId: f.entityId };
    },
    beforeUpdate: stripMeta,
  },
);
export const timerSessionsStore = createApiCollection<TaskTimerSession>(
  "timer-sessions",
  {
    list: "/tasks/sessions/all",
    // Sessions are started/stopped via dedicated /tasks/:id/timer endpoints.
    // The generic create/update/remove paths below exist only to satisfy the
    // Collection<T> interface; UI components should call the timer API directly
    // (see client/src/lib/timer/api.ts in Phase 5+).
    create: "/tasks/sessions/all",
    update: (id) => `/tasks/sessions/${id}`,
    remove: (id) => `/tasks/sessions/${id}`,
  },
  { beforeCreate: stripIdAndMeta, beforeUpdate: stripMeta },
);

export const activeTimerStore = createSingleton<ActiveTimer>("active-timer", null);
export const sessionStore = createSingleton<Session | null>("session", null);

// Read-only directory of real backend users (id = real UUID) for assignment
// pickers — task assignee, reviewers, etc. Replaces the legacy localStorage
// usersStore in those contexts so assignments persist against real accounts.
export type DirectoryUser = { id: string; displayName: string; role: string; office?: string | null; employeeId?: string | null };
// Per-project meetings & minutes (local store — no backend table yet).
export type ProjectMeeting = { id: string; projectId: string; date: string; title: string; attendees: string; notes?: string; status: string; createdAt: string };
export const projectMeetingsStore = itemCollection<ProjectMeeting>("meeting");
export const designDeliverablesStore = itemCollection<DesignDeliverable>("design-deliverable", SEED_DESIGN_DELIVERABLES);

export const userDirectoryStore = createApiCollection<DirectoryUser>(
  "user-directory",
  { list: "/users/directory", create: "/users/directory", update: (id) => `/users/directory/${id}`, remove: (id) => `/users/directory/${id}` },
  {},
);
