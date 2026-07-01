import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { attachCrud, dateOrNull, numStrOrNull } from "../../lib/crud.js";
import {
  projectRisks, docFolders, projectDocuments, drawings, rfis,
} from "../../db/schema/index.js";

export const projectExtrasRouter = Router();
projectExtrasRouter.use(requireAuth);

const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// -------------------- RISKS --------------------
const actionSchema = z.object({
  id: z.string(),
  action: z.string(),
  ownerUserId: z.string().optional(),
  ownerDisplay: z.string().optional(),
  dueDate: iso.optional(),
  status: z.string(),
  completedAt: z.string().optional(),
  note: z.string().optional(),
}).passthrough();

const reviewSchema = z.object({
  id: z.string(),
  reviewedAt: z.string(),
  reviewedByDisplay: z.string(),
  prevStatus: z.string().optional(),
  newStatus: z.string(),
  prevScore: z.number(),
  newScore: z.number(),
  note: z.string().optional(),
}).passthrough();

const riskCreate = z.object({
  projectId: z.string().uuid(),
  code: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  phase: z.string(),
  stageRef: z.string().optional(),
  authorityRef: z.string().optional(),
  inherentProbability: z.number().int(),
  inherentImpact: z.number().int(),
  residualProbability: z.number().int().optional(),
  residualImpact: z.number().int().optional(),
  treatment: z.enum(["avoid","transfer","mitigate","accept"]),
  treatmentRationale: z.string().optional(),
  costImpactAed: z.number().optional(),
  scheduleImpactDays: z.number().int().optional(),
  ownerUserId: z.string().uuid().optional(),
  ownerDisplay: z.string().optional(),
  raisedByUserId: z.string().uuid().optional(),
  raisedByDisplay: z.string().optional(),
  raisedAt: z.string().optional(),
  triggerConditions: z.string().optional(),
  earlyWarningSigns: z.string().optional(),
  contingencyPlan: z.string().optional(),
  linkedTaskIds: z.array(z.string()).optional(),
  linkedDocumentIds: z.array(z.string()).optional(),
  linkedSubmittalIds: z.array(z.string()).optional(),
  status: z.enum(["identified","assessed","treated","monitoring","escalated","closed","realised"]).optional(),
  reviewFrequency: z.enum(["weekly","fortnightly","monthly","stage-gate","ad-hoc"]).optional(),
  nextReviewDate: iso.optional(),
  lastReviewedAt: z.string().optional(),
  actions: z.array(actionSchema).optional(),
  reviews: z.array(reviewSchema).optional(),
  closedAt: z.string().optional(),
  closureReason: z.string().optional(),
  lessonsLearned: z.string().optional(),
});

attachCrud(projectExtrasRouter, "/risks", {
  table: projectRisks,
  idColumn: projectRisks.id,
  createSchema: riskCreate,
  updateSchema: riskCreate.partial(),
  perms: { read: "projects:read", write: "projects:write" },
  entityType: "risk",
  orderBy: projectRisks.createdAt,
  beforeCreate: (i) => ({
    ...i,
    costImpactAed: numStrOrNull(i.costImpactAed),
    nextReviewDate: dateOrNull(i.nextReviewDate),
    raisedAt: i.raisedAt ? new Date(i.raisedAt) : new Date(),
    lastReviewedAt: i.lastReviewedAt ? new Date(i.lastReviewedAt) : null,
    closedAt: i.closedAt ? new Date(i.closedAt) : null,
  }),
  beforeUpdate: (i) => ({
    ...i,
    costImpactAed: i.costImpactAed !== undefined ? numStrOrNull(i.costImpactAed) : undefined,
    nextReviewDate: i.nextReviewDate !== undefined ? dateOrNull(i.nextReviewDate) : undefined,
    lastReviewedAt: i.lastReviewedAt !== undefined ? (i.lastReviewedAt ? new Date(i.lastReviewedAt) : null) : undefined,
    closedAt: i.closedAt !== undefined ? (i.closedAt ? new Date(i.closedAt) : null) : undefined,
    updatedAt: new Date(),
  }),
});

