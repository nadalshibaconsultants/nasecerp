import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema/index.js";
import { effectiveHas, effectiveHasAny, type Permission, type Role } from "../lib/permissions.js";
import { HttpError } from "./errors.js";

// Loads the user's per-user grants only when the role alone doesn't satisfy the
// check — so the common (role-allowed) path stays query-free.
async function loadExtra(userId: string): Promise<string[]> {
  const rows = await db.select({ extra: users.extraPermissions }).from(users).where(eq(users.id, userId)).limit(1);
  return rows[0]?.extra ?? [];
}

/** Imperative permission check for use inside handlers (same logic as
 *  requirePerm, but returns a boolean instead of rejecting the request). */
export async function userHasPerm(req: Request, perm: Permission): Promise<boolean> {
  if (!req.user) return false;
  const role = req.user.role as Role;
  if (effectiveHas(role, null, perm)) return true;
  const extra = await loadExtra(req.user.sub);
  return effectiveHas(role, extra, perm);
}

export function requirePerm(perm: Permission) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new HttpError(401, "Authentication required");
      const role = req.user.role as Role;
      if (!effectiveHas(role, null, perm)) {
        const extra = await loadExtra(req.user.sub);
        if (!effectiveHas(role, extra, perm)) throw new HttpError(403, `Missing permission: ${perm}`);
      }
      next();
    } catch (err) { next(err); }
  };
}

export function requireAnyPerm(...perms: Permission[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new HttpError(401, "Authentication required");
      const role = req.user.role as Role;
      if (!effectiveHasAny(role, null, perms)) {
        const extra = await loadExtra(req.user.sub);
        if (!effectiveHasAny(role, extra, perms)) throw new HttpError(403, `Missing any of: ${perms.join(", ")}`);
      }
      next();
    } catch (err) { next(err); }
  };
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new HttpError(401, "Authentication required");
    if (!roles.includes(req.user.role as Role)) {
      throw new HttpError(403, `Role not permitted: ${req.user.role}`);
    }
    next();
  };
}
