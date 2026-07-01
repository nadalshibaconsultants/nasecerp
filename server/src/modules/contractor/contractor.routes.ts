import { Router } from "express";
import { z } from "zod";
import { and, eq, sql, desc } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  contractorCompanies, contractorUsers, submittals, submittalRevisions, submittalMessages,
} from "../../db/schema/index.js";
import { requireAuth } from "../../middleware/auth.js";
import { requirePerm, requireRole } from "../../middleware/rbac.js";
import { writeAudit } from "../../middleware/audit.js";
import { HttpError } from "../../middleware/errors.js";
import { attachCrud } from "../../lib/crud.js";
import { pickReviewer, pickApprover, computeSlaDeadline } from "./routing.js";
import { emitToProject } from "../../lib/realtime.js";

export const contractorRouter = Router();
contractorRouter.use(requireAuth);

// ---------------- COMPANIES ----------------
const companyCreate = z.object({
  name: z.string().min(1),
  tradeLicense: z.string().min(1),
  type: z.string().min(1),
  trades: z.array(z.string()).default([]),
  status: z.enum(["active", "invited", "suspended"]).optional(),
  allowedTypes: z.array(z.string()).default([]),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
});

attachCrud(contractorRouter, "/companies", {
  table: contractorCompanies,
  idColumn: contractorCompanies.id,
  createSchema: companyCreate,
  updateSchema: companyCreate.partial(),
  perms: { read: "projects:read", write: "projects:write" },
  entityType: "contractor-company",
  orderBy: contractorCompanies.createdAt,
});

// ---------------- COMPANY USERS ----------------
const userCreate = z.object({
  companyId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(["Admin", "Engineer", "Coordinator"]),
  avatar: z.string().optional(),
});

contractorRouter.get("/users", requirePerm("projects:read"), async (req, res, next) => {
  try {
    const { companyId } = req.query as Record<string, string>;
    const q = companyId
      ? db.select().from(contractorUsers).where(eq(contractorUsers.companyId, companyId))
      : db.select().from(contractorUsers);
    res.json(await q);
  } catch (e) { next(e); }
});

contractorRouter.post("/users", requirePerm("projects:write"), async (req, res, next) => {
  try {
    const input = userCreate.parse(req.body);
    const inserted = await db.insert(contractorUsers).values(input as any).returning();
    await writeAudit(req, { action: "create-contractor-user", entityType: "contractor-user", entityId: inserted[0].id, after: input });
    res.status(201).json(inserted[0]);
  } catch (e) { next(e); }
});

