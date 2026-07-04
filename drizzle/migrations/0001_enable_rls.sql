-- Enable Row Level Security on every table.
--
-- Auth is Clerk, not Supabase Auth, so there are no auth.uid()-based
-- policies: all application access goes through the server-side Drizzle
-- connection (table owner, bypasses RLS), which enforces ownership in
-- query code. Enabling RLS with no policies makes the tables return
-- nothing through Supabase's PostgREST API (anon/authenticated roles),
-- closing that surface entirely.

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admin_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "embeddings" ENABLE ROW LEVEL SECURITY;
