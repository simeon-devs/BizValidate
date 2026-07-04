import { z } from "zod";

const envSchema = z.object({
  // Anthropic (scorer + extractor/verifier)
  ANTHROPIC_API_KEY: z.string().min(1),

  // Groq (Llama 3.3 70B — economy tier)
  GROQ_API_KEY: z.string().min(1),

  // OpenAI (embeddings only)
  OPENAI_API_KEY: z.string().min(1),

  // Tavily (regional search)
  TAVILY_API_KEY: z.string().min(1),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Drizzle — direct Postgres connection string
  DATABASE_URL: z.string().min(1),

  // Clerk
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default("/validate"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default("/validate"),

  // Upstash Redis
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  // Cloudflare R2
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_URL: z.string().url(),

  // Inngest
  INNGEST_EVENT_KEY: z.string().min(1),
  INNGEST_SIGNING_KEY: z.string().min(1),

  // LangSmith
  LANGCHAIN_TRACING_V2: z.enum(["true", "false"]).default("false"),
  LANGCHAIN_API_KEY: z.string().min(1),
  LANGCHAIN_PROJECT: z.string().default("bizvalidate"),

  // Sentry
  NEXT_PUBLIC_SENTRY_DSN: z.string().min(1),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