contractorRouter.delete("/users/:id", requirePerm("projects:write"), async (req, res, next) => {
  try {
    const del = await db.delete(contractorUsers).where(eq(contractorUsers.id, req.params.id)).returning();
    if (!del[0]) throw new HttpError(404, "Contractor user not found");
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------------- SUBMITTALS ----------------
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Accepts both the API shape (contractorCompanyId) and the portal store shape
// the web client persists (contractor = company name/id, contractorUser =
// display name, project = project name, ref/status/dates precomputed).
const submittalCreate = z.object({
  ref: z.string().optional(),
  projectId: z.string().uuid().nullable().optional(),
  projectCode: z.string().optional(),
  projectName: z.string().optional(),
  project: z.string().optional(),                       // portal alias for projectName
  contractorCompanyId: z.string().uuid().optional(),
  contractor: z.string().optional(),                    // portal alias: company id or name
  contractorUserId: z.string().uuid().optional(),
  contractorUser: z.string().optional(),                // portal alias: display name
  type: z.string().min(1),
  discipline: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  attachmentFileIds: z.array(z.string().uuid()).optional(),
  attachments: z.array(z.string()).optional(),          // portal alias (may hold plain filenames)
  location: z.string().optional(),
  priority: z.enum(["Normal", "Urgent"]).default("Normal"),
  watchers: z.array(z.string()).optional(),
  primaryReviewer: z.union([z.string(), z.array(z.string())]).optional(),
  approver: z.string().optional(),
  status: z.string().optional(),
  revision: z.number().int().optional(),
  dateSubmitted: z.string().optional(),
  slaDeadline: z.string().optional(),
  fromPortal: z.boolean().optional(),
});

// The web portal uses display labels for status; the DB stores an enum.
// Translate at the boundary in both directions.
const ENUM_TO_PORTAL_STATUS: Record<string, string> = {
  "draft": "Open",
  "submitted": "Open",
  "under-review": "Under Review",
  "code-a": "Approved",
  "code-b": "Approved with Comments",
  "code-c": "Need More Info",
  "code-d": "Rejected",
  "revise-and-resubmit": "Resubmit",
  "rejected": "Rejected",
  "closed": "Approved",
  "overdue": "Under Review",
};
const PORTAL_TO_ENUM_STATUS: Record<string, string> = {
  "Open": "submitted",
  "Under Review": "under-review",
  "Approved": "code-a",
  "Approved with Comments": "code-b",
  "Need More Info": "code-c",
  "Resubmit": "revise-and-resubmit",
  "Rejected": "rejected",
};
function toEnumStatus(value: string): string | undefined {
  if (PORTAL_TO_ENUM_STATUS[value]) return PORTAL_TO_ENUM_STATUS[value];
  if (value in ENUM_TO_PORTAL_STATUS) return value;     // already an enum value
  return undefined;
}

async function companyNameMap(): Promise<Map<string, string>> {
  const rows = await db.select({ id: contractorCompanies.id, name: contractorCompanies.name }).from(contractorCompanies);
  return new Map(rows.map((r) => [r.id, r.name]));
}

function toPortalShape(row: any, companyNames?: Map<string, string>) {
  const submittedAt = row.dateSubmitted instanceof Date ? row.dateSubmitted : new Date(row.dateSubmitted);
  const slaAt = row.slaDeadline instanceof Date ? row.slaDeadline : new Date(row.slaDeadline);
  const daysRemaining = Math.ceil((slaAt.getTime() - Date.now()) / 86_400_000);
  return {
    id: row.id,
    ref: row.ref,
    type: row.type,
    discipline: row.discipline,
    title: row.title,
    description: row.description ?? "",
    contractor: companyNames?.get(row.contractorCompanyId) ?? row.contractorCompanyId,
    contractorId: row.contractorCompanyId,
    contractorUser: row.contractorUserDisplay ?? row.contractorUserId ?? "",
    project: row.projectName ?? row.projectId ?? "",
    projectCode: row.projectCode ?? "",
    dateSubmitted: submittedAt.toISOString(),
    slaDeadline: slaAt.toISOString(),
    daysRemaining,
    status: ENUM_TO_PORTAL_STATUS[row.status] ?? row.status,
    revision: row.revision,
    primaryReviewer: row.primaryReviewer,
    approver: row.approver,
    watchers: row.watchers ?? [],
    attachments: row.attachmentFileIds ?? [],
    location: row.location ?? undefined,
    priority: row.priority,
    responseDate: row.responseDate ? new Date(row.responseDate).toISOString() : undefined,
    responseBy: row.responseBy ?? undefined,
    comments: row.comments ?? undefined,
    fromPortal: row.fromPortal,
  };
}

// Resolve which contractor company the authenticated user belongs to (by
// linked userId first, then email). Returns undefined for non-contractor staff.
async function companyForUser(userId: string, email: string | undefined): Promise<string | undefined> {
  const byId = (await db.select().from(contractorUsers).where(eq(contractorUsers.userId, userId)).limit(1))[0];
  if (byId) return byId.companyId;
  if (email) {
    const byEmail = (await db.select().from(contractorUsers).where(eq(contractorUsers.email, email)).limit(1))[0];
    if (byEmail) return byEmail.companyId;
  }
  return undefined;
}

contractorRouter.get("/submittals", requirePerm("projects:read"), async (req, res, next) => {
  try {
    const { companyId, projectId } = req.query as Record<string, string>;
    const conds: any[] = [];
    if (companyId) conds.push(eq(submittals.contractorCompanyId, companyId));
    if (projectId) conds.push(eq(submittals.projectId, projectId));
    const q = conds.length ? db.select().from(submittals).where(and(...conds)) : db.select().from(submittals);
    const rows = await q.orderBy(desc(submittals.dateSubmitted));
    const names = await companyNameMap();
    res.json(rows.map((r) => toPortalShape(r, names)));
  } catch (e) { next(e); }
});

contractorRouter.get("/submittals/:id", requirePerm("projects:read"), async (req, res, next) => {
  try {
    const row = (await db.select().from(submittals).where(eq(submittals.id, req.params.id)).limit(1))[0];
    if (!row) throw new HttpError(404, "Submittal not found");
    res.json(toPortalShape(row, await companyNameMap()));
  } catch (e) { next(e); }
});

contractorRouter.post("/submittals", requirePerm("projects:read"), async (req, res, next) => {
  // Both consultants and contractors can create. RLS scopes contractor to their own company.
  try {
    const input = submittalCreate.parse(req.body);

    // Resolve the contractor company: explicit uuid, portal alias (id or
    // name), or the caller's own linked company.
    let companyId = input.contractorCompanyId;
    if (!companyId && input.contractor) {
      if (UUID_RE.test(input.contractor)) {
        companyId = input.contractor;
      } else {
        const byName = (await db.select().from(contractorCompanies).where(eq(contractorCompanies.name, input.contractor)).limit(1))[0];
        companyId = byName?.id;
      }
    }
    if (!companyId) companyId = await companyForUser(req.user!.sub, req.user!.email);
    if (!companyId) throw new HttpError(400, "contractorCompanyId is required (no contractor company could be resolved)");

    const submittedAt = input.dateSubmitted && !Number.isNaN(Date.parse(input.dateSubmitted)) ? new Date(input.dateSubmitted) : new Date();
    const primaryReviewer = input.primaryReviewer ?? pickReviewer(input.discipline, input.type);
    const approver = input.approver ?? pickApprover(input.discipline, input.type);
    const slaDeadline = input.slaDeadline && !Number.isNaN(Date.parse(input.slaDeadline))
      ? new Date(input.slaDeadline)
      : computeSlaDeadline(input.type, submittedAt, input.priority);
    const ref = input.ref || `SUB-${input.type}-${Date.now().toString(36).toUpperCase()}`;
    // Portal `attachments` may carry plain filenames; only uuid entries are file ids
    const attachmentFileIds = input.attachmentFileIds ?? (input.attachments ?? []).filter((a) => UUID_RE.test(a));

    const inserted = await db.insert(submittals).values({
      ref,
      projectId: input.projectId ?? null,
      projectCode: input.projectCode ?? null,
      projectName: input.projectName ?? input.project ?? null,
      contractorCompanyId: companyId,
      contractorUserId: input.contractorUserId ?? null,
      contractorUserDisplay: input.contractorUser ?? null,
      type: input.type,
      discipline: input.discipline,
      title: input.title,
      description: input.description ?? null,
      dateSubmitted: submittedAt,
      slaDeadline,
      status: (input.status && toEnumStatus(input.status)) || "submitted",
      revision: input.revision ?? 1,
      primaryReviewer,
      approver,
      watchers: input.watchers ?? [],
      attachmentFileIds,
      location: input.location ?? null,
      priority: input.priority,
      fromPortal: input.fromPortal ?? true,
    } as any).returning();

    await db.insert(submittalRevisions).values({
      submittalId: inserted[0].id,
      revision: inserted[0].revision,
      status: inserted[0].status,
      submittedAt,
      attachmentFileIds,
    });

    await writeAudit(req, { action: "create-submittal", entityType: "submittal", entityId: inserted[0].id, after: { ref, type: input.type } });
    res.status(201).json(toPortalShape(inserted[0], await companyNameMap()));
  } catch (e) { next(e); }
});

// Generic partial update in the portal shape — this is what the web client's
// submittalsStore.put() issues for respond / resubmit / edits. Contractors
// may only touch their own company's submittals; staff need projects perms.
const submittalPatch = z.object({
  status: z.string().optional(),
  revision: z.number().int().optional(),
  comments: z.string().nullable().optional(),
  responseBy: z.string().nullable().optional(),
  responseDate: z.string().nullable().optional(),
  dateSubmitted: z.string().optional(),
  slaDeadline: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  location: z.string().nullable().optional(),
  priority: z.enum(["Normal", "Urgent"]).optional(),
  watchers: z.array(z.string()).optional(),
  primaryReviewer: z.union([z.string(), z.array(z.string())]).optional(),
  approver: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  attachmentFileIds: z.array(z.string().uuid()).optional(),
});

contractorRouter.patch("/submittals/:id", requirePerm("projects:read"), async (req, res, next) => {
  try {
    const input = submittalPatch.parse(req.body);
    const before = (await db.select().from(submittals).where(eq(submittals.id, req.params.id)).limit(1))[0];
    if (!before) throw new HttpError(404, "Submittal not found");

    if (req.user!.role === "contractor") {
      const ownCompany = await companyForUser(req.user!.sub, req.user!.email);
      if (!ownCompany || ownCompany !== before.contractorCompanyId) {
        throw new HttpError(403, "Contractors can only update their own submittals");
      }
    }

    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (input.status !== undefined) {
      const mapped = toEnumStatus(input.status);
      if (!mapped) throw new HttpError(400, `Unknown submittal status: ${input.status}`);
      set.status = mapped;
    }
    if (input.revision !== undefined) set.revision = input.revision;
    if (input.comments !== undefined) set.comments = input.comments;
    if (input.responseBy !== undefined) set.responseBy = input.responseBy;
    if (input.responseDate !== undefined) {
      set.responseDate = input.responseDate && !Number.isNaN(Date.parse(input.responseDate)) ? new Date(input.responseDate) : null;
      if (input.responseDate) set.responseByUserId = req.user!.sub;
    }
    if (input.dateSubmitted !== undefined && !Number.isNaN(Date.parse(input.dateSubmitted))) set.dateSubmitted = new Date(input.dateSubmitted);
    if (input.slaDeadline !== undefined && !Number.isNaN(Date.parse(input.slaDeadline))) set.slaDeadline = new Date(input.slaDeadline);
    if (input.title !== undefined) set.title = input.title;
    if (input.description !== undefined) set.description = input.description;
    if (input.location !== undefined) set.location = input.location;
    if (input.priority !== undefined) set.priority = input.priority;
    if (input.watchers !== undefined) set.watchers = input.watchers;
    if (input.primaryReviewer !== undefined) set.primaryReviewer = input.primaryReviewer;
    if (input.approver !== undefined) set.approver = input.approver;
    if (input.attachmentFileIds !== undefined) set.attachmentFileIds = input.attachmentFileIds;
    else if (input.attachments !== undefined) set.attachmentFileIds = input.attachments.filter((a) => UUID_RE.test(a));

    const updated = await db.update(submittals).set(set as any).where(eq(submittals.id, req.params.id)).returning();

    // Keep the revision history coherent for the two flows the portal uses
    const after = updated[0];
    if (input.revision !== undefined && input.revision > before.revision) {
      await db.insert(submittalRevisions).values({
        submittalId: after.id,
        revision: after.revision,
        status: after.status,
        submittedAt: after.dateSubmitted instanceof Date ? after.dateSubmitted : new Date(after.dateSubmitted as any),
        attachmentFileIds: after.attachmentFileIds ?? [],
      });
    } else if (set.status !== undefined && set.responseDate) {
      await db.update(submittalRevisions)
        .set({ status: after.status, reviewedAt: set.responseDate as Date, reviewerUserId: req.user!.sub, comments: after.comments ?? null })
        .where(and(eq(submittalRevisions.submittalId, after.id), eq(submittalRevisions.revision, after.revision)));
    }

    await writeAudit(req, { action: "update-submittal", entityType: "submittal", entityId: after.id, after: input });
    if (after.projectId) emitToProject(after.projectId, "submittal:updated", toPortalShape(after));
    res.json(toPortalShape(after, await companyNameMap()));
  } catch (e) { next(e); }
});

const respondSchema = z.object({
  // Accepts enum values ("code-a") and portal labels ("Approved") alike
  status: z.string().refine((s) => !!toEnumStatus(s), { message: "Unknown submittal status" }),
  comments: z.string().optional(),
  responseBy: z.string().optional(),
});

contractorRouter.post("/submittals/:id/respond", requirePerm("projects:write"), async (req, res, next) => {
  try {
    const input = respondSchema.parse(req.body);
    const responseDate = new Date();
    const updated = await db.update(submittals).set({
      status: toEnumStatus(input.status) as any,
      comments: input.comments ?? null,
      responseDate,
      responseByUserId: req.user!.sub,
      responseBy: input.responseBy ?? req.user!.email,
      updatedAt: new Date(),
    }).where(eq(submittals.id, req.params.id)).returning();
    if (!updated[0]) throw new HttpError(404, "Submittal not found");

    await db.update(submittalRevisions)
      .set({ status: toEnumStatus(input.status) as any, reviewedAt: responseDate, reviewerUserId: req.user!.sub, comments: input.comments ?? null })
      .where(and(eq(submittalRevisions.submittalId, req.params.id), eq(submittalRevisions.revision, updated[0].revision)));

    await writeAudit(req, { action: "respond-submittal", entityType: "submittal", entityId: req.params.id, after: input });
    if (updated[0].projectId) emitToProject(updated[0].projectId, "submittal:updated", toPortalShape(updated[0]));
    res.json(toPortalShape(updated[0], await companyNameMap()));
  } catch (e) { next(e); }
});

// Contractor re-submits next revision after revise-and-resubmit
const resubmitSchema = z.object({
  attachmentFileIds: z.array(z.string().uuid()).optional(),
  comments: z.string().optional(),
});

contractorRouter.post("/submittals/:id/resubmit", requirePerm("projects:read"), async (req, res, next) => {
  try {
    const input = resubmitSchema.parse(req.body);
    const before = (await db.select().from(submittals).where(eq(submittals.id, req.params.id)).limit(1))[0];
    if (!before) throw new HttpError(404, "Submittal not found");
    const nextRev = before.revision + 1;
    const submittedAt = new Date();
    const slaDeadline = computeSlaDeadline(before.type, submittedAt, before.priority);
    const updated = await db.update(submittals).set({
      revision: nextRev,
      status: "submitted",
      dateSubmitted: submittedAt,
      slaDeadline,
      attachmentFileIds: input.attachmentFileIds ?? before.attachmentFileIds,
      responseDate: null,
      responseByUserId: null,
      responseBy: null,
      comments: input.comments ?? null,
      updatedAt: new Date(),
    }).where(eq(submittals.id, req.params.id)).returning();

    await db.insert(submittalRevisions).values({
      submittalId: req.params.id,
      revision: nextRev,
      status: "submitted",
      submittedAt,
      attachmentFileIds: input.attachmentFileIds ?? [],
    });

    await writeAudit(req, { action: "resubmit-submittal", entityType: "submittal", entityId: req.params.id, after: { revision: nextRev } });
    res.json(toPortalShape(updated[0], await companyNameMap()));
  } catch (e) { next(e); }
});

contractorRouter.delete("/submittals/:id", requirePerm("projects:write"), async (req, res, next) => {
  try {
    const del = await db.delete(submittals).where(eq(submittals.id, req.params.id)).returning();
    if (!del[0]) throw new HttpError(404, "Submittal not found");
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------------- MESSAGES ----------------
const messageSchema = z.object({
  submittalId: z.string().uuid(),
  body: z.string().min(1),
  attachmentFileId: z.string().uuid().optional(),
});

contractorRouter.get("/submittals/:id/messages", requirePerm("projects:read"), async (req, res, next) => {
  try {
    const rows = await db.select().from(submittalMessages)
      .where(eq(submittalMessages.submittalId, req.params.id))
      .orderBy(submittalMessages.createdAt);
    res.json(rows);
  } catch (e) { next(e); }
});

contractorRouter.post("/submittals/:id/messages", requirePerm("projects:read"), async (req, res, next) => {
  try {
    const body = messageSchema.parse({ ...req.body, submittalId: req.params.id });
    const role = req.user!.role === "contractor" ? "contractor" : "consultant";
    const inserted = await db.insert(submittalMessages).values({
      submittalId: body.submittalId,
      authorUserId: req.user!.sub,
      authorDisplay: req.user!.email,
      authorRole: role,
      body: body.body,
      attachmentFileId: body.attachmentFileId ?? null,
    } as any).returning();
    // Notify the submittal's project room
    const parent = (await db.select().from(submittals).where(eq(submittals.id, body.submittalId)).limit(1))[0];
    if (parent?.projectId) emitToProject(parent.projectId, "submittal:message", inserted[0]);
    res.status(201).json(inserted[0]);
  } catch (e) { next(e); }
});
