// Placeholder data driving the UI until the AI pipeline (BLUEPRINT Phase 3)
// and DB queries exist. Every consumer of this file gets rewired to real
// data when the corresponding backend phase lands.

import type { Grade, InvestmentTier, MetricId, ReportData } from "@/types/report";
import { getGrade } from "@/lib/scoring/grade";
import { getInvestmentTier } from "@/lib/scoring/tier";
import { WEIGHT_PRESETS } from "@/lib/scoring/presets";

// UI-only submission status for the history list; the real pipeline
// status enum arrives with the state machine in Phase 3.
export type ValidationStatus = "Draft" | "In Review" | "Validated" | "Rejected";

export interface ValidationRow {
  id: string;
  business: string;
  type: string;
  score: number;
  grade: Grade;
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
