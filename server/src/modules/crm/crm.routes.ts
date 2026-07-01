import { Router } from "express";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { leads, leadActivities, leadConversions, projects } from "../../db/schema/index.js";
import { requireAuth } from "../../middleware/auth.js";
import { requirePerm } from "../../middleware/rbac.js";
import { writeAudit } from "../../middleware/audit.js";
import { HttpError } from "../../middleware/errors.js";
import { attachCrud, dateOrNull, numStrOrNull } from "../../lib/crud.js";

export const crmRouter = Router();
crmRouter.use(requireAuth);

const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const leadCreate = z.object({
  companyName: z.string().min(1),
  contactName: z.string().min(1),
  contactRole: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  industry: z.string().optional(),
  source: z.enum(["referral", "website", "tender", "cold", "event", "existing-client", "other"]).default("other"),
  stage: z.enum(["new", "qualified", "proposal", "negotiation", "won", "lost"]).default("new"),
  estimatedValueAed: z.number().optional(),
  probability: z.number().int().min(0).max(100).optional(),
  expectedCloseDate: iso.optional(),
  ownerUserId: z.string().uuid().nullable().optional(),
  notes: z.string().optional(),
});

attachCrud(crmRouter, "/leads", {
  table: leads,
  idColumn: leads.id,
  createSchema: leadCreate,
  updateSchema: leadCreate.partial(),
  perms: { read: "crm:read", write: "crm:write" },
  entityType: "lead",
  orderBy: leads.createdAt,
  beforeCreate: (i) => ({
    ...i,
    estimatedValueAed: numStrOrNull(i.estimatedValueAed),
    expectedCloseDate: dateOrNull(i.expectedCloseDate),
  }),
  beforeUpdate: (i) => ({
    ...i,
    estimatedValueAed: i.estimatedValueAed !== undefined ? numStrOrNull(i.estimatedValueAed) : undefined,
    expectedCloseDate: i.expectedCloseDate !== undefined ? dateOrNull(i.expectedCloseDate) : undefined,
    updatedAt: new Date(),
  }),
});

// -------- Activities --------
const activityCreate = z.object({
  leadId: z.string().uuid(),
  type: z.enum(["call", "email", "meeting", "note", "stage-change", "proposal-sent"]),
  by: z.string(),
  at: z.string().optional(),
  summary: z.string().min(1),
  detail: z.string().optional(),
});

crmRouter.get("/lead-activities", requirePerm("crm:read"), async (req, res, next) => {
  try {
    const { leadId } = req.query as Record<string, string>;
    const q = leadId
      ? db.select().from(leadActivities).where(eq(leadActivities.leadId, leadId))
      : db.select().from(leadActivities);
    res.json(await q.orderBy(sql`${leadActivities.at} desc`));
  } catch (e) { next(e); }
});

crmRouter.post("/lead-activities", requirePerm("crm:write"), async (req, res, next) => {
  try {
    const input = activityCreate.parse(req.body);
    const inserted = await db.insert(leadActivities).values({
      ...input,
      at: input.at ? new Date(input.at) : new Date(),
    } as any).returning();
    res.status(201).json(inserted[0]);
  } catch (e) { next(e); }
});

crmRouter.delete("/lead-activities/:id", requirePerm("crm:write"), async (req, res, next) => {
  try {
    const deleted = await db.delete(leadActivities).where(eq(leadActivities.id, req.params.id)).returning();
    if (!deleted[0]) throw new HttpError(404, "Activity not found");
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// -------- Lead → Project conversion --------
const conversionSchema = z.object({
  // Either reference an existing project to link...
  projectId: z.string().uuid().optional(),
  // ...or auto-create a new project from the lead
  newProject: z.object({
    code: z.string().min(1),
    nameEn: z.string().min(1),
    type: z.string().optional(),
    community: z.string().optional(),
    emirate: z.string().optional(),
    office: z.string().optional(),
  }).optional(),
});

crmRouter.post("/leads/:id/convert", requirePerm("crm:write"), async (req, res, next) => {
  try {
    const lead = (await db.select().from(leads).where(eq(leads.id, req.params.id)).limit(1))[0];
    if (!lead) throw new HttpError(404, "Lead not found");
    const input = conversionSchema.parse(req.body ?? {});

    let projectId = input.projectId;
    if (!projectId) {
      if (!input.newProject) throw new HttpError(400, "projectId or newProject required");
      const inserted = await db.insert(projects).values({
        code: input.newProject.code,
        nameEn: input.newProject.nameEn,
        type: input.newProject.type ?? null,
        community: input.newProject.community ?? null,
        emirate: input.newProject.emirate ?? null,
        office: input.newProject.office ?? null,
        client: lead.companyName,
        contractValue: lead.estimatedValueAed,
        stage: "pre-contract",
        pmUserId: lead.ownerUserId,
      } as any).returning();
      projectId = inserted[0].id;
    }

    const conv = await db.insert(leadConversions).values({
      leadId: lead.id,
      projectId: projectId!,
      byUserId: req.user!.sub,
    }).returning();

    // Mark lead won + log activity
    await db.update(leads).set({ stage: "won", updatedAt: new Date() }).where(eq(leads.id, lead.id));
    await db.insert(leadActivities).values({
      leadId: lead.id,
      type: "stage-change",
      by: req.user!.email,
      summary: `Converted to project`,
      detail: projectId,
    } as any);

    await writeAudit(req, { action: "convert-lead", entityType: "lead", entityId: lead.id, after: { projectId } });
    res.status(201).json({ ...conv[0], projectId });
  } catch (e) { next(e); }
});
