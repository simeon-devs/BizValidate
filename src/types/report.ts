export type MetricId =
  | "team"
  | "market"
  | "product"
  | "competitive"
  | "gotomarket"
  | "financials"
  | "traction"
  | "scalability";

export type Grade = "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "F";

export type InvestmentTier =
  | "Series A Ready"
  | "Seed Ready"
  | "Pre-Seed Potential"
  | "Not Investment Ready";

// A single external result behind the regional context, kept with its URL so
// the report can cite it. Referenced as [S1], [S2]… in prompts and in the UI.
export interface EnrichmentSource {
  id: number; // 1-based
  title: string;
  url: string;
  snippet: string;
}

// Structured output of the enrichment step. `summary` is the human-readable
// context handed to the scorer; `sources` is what makes a claim checkable.
export interface RegionalContext {
  summary: string;
  sources: EnrichmentSource[];
  query: string; // the exact search issued — part of the audit trail
  fetchedAt: string; // ISO timestamp
}

export type MetricBasis = "regional-data" | "submission" | "rubric-inference";
export type MetricConfidence = "high" | "medium" | "low";

export interface MetricScore {
  score: number;
  note: string;
  strength: string;
  gap: string;
  // Audit fields, added in prompt v1.1. Optional: reports scored under v1.0
  // predate them and must keep rendering unchanged.
  anchorBand?: string; // anchor levels the score sits between, e.g. "60-80"
  basis?: MetricBasis;
  confidence?: MetricConfidence;
  sourceRefs?: number[]; // EnrichmentSource.id values actually used
  rescored?: boolean; // verifier flagged it as an outlier and re-ran it
}

export interface ReportData {
  metrics: Record<MetricId, MetricScore>;
  // v1.1: the regional sources behind any cited claim. Absent on v1.0
  // reports and on reports scored without live enrichment.
  sources?: EnrichmentSource[];
  verdict: string;
  stageAlignment: string;
  strengths: string[]; // 4 items
  weaknesses: string[]; // 3 items
  recommendations: string[]; // 4 items
  quickWins: string[]; // 2 items
  risks: string[]; // 3 items
  investorNotes: string;
}

export interface Report {
  id: string;
  submissionId: string;
  overallScore: number;
  grade: Grade;
  investmentTier: InvestmentTier;
  reportData: ReportData;
  weightsSnapshot: Record<MetricId, number>;
  promptVersion: string;
  scorerModel: string;
  fromCache: boolean;
  createdAt: Date;
}
