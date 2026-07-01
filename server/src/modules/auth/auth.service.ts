import { eq, and, isNull, gt, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { users, refreshTokens, passwordResets, employees, clientLoginLogs } from "../../db/schema/index.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { signAccessToken, newRefreshToken, hashRefreshToken, refreshTokenExpiry } from "../../lib/jwt.js";
import { HttpError } from "../../middleware/errors.js";
import { createHash, randomBytes } from "node:crypto";
import type { LoginInput, RegisterInput } from "./auth.schema.js";

export async function login(input: LoginInput, meta: { ip?: string; userAgent?: string }) {
  const identifier = input.email.trim();
  // Look up by email (case-insensitive); fall back to Staff ID (employees.code)
  // so staff can sign in with their Staff ID as username.
  let found = await db.select().from(users)
    .where(sql`lower(${users.email}) = lower(${identifier})`).limit(1);
  if (!found[0]) {
    const emp = await db.select({ id: employees.id }).from(employees)
      .where(sql`lower(${employees.code}) = lower(${identifier})`).limit(1);
    if (emp[0]) {
      found = await db.select().from(users).where(eq(users.employeeId, emp[0].id)).limit(1);
    }
  }
  const user = found[0];
  if (!user) throw new HttpError(401, "Invalid credentials");
  if (user.status !== "active") throw new HttpError(403, "Account not active");

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw new HttpError(401, "Invalid credentials");

  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    office: user.office,
    employeeId: user.employeeId,
    email: user.email,
  });

  const { plain: refreshPlain, hash: refreshHash } = newRefreshToken();
  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: refreshHash,
    expiresAt: refreshTokenExpiry(),
    userAgent: meta.userAgent ?? null,
    ip: meta.ip ?? null,
  });

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  // Client Portal session tracking — log each client sign-in.
  if (user.role === "client") {
    await db.insert(clientLoginLogs).values({
      clientUserId: user.id,
      ipAddress: meta.ip ?? null,
      device: meta.userAgent ?? null,
    });
  }

  return {
    accessToken,
    refreshToken: refreshPlain,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      office: user.office,
      employeeId: user.employeeId,
    },
  };
}

export async function refresh(refreshTokenPlain: string) {
  const hash = hashRefreshToken(refreshTokenPlain);
  const rows = await db.select().from(refreshTokens)
    .where(and(eq(refreshTokens.tokenHash, hash), isNull(refreshTokens.revokedAt), gt(refreshTokens.expiresAt, new Date())))
    .limit(1);
  const rt = rows[0];
  if (!rt) throw new HttpError(401, "Invalid refresh token");

  const userRows = await db.select().from(users).where(eq(users.id, rt.userId)).limit(1);
  const user = userRows[0];
  if (!user || user.status !== "active") throw new HttpError(403, "Account not active");

  // Rotate
  await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, rt.id));
  const { plain, hash: newHash } = newRefreshToken();
  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: newHash,
    expiresAt: refreshTokenExpiry(),
  });

  const accessToken = signAccessToken({
    sub: user.id, role: user.role, office: user.office,
    employeeId: user.employeeId, email: user.email,
  });
  return { accessToken, refreshToken: plain };
}

export async function logout(refreshTokenPlain: string | undefined) {
  if (!refreshTokenPlain) return;
  const hash = hashRefreshToken(refreshTokenPlain);
  // Close the client's open session log (if this token belongs to a client).
  const rt = (await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, hash)).limit(1))[0];
  if (rt) {
    const u = (await db.select().from(users).where(eq(users.id, rt.userId)).limit(1))[0];
    if (u?.role === "client") {
      const open = (await db.select().from(clientLoginLogs)
        .where(and(eq(clientLoginLogs.clientUserId, u.id), isNull(clientLoginLogs.logoutTime)))
        .orderBy(sql`login_time DESC`).limit(1))[0];
      if (open) await db.update(clientLoginLogs).set({ logoutTime: new Date() }).where(eq(clientLoginLogs.id, open.id));
    }
  }
  await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.tokenHash, hash));
}

export async function register(input: RegisterInput) {
  const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (existing[0]) throw new HttpError(409, "Email already registered");
  const passwordHash = await hashPassword(input.password);
  const inserted = await db.insert(users).values({
    email: input.email,
    passwordHash,
    displayName: input.displayName,
    role: input.role,
    office: input.office ?? null,
    employeeId: input.employeeId ?? null,
  }).returning();
  const u = inserted[0];
  return { id: u.id, email: u.email, displayName: u.displayName, role: u.role };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = rows[0];
  if (!user) throw new HttpError(404, "User not found");
  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) throw new HttpError(401, "Current password incorrect");
  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function createPasswordReset(email: string): Promise<{ token: string; userId: string } | null> {
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (!user) return null;
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await db.insert(passwordResets).values({ userId: user.id, tokenHash, expiresAt });
  return { token, userId: user.id };
}

export async function consumePasswordReset(token: string, newPassword: string) {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const rows = await db.select().from(passwordResets)
    .where(and(eq(passwordResets.tokenHash, tokenHash), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, new Date())))
    .limit(1);
  const pr = rows[0];
  if (!pr) throw new HttpError(400, "Invalid or expired token");
  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, pr.userId));
  await db.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, pr.id));
}

export async function me(userId: string) {
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const u = rows[0];
  if (!u) throw new HttpError(404, "User not found");
  return {
    id: u.id, email: u.email, displayName: u.displayName,
    role: u.role, office: u.office, employeeId: u.employeeId,
    status: u.status, avatarColor: u.avatarColor, lastLoginAt: u.lastLoginAt,
    extraPermissions: u.extraPermissions ?? [],
  };
}
