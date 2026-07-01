// Daily attendance roll-up. For each (employee, day) where punches exist,
// computes first-in / last-out / total hours / project list / missing-punch flag,
// then upserts into attendance_daily_rollup.
//
// Default: runs for "yesterday" UTC. Pass an explicit date for backfills.
import { sql } from "drizzle-orm";
import { db } from "../db/client.js";

export async function runAttendanceRollupJob(targetDay?: string) {
  const day = targetDay ?? new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  console.log(`[job:attendance-rollup] day=${day}`);

  const result = await db.execute(sql`
    INSERT INTO attendance_daily_rollup (employee_id, day, first_in, last_out, hours, project_ids, punch_count, missing_punches, updated_at)
    SELECT
      employee_id,
      ${day} AS day,
      MIN(CASE WHEN type = 'in' THEN timestamp END) AS first_in,
      MAX(CASE WHEN type = 'out' THEN timestamp END) AS last_out,
      ROUND(
        GREATEST(
          0,
          EXTRACT(EPOCH FROM (MAX(CASE WHEN type = 'out' THEN timestamp END)
                              - MIN(CASE WHEN type = 'in' THEN timestamp END))) / 3600.0
        )::numeric, 2
      ) AS hours,
      coalesce(jsonb_agg(DISTINCT project_id) FILTER (WHERE project_id IS NOT NULL), '[]'::jsonb) AS project_ids,
      COUNT(*)::int AS punch_count,
      (
        COUNT(*) FILTER (WHERE type = 'in') <> COUNT(*) FILTER (WHERE type = 'out')
      ) AS missing_punches,
      now() AS updated_at
    FROM attendance_punches
    WHERE timestamp::date = ${day}::date
    GROUP BY employee_id
    ON CONFLICT (employee_id, day) DO UPDATE
      SET first_in = EXCLUDED.first_in,
          last_out = EXCLUDED.last_out,
          hours = EXCLUDED.hours,
          project_ids = EXCLUDED.project_ids,
          punch_count = EXCLUDED.punch_count,
          missing_punches = EXCLUDED.missing_punches,
          updated_at = EXCLUDED.updated_at
  `);

  console.log(`[job:attendance-rollup] rows: ${(result as any).rowCount ?? "?"}`);
}
