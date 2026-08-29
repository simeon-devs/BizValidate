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

// Which question a source was retrieved to answer. One targeted search runs
// per topic, so the scorer can be handed "here is what we found about your
// competitors" rather than one undifferentiated pile.
export type SourceTopic =
  | "market"
  | "competitive"
  | "gotomarket"
  | "financials"
  | "scalability";

// A single external result behind the regional context, kept with its URL so
// the report can cite it. Referenced as [S1], [S2]… in prompts and in the UI.
export interface EnrichmentSource {
  id: number; // 1-based
  title: string;
  url: string;
  snippet: string;
  topic?: SourceTopic; // absent on reports enriched with the single generic query
}

// Structured output of the enrichment step. `summary` is the human-readable
// context handed to the scorer; `sources` is what makes a claim checkable.
export interface RegionalContext {
  summary: string;
  sources: EnrichmentSource[];
  query: string; // the searches issued, joined — kept for older readers
  queries?: string[]; // one per topic actually searched
  fetchedAt: string; // ISO timestamp
}

// One executed step of the fixed 6-step pipeline, recorded so a report can
// explain how it was produced rather than asking to be taken on faith.
export interface PipelineStep {
  step: number; // 1-6, matching BLUEPRINT §8
  name: string;
  status: "ran" | "skipped" | "cached" | "failed";
  detail: string;
  model?: string;
  durationMs: number;
}

export type MetricBasis = "regional-data" | "submission" | "rubric-inference";
export type MetricConfidence = "high" | "medium" | "low";

export interface MetricScore {
  score: number;
  // v1.0–v1.1: a two-line justification. Replaced by `assessment` in v1.2;
  // kept optional so older reports still render.
  note?: string;
  strength: string;
  gap: string;
  // v1.2: a plain-language assessment, the specific facts relied on
  // (validated in code against the submission and cited sources), and what
  // would have been needed to score higher.
  assessment?: string;
  evidence?: string[];
  missing?: string;
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
  // The business name the extractor identified. Submissions carry no name
  // field of their own; older reports predate this and fall back to the
  // opening of the submission text.
  businessName?: string;
  // v1.1: the regional sources behind any cited claim. Absent on v1.0
  // reports and on reports scored without live enrichment.
  sources?: EnrichmentSource[];
  // v1.1: how this report was produced, step by step. Absent on v1.0 reports.
  trace?: PipelineStep[];
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
