// Placeholder data driving the UI until the AI pipeline (BLUEPRINT Phase 3)
// and DB queries exist. Every consumer of this file gets rewired to real
// data when the corresponding backend phase lands.

import type { Grade, InvestmentTier, MetricId, ReportData } from "@/types/report";
import type { ModelTier } from "@/types/config";
import { getGrade } from "@/lib/scoring/grade";
import { getInvestmentTier } from "@/lib/scoring/tier";
import { WEIGHT_PRESETS } from "@/lib/scoring/presets";

// UI-only submission status for the history list; the real pipeline
// status enum arrives with the state machine in Phase 3.
export type ValidationStatus = "Draft" | "In Review" | "Validated" | "Rejected";

// score/grade are null for real submissions awaiting the AI pipeline.
export interface ValidationRow {
  id: string;
  business: string;
  type: string;
  score: number | null;
  grade: Grade | null;
  date: string; // ISO
  status: ValidationStatus;
}

function row(
  id: string,
  business: string,
  type: string,
  score: number,
  date: string,
  status: ValidationStatus,
): ValidationRow {
  return { id, business, type, score, grade: getGrade(score), date, status };
}

export const sampleValidations: ValidationRow[] = [
  row("v-008", "Harbor Freight Analytics", "B2B SaaS · Logistics", 92, "2026-06-28", "Validated"),
  row("v-007", "Meadow & Oat", "DTC · Food & Beverage", 84, "2026-06-21", "Validated"),
  row("v-006", "Northline Health", "Marketplace · Healthcare", 77, "2026-06-14", "In Review"),
  row("v-005", "Cobalt Tutoring", "Consumer · EdTech", 81, "2026-06-05", "Validated"),
  row("v-004", "Rove Rentals", "Marketplace · Travel", 63, "2026-05-27", "Rejected"),
  row("v-003", "Pallet Robotics", "Hardware · Industrial", 88, "2026-05-18", "Validated"),
  row("v-002", "Fernwood Studio", "Agency · Creative", 71, "2026-05-09", "In Review"),
  row("v-001", "Bright Ledger", "B2B SaaS · Fintech", 58, "2026-04-30", "Rejected"),
];

// Full sample report for /report/[id].
export interface SampleReport {
  id: string;
  business: string;
  type: string;
  region: string;
  date: string; // ISO
  overallScore: number;
  grade: Grade;
  investmentTier: InvestmentTier;
  weightsSnapshot: Record<MetricId, number>;
  reportData: ReportData;
}

const SCORE = 87;

