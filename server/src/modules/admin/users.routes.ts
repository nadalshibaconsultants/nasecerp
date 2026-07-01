import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import { users } from "../../db/schema/index.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { writeAudit } from "../../middleware/audit.js";
import { HttpError } from "../../middleware/errors.js";
import { hashPassword } from "../../lib/password.js";

export const adminUsersRouter = Router();
adminUsersRouter.use(requireAuth, requireRole("director", "hr-manager"));

const patchSchema = z.object({
  displayName: z.string().min(1).optional(),
  role: z
    .enum([
      "director",
      "hr-manager",
      "finance-manager",
      "accountant",
      "pm",
      "design-lead",
      "site-engineer",
      "bd-manager",
      "employee",
      "contractor",
      "client",
    ])
    .optional(),
  office: z.enum(["dubai", "cairo"]).nullable().optional(),
  status: z.enum(["active", "disabled", "pending"]).optional(),
  employeeId: z.string().uuid().nullable().optional(),
  avatarColor: z.string().nullable().optional(),
  // Per-user extra module grants (Director/HR manage). Full replacement set.
  extraPermissions: z.array(z.string()).optional(),
  password: z.string().min(1).optional(),
});

adminUsersRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        role: users.role,
        office: users.office,
        status: users.status,
        employeeId: users.employeeId,
        avatarColor: users.avatarColor,
        extraPermissions: users.extraPermissions,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.createdAt);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

adminUsersRouter.get("/:id", async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, req.params.id))
      .limit(1);
    if (!rows[0]) throw new HttpError(404, "User not found");
    const { passwordHash, ...safe } = rows[0];
    res.json(safe);
  } catch (err) {
    next(err);
  }
});

adminUsersRouter.patch("/:id", async (req, res, next) => {
  try {
    const input = patchSchema.parse(req.body);
    const before = (
      await db.select().from(users).where(eq(users.id, req.params.id)).limit(1)
    )[0];
    if (!before) throw new HttpError(404, "User not found");

    const { password, ...rest } = input;
    const updateData: any = { ...rest, updatedAt: new Date() };
    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }

    const updated = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, req.params.id))
      .returning();
    await writeAudit(req, {
      action: "update-user",
      entityType: "user",
      entityId: req.params.id,
      before,
      after: updated[0],
    });
    const { passwordHash, ...safe } = updated[0];
    res.json(safe);
  } catch (err) {
    next(err);
  }
});

adminUsersRouter.delete("/:id", async (req, res, next) => {
  try {
    if (req.user!.sub === req.params.id)
      throw new HttpError(400, "Cannot delete yourself");
    const deleted = await db
      .delete(users)
      .where(eq(users.id, req.params.id))
      .returning();
    if (!deleted[0]) throw new HttpError(404, "User not found");
    await writeAudit(req, {
      action: "delete-user",
      entityType: "user",
      entityId: req.params.id,
      before: deleted[0],
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
