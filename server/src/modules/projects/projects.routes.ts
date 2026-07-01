import { Router } from "express";
import { z } from "zod";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  projects, projectTeamMembers, projectStages, stageGateApprovals, authoritySubmittals, clientProjectAccess,
} from "../../db/schema/index.js";
import { requireAuth } from "../../middleware/auth.js";
import { requirePerm, requireAnyPerm, userHasPerm } from "../../middleware/rbac.js";
import { writeAudit } from "../../middleware/audit.js";
import { HttpError } from "../../middleware/errors.js";

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// Frontend Project type uses these field names — keep API in lockstep
const projectCreate = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1),
  nameEn: z.string().min(1),
  nameAr: z.string().optional(),
  stage: z.enum(["pipeline", "pre-contract", "post-contract", "completed"]).default("pipeline"),
  health: z.enum(["on-track", "at-risk", "delayed"]).default("on-track"),
  type: z.string().optional(),
  plotNo: z.string().optional(),
  community: z.string().optional(),
  emirate: z.string().optional(),
  authority: z.string().optional(),
  client: z.string().optional(),
  contractValue: z.number().optional(),
  currency: z.string().default("AED"),
  feeType: z.string().optional(),
  startDate: iso.optional(),
  targetCompletion: iso.optional(),
  gfa: z.number().optional(),
  plotArea: z.number().optional(),
  floors: z.number().int().optional(),
  currentSubStage: z.number().int().optional(),
  progress: z.number().optional(),
  budgetConsumed: z.number().optional(),
  hoursLogged: z.number().optional(),
  hoursPlanned: z.number().optional(),
  daysToDeadline: z.number().int().optional(),
  openRfis: z.number().int().optional(),
  openNcrs: z.number().int().optional(),
  pendingApprovals: z.number().int().optional(),
  starred: z.boolean().optional(),
  pmUserId: z.string().uuid().nullable().optional(),
  designLeadUserId: z.string().uuid().nullable().optional(),
  office: z.string().optional(),
});

const projectUpdate = projectCreate.partial();

const toNum = (v: any) => (v == null ? null : String(v));
function coerceForInsert(input: any) {
  return {
    ...input,
    contractValue: toNum(input.contractValue),
    gfa: toNum(input.gfa),
    plotArea: toNum(input.plotArea),
    progress: toNum(input.progress),
    budgetConsumed: toNum(input.budgetConsumed),
    hoursLogged: toNum(input.hoursLogged),
    hoursPlanned: toNum(input.hoursPlanned),
  };
}

async function assertClientProjectAccess(req: any, projectId: string) {
  if (req.user?.role !== "client") return;
  const access = (await db.select().from(clientProjectAccess)
    .where(and(eq(clientProjectAccess.clientUserId, req.user.sub), eq(clientProjectAccess.projectId, projectId))).limit(1))[0];
  if (!access) throw new HttpError(403, "You don't have access to this project");
}

async function clientProjectIds(req: any): Promise<string[] | null> {
  if (req.user?.role !== "client") return null;
  const access = await db.select().from(clientProjectAccess).where(eq(clientProjectAccess.clientUserId, req.user.sub));
  return access.map((row) => row.projectId);
}

// Map DB row → frontend Project shape (camelCase already, but expose team list)
async function expandProject(row: any) {
  const team = await db.select().from(projectTeamMembers)
    .where(eq(projectTeamMembers.projectId, row.id));
  const teamUserIds = team.filter((t: any) => !t.removedAt).map((t: any) => t.userId);
  return {
    ...row,
    teamUserIds,
    contractValue: Number(row.contractValue ?? 0),
    gfa: Number(row.gfa ?? 0),
    plotArea: Number(row.plotArea ?? 0),
    progress: Number(row.progress ?? 0),
    budgetConsumed: Number(row.budgetConsumed ?? 0),
    hoursLogged: Number(row.hoursLogged ?? 0),
    hoursPlanned: Number(row.hoursPlanned ?? 0),
    starred: !!row.starred,
  };
}