export const sampleReport: SampleReport = {
  id: "v-008",
  business: "Harbor Freight Analytics",
  type: "B2B SaaS · Logistics",
  region: "North America",
  date: "2026-06-28",
  overallScore: SCORE,
  grade: getGrade(SCORE),
  investmentTier: getInvestmentTier(SCORE),
  weightsSnapshot: WEIGHT_PRESETS.accelerator.weights,
  reportData: {
    verdict:
      "A capital-efficient logistics analytics play with a credible wedge into mid-market freight brokers. Strong founding team and early traction offset a crowded competitive field.",
    stageAlignment:
      "Metrics and burn profile are consistent with a strong seed-stage company approaching Series A readiness.",
    metrics: {
      team: {
        score: 92,
        note: "Two-time logistics founders with a domain-expert technical lead. Prior exit lends credibility.",
        strength: "Prior exit and deep operator network in freight.",
        gap: "No dedicated commercial leadership yet.",
      },
      market: {
        score: 88,
        note: "Large, fragmented freight brokerage TAM with clear digitization tailwinds through 2030.",
        strength: "Well-researched TAM with timing argument.",
        gap: "SOM assumptions rest on aggressive penetration rates.",
      },
      product: {
        score: 84,
        note: "Working analytics suite with live customers. UX is dense but purpose-built for operators.",
        strength: "Product validated by paying users.",
        gap: "Dense UX may slow non-operator adoption.",
      },
      competitive: {
        score: 71,
        note: "Crowded incumbents with deeper pockets. Differentiation rests on speed and pricing.",
        strength: "Clear landscape mapping with named differentiators.",
        gap: "Thin moat against better-funded incumbents.",
      },
      gotomarket: {
        score: 79,
        note: "Founder-led sales converting well. Repeatable motion not yet fully proven at scale.",
        strength: "Strong founder-led conversion rates.",
        gap: "Sales playbook not yet codified beyond founders.",
      },
      financials: {
        score: 83,
        note: "Healthy gross margins and a lean burn. Runway of 14 months at current spend.",
        strength: "Solid unit economics and capital discipline.",
        gap: "Projections lack downside scenario modeling.",
      },
      traction: {
        score: 90,
        note: "Twenty-two paying accounts with 118% net revenue retention over the last two quarters.",
        strength: "Retention numbers signal genuine product-market pull.",
        gap: "Concentration risk in top three accounts.",
      },
      scalability: {
        score: 86,
        note: "Multi-tenant architecture handles load cleanly. Onboarding still requires manual setup.",
        strength: "Low marginal cost to serve additional brokers.",
        gap: "Manual onboarding limits expansion velocity.",
      },
    },
    strengths: [
      "Founding team with a prior logistics exit and deep operator network.",
      "Net revenue retention above 115% signals genuine product stickiness.",
      "Capital-efficient burn extends runway well past the next milestone.",
      "Working product validated by twenty-two paying accounts.",
    ],
    weaknesses: [
      "Differentiation is thin against better-funded incumbents.",
      "Sales motion still depends heavily on the founders.",
      "Onboarding requires manual configuration that limits velocity.",
    ],
    recommendations: [
      "Codify the sales playbook and hire a first non-founder AE.",
      "Invest in self-serve onboarding to compress time-to-value.",
      "Sharpen positioning around the mid-market freight wedge.",
      "Model downside financial scenarios before the next raise.",
    ],
    quickWins: [
      "Publish two operator case studies with quantified ROI.",
      "Instrument the activation funnel to find onboarding drop-off.",
    ],
    risks: [
      "Incumbent price war could compress margins.",
      "Key-person dependency on the founding team.",
      "Freight market cyclicality may soften near-term demand.",
    ],
    investorNotes:
      "Rare combination of operator credibility and capital discipline. The competitive picture gives me pause, but the retention numbers are the kind that compound quietly. I would want to see one repeatable, non-founder sales cycle before leading — but this is a company I would not want to miss.",
  },
};

// --- Settings page fixtures (until Phase 7 wires real providers) ---

export type ProviderId = "anthropic" | "groq" | "openai" | "tavily";

export interface Provider {
  id: ProviderId;
  name: string;
  description: string;
  placeholder: string;
}

export const PROVIDERS: Provider[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Sonnet scoring + Haiku extraction/verification",
    placeholder: "sk-ant-api03-••••••••••••••••••••",
  },
  {
    id: "groq",
    name: "Groq",
    description: "Llama 3.3 70B economy fallback",
    placeholder: "gsk_••••••••••••••••••••••••",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "Embeddings for the drift gate",
    placeholder: "sk-proj-••••••••••••••••••••",
  },
  {
    id: "tavily",
    name: "Tavily",
    description: "Live regional market context",
    placeholder: "tvly-••••••••••••••••••••••",
  },
];

export const SAVED_KEYS: Record<ProviderId, string> = {
  anthropic: "sk-ant-api03-a1b2c3d4e5f6g7h8i9j0",
  groq: "",
  openai: "sk-proj-9z8y7x6w5v4u3t2s1r0q",
  tavily: "tvly-k1l2m3n4o5p6q7r8s9t0",
};

export type HealthStatus = "healthy" | "degraded" | "down";

export interface ServiceHealth {
  name: string;
  status: HealthStatus;
  latencyMs: number | null;
  region: string;
}

