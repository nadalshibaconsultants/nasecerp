import { Router } from "express";
import { z } from "zod";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { tasks, taskTimerSessions, timesheets, taskMessages, files } from "../../db/schema/index.js";
import { storage } from "../../lib/storage.js";
import { requireAuth } from "../../middleware/auth.js";
import { requirePerm, userHasPerm } from "../../middleware/rbac.js";
import { effectiveHas, type Role } from "../../lib/permissions.js";
import { writeAudit } from "../../middleware/audit.js";
import { HttpError } from "../../middleware/errors.js";
import { emitToTask } from "../../lib/realtime.js";

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const taskCreate = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["todo", "in-progress", "blocked", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  category: z.enum(["design", "review", "meeting", "submission", "site", "admin", "client", "other"]).default("other"),
  projectId: z.string().uuid().nullable().optional(),
  assigneeUserId: z.string().uuid().nullable().optional(),
  assigneeUserIds: z.array(z.string().uuid()).optional(),
  reporterUserId: z.string().uuid().nullable().optional(),
  dueDate: iso.optional(),
  tags: z.array(z.string()).optional(),
});

const taskUpdate = taskCreate.partial();

// LIST — Directors see every task (oversight); everyone else sees only tasks
// they created (reporter) or that were assigned to them (assignee).
tasksRouter.get("/", requirePerm("tasks:read"), async (req, res, next) => {
  try {
    const me = req.user!.sub;
    const base = db.select().from(tasks);
    // Project-scoped tasks are team-visible: anyone who can read projects
    // sees them (so the project task board shows the whole board, not just
    // the viewer's own cards). Personal tasks stay reporter/assignee-only.
    const canSeeProjectTasks = req.user!.role !== "client" && (req.user!.role === "director" || await userHasPerm(req, "projects:read"));
    const rows = req.user!.role === "director"
      ? await base.orderBy(sql`${tasks.createdAt} desc`)
      : await base
          .where(or(
            eq(tasks.assigneeUserId, me),
            eq(tasks.reporterUserId, me),
            sql`${tasks.assigneeUserIds} @> ${JSON.stringify([me])}::jsonb`,
            ...(canSeeProjectTasks ? [sql`${tasks.projectId} is not null`] : []),
          ))
          .orderBy(sql`${tasks.createdAt} desc`);
    res.json(rows);
  } catch (e) { next(e); }
});

tasksRouter.get("/mine", requirePerm("tasks:read"), async (req, res, next) => {
  try {
    const rows = await db.select().from(tasks).where(eq(tasks.assigneeUserId, req.user!.sub));
    res.json(rows);
  } catch (e) { next(e); }
});

tasksRouter.get("/:id", requirePerm("tasks:read"), async (req, res, next) => {
  try {
    const rows = await db.select().from(tasks).where(eq(tasks.id, req.params.id)).limit(1);
    if (!rows[0]) throw new HttpError(404, "Task not found");
    if (!isMember(rows[0], req.user!.sub, req.user!.role)) throw new HttpError(403, "Not a member of this task");
    res.json(rows[0]);
  } catch (e) { next(e); }
});

tasksRouter.post("/", requirePerm("tasks:write"), async (req, res, next) => {
  try {
    const input = taskCreate.parse(req.body);
    // Normalise the assignee set: union of the array + single field.
    const ids = new Set<string>(input.assigneeUserIds ?? []);
    if (input.assigneeUserId) ids.add(input.assigneeUserId);
    const assigneeUserIds = [...ids];
    const inserted = await db.insert(tasks).values({
      ...input,
      assigneeUserIds,
      assigneeUserId: input.assigneeUserId ?? assigneeUserIds[0] ?? null,
      reporterUserId: input.reporterUserId ?? req.user!.sub,
    } as any).returning();
    await writeAudit(req, { action: "create-task", entityType: "task", entityId: inserted[0].id, after: inserted[0] });
    res.status(201).json(inserted[0]);
  } catch (e) { next(e); }
});

