// Aggregates the 5 "simple CRUD" HR endpoints into one router file:
// training, assets, disciplinary, reviews, onboarding.
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { attachCrud, dateOrNull, numStrOrNull } from "../../lib/crud.js";
import {
  trainingRecords, assetAssignments, disciplinaryActions,
  performanceReviews, onboardingChecklists,
} from "../../db/schema/index.js";

export const hrSimpleRouter = Router();
hrSimpleRouter.use(requireAuth);

const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// ---------------- TRAINING ----------------
const trainingCreate = z.object({
  employeeId: z.string().uuid(),
  name: z.string().min(1),
  provider: z.string().optional(),
  category: z.enum(["professional","safety","technical","soft-skills","compliance"]),
  issueDate: iso.optional(),
  expiryDate: iso.optional(),
  costAed: z.number().optional(),
  certificateFileId: z.string().uuid().optional(),
  notes: z.string().optional(),
});
attachCrud(hrSimpleRouter, "/training", {
  table: trainingRecords,
  idColumn: trainingRecords.id,
  createSchema: trainingCreate,
  updateSchema: trainingCreate.partial(),
  perms: { read: "hr:read", write: "hr:write" },
  entityType: "training",
  orderBy: trainingRecords.createdAt,
  beforeCreate: (i) => ({
    ...i,
    issueDate: dateOrNull(i.issueDate),
    expiryDate: dateOrNull(i.expiryDate),
    costAed: numStrOrNull(i.costAed),
  }),
  beforeUpdate: (i) => ({
    ...i,
    issueDate: i.issueDate !== undefined ? dateOrNull(i.issueDate) : undefined,
    expiryDate: i.expiryDate !== undefined ? dateOrNull(i.expiryDate) : undefined,
    costAed: i.costAed !== undefined ? numStrOrNull(i.costAed) : undefined,
  }),
});

// ---------------- ASSETS ----------------
const assetCreate = z.object({
  employeeId: z.string().uuid(),
  type: z.enum(["laptop","phone","vehicle","software","tool","uniform","other"]),
  identifier: z.string().min(1),
  description: z.string().min(1),
  assignedDate: iso,
  returnedDate: iso.optional(),
  condition: z.enum(["new","good","fair","damaged"]).optional(),
  estimatedValueAed: z.number().optional(),
  notes: z.string().optional(),
});
attachCrud(hrSimpleRouter, "/assets", {
  table: assetAssignments,
  idColumn: assetAssignments.id,
  createSchema: assetCreate,
  updateSchema: assetCreate.partial(),
  perms: { read: "hr:read", write: "hr:write" },
  entityType: "asset-assignment",
  orderBy: assetAssignments.createdAt,
  beforeCreate: (i) => ({
    ...i,
    returnedDate: dateOrNull(i.returnedDate),
    estimatedValueAed: numStrOrNull(i.estimatedValueAed),
  }),
  beforeUpdate: (i) => ({
    ...i,
    returnedDate: i.returnedDate !== undefined ? dateOrNull(i.returnedDate) : undefined,
    estimatedValueAed: i.estimatedValueAed !== undefined ? numStrOrNull(i.estimatedValueAed) : undefined,
  }),
});

// ---------------- DISCIPLINARY ----------------
const disciplinaryCreate = z.object({
  employeeId: z.string().uuid(),
  date: iso,
  type: z.enum(["verbal-warning","written-warning","suspension","final-warning","termination"]),
  reason: z.string().min(1),
  detail: z.string().optional(),
  acknowledgedByEmployee: z.boolean().optional().default(false),
  attachedFileIds: z.array(z.string().uuid()).optional().default([]),
});
attachCrud(hrSimpleRouter, "/disciplinary", {
  table: disciplinaryActions,
  idColumn: disciplinaryActions.id,
  createSchema: disciplinaryCreate,
  updateSchema: disciplinaryCreate.partial(),
  perms: { read: "hr:disciplinary:read", write: "hr:disciplinary:write" },
  entityType: "disciplinary",
  orderBy: disciplinaryActions.createdAt,
  beforeCreate: (i, req) => ({ ...i, issuedByUserId: req.user!.sub }),
});

// ---------------- REVIEWS ----------------
const reviewCreate = z.object({
  employeeId: z.string().uuid(),
  period: z.string().min(1),
  reviewerUserId: z.string().uuid().optional(),
  date: iso,
  scores: z.array(z.object({
    dimension: z.string(),
    score: z.number(),
    max: z.number(),
    comment: z.string().optional(),
  })),
  overallRating: z.number(),
  managerComments: z.string(),
  employeeComments: z.string().optional(),
  status: z.enum(["draft","submitted","acknowledged"]).optional(),
});
attachCrud(hrSimpleRouter, "/reviews", {
  table: performanceReviews,
  idColumn: performanceReviews.id,
  createSchema: reviewCreate,
  updateSchema: reviewCreate.partial(),
  perms: { read: "hr:reviews:read", write: "hr:reviews:write" },
  entityType: "review",
  orderBy: performanceReviews.createdAt,
  beforeCreate: (i, req) => ({
    ...i,
    reviewerUserId: i.reviewerUserId ?? req.user!.sub,
    overallRating: String(i.overallRating),
  }),
  beforeUpdate: (i) => ({
    ...i,
    overallRating: i.overallRating !== undefined ? String(i.overallRating) : undefined,
  }),
});

// ---------------- ONBOARDING ----------------
const onboardingStep = z.object({
  key: z.string(),
  label: z.string(),
  status: z.enum(["pending","in-progress","complete","skipped"]),
  completedAt: z.string().optional(),
  note: z.string().optional(),
});
const onboardingCreate = z.object({
  employeeId: z.string().uuid(),
  expectedJoinDate: iso,
  status: z.enum(["in-progress","complete","abandoned"]).optional(),
  steps: z.array(onboardingStep),
});
attachCrud(hrSimpleRouter, "/onboarding", {
  table: onboardingChecklists,
  idColumn: onboardingChecklists.id,
  createSchema: onboardingCreate,
  updateSchema: onboardingCreate.partial(),
  perms: { read: "hr:read", write: "hr:write" },
  entityType: "onboarding",
  orderBy: onboardingChecklists.updatedAt,
});