export const SERVICE_HEALTH: ServiceHealth[] = [
  { name: "Anthropic API", status: "healthy", latencyMs: 412, region: "us-east" },
  { name: "Groq API", status: "healthy", latencyMs: 128, region: "us-central" },
  { name: "OpenAI Embeddings", status: "degraded", latencyMs: 1840, region: "us-east" },
  { name: "Tavily Search", status: "healthy", latencyMs: 356, region: "global" },
  { name: "Supabase Postgres", status: "healthy", latencyMs: 18, region: "us-east" },
  { name: "Upstash Redis", status: "healthy", latencyMs: 9, region: "global" },
  { name: "Cloudflare R2", status: "healthy", latencyMs: 84, region: "global" },
  { name: "Inngest", status: "down", latencyMs: null, region: "us-west" },
];

// Approx blended cost per validation run (USD) by tier.
export const TIER_COST_PER_VALIDATION: Record<ModelTier, number> = {
  economy: 0.02,
  balanced: 0.12,
  premium: 0.31,
};

export const TIER_NOTES: Record<ModelTier, string> = {
  economy: "Llama 3.3 70B via Groq",
  balanced: "Sonnet scoring, Haiku extraction",
  premium: "Sonnet everywhere, deeper passes",
};

export type CallStatus = "success" | "error" | "timeout";

export interface CallLogEntry {
  timestamp: string;
  model: string;
  step: string;
  tokens: number;
  cost: number;
  status: CallStatus;
}

export const CALL_LOG: CallLogEntry[] = [
  { timestamp: "2026-07-04 14:32:07", model: "claude-sonnet-4-5", step: "Scoring", tokens: 18420, cost: 0.0895, status: "success" },
  { timestamp: "2026-07-04 14:31:58", model: "claude-haiku-4-5", step: "Extracting", tokens: 9210, cost: 0.0092, status: "success" },
  { timestamp: "2026-07-04 14:31:44", model: "tavily-search", step: "Enriching", tokens: 0, cost: 0.005, status: "success" },
  { timestamp: "2026-07-04 14:30:12", model: "claude-sonnet-4-5", step: "Scoring", tokens: 15680, cost: 0.0761, status: "timeout" },
  { timestamp: "2026-07-04 14:29:50", model: "claude-haiku-4-5", step: "Verifying", tokens: 7340, cost: 0.0073, status: "success" },
  { timestamp: "2026-07-04 14:28:33", model: "llama-3.3-70b", step: "Extracting", tokens: 11205, cost: 0.0009, status: "success" },
  { timestamp: "2026-07-04 14:27:19", model: "text-embedding-3-small", step: "Drift gate", tokens: 4096, cost: 0.0001, status: "success" },
  { timestamp: "2026-07-04 14:26:41", model: "claude-sonnet-4-5", step: "Scoring", tokens: 16920, cost: 0.0822, status: "error" },
  { timestamp: "2026-07-04 14:25:08", model: "claude-sonnet-4-5", step: "Scoring", tokens: 19870, cost: 0.0966, status: "success" },
  { timestamp: "2026-07-04 14:24:52", model: "tavily-search", step: "Enriching", tokens: 0, cost: 0.005, status: "success" },
  { timestamp: "2026-07-04 14:23:30", model: "claude-haiku-4-5", step: "Extracting", tokens: 8640, cost: 0.0086, status: "success" },
  { timestamp: "2026-07-04 14:22:14", model: "claude-haiku-4-5", step: "Verifying", tokens: 6980, cost: 0.007, status: "success" },
];

// BLUEPRINT §16 test fixture — used by pipeline tests, including the
// ±5-point consistency test once the scorer exists.
export const TEST_SUBMISSION = `
  We are building a B2B SaaS platform for restaurant inventory management in West Africa.
  Team: 2 co-founders. CEO has 5 years in food distribution. CTO has 3 years engineering at fintech.
  Market: 50,000 restaurants in Lagos alone, currently using paper/WhatsApp. $200M TAM.
  Product: mobile app + WhatsApp bot. 12 pilot restaurants, 3 paying at $50/month.
  Revenue: SaaS $50-200/month per restaurant.
  Competitors: no direct competitor in West Africa. Excel and WhatsApp are the competition.
  Funding: seeking $150k pre-seed to hire 2 engineers and expand to Accra.
`;
