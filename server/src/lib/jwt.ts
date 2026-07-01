import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import { env } from "../env.js";

export type AccessTokenPayload = {
  sub: string;          // user_id
  role: string;
  office?: string | null;
  employeeId?: string | null;
  email: string;
};

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_ACCESS_TTL_SECONDS });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}

export function newRefreshToken(): { plain: string; hash: string } {
  const plain = randomBytes(48).toString("base64url");
  const hash = createHash("sha256").update(plain).digest("hex");
  return { plain, hash };
}

export function hashRefreshToken(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

export function refreshTokenExpiry(): Date {
  return new Date(Date.now() + env.JWT_REFRESH_TTL_SECONDS * 1000);
}
