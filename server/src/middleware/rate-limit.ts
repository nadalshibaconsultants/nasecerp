import rateLimit from "express-rate-limit";
import { env } from "../env.js";

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.RATE_LIMIT_GLOBAL_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests" },
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.RATE_LIMIT_AUTH_PER_MINUTE,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts" },
});
