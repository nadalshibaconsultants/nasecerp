import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type AccessTokenPayload } from "../lib/jwt.js";
import { HttpError } from "./errors.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (!header || !header.startsWith("Bearer ")) {
    throw new HttpError(401, "Missing bearer token");
  }
  const token = header.slice(7);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (header?.startsWith("Bearer ")) {
    try { req.user = verifyAccessToken(header.slice(7)); } catch { /* ignore */ }
  }
  next();
}
