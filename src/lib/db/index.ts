import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

// Dev HMR re-evaluates this module on every reload; without a global cache
// each reload leaks a fresh connection pool until Supabase's session pooler
// hits its client cap and all writes start failing. Cache the client across
// reloads and keep the pool small — the pooler multiplexes for us.
const globalForDb = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.pgClient ??
  postgres(env.DATABASE_URL, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (env.NODE_ENV !== "production") {
  globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema });
