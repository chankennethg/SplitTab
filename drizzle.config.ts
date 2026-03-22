import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // DIRECT_URL bypasses Supabase's PgBouncer pooler, required for DDL migrations.
    // Falls back to DATABASE_URL for local dev where pooler isn't used.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
});
