import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "../env.js";
import * as schema from "./schema/index.js";

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
});

pool.on("error", (err) => {
  console.error("[pg pool] unexpected error", err);
});

export const db = drizzle(pool, { schema });
export type DB = typeof db;
