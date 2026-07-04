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

export interface MetricScore {
  score: number;
  note: string;
  strength: string;
  gap: string;
}

export interface ReportData {
  metrics: Record<MetricId, MetricScore>;
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