// LIST — full visibility with projects:read; otherwise (self:read) only the
// projects the user has been assigned to via Team & Roles.
projectsRouter.get("/", requireAnyPerm("projects:read", "self:read", "client:portal"), async (req, res, next) => {
  try {
    const rows = await db.select().from(projects).orderBy(sql`${projects.createdAt} desc`);
    const teams = await db.select().from(projectTeamMembers);
    const teamMap = new Map<string, string[]>();
    for (const t of teams) {
      if (t.removedAt) continue;
      const arr = teamMap.get(t.projectId) ?? [];
      arr.push(t.userId);
      teamMap.set(t.projectId, arr);
    }
    let visible = rows;
    if (req.user!.role === "client") {
      const access = await db.select().from(clientProjectAccess).where(eq(clientProjectAccess.clientUserId, req.user!.sub));
      const ids = new Set(access.map((a) => a.projectId));
      visible = rows.filter((r: any) => ids.has(r.id));
    } else if (!(await userHasPerm(req, "projects:read"))) {
      const uid = req.user!.sub;
      visible = rows.filter((r: any) => (teamMap.get(r.id) ?? []).includes(uid));
    }
    res.json(visible.map((r: any) => ({
      ...r,
      teamUserIds: teamMap.get(r.id) ?? [],
      contractValue: Number(r.contractValue ?? 0),
      gfa: Number(r.gfa ?? 0),
      plotArea: Number(r.plotArea ?? 0),
      progress: Number(r.progress ?? 0),
      budgetConsumed: Number(r.budgetConsumed ?? 0),
      hoursLogged: Number(r.hoursLogged ?? 0),
      hoursPlanned: Number(r.hoursPlanned ?? 0),
    })));
  } catch (e) { next(e); }
});

// GET ONE
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
projectsRouter.get("/:id", requireAnyPerm("projects:read", "self:read", "client:portal"), async (req, res, next) => {
  try {
    // Don't swallow literal sub-routes declared later (/approvals,
    // /authority-submittals) — only treat genuine UUIDs as a project id.
    if (!UUID_RE.test(req.params.id)) return next();
    const rows = await db.select().from(projects).where(eq(projects.id, req.params.id)).limit(1);
    if (!rows[0]) throw new HttpError(404, "Project not found");
    if (req.user!.role === "client") {
      const access = (await db.select().from(clientProjectAccess)
        .where(and(eq(clientProjectAccess.clientUserId, req.user!.sub), eq(clientProjectAccess.projectId, req.params.id))).limit(1))[0];
      if (!access) throw new HttpError(403, "You don't have access to this project");
    } else if (!(await userHasPerm(req, "projects:read"))) {
      const member = await db.select().from(projectTeamMembers)
        .where(eq(projectTeamMembers.projectId, req.params.id));
      if (!member.some((m) => m.userId === req.user!.sub && !m.removedAt)) {
        throw new HttpError(403, "You are not assigned to this project");
      }
    }
    res.json(await expandProject(rows[0]));
  } catch (e) { next(e); }
});

// CREATE
projectsRouter.post("/", requirePerm("projects:write"), async (req, res, next) => {
  try {
    const input = projectCreate.parse(req.body);
    const inserted = await db.insert(projects).values(coerceForInsert(input) as any).returning();
    await writeAudit(req, { action: "create-project", entityType: "project", entityId: inserted[0].id, after: inserted[0] });
    res.status(201).json(await expandProject(inserted[0]));
  } catch (e) { next(e); }
});

// UPDATE
projectsRouter.patch("/:id", requirePerm("projects:write"), async (req, res, next) => {
  try {
    const input = projectUpdate.parse(req.body);
    const before = (await db.select().from(projects).where(eq(projects.id, req.params.id)).limit(1))[0];
    if (!before) throw new HttpError(404, "Project not found");
    const updated = await db.update(projects)
      .set({ ...coerceForInsert(input), updatedAt: new Date() } as any)
      .where(eq(projects.id, req.params.id)).returning();
    await writeAudit(req, { action: "update-project", entityType: "project", entityId: req.params.id, before, after: updated[0] });
    res.json(await expandProject(updated[0]));
  } catch (e) { next(e); }
});