// -------------------- DOC FOLDERS --------------------
const folderCreate = z.object({
  projectId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  order: z.number().int().default(0),
  code: z.string().optional(),
  name: z.string().min(1),
  accessRoles: z.array(z.string()).optional(),
  retention: z.string().optional(),
  indicator: z.string().optional(),
});
attachCrud(projectExtrasRouter, "/doc-folders", {
  table: docFolders,
  idColumn: docFolders.id,
  createSchema: folderCreate,
  updateSchema: folderCreate.partial(),
  perms: { read: "documents:read", write: "documents:write" },
  entityType: "doc-folder",
});

// -------------------- PROJECT DOCUMENTS --------------------
const documentCreate = z.object({
  folderId: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string().min(1),
  category: z.string().optional(),
  status: z.enum(["draft","for-approval","final","stamped","superseded"]).default("draft"),
  version: z.string().default("v1.0"),
  uploadedByUserId: z.string().uuid().optional(),
  uploadedByDisplay: z.string().optional(),
  sizeBytes: z.number().int().default(0),
  mimeType: z.string().optional(),
  fileStoreId: z.string().uuid().optional(),
  notes: z.string().optional(),
});
attachCrud(projectExtrasRouter, "/documents", {
  table: projectDocuments,
  idColumn: projectDocuments.id,
  createSchema: documentCreate,
  updateSchema: documentCreate.partial(),
  perms: { read: "documents:read", write: "documents:write" },
  entityType: "document",
  orderBy: projectDocuments.uploadedAt,
  beforeCreate: (i, req) => ({
    ...i,
    uploadedByUserId: i.uploadedByUserId ?? req.user!.sub,
  }),
});

// -------------------- DRAWINGS --------------------
const drawingCreate = z.object({
  projectId: z.string().uuid(),
  drawingNumber: z.string().min(1),
  title: z.string().min(1),
  discipline: z.string(),
  scale: z.string().optional(),
  paperSize: z.enum(["A0","A1","A2","A3","A4"]).optional(),
  currentRev: z.string().default("P01"),
  currentStatus: z.string(),
  preparedByDisplay: z.string().optional(),
  checkedByDisplay: z.string().optional(),
  approvedByDisplay: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  revisions: z.array(z.any()).optional(),
});
attachCrud(projectExtrasRouter, "/drawings", {
  table: drawings,
  idColumn: drawings.id,
  createSchema: drawingCreate,
  updateSchema: drawingCreate.partial(),
  perms: { read: "documents:read", write: "documents:write" },
  entityType: "drawing",
  orderBy: drawings.createdAt,
  beforeUpdate: (i) => ({ ...i, updatedAt: new Date() }),
});

// -------------------- RFIs --------------------
const rfiCreate = z.object({
  reference: z.string().min(1),
  projectId: z.string().uuid(),
  date: iso,
  raisedByCompany: z.string(),
  raisedByDisplay: z.string(),
  raisedToDiscipline: z.string().optional(),
  raisedToDisplay: z.string().optional(),
  subject: z.string().min(1),
  question: z.string().min(1),
  drawingRefs: z.array(z.string()).optional(),
  specificationRefs: z.array(z.string()).optional(),
  priority: z.enum(["low","medium","high","urgent"]).default("medium"),
  dueDate: iso.optional(),
  status: z.enum(["draft","open","awaiting-response","responded","closed","void"]).default("draft"),
  responses: z.array(z.any()).optional(),
  costImpact: z.number().optional(),
  scheduleImpactDays: z.number().int().optional(),
  closureNote: z.string().optional(),
  closedAt: z.string().optional(),
  closedByDisplay: z.string().optional(),
});
attachCrud(projectExtrasRouter, "/rfis", {
  table: rfis,
  idColumn: rfis.id,
  createSchema: rfiCreate,
  updateSchema: rfiCreate.partial(),
  perms: { read: "projects:read", write: "projects:write" },
  entityType: "rfi",
  orderBy: rfis.createdAt,
  beforeCreate: (i) => ({
    ...i,
    costImpact: numStrOrNull(i.costImpact),
    dueDate: dateOrNull(i.dueDate),
    closedAt: i.closedAt ? new Date(i.closedAt) : null,
  }),
  beforeUpdate: (i) => ({
    ...i,
    costImpact: i.costImpact !== undefined ? numStrOrNull(i.costImpact) : undefined,
    dueDate: i.dueDate !== undefined ? dateOrNull(i.dueDate) : undefined,
    closedAt: i.closedAt !== undefined ? (i.closedAt ? new Date(i.closedAt) : null) : undefined,
    updatedAt: new Date(),
  }),
});
