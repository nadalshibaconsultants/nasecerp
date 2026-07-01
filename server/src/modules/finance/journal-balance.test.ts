// Regression: journal entries must balance (sum debit == sum credit).
import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../index.js";
import { pool, db } from "../../db/client.js";
import { users } from "../../db/schema/index.js";
import { hashPassword } from "../../lib/password.js";
import { eq } from "drizzle-orm";

const EMAIL = "vitest-finance@nasec.test";
const PW = "TestPw!12345";

async function token() {
  await db.delete(users).where(eq(users.email, EMAIL));
  await db.insert(users).values({
    email: EMAIL,
    passwordHash: await hashPassword(PW),
    displayName: "Vitest Finance",
    role: "finance-manager",
    office: "dubai",
    status: "active",
  });
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: EMAIL, password: PW });
  return res.body.accessToken as string;
}

describe("journal balance check", () => {
  it("rejects unbalanced journals with 400", async () => {
    const auth = `Bearer ${await token()}`;
    const res = await request(app)
      .post("/api/v1/finance/journal-entries")
      .set("Authorization", auth)
      .send({
        reference: "JE-TEST-001",
        date: "2026-05-25",
        office: "dubai",
        narration: "imbalance test",
        lines: [
          { accountCode: "1101000", debit: 100, credit: 0 },
          { accountCode: "4101001", debit: 0, credit: 99 }, // off by 1
        ],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not balanced/i);
  });

  it("accepts a balanced journal", async () => {
    const auth = `Bearer ${await token()}`;
    const res = await request(app)
      .post("/api/v1/finance/journal-entries")
      .set("Authorization", auth)
      .send({
        reference: "JE-TEST-002",
        date: "2026-05-25",
        office: "dubai",
        narration: "balanced test",
        lines: [
          { accountCode: "1101000", debit: 100, credit: 0 },
          { accountCode: "4101001", debit: 0, credit: 100 },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("draft");
  });

  it("cleanup", async () => {
    await db.delete(users).where(eq(users.email, EMAIL));
    await pool.end();
  });
});
