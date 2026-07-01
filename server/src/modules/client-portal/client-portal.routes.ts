// Client Portal backend.
//   Management (Director/PM, gated by projects:write): invite clients, list per
//   project, edit, reset password, disable/enable, delete, assign projects, view
//   login logs. Client accounts reuse the `users` table (role='client').
//   Client-facing (role='client'): list only assigned projects.
import { Router } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import { users, projects, clientProjectAccess, clientLoginLogs } from "../../db/schema/index.js";
import { requireAuth } from "../../middleware/auth.js";
import { requirePerm } from "../../middleware/rbac.js";
import { writeAudit } from "../../middleware/audit.js";
import { HttpError } from "../../middleware/errors.js";
import { hashPassword } from "../../lib/password.js";
import { sendMail } from "../../lib/mailer.js";
import { createPasswordReset } from "../auth/auth.service.js";

export const clientPortalRouter = Router();
clientPortalRouter.use(requireAuth);

const accessRole = z.enum(["admin", "viewer"]);

// Shape returned for a client card in the portal tab.
function clientCard(u: any, access?: any) {
  return {
    id: u.id,
    accessId: access?.id,
    name: u.displayName,
    email: u.email,
    role: access?.role ?? "viewer",        // per-project Admin/Viewer
    status: u.status === "active" ? "Active" : u.status === "disabled" ? "Disabled" : "Pending",
    rawStatus: u.status,
    lastLogin: u.lastLoginAt,
  };
}

// ---------------------------------------------------------------- MANAGEMENT
// List clients with access to a project.
clientPortalRouter.get("/access", requirePerm("projects:read"), async (req, res, next) => {
  try {
    const projectId = String(req.query.projectId || "");
    if (!projectId) throw new HttpError(400, "projectId query param required");
    const rows = await db
      .select({ access: clientProjectAccess, user: users })
      .from(clientProjectAccess)
      .innerJoin(users, eq(users.id, clientProjectAccess.clientUserId))
      .where(eq(clientProjectAccess.projectId, projectId));
    res.json(rows.map((r) => clientCard(r.user, r.access)));
  } catch (e) { next(e); }
});

// All client accounts (across projects).
clientPortalRouter.get("/list", requirePerm("projects:read"), async (_req, res, next) => {
  try {
    const rows = await db.select().from(users).where(eq(users.role, "client"));
    res.json(rows.map((u) => clientCard(u)));
  } catch (e) { next(e); }
});

clientPortalRouter.get("/client-projects/:userId", requirePerm("projects:read"), async (req, res, next) => {
  try {
    const user = (await db.select().from(users).where(eq(users.id, req.params.userId)).limit(1))[0];
    if (!user || user.role !== "client") throw new HttpError(404, "Client not found");
    const rows = await db
      .select({ access: clientProjectAccess, project: projects })
      .from(clientProjectAccess)
      .innerJoin(projects, eq(projects.id, clientProjectAccess.projectId))
      .where(eq(clientProjectAccess.clientUserId, user.id));
    res.json(rows.map((r) => ({ ...r.project, accessId: r.access.id, portalRole: r.access.role })));
  } catch (e) { next(e); }
});

const clientProjectsSchema = z.object({
  projectIds: z.array(z.string().uuid()),
  role: accessRole.default("viewer"),
});
clientPortalRouter.put("/client-projects/:userId", requirePerm("projects:write"), async (req, res, next) => {
  try {
    const input = clientProjectsSchema.parse(req.body);
    const user = (await db.select().from(users).where(eq(users.id, req.params.userId)).limit(1))[0];
    if (!user || user.role !== "client") throw new HttpError(404, "Client not found");

    const current = await db.select().from(clientProjectAccess).where(eq(clientProjectAccess.clientUserId, user.id));
    const nextIds = new Set(input.projectIds);
    for (const row of current) {
      if (!nextIds.has(row.projectId)) {
        await db.delete(clientProjectAccess).where(eq(clientProjectAccess.id, row.id));
      }
    }
    const currentIds = new Set(current.map((row) => row.projectId));
    for (const projectId of nextIds) {
      if (currentIds.has(projectId)) {
        await db.update(clientProjectAccess)
          .set({ role: input.role })
          .where(and(eq(clientProjectAccess.clientUserId, user.id), eq(clientProjectAccess.projectId, projectId)));
      } else {
        await db.insert(clientProjectAccess).values({ clientUserId: user.id, projectId, role: input.role });
      }
    }

    await writeAudit(req, { action: "set-client-projects", entityType: "client", entityId: user.id, after: { projectIds: input.projectIds, role: input.role } });
    const rows = await db
      .select({ access: clientProjectAccess, project: projects })
      .from(clientProjectAccess)
      .innerJoin(projects, eq(projects.id, clientProjectAccess.projectId))
      .where(eq(clientProjectAccess.clientUserId, user.id));
    res.json(rows.map((r) => ({ ...r.project, accessId: r.access.id, portalRole: r.access.role })));
  } catch (e) { next(e); }
});

const inviteSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: accessRole.default("viewer"),
  sendEmail: z.boolean().optional(),
});

// Invite (create-or-reuse) a client and grant project access.
clientPortalRouter.post("/invite", requirePerm("projects:write"), async (req, res, next) => {
  try {
    const input = inviteSchema.parse(req.body);
    const proj = (await db.select().from(projects).where(eq(projects.id, input.projectId)).limit(1))[0];
    if (!proj) throw new HttpError(404, "Project not found");

    const existing = (await db.select().from(users).where(eq(users.email, input.email.toLowerCase())).limit(1))[0]
      || (await db.select().from(users).where(eq(users.email, input.email)).limit(1))[0];
    let user = existing;
    if (user && user.role !== "client") {
      throw new HttpError(409, "That email already belongs to a staff account.");
    }
    const passwordHash = await hashPassword(input.password);
    if (!user) {
      user = (await db.insert(users).values({
        email: input.email,
        passwordHash,
        displayName: input.name,
        role: "client",
        status: "active",
      }).returning())[0];
    } else {
      // Reuse the client account; refresh name + password to the invited values.
      user = (await db.update(users).set({ displayName: input.name, passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id)).returning())[0];
    }

    // Grant (or update) project access.
    const existingAccess = (await db.select().from(clientProjectAccess)
      .where(and(eq(clientProjectAccess.clientUserId, user.id), eq(clientProjectAccess.projectId, input.projectId))).limit(1))[0];
    let access;
    if (existingAccess) {
      access = (await db.update(clientProjectAccess).set({ role: input.role }).where(eq(clientProjectAccess.id, existingAccess.id)).returning())[0];
    } else {
      access = (await db.insert(clientProjectAccess).values({ clientUserId: user.id, projectId: input.projectId, role: input.role }).returning())[0];
    }

    let emailed = false;
    if (input.sendEmail) {
      const origin = `${req.protocol}://${req.get("host")}`;
      const r = await sendMail({
        to: input.email,
        subject: `NASEC — Client Portal access · ${proj.nameEn ?? proj.code ?? "Project"}`,
        html: `<p>Hello ${input.name},</p>
<p>You've been granted <strong>${input.role}</strong> access to the NASEC Client Portal for project <strong>${proj.nameEn ?? proj.code}</strong>.</p>
<p><strong>Portal:</strong> <a href="${origin}/login">${origin}/login</a><br/>
<strong>Email:</strong> ${input.email}<br/>
<strong>Temporary password:</strong> ${input.password}</p>
<p>Please sign in and change your password.</p>`,
      });
      emailed = r.ok;
    }

    await writeAudit(req, { action: "invite-client", entityType: "client", entityId: user.id, after: { projectId: input.projectId, role: input.role, emailed } });
    res.status(201).json({ ...clientCard(user, access), emailed });
  } catch (e) { next(e); }
});

// Edit a client's name and/or per-project access role.
const editSchema = z.object({ name: z.string().min(1).optional(), role: accessRole.optional() });
clientPortalRouter.patch("/access/:accessId", requirePerm("projects:write"), async (req, res, next) => {
  try {
    const input = editSchema.parse(req.body);
    const access = (await db.select().from(clientProjectAccess).where(eq(clientProjectAccess.id, req.params.accessId)).limit(1))[0];
    if (!access) throw new HttpError(404, "Access record not found");
    if (input.role) await db.update(clientProjectAccess).set({ role: input.role }).where(eq(clientProjectAccess.id, access.id));
    if (input.name) await db.update(users).set({ displayName: input.name, updatedAt: new Date() }).where(eq(users.id, access.clientUserId));
    const user = (await db.select().from(users).where(eq(users.id, access.clientUserId)).limit(1))[0];
    const updated = (await db.select().from(clientProjectAccess).where(eq(clientProjectAccess.id, access.id)).limit(1))[0];
    await writeAudit(req, { action: "edit-client", entityType: "client", entityId: access.clientUserId, after: input });
    res.json(clientCard(user, updated));
  } catch (e) { next(e); }
});

