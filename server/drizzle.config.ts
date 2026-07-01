import type { Config } from "drizzle-kit";
import "dotenv/config";

export default {
  schema: "./src/db/schema/*.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://nasec:nasec_dev_pw@localhost:5432/nasec_erp",
  },
  strict: true,
  verbose: true,
} satisfies Config;
