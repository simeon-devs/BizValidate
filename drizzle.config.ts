import { defineConfig } from "drizzle-kit";

// drizzle-kit is a standalone CLI tool, not part of the app runtime — it
// reads process.env directly rather than through src/lib/env.ts.
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
