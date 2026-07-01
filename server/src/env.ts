import "dotenv/config";
import { z } from "zod";

const optionalUrl = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().url().optional());

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  LOG_LEVEL: z.string().default("info"),

  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().default(15 * 60),
  JWT_REFRESH_TTL_SECONDS: z.coerce.number().default(30 * 24 * 60 * 60),

  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  RATE_LIMIT_GLOBAL_PER_MINUTE: z.coerce.number().int().positive().default(1200),
  RATE_LIMIT_AUTH_PER_MINUTE: z.coerce.number().int().positive().default(120),

  // NB: z.coerce.boolean() is Boolean(str) — "false" would coerce to true.
  // Treat only the explicit truthy strings as true so SECURE_COOKIES=false works.
  SECURE_COOKIES: z
    .string()
    .default("false")
    .transform((v) => ["true", "1", "yes", "on"].includes(v.trim().toLowerCase())),
  // Trim, and ignore empty / comment-like values so a stray .env inline comment
  // can never reach res.cookie({ domain }) and crash every login.
  COOKIE_DOMAIN: z
    .string()
    .optional()
    .transform((v) => {
      const t = v?.trim();
      return t && !t.startsWith("#") ? t : undefined;
    }),

  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_PATH: z.string().default("./data/files"),

  AWS_REGION: z.string().default("me-central-1"),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().default("no-reply@nasec.local"),

  EINVOICE_ASP_MODE: z.enum(["simulation", "live"]).default("simulation"),
  EINVOICE_ASP_PROVIDER: z.string().default(""),
  EINVOICE_ASP_ENDPOINT: optionalUrl,
  EINVOICE_ASP_API_KEY: z.string().optional(),
  EINVOICE_WEBHOOK_SECRET: z.string().optional(),

  SEED_DIRECTOR_EMAIL: z.string().email().default("director@nasec.local"),
  SEED_DIRECTOR_PASSWORD: z.string().min(8).default("ChangeMe!123"),
  SEED_DIRECTOR_NAME: z.string().default("Director"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const corsOrigins = env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);
