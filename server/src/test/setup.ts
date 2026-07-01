// Vitest setup: forces a separate test database + minimum env vars so the
// app module can import without aborting in env.ts validation.
import { config } from "dotenv";
config({ path: ".env.test" });

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL
  ?? "postgres://nasec:nasec_dev_pw@localhost:5432/nasec_erp_test";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret-very-very-long-string-test";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "test-refresh-secret-very-long-string";
process.env.CORS_ORIGINS = "http://localhost";
process.env.STORAGE_DRIVER = "local";
process.env.STORAGE_LOCAL_PATH = "./.test-files";
