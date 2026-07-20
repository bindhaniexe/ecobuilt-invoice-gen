import { defineConfig } from "drizzle-kit";

// drizzle-kit reads DATABASE_URL from the environment. Load .env.local first so
// `pnpm db:push` works without exporting the variable manually (Node 20.6+).
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — rely on the ambient environment (e.g. CI secrets).
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
