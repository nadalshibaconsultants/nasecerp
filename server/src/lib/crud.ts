// Tiny CRUD scaffolder for "list / get / create / update / delete" tables.
// Used by HR workflow routes to keep them short and consistent.
import type { Router, Request, Response, NextFunction } from "express";
import { eq, desc, type AnyColumn } from "drizzle-orm";
import type { PgTable, PgColumn } from "drizzle-orm/pg-core";
import { z, type ZodSchema } from "zod";
import { db } from "../db/client.js";
import { requirePerm } from "../middleware/rbac.js";
import { writeAudit } from "../middleware/audit.js";
import { HttpError } from "../middleware/errors.js";
import type { Permission } from "./permissions.js";

export type CrudOptions<TCreate, TUpdate> = {
  table: PgTable<any>;
  idColumn: PgColumn<any>;
  createSchema: ZodSchema<TCreate>;
  updateSchema: ZodSchema<TUpdate>;
  perms: { read: Permission; write: Permission };
  entityType: string;
  /** Optional orderBy column for list */
  orderBy?: AnyColumn;
  /** Map req.body -> insert values (e.g. coerce ISO strings, attach user id) */
  beforeCreate?: (input: any, req: Request) => any | Promise<any>;
  beforeUpdate?: (input: any, req: Request) => any | Promise<any>;
  /** Map DB row -> response */
  afterRead?: (row: any) => any;
  /** Side effects after a successful create (e.g. auto-journal posting) */
  afterCreate?: (row: any, req: Request) => void | Promise<void>;
};

export function attachCrud<C, U>(r: Router, path: string, opts: CrudOptions<C, U>) {
  const { table, idColumn, createSchema, updateSchema, perms, entityType, orderBy, beforeCreate, beforeUpdate, afterRead, afterCreate } = opts;
  const out = afterRead ?? ((x: any) => x);

  r.get(path, requirePerm(perms.read), async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const q = (db.select().from(table) as any);
      const rows = orderBy ? await q.orderBy(desc(orderBy)) : await q;
      res.json(rows.map(out));
    } catch (e) { next(e); }
  });

  r.get(`${path}/:id`, requirePerm(perms.read), async (req, res, next) => {
    try {
      const rows = await db.select().from(table).where(eq(idColumn as any, req.params.id)).limit(1);
      if (!rows[0]) throw new HttpError(404, `${entityType} not found`);
      res.json(out(rows[0]));
    } catch (e) { next(e); }
  });

  r.post(path, requirePerm(perms.write), async (req, res, next) => {
    try {
      const input = createSchema.parse(req.body);
      const values = beforeCreate ? await beforeCreate(input, req) : input;
      const inserted = await db.insert(table).values(values as any).returning();
      await writeAudit(req, { action: `create-${entityType}`, entityType, entityId: (inserted[0] as any).id, after: inserted[0] });
      if (afterCreate) { try { await afterCreate(inserted[0], req); } catch (err) { console.warn(`[crud:${entityType}] afterCreate failed`, err); } }
      res.status(201).json(out(inserted[0]));
    } catch (e) { next(e); }
  });

  r.patch(`${path}/:id`, requirePerm(perms.write), async (req, res, next) => {
    try {
      const input = updateSchema.parse(req.body);
      const before = (await db.select().from(table).where(eq(idColumn as any, req.params.id)).limit(1))[0];
      if (!before) throw new HttpError(404, `${entityType} not found`);
      const values = beforeUpdate ? await beforeUpdate(input, req) : input;
      const updated = await db.update(table).set(values as any).where(eq(idColumn as any, req.params.id)).returning();
      await writeAudit(req, { action: `update-${entityType}`, entityType, entityId: req.params.id, before, after: updated[0] });
      res.json(out(updated[0]));
    } catch (e) { next(e); }
  });

  r.delete(`${path}/:id`, requirePerm(perms.write), async (req, res, next) => {
    try {
      const deleted = await db.delete(table).where(eq(idColumn as any, req.params.id)).returning();
      if (!deleted[0]) throw new HttpError(404, `${entityType} not found`);
      await writeAudit(req, { action: `delete-${entityType}`, entityType, entityId: req.params.id, before: deleted[0] });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });
}

export const dateOrNull = (v?: string | null) => (v && v !== "" ? v : null);
export const numStrOrNull = (v?: number | null) => (v == null ? null : String(v));