// DELETE
projectsRouter.delete("/:id", requirePerm("projects:write"), async (req, res, next) => {
  try {
    const deleted = await db.delete(projects).where(eq(projects.id, req.params.id)).returning();
    if (!deleted[0]) throw new HttpError(404, "Project not found");
    await writeAudit(req, { action: "delete-project", entityType: "project", entityId: req.params.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// -------------------- Team --------------------
projectsRouter.get("/:id/team", requireAnyPerm("projects:read", "self:read", "client:portal"), async (req, res, next) => {
  try {
    const rows = await db.select().from(projectTeamMembers)
      .where(eq(projectTeamMembers.projectId, req.params.id));
    res.json(rows);
  } catch (e) { next(e); }
});

// HR and the Director manage project membership alongside PMs/design leads.
const teamAdd = z.object({ userId: z.string().uuid(), roleOnProject: z.string().optional() });
projectsRouter.post("/:id/team", requireAnyPerm("projects:write", "hr:write"), async (req, res, next) => {
  try {
    const input = teamAdd.parse(req.body);
    const inserted = await db.insert(projectTeamMembers).values({
      projectId: req.params.id, userId: input.userId, roleOnProject: input.roleOnProject ?? null,
    }).onConflictDoNothing().returning();
    let row = inserted[0];
    if (!row) {
      // Already a member (possibly soft-removed) — restore / update the role
      row = (await db.update(projectTeamMembers)
        .set({ removedAt: null, roleOnProject: input.roleOnProject ?? null })
        .where(sql`${projectTeamMembers.projectId} = ${req.params.id} AND ${projectTeamMembers.userId} = ${input.userId}`)
        .returning())[0];
    }
    await writeAudit(req, { action: "add-project-team", entityType: "project-team", entityId: req.params.id, after: input });
    res.status(201).json(row ?? null);
  } catch (e) { next(e); }
});

projectsRouter.delete("/:id/team/:userId", requireAnyPerm("projects:write", "hr:write"), async (req, res, next) => {
  try {
    await db.update(projectTeamMembers)
      .set({ removedAt: new Date() })
      .where(sql`${projectTeamMembers.projectId} = ${req.params.id} AND ${projectTeamMembers.userId} = ${req.params.userId}`);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// -------------------- Stages --------------------
projectsRouter.get("/:id/stages", requireAnyPerm("projects:read", "client:portal"), async (req, res, next) => {
  try {
    await assertClientProjectAccess(req, req.params.id);
    const rows = await db.select().from(projectStages).where(eq(projectStages.projectId, req.params.id));
    res.json(rows);
  } catch (e) { next(e); }
});

const stageCreate = z.object({
  subStageCode: z.string().min(1),
  label: z.string().min(1),
  status: z.string().optional(),
  plannedStart: iso.optional(),
  plannedEnd: iso.optional(),
  actualStart: iso.optional(),
  actualEnd: iso.optional(),
  varianceReason: z.string().optional(),
  progress: z.number().optional(),
});
projectsRouter.post("/:id/stages", requirePerm("projects:write"), async (req, res, next) => {
  try {
    const input = stageCreate.parse(req.body);
    const inserted = await db.insert(projectStages).values({
      projectId: req.params.id, ...input, progress: input.progress != null ? String(input.progress) : "0",
    } as any).returning();
    res.status(201).json(inserted[0]);
  } catch (e) { next(e); }
});

projectsRouter.patch("/:id/stages/:stageId", requirePerm("projects:write"), async (req, res, next) => {
  try {
    const input = stageCreate.partial().parse(req.body);
    const next: any = { ...input };
    if (input.progress != null) next.progress = String(input.progress);
    const updated = await db.update(projectStages).set(next).where(eq(projectStages.id, req.params.stageId)).returning();
    if (!updated[0]) throw new HttpError(404, "Stage not found");
    res.json(updated[0]);
  } catch (e) { next(e); }
});

// -------------------- Stage-gate approvals --------------------
projectsRouter.get("/approvals", requireAnyPerm("projects:read", "client:portal"), async (req, res, next) => {
  try {
    const ids = await clientProjectIds(req);
    if (ids && ids.length === 0) return res.json([]);
    const rows = ids
      ? await db.select().from(stageGateApprovals).where(inArray(stageGateApprovals.projectId, ids))
      : await db.select().from(stageGateApprovals);
    res.json(rows);
  } catch (e) { next(e); }
});

const approvalCreate = z.object({
  id: z.string().uuid().optional(),
  projectId: z.string().uuid(),
  stageCode: z.string(),
  gateCode: z.string(),
  requesterDisplay: z.string(),
  approvals: z.array(z.object({
    kind: z.enum(["LA", "PM", "DM"]),
    role: z.enum(["design-lead", "pm", "director"]),
    status: z.enum(["pending", "approved", "rejected"]).default("pending"),
    note: z.string().optional().nullable(),
    decidedByUserId: z.string().optional().nullable(),
    decidedByDisplay: z.string().optional().nullable(),
    decidedAt: z.string().optional().nullable(),
  })),
  status: z.enum(["in-review", "approved", "rejected", "withdrawn"]).default("in-review"),
  note: z.string().optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
});

projectsRouter.post("/approvals", requirePerm("projects:approve"), async (req, res, next) => {
  try {
    const input = approvalCreate.parse(req.body);
    // Prevent duplicate: if an active record already exists for this project+stage, return it
    const existing = await db.select().from(stageGateApprovals)
      .where(and(
        eq(stageGateApprovals.projectId, input.projectId),
        eq(stageGateApprovals.stageCode, input.stageCode),
        sql`${stageGateApprovals.status} NOT IN ('withdrawn', 'rejected')`
      ))
      .limit(1);
    if (existing[0]) { res.status(200).json(existing[0]); return; }
    const inserted = await db.insert(stageGateApprovals).values({
      ...(input.id ? { id: input.id } : {}),
      projectId: input.projectId,
      stageCode: input.stageCode,
      gateCode: input.gateCode,
      requesterUserId: req.user!.sub,
      requesterDisplay: input.requesterDisplay,
      status: input.status,
      approvals: input.approvals,
      note: input.note ?? null,
      completedAt: input.completedAt ? new Date(input.completedAt) : null,
    } as any).returning();
    await writeAudit(req, { action: "create-approval", entityType: "stage-gate-approval", entityId: inserted[0].id, after: inserted[0] });
    res.status(201).json(inserted[0]);
  } catch (e) { next(e); }
});

projectsRouter.patch("/approvals/:id", requirePerm("projects:approve"), async (req, res, next) => {
  try {
    const input = approvalCreate.partial().parse(req.body);
    const patch: Record<string, unknown> = { ...input, updatedAt: new Date() };
    if ("completedAt" in input) {
      patch.completedAt = input.completedAt ? new Date(input.completedAt) : null;
    }
    const updated = await db.update(stageGateApprovals)
      .set(patch as any)
      .where(eq(stageGateApprovals.id, req.params.id)).returning();
    if (!updated[0]) throw new HttpError(404, "Approval not found");
    await writeAudit(req, { action: "update-approval", entityType: "stage-gate-approval", entityId: req.params.id, after: updated[0] });
    res.json(updated[0]);
  } catch (e) { next(e); }
});

projectsRouter.delete("/approvals/:id", requirePerm("projects:approve"), async (req, res, next) => {
  try {
    const deleted = await db.delete(stageGateApprovals).where(eq(stageGateApprovals.id, req.params.id)).returning();
    if (!deleted[0]) throw new HttpError(404, "Approval not found");
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// -------------------- Authority submittals --------------------
projectsRouter.get("/authority-submittals", requireAnyPerm("projects:read", "client:portal"), async (req, res, next) => {
  try {
    const ids = await clientProjectIds(req);
    if (ids && ids.length === 0) return res.json([]);
    const rows = ids
      ? await db.select().from(authoritySubmittals).where(inArray(authoritySubmittals.projectId, ids)).orderBy(authoritySubmittals.order)
      : await db.select().from(authoritySubmittals).orderBy(authoritySubmittals.order);
    res.json(rows);
  } catch (e) { next(e); }
});

const submittalCreate = z.object({
  projectId: z.string().uuid(),
  isGroupHeader: z.boolean().optional(),
  groupName: z.string().optional(),
  name: z.string().min(1),
  authority: z.string().optional(),
  status: z.enum(["to-start", "in-progress", "approved", "rejected", "completed"]).default("to-start"),
  milestoneStatus: z.enum(["to-start", "in-progress", "approved", "rejected", "completed"]).optional(),
  startDate: iso.optional(),
  targetFinishDate: iso.optional(),
  actualFinishDate: iso.optional(),
  remarks: z.string().optional(),
  order: z.number().int().default(0),
});

projectsRouter.post("/authority-submittals", requirePerm("projects:write"), async (req, res, next) => {
  try {
    const input = submittalCreate.parse(req.body);
    const inserted = await db.insert(authoritySubmittals).values(input as any).returning();
    res.status(201).json(inserted[0]);
  } catch (e) { next(e); }
});

projectsRouter.patch("/authority-submittals/:id", requirePerm("projects:write"), async (req, res, next) => {
  try {
    const input = submittalCreate.partial().parse(req.body);
    const updated = await db.update(authoritySubmittals).set(input as any).where(eq(authoritySubmittals.id, req.params.id)).returning();
    if (!updated[0]) throw new HttpError(404, "Submittal not found");
    res.json(updated[0]);
  } catch (e) { next(e); }
});

projectsRouter.delete("/authority-submittals/:id", requirePerm("projects:write"), async (req, res, next) => {
  try {
    const deleted = await db.delete(authoritySubmittals).where(eq(authoritySubmittals.id, req.params.id)).returning();
    if (!deleted[0]) throw new HttpError(404, "Submittal not found");
    res.json({ ok: true });
  } catch (e) { next(e); }
});