// Reset a client's password — set directly, or email a reset link.
const resetSchema = z.object({ password: z.string().min(6).optional(), sendEmail: z.boolean().optional() });
clientPortalRouter.post("/clients/:userId/reset-password", requirePerm("projects:write"), async (req, res, next) => {
  try {
    const input = resetSchema.parse(req.body);
    const user = (await db.select().from(users).where(eq(users.id, req.params.userId)).limit(1))[0];
    if (!user || user.role !== "client") throw new HttpError(404, "Client not found");
    if (input.password) {
      const passwordHash = await hashPassword(input.password);
      await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id));
    } else {
      const issued = await createPasswordReset(user.email);
      if (issued && input.sendEmail !== false) {
        const link = `${req.protocol}://${req.get("host")}/reset-password?token=${issued.token}`;
        await sendMail({ to: user.email, subject: "NASEC Client Portal — Password reset", html: `<p>Reset link (valid 1h): <a href="${link}">${link}</a></p>` });
      }
    }
    await writeAudit(req, { action: "reset-client-password", entityType: "client", entityId: user.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Disable / enable a client account.
const statusSchema = z.object({ status: z.enum(["active", "disabled"]) });
clientPortalRouter.patch("/clients/:userId/status", requirePerm("projects:write"), async (req, res, next) => {
  try {
    const { status } = statusSchema.parse(req.body);
    const user = (await db.select().from(users).where(eq(users.id, req.params.userId)).limit(1))[0];
    if (!user || user.role !== "client") throw new HttpError(404, "Client not found");
    const updated = (await db.update(users).set({ status, updatedAt: new Date() }).where(eq(users.id, user.id)).returning())[0];
    await writeAudit(req, { action: "set-client-status", entityType: "client", entityId: user.id, after: { status } });
    res.json(clientCard(updated));
  } catch (e) { next(e); }
});

// Revoke a single project's access.
clientPortalRouter.delete("/access/:accessId", requirePerm("projects:write"), async (req, res, next) => {
  try {
    const deleted = (await db.delete(clientProjectAccess).where(eq(clientProjectAccess.id, req.params.accessId)).returning())[0];
    if (!deleted) throw new HttpError(404, "Access record not found");
    await writeAudit(req, { action: "revoke-client-access", entityType: "client", entityId: deleted.clientUserId });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Delete a client account entirely (cascades access + logs).
clientPortalRouter.delete("/clients/:userId", requirePerm("projects:write"), async (req, res, next) => {
  try {
    const user = (await db.select().from(users).where(eq(users.id, req.params.userId)).limit(1))[0];
    if (!user || user.role !== "client") throw new HttpError(404, "Client not found");
    await db.delete(users).where(eq(users.id, user.id));
    await writeAudit(req, { action: "delete-client", entityType: "client", entityId: user.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Assign an existing client to another project.
const assignSchema = z.object({ clientUserId: z.string().uuid(), projectId: z.string().uuid(), role: accessRole.default("viewer") });
clientPortalRouter.post("/assign-project", requirePerm("projects:write"), async (req, res, next) => {
  try {
    const input = assignSchema.parse(req.body);
    const user = (await db.select().from(users).where(eq(users.id, input.clientUserId)).limit(1))[0];
    if (!user || user.role !== "client") throw new HttpError(404, "Client not found");
    const exists = (await db.select().from(clientProjectAccess)
      .where(and(eq(clientProjectAccess.clientUserId, input.clientUserId), eq(clientProjectAccess.projectId, input.projectId))).limit(1))[0];
    const access = exists
      ? (await db.update(clientProjectAccess).set({ role: input.role }).where(eq(clientProjectAccess.id, exists.id)).returning())[0]
      : (await db.insert(clientProjectAccess).values(input).returning())[0];
    await writeAudit(req, { action: "assign-client-project", entityType: "client", entityId: input.clientUserId, after: { projectId: input.projectId, role: input.role } });
    res.status(201).json(clientCard(user, access));
  } catch (e) { next(e); }
});

// Login/session logs for a client.
clientPortalRouter.get("/login-logs", requirePerm("projects:read"), async (req, res, next) => {
  try {
    const clientId = String(req.query.clientId || "");
    const q = db.select().from(clientLoginLogs).orderBy(desc(clientLoginLogs.loginTime)).limit(100);
    const rows = clientId ? await q.where(eq(clientLoginLogs.clientUserId, clientId)) : await q;
    res.json(rows);
  } catch (e) { next(e); }
});

// ------------------------------------------------------------- CLIENT-FACING
function requireClient(req: any) {
  if (req.user?.role !== "client") throw new HttpError(403, "Client portal access only");
}

// The projects this client may see (with their per-project role).
clientPortalRouter.get("/my-projects", async (req, res, next) => {
  try {
    requireClient(req);
    const access = await db.select().from(clientProjectAccess).where(eq(clientProjectAccess.clientUserId, req.user!.sub));
    if (!access.length) return res.json([]);
    const ids = access.map((a) => a.projectId);
    const projRows = await db.select().from(projects).where(inArray(projects.id, ids));
    const roleByProject = new Map(access.map((a) => [a.projectId, a.role]));
    res.json(projRows.map((p) => ({ ...p, portalRole: roleByProject.get(p.id) ?? "viewer" })));
  } catch (e) { next(e); }
});

// A single assigned project (403 if not granted).
clientPortalRouter.get("/project/:id", async (req, res, next) => {
  try {
    requireClient(req);
    const access = (await db.select().from(clientProjectAccess)
      .where(and(eq(clientProjectAccess.clientUserId, req.user!.sub), eq(clientProjectAccess.projectId, req.params.id))).limit(1))[0];
    if (!access) throw new HttpError(403, "You don't have access to this project");
    const proj = (await db.select().from(projects).where(eq(projects.id, req.params.id)).limit(1))[0];
    if (!proj) throw new HttpError(404, "Project not found");
    res.json({ ...proj, portalRole: access.role });
  } catch (e) { next(e); }
});
