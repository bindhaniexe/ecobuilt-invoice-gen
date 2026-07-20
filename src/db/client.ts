import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

export type Database = ReturnType<typeof drizzle<typeof schema>>;

let cached: Database | null = null;

/** True when a Neon connection string is configured. */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Lazily build the Drizzle client. Returns null when DATABASE_URL is unset so
 * the app still runs fully offline (sync becomes a no-op).
 */
export function getDb(): Database | null {
  if (!isDatabaseConfigured()) return null;
  if (cached) return cached;

  const sql = neon(process.env.DATABASE_URL as string);
  cached = drizzle(sql, { schema });
  return cached;
}
