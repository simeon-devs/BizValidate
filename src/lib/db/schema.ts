import {
  pgTable,
  text,
  real,
  timestamp,
  jsonb,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user ID
  email: text("email").notNull().unique(),
  name: text("name"),
  plan: text("plan").notNull().default("free"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminConfigs = pgTable("admin_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  weights: jsonb("weights").notNull(), // Record<MetricId, number> must sum to 100
  thresholds: jsonb("thresholds").notNull(),
  activePreset: text("active_preset"),
  modelTier: text("model_tier").notNull().default("balanced"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  inputType: text("input_type").notNull(), // 'plan'|'pitch'|'financials'|'idea'
  stage: text("stage").notNull(),
  rawText: text("raw_text").notNull(),
  fileUrl: text("file_url"),
  contentHash: text("content_hash").notNull(), // SHA-256 for drift detection
  embeddingId: text("embedding_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => submissions.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  overallScore: real("overall_score").notNull(),
  teamScore: real("team_score").notNull(),
  marketScore: real("market_score").notNull(),
  productScore: real("product_score").notNull(),
  competitiveScore: real("competitive_score").notNull(),
  gotomarketScore: real("gotomarket_score").notNull(),
  financialsScore: real("financials_score").notNull(),
  tractionScore: real("traction_score").notNull(),
  scalabilityScore: real("scalability_score").notNull(),
  grade: text("grade").notNull(),
  investmentTier: text("investment_tier").notNull(),
  reportData: jsonb("report_data").notNull(),
  weightsSnapshot: jsonb("weights_snapshot").notNull(),
  promptVersion: text("prompt_version").notNull(),
  scorerModel: text("scorer_model").notNull(),
  fromCache: boolean("from_cache").notNull().default(false),
  regionContext: text("region_context"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const embeddings = pgTable("embeddings", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => submissions.id),
  vector: jsonb("vector").notNull(), // number[] 1536 dims
  createdAt: timestamp("created_at").defaultNow(),
});
