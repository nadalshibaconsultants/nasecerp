import { z } from "zod";

export const loginSchema = z.object({
  // Accepts either an email address or a Staff ID (e.g. "C1-001"). Kept under
  // the `email` key so existing clients don't change; resolved in auth.service.
  email: z.string().min(1),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1),
  role: z.enum([
    "director",
    "hr-manager",
    "finance-manager",
    "accountant",
    "pm",
    "design-lead",
    "site-engineer",
    "bd-manager",
    "employee",
    "contractor",
    "client",
  ]),
  office: z.enum(["dubai", "cairo"]).optional(),
  employeeId: z.string().uuid().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
