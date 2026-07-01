import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { users } from "../../db/schema/index.js";
import { requireAuth } from "../../middleware/auth.js";

export const usersRouter = Router();
usersRouter.use(requireAuth);

// Lightweight, read-only directory for assignment pickers (task assignee,
// reviewers, etc.). Available to any authenticated user — exposes only
// non-sensitive identity fields, never password hashes or grants.
usersRouter.get("/directory", async (_req, res, next) => {
  try {
    const rows = await db.select({
      id: users.id,
      displayName: users.displayName,
      role: users.role,
      office: users.office,
      employeeId: users.employeeId,
    }).from(users).where(eq(users.status, "active")).orderBy(users.displayName);
    res.json(rows);
  } catch (err) { next(err); }
});
