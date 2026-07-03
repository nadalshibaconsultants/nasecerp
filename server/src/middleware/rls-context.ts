import type { Request, Response, NextFunction } from "express";
import { pool } from "../db/client.js";

// Sets per-request RLS session vars and immediately releases the connection.
// Holding a dedicated connection for the full request lifetime exhausted the
// pool under concurrent load — routes use Drizzle's db (pool) directly anyway.
export async function rlsContext(req: Request, res: Response, next: NextFunction) {
  const client = await pool.connect();
  try {
    const u = req.user;
    await client.query(
      "SELECT set_config('app.user_id', $1, false), set_config('app.role', $2, false), set_config('app.office', $3, false), set_config('app.employee_id', $4, false)",
      [u?.sub ?? "", u?.role ?? "", u?.office ?? "", u?.employeeId ?? ""]
    );
  } finally {
    client.release();
  }
  next();
}