tasksRouter.patch("/:id", requirePerm("tasks:write"), async (req, res, next) => {
  try {
    const input = taskUpdate.parse(req.body);
    const before = (await db.select().from(tasks).where(eq(tasks.id, req.params.id)).limit(1))[0];
    if (!before) throw new HttpError(404, "Task not found");
    const next: any = { ...input, updatedAt: new Date() };
    if (input.status === "done" && before.status !== "done") next.completedAt = new Date();
    if (input.status && input.status !== "done") next.completedAt = null;
    const updated = await db.update(tasks).set(next).where(eq(tasks.id, req.params.id)).returning();
    await writeAudit(req, { action: "update-task", entityType: "task", entityId: req.params.id, before, after: updated[0] });
    res.json(updated[0]);
  } catch (e) { next(e); }
});

tasksRouter.delete("/:id", requirePerm("tasks:write"), async (req, res, next) => {
  try {
    const t = await loadTask(req.params.id);
    if (req.user!.role !== "director" && t.reporterUserId !== req.user!.sub) {
      throw new HttpError(403, "Only the task creator or the Director can delete a task");
    }
    const deleted = await db.delete(tasks).where(eq(tasks.id, req.params.id)).returning();
    if (!deleted[0]) throw new HttpError(404, "Task not found");
    await writeAudit(req, { action: "delete-task", entityType: "task", entityId: req.params.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// -------------------- ASSIGNEES (members) --------------------
async function loadTask(id: string) {
  const rows = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!rows[0]) throw new HttpError(404, "Task not found");
  return rows[0];
}
function taskMembers(t: any): string[] {
  const s = new Set<string>(t.assigneeUserIds ?? []);
  if (t.assigneeUserId) s.add(t.assigneeUserId);
  if (t.reporterUserId) s.add(t.reporterUserId);
  return [...s];
}
function isMember(t: any, userId: string, role: string): boolean {
  return role === "director" || taskMembers(t).includes(userId);
}
// Only the task's creator (reporter) or a Director may change the assignee set.
function canManage(t: any, userId: string, role: string): boolean {
  return role === "director" || t.reporterUserId === userId;
}

const assigneeBody = z.object({ userId: z.string().uuid() });

tasksRouter.post("/:id/assignees", requirePerm("tasks:read"), async (req, res, next) => {
  try {
    const t = await loadTask(req.params.id);
    if (!canManage(t, req.user!.sub, req.user!.role)) throw new HttpError(403, "Only the task creator can change assignees");
    const { userId } = assigneeBody.parse(req.body);
    const ids = new Set<string>(t.assigneeUserIds ?? []);
    ids.add(userId);
    const assigneeUserIds = [...ids];
    const updated = await db.update(tasks)
      .set({ assigneeUserIds, assigneeUserId: t.assigneeUserId ?? assigneeUserIds[0] ?? null, updatedAt: new Date() })
      .where(eq(tasks.id, t.id)).returning();
    emitToTask(t.id, "task-updated", updated[0]);
    res.json(updated[0]);
  } catch (e) { next(e); }
});

tasksRouter.delete("/:id/assignees/:userId", requirePerm("tasks:read"), async (req, res, next) => {
  try {
    const t = await loadTask(req.params.id);
    if (!canManage(t, req.user!.sub, req.user!.role)) throw new HttpError(403, "Only the task creator can change assignees");
    const assigneeUserIds = (t.assigneeUserIds ?? []).filter((u: string) => u !== req.params.userId);
    const assigneeUserId = t.assigneeUserId === req.params.userId ? (assigneeUserIds[0] ?? null) : t.assigneeUserId;
    const updated = await db.update(tasks)
      .set({ assigneeUserIds, assigneeUserId, updatedAt: new Date() })
      .where(eq(tasks.id, t.id)).returning();
    emitToTask(t.id, "task-updated", updated[0]);
    res.json(updated[0]);
  } catch (e) { next(e); }
});

// -------------------- TASK CHAT --------------------
tasksRouter.get("/:id/messages", requirePerm("tasks:read"), async (req, res, next) => {
  try {
    const t = await loadTask(req.params.id);
    if (!isMember(t, req.user!.sub, req.user!.role)) throw new HttpError(403, "Not a member of this task");
    const rows = await db.select().from(taskMessages)
      .where(eq(taskMessages.taskId, t.id))
      .orderBy(sql`${taskMessages.createdAt} asc`);
    res.json(rows);
  } catch (e) { next(e); }
});

const messageBody = z.object({
  kind: z.enum(["text", "image", "file", "voice"]).default("text"),
  body: z.string().optional(),
  fileStoreId: z.string().uuid().optional(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  durationSec: z.number().int().optional(),
});

tasksRouter.post("/:id/messages", requirePerm("tasks:read"), async (req, res, next) => {
  try {
    const t = await loadTask(req.params.id);
    if (!isMember(t, req.user!.sub, req.user!.role)) throw new HttpError(403, "Not a member of this task");
    const input = messageBody.parse(req.body);
    if (input.kind === "text" && !input.body?.trim()) throw new HttpError(400, "Empty message");
    if (input.kind !== "text" && !input.fileStoreId) throw new HttpError(400, "Missing attachment");
    const inserted = await db.insert(taskMessages).values({
      taskId: t.id,
      userId: req.user!.sub,
      authorDisplay: (req.user as any).email ?? null,
      kind: input.kind,
      body: input.body ?? null,
      fileStoreId: input.fileStoreId ?? null,
      fileName: input.fileName ?? null,
      mimeType: input.mimeType ?? null,
      durationSec: input.durationSec ?? null,
    } as any).returning();
    emitToTask(t.id, "task-message", inserted[0]);
    res.status(201).json(inserted[0]);
  } catch (e) { next(e); }
});

// Delete a chat message (and its attachment) — the author may delete their
// own messages; the Director may delete anything.
tasksRouter.delete("/:id/messages/:messageId", requirePerm("tasks:read"), async (req, res, next) => {
  try {
    const t = await loadTask(req.params.id);
    if (!isMember(t, req.user!.sub, req.user!.role)) throw new HttpError(403, "Not a member of this task");
    const msg = (await db.select().from(taskMessages).where(eq(taskMessages.id, req.params.messageId)).limit(1))[0];
    if (!msg || msg.taskId !== t.id) throw new HttpError(404, "Message not found");
    if (req.user!.role !== "director" && msg.userId !== req.user!.sub) {
      throw new HttpError(403, "Only the author or the Director can delete this message");
    }
    if (msg.fileStoreId) {
      const f = (await db.select().from(files).where(eq(files.id, msg.fileStoreId)).limit(1))[0];
      if (f) {
        const key = f.storagePath.startsWith("s3://") ? f.storagePath.replace(/^s3:\/\/[^/]+\//, "") : f.storagePath;
        try { await storage.delete(key); } catch { /* best-effort */ }
        await db.delete(files).where(eq(files.id, f.id));
      }
    }
    await db.delete(taskMessages).where(eq(taskMessages.id, msg.id));
    await writeAudit(req, { action: "delete-task-message", entityType: "task-message", entityId: msg.id });
    emitToTask(t.id, "task-message-deleted", { id: msg.id, taskId: t.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// -------------------- TIMER --------------------
// Active timer for current user (running session, i.e. ended_at IS NULL)
tasksRouter.get("/timer/active", requirePerm("tasks:read"), async (req, res, next) => {
  try {
    const rows = await db.select().from(taskTimerSessions)
      .where(and(eq(taskTimerSessions.userId, req.user!.sub), isNull(taskTimerSessions.endedAt)))
      .limit(1);
    res.json(rows[0] ?? null);
  } catch (e) { next(e); }
});

tasksRouter.get("/sessions/all", requirePerm("tasks:read"), async (req, res, next) => {
  try {
    const rows = await db.select().from(taskTimerSessions)
      .where(eq(taskTimerSessions.userId, req.user!.sub));
    res.json(rows);
  } catch (e) { next(e); }
});

// Manual session create — the web TaskTimer logs a finished session in one
// shot (start/stop happened client-side), unlike the /:id/timer endpoints.
const sessionCreate = z.object({
  taskId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().optional(),
  durationSec: z.number().int().nonnegative().optional(),
  note: z.string().optional(),
});
tasksRouter.post("/sessions/all", requirePerm("tasks:read"), async (req, res, next) => {
  try {
    const input = sessionCreate.parse(req.body);
    // Only privileged users may log time on someone else's behalf
    const userId = input.userId && input.userId !== req.user!.sub ? input.userId : req.user!.sub;
    if (userId !== req.user!.sub && !effectiveHas(req.user!.role as Role, null, "tasks:write")) {
      throw new HttpError(403, "Cannot log time for another user");
    }
    const inserted = await db.insert(taskTimerSessions).values({
      taskId: input.taskId,
      userId,
      startedAt: input.startedAt,
      endedAt: input.endedAt ?? null,
      durationSec: input.durationSec ?? (input.endedAt ? Math.floor((input.endedAt.getTime() - input.startedAt.getTime()) / 1000) : null),
      note: input.note ?? null,
    }).returning();
    res.status(201).json(inserted[0]);
  } catch (e) { next(e); }
});

const sessionUpdate = z.object({
  startedAt: z.coerce.date().optional(),
  endedAt: z.coerce.date().nullable().optional(),
  durationSec: z.number().int().nonnegative().nullable().optional(),
  note: z.string().nullable().optional(),
});
tasksRouter.patch("/sessions/:id", requirePerm("tasks:read"), async (req, res, next) => {
  try {
    const input = sessionUpdate.parse(req.body);
    const existing = (await db.select().from(taskTimerSessions).where(eq(taskTimerSessions.id, req.params.id)).limit(1))[0];
    if (!existing) throw new HttpError(404, "Session not found");
    if (existing.userId !== req.user!.sub && !effectiveHas(req.user!.role as Role, null, "tasks:write")) {
      throw new HttpError(403, "Cannot edit another user's session");
    }
    const updated = await db.update(taskTimerSessions).set(input).where(eq(taskTimerSessions.id, req.params.id)).returning();
    res.json(updated[0]);
  } catch (e) { next(e); }
});

tasksRouter.delete("/sessions/:id", requirePerm("tasks:read"), async (req, res, next) => {
  try {
    const existing = (await db.select().from(taskTimerSessions).where(eq(taskTimerSessions.id, req.params.id)).limit(1))[0];
    if (!existing) throw new HttpError(404, "Session not found");
    if (existing.userId !== req.user!.sub && !effectiveHas(req.user!.role as Role, null, "tasks:write")) {
      throw new HttpError(403, "Cannot delete another user's session");
    }
    await db.delete(taskTimerSessions).where(eq(taskTimerSessions.id, req.params.id));
    res.json({ ok: true });
  } catch (e) { next(e); }
});

tasksRouter.get("/:id/sessions", requirePerm("tasks:read"), async (req, res, next) => {
  try {
    const rows = await db.select().from(taskTimerSessions).where(eq(taskTimerSessions.taskId, req.params.id));
    res.json(rows);
  } catch (e) { next(e); }
});

const startSchema = z.object({ note: z.string().optional() });
tasksRouter.post("/:id/timer/start", requirePerm("tasks:read"), async (req, res, next) => {
  try {
    const input = startSchema.parse(req.body ?? {});
    // Stop any active session first (only one at a time per user)
    const active = (await db.select().from(taskTimerSessions)
      .where(and(eq(taskTimerSessions.userId, req.user!.sub), isNull(taskTimerSessions.endedAt))).limit(1))[0];
    if (active) {
      const endedAt = new Date();
      const dur = Math.floor((endedAt.getTime() - new Date(active.startedAt as any).getTime()) / 1000);
      await db.update(taskTimerSessions)
        .set({ endedAt, durationSec: dur })
        .where(eq(taskTimerSessions.id, active.id));
    }
    const inserted = await db.insert(taskTimerSessions).values({
      taskId: req.params.id,
      userId: req.user!.sub,
      note: input.note ?? null,
    }).returning();
    res.status(201).json(inserted[0]);
  } catch (e) { next(e); }
});

tasksRouter.post("/:id/timer/stop", requirePerm("tasks:read"), async (req, res, next) => {
  try {
    const active = (await db.select().from(taskTimerSessions)
      .where(and(eq(taskTimerSessions.taskId, req.params.id), eq(taskTimerSessions.userId, req.user!.sub), isNull(taskTimerSessions.endedAt))).limit(1))[0];
    if (!active) throw new HttpError(404, "No active timer on this task");
    const endedAt = new Date();
    const dur = Math.floor((endedAt.getTime() - new Date(active.startedAt as any).getTime()) / 1000);
    const updated = await db.update(taskTimerSessions)
      .set({ endedAt, durationSec: dur })
      .where(eq(taskTimerSessions.id, active.id))
      .returning();
    res.json(updated[0]);
  } catch (e) { next(e); }
});

// -------------------- TIMESHEETS --------------------
const timesheetCreate = z.object({
  weekStartDate: iso,
  weekEndDate: iso,
  hours: z.record(z.string(), z.record(z.string(), z.number())),    // {date: {taskId: hours}}
  totalHours: z.number().optional(),
  note: z.string().optional(),
});

export const timesheetsRouter = Router();
timesheetsRouter.use(requireAuth);

timesheetsRouter.get("/", requirePerm("tasks:read"), async (req, res, next) => {
  try {
    // Default: own timesheets. HR/director see all.
    const role = req.user!.role;
    if (role === "director" || role === "hr-manager") {
      res.json(await db.select().from(timesheets).orderBy(sql`${timesheets.weekStartDate} desc`));
    } else {
      res.json(await db.select().from(timesheets).where(eq(timesheets.userId, req.user!.sub))
        .orderBy(sql`${timesheets.weekStartDate} desc`));
    }
  } catch (e) { next(e); }
});

timesheetsRouter.post("/", requirePerm("tasks:read"), async (req, res, next) => {
  try {
    const input = timesheetCreate.parse(req.body);
    const total = input.totalHours ?? Object.values(input.hours).reduce(
      (sum, day) => sum + Object.values(day).reduce((a, b) => a + b, 0), 0,
    );
    // Upsert by (user, week)
    const existing = (await db.select().from(timesheets)
      .where(and(eq(timesheets.userId, req.user!.sub), eq(timesheets.weekStartDate, input.weekStartDate))).limit(1))[0];
    if (existing) {
      const updated = await db.update(timesheets)
        .set({ hours: input.hours, totalHours: String(total), note: input.note ?? null })
        .where(eq(timesheets.id, existing.id))
        .returning();
      return res.json(updated[0]);
    }
    const inserted = await db.insert(timesheets).values({
      userId: req.user!.sub,
      weekStartDate: input.weekStartDate,
      weekEndDate: input.weekEndDate,
      hours: input.hours,
      totalHours: String(total),
      note: input.note ?? null,
    }).returning();
    res.status(201).json(inserted[0]);
  } catch (e) { next(e); }
});

timesheetsRouter.post("/:id/submit", requirePerm("tasks:read"), async (req, res, next) => {
  try {
    const updated = await db.update(timesheets)
      .set({ status: "submitted", submittedAt: new Date() })
      .where(eq(timesheets.id, req.params.id))
      .returning();
    if (!updated[0]) throw new HttpError(404, "Timesheet not found");
    await writeAudit(req, { action: "submit-timesheet", entityType: "timesheet", entityId: req.params.id });
    res.json(updated[0]);
  } catch (e) { next(e); }
});

timesheetsRouter.post("/:id/approve", requirePerm("tasks:write"), async (req, res, next) => {
  try {
    const updated = await db.update(timesheets)
      .set({ status: "approved", approvedByUserId: req.user!.sub, approvedAt: new Date() })
      .where(eq(timesheets.id, req.params.id))
      .returning();
    if (!updated[0]) throw new HttpError(404, "Timesheet not found");
    await writeAudit(req, { action: "approve-timesheet", entityType: "timesheet", entityId: req.params.id });
    res.json(updated[0]);
  } catch (e) { next(e); }
});

timesheetsRouter.post("/:id/reject", requirePerm("tasks:write"), async (req, res, next) => {
  try {
    const updated = await db.update(timesheets)
      .set({ status: "rejected" })
      .where(eq(timesheets.id, req.params.id))
      .returning();
    if (!updated[0]) throw new HttpError(404, "Timesheet not found");
    await writeAudit(req, { action: "reject-timesheet", entityType: "timesheet", entityId: req.params.id });
    res.json(updated[0]);
  } catch (e) { next(e); }
});
