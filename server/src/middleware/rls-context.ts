import type { Request, Response, NextFunction } from "express";
import { pool } from "../db/client.js";

/**
 * Per-request middleware that opens a dedicated pg client, sets the
 * `app.*` session vars consumed by RLS policies, and attaches helpers to
 * `req` for module code to use.
 *
 * Usage in routes:
 *   const result = await req.dbQuery(sql, params);
 *
 * The client is released automatically at response finish.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      dbQuery?: (text: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount: number | null }>;
    }
  }
}

export async function rlsContext(req: Request, res: Response, next: NextFunction) {
  const client = await pool.connect();
  // Both "finish" and "close" fire for most responses; release exactly once or
  // pg-pool throws "Release called on client which has already been released"
  // — which, firing on an event emitter, crashes the whole process.
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    client.release();
  };
  try {
    const u = req.user;
    await client.query("SELECT set_config('app.user_id', $1, false), set_config('app.role', $2, false), set_config('app.office', $3, false), set_config('app.employee_id', $4, false)", [
      u?.sub ?? "",
      u?.role ?? "",
      u?.office ?? "",
      u?.employeeId ?? "",
    ]);
    req.dbQuery = async (text: string, params?: unknown[]) => {
      const r = await client.query(text, params as any[]);
      return { rows: r.rows, rowCount: r.rowCount };
    };
    res.on("finish", release);
    res.on("close", release);
    next();
  } catch (err) {
    release();
    next(err);
  }
}
