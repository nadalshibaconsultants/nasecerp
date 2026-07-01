// Submittal SLA watcher. Runs every 15 minutes:
//   1. Flips submittals whose SLA deadline has passed (still in 'submitted' or
//      'under-review') to 'overdue'.
//   2. Creates one in-app notification per newly-overdue submittal to its
//      contractor + project PM + design lead.
import { and, eq, lte, inArray, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { submittals, notifications, projects, users } from "../db/schema/index.js";
import { emitToUser, emitToProject } from "../lib/realtime.js";

export async function runSlaTimerJob() {
  const now = new Date();
  const due = await db.select().from(submittals).where(and(
    inArray(submittals.status, ["submitted", "under-review"] as any),
    lte(submittals.slaDeadline, now),
  ));

  if (due.length === 0) return;

  for (const s of due) {
    await db.update(submittals).set({ status: "overdue", updatedAt: new Date() }).where(eq(submittals.id, s.id));

    // Notify PM + design lead of the project (if any) and HR/director broadcast
    const recipients = new Set<string>();
    if (s.projectId) {
      const proj = (await db.select().from(projects).where(eq(projects.id, s.projectId)).limit(1))[0];
      if (proj?.pmUserId) recipients.add(proj.pmUserId);
      if (proj?.designLeadUserId) recipients.add(proj.designLeadUserId);
    }
    const directors = await db.select().from(users).where(eq(users.role, "director"));
    for (const d of directors) recipients.add(d.id);

    const title = `Submittal overdue — ${s.ref}`;
    const body = `${s.type} / ${s.discipline} on ${s.projectCode ?? s.projectId ?? "—"} passed its SLA at ${s.slaDeadline}`;
    const link = `/submittals/${s.id}`;

    for (const userId of recipients) {
      // De-dupe within 12h
      const existing = await db.execute(sql`
        SELECT 1 FROM notifications
        WHERE user_id = ${userId} AND type = 'submittal-overdue'
          AND title = ${title} AND created_at > now() - interval '12 hours'
        LIMIT 1
      `);
      if ((existing as any).rows?.length) continue;
      const [row] = await db.insert(notifications).values({ userId, type: "submittal-overdue", title, body, link }).returning();
      emitToUser(userId, "notification", row);
    }
    if (s.projectId) emitToProject(s.projectId, "submittal:overdue", { id: s.id, ref: s.ref });
  }
  console.log(`[job:sla-timers] flipped ${due.length} submittals to overdue`);
}
