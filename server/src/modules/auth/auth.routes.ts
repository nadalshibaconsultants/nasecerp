import { Router } from "express";
import * as svc from "./auth.service.js";
import {
  loginSchema, registerSchema, changePasswordSchema,
  forgotPasswordSchema, resetPasswordSchema,
} from "./auth.schema.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { authLimiter } from "../../middleware/rate-limit.js";
import { writeAudit } from "../../middleware/audit.js";
import { sendMail } from "../../lib/mailer.js";
import { env } from "../../env.js";

export const authRouter = Router();

const REFRESH_COOKIE = "nasec_rt";
const cookieOptions = {
  httpOnly: true,
  secure: env.SECURE_COOKIES,
  sameSite: "lax" as const,
  domain: env.COOKIE_DOMAIN || undefined,
  path: "/api/v1/auth",
  maxAge: env.JWT_REFRESH_TTL_SECONDS * 1000,
};

authRouter.post("/login", authLimiter, async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await svc.login(input, { ip: req.ip, userAgent: req.header("user-agent") ?? undefined });
    res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);
    res.json({ accessToken: result.accessToken, user: result.user });
    writeAudit(req, { action: "login", entityType: "user", entityId: result.user.id }).catch(() => {});
  } catch (err) { next(err); }
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;
    if (!token) return res.status(401).json({ error: "Missing refresh token" });
    const result = await svc.refresh(token);
    res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);
    res.json({ accessToken: result.accessToken });
  } catch (err) { next(err); }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    await svc.logout(token);
    res.clearCookie(REFRESH_COOKIE, { ...cookieOptions, maxAge: 0 });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const u = await svc.me(req.user!.sub);
    res.json(u);
  } catch (err) { next(err); }
});

authRouter.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const input = changePasswordSchema.parse(req.body);
    await svc.changePassword(req.user!.sub, input.currentPassword, input.newPassword);
    await writeAudit(req, { action: "change-password", entityType: "user", entityId: req.user!.sub });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

authRouter.post("/forgot-password", authLimiter, async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const issued = await svc.createPasswordReset(email);
    if (issued) {
      const link = `${req.protocol}://${req.get("host")}/reset-password?token=${issued.token}`;
      await sendMail({
        to: email,
        subject: "NASEC ERP — Password reset",
        html: `<p>Reset link (valid 1h): <a href="${link}">${link}</a></p>`,
      });
    }
    // Always return ok to prevent email enumeration
    res.json({ ok: true });
  } catch (err) { next(err); }
});

authRouter.post("/reset-password", authLimiter, async (req, res, next) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);
    await svc.consumePasswordReset(token, newPassword);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Director-only registration of new users (Phase 0 — admin path)
authRouter.post("/register", requireAuth, requireRole("director", "hr-manager"), async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const created = await svc.register(input);
    await writeAudit(req, { action: "create-user", entityType: "user", entityId: created.id, after: created });
    res.status(201).json(created);
  } catch (err) { next(err); }
});
