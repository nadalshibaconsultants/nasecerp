import cron from "node-cron";
import { runDocumentExpiryJob } from "./document-expiry.js";
import { runLeaveAccrualJob } from "./leave-accrual.js";
import { runAttendanceRollupJob } from "./attendance-rollup.js";
import { runSlaTimerJob } from "./sla-timers.js";
import { runFirebaseAttendanceSync } from "./firebase-sync.js";

export function startJobs() {
  // Daily 03:00 — document expiry alerts
  cron.schedule("0 3 * * *", () => {
    runDocumentExpiryJob().catch((err) => console.error("[job:document-expiry] failed", err));
  });

  // Daily 02:00 — attendance roll-up for yesterday
  cron.schedule("0 2 * * *", () => {
    runAttendanceRollupJob().catch((err) => console.error("[job:attendance-rollup] failed", err));
  });

  // Monthly 1st 02:00 — leave accrual
  cron.schedule("0 2 1 * *", () => {
    runLeaveAccrualJob().catch((err) => console.error("[job:leave-accrual] failed", err));
  });

  // Every 15 min — submittal SLA timers
  cron.schedule("*/15 * * * *", () => {
    runSlaTimerJob().catch((err) => console.error("[job:sla-timers] failed", err));
  });

  // Token cleanup — daily 02:30
  cron.schedule("30 2 * * *", async () => {
    const { db } = await import("../db/client.js");
    const { refreshTokens } = await import("../db/schema/index.js");
    const { lt } = await import("drizzle-orm");
    const res = await db.delete(refreshTokens).where(lt(refreshTokens.expiresAt, new Date())).returning();
    console.log(`[job:refresh-token-cleanup] purged ${res.length}`);
  });

  // Every 15 min — pull new attendance punches from Firebase (if enabled)
  cron.schedule("*/15 * * * *", () => {
    runFirebaseAttendanceSync().catch((err) => console.error("[job:firebase-sync] failed", err));
  });

  console.log("[jobs] scheduled: document-expiry, leave-accrual, attendance-rollup, sla-timers, refresh-token-cleanup, firebase-sync");
}
