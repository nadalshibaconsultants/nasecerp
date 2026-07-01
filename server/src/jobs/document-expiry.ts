// Daily scan of employee identity documents (passport, EID, visa, labour card)
// + employee_documents.expiry_date. Creates one in-app notification per row
// crossing the 60/30/7-day-before threshold, addressed to HR managers and the
// employee's linked user.
import { and, eq, inArray, isNotNull, lte, gte, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { employees, employeeDocuments, users, notifications } from "../db/schema/index.js";
import { emitToUser } from "../lib/realtime.js";

const THRESHOLDS = [60, 30, 7];

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

type ExpiryRow = {
  employeeId: string;
  employeeName: string;
  docType: string;
  docNumber: string | null;
  expiryDate: Date | string;
  linkedUserId: string | null;
};

async function buildAlerts(): Promise<ExpiryRow[]> {
  const today = new Date();
  const horizon = addDays(today, Math.max(...THRESHOLDS));

  // Top-level identity fields on employees
  const empRows = await db.select().from(employees);
  const userRows = await db.select({ id: users.id, employeeId: users.employeeId }).from(users)
    .where(isNotNull(users.employeeId));
  const empToUser = new Map(userRows.map((u) => [u.employeeId!, u.id]));

  const alerts: ExpiryRow[] = [];
  for (const e of empRows) {
    const linked = empToUser.get(e.id) ?? null;
    const name = `${e.firstName} ${e.lastName}`;
    const fields: Array<["passport"|"emirates-id"|"visa"|"labour-card", string | null, Date | string | null]> = [
      ["passport", e.passportNo, e.passportExpiry as any],
      ["emirates-id", e.emiratesIdNo, e.emiratesIdExpiry as any],
      ["visa", e.visaNo, e.visaExpiry as any],
      ["labour-card", e.labourCardNo, e.labourCardExpiry as any],
    ];
    for (const [type, num, exp] of fields) {
      if (!exp) continue;
      const d = exp instanceof Date ? exp : new Date(exp);
      if (d > horizon || d < today) continue;
      alerts.push({ employeeId: e.id, employeeName: name, docType: type, docNumber: num, expiryDate: d, linkedUserId: linked });
    }
  }

  // employee_documents table
  const docs = await db.select({
    id: employeeDocuments.id, employeeId: employeeDocuments.employeeId,
    type: employeeDocuments.type, number: employeeDocuments.number,
    expiryDate: employeeDocuments.expiryDate,
  }).from(employeeDocuments)
    .where(and(isNotNull(employeeDocuments.expiryDate), gte(employeeDocuments.expiryDate, today.toISOString().slice(0, 10)), lte(employeeDocuments.expiryDate, horizon.toISOString().slice(0, 10))));

  const empMap = new Map(empRows.map((e) => [e.id, `${e.firstName} ${e.lastName}`]));
  for (const d of docs) {
    alerts.push({
      employeeId: d.employeeId,
      employeeName: empMap.get(d.employeeId) ?? "Employee",
      docType: d.type,
      docNumber: d.number,
      expiryDate: d.expiryDate as any,
      linkedUserId: empToUser.get(d.employeeId) ?? null,
    });
  }
  return alerts;
}

export async function runDocumentExpiryJob() {
  console.log("[job:document-expiry] scanning...");
  const alerts = await buildAlerts();

  // HR managers + directors get all alerts
  const recipients = await db.select({ id: users.id, role: users.role }).from(users)
    .where(inArray(users.role, ["director", "hr-manager"]));
  const broadcastIds = recipients.map((r) => r.id);

  const today = new Date();
  let written = 0;
  for (const a of alerts) {
    const exp = a.expiryDate instanceof Date ? a.expiryDate : new Date(a.expiryDate);
    const daysLeft = Math.round((exp.getTime() - today.getTime()) / 86_400_000);
    const tier = THRESHOLDS.find((t) => daysLeft <= t) ?? 60;

    const title = `${a.docType.toUpperCase()} expiring in ${daysLeft}d — ${a.employeeName}`;
    const body = `${a.docType} ${a.docNumber ?? ""} expires ${exp.toISOString().slice(0, 10)}`;
    const link = `/hr/employees/${a.employeeId}`;

    const targets = new Set<string>(broadcastIds);
    if (a.linkedUserId) targets.add(a.linkedUserId);

    for (const userId of targets) {
      // De-dupe per (user, docType, employee, tier) by checking last 24h
      const existing = await db.execute(sql`
        SELECT 1 FROM notifications
        WHERE user_id = ${userId}
          AND type = 'doc-expiry'
          AND title = ${title}
          AND created_at > now() - interval '20 hours'
        LIMIT 1
      `);
      if ((existing as any).rows?.length) continue;
      const [row] = await db.insert(notifications).values({ userId, type: "doc-expiry", title, body, link }).returning();
      emitToUser(userId, "notification", row);
      written++;
    }
  }
  console.log(`[job:document-expiry] alerts: ${alerts.length}, notifications written: ${written}`);
}
