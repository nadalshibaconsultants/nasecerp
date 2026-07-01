import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../index.js";
import { pool, db } from "../../db/client.js";
import { users } from "../../db/schema/index.js";
import { hashPassword } from "../../lib/password.js";
import { eq } from "drizzle-orm";

const TEST_EMAIL = "vitest-director@nasec.test";
const TEST_PW = "TestPw!12345";

describe("auth", () => {
  beforeAll(async () => {
    await db.delete(users).where(eq(users.email, TEST_EMAIL));
    await db.insert(users).values({
      email: TEST_EMAIL,
      passwordHash: await hashPassword(TEST_PW),
      displayName: "Vitest Director",
      role: "director",
      office: "dubai",
      status: "active",
    });
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.email, TEST_EMAIL));
    await pool.end();
  });

  it("rejects invalid credentials", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ email: TEST_EMAIL, password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("logs in and returns an access token", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ email: TEST_EMAIL, password: TEST_PW });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTypeOf("string");
    expect(res.body.user.email).toBe(TEST_EMAIL);
  });

  it("refuses /auth/me without a token", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns the current user with a valid token", async () => {
    const login = await request(app).post("/api/v1/auth/login").send({ email: TEST_EMAIL, password: TEST_PW });
    const res = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("director");
  });
});
