// Importer: takes a JSON dump exported from the running SPA's localStorage
// (Settings → Backend → Export) and pushes existing demo data into Postgres.
//
// USAGE:  pnpm seed:import path/to/localstorage-dump.json
//
// This Phase 0 importer maps the bits we currently have tables for:
//   - users (creates accounts with a default reset-required password)
//   - audit log entries
//
// Subsequent phases extend this script as new entity tables come online.
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { db, pool } from "../db/client.js";
import { users, auditLog } from "../db/schema/index.js";
import { hashPassword } from "../lib/password.js";

type LocalUser = {
  id: string;
  username: string;
  displayName: string;
  role: string;
  active?: boolean;
  employeeId?: string;
  avatarColor?: string;
};

type LocalAudit = {
  id: string;
  timestamp: string;
  actor: string;
  module: string;
  action: string;
  subject: string;
  detail?: string;
};

type Dump = {
  // localStorage keys live under "nasec-erp-v1::*"
  // The exporter strips the prefix and yields { storeName: value }
  users?: LocalUser[];
  audit?: LocalAudit[];
};

async function main() {
  const path = process.argv[2];
  if (!path) { console.error("usage: tsx src/seed/from-localstorage.ts <dump.json>"); process.exit(1); }

  const dump = JSON.parse(readFileSync(path, "utf8")) as Dump;
  const defaultPw = await hashPassword("ChangeMe!123");

  let createdUsers = 0;
  for (const u of dump.users ?? []) {
    const email = u.username.includes("@") ? u.username : `${u.username}@nasec.local`;
    const exists = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (exists[0]) continue;
    await db.insert(users).values({
      email,
      passwordHash: defaultPw,
      displayName: u.displayName,
      role: u.role as any,
      status: u.active === false ? "disabled" : "active",
      avatarColor: u.avatarColor ?? null,
    });
    createdUsers++;
  }
  console.log(`[import] users created: ${createdUsers} (default password: ChangeMe!123 — forced reset recommended)`);

  let createdAudit = 0;
  for (const a of dump.audit ?? []) {
    await db.insert(auditLog).values({
      at: new Date(a.timestamp),
      actorUserId: null,
      actorRole: null,
      action: `${a.module}:${a.action}`,
      entityType: a.module,
      entityId: null,
      before: null,
      after: { subject: a.subject, detail: a.detail, legacyActor: a.actor },
    });
    createdAudit++;
  }
  console.log(`[import] audit rows: ${createdAudit}`);

  await pool.end();
  console.log("[import] done");
}

main().catch((err) => { console.error("[import] failed:", err); process.exit(1); });
