import type { MetricId, ReportData } from "@/types/report";
import { getSubmissionById } from "@/lib/db/queries/submissions";
import {
  createReport,
  getReportById,
  getReportBySubmissionId,
  type ReportRow,
} from "@/lib/db/queries/reports";
import { getConfigByUser } from "@/lib/db/queries/configs";
import { aggregateScore } from "@/lib/scoring/aggregate";
import { getGrade } from "@/lib/scoring/grade";
import { getInvestmentTier } from "@/lib/scoring/tier";
import { AppError } from "@/lib/utils/errors";
import { METRIC_ORDER } from "@/lib/utils/format";
import { extractFacts } from "./extractor";
import { enrichRegionalContext } from "./enricher";
import { scoreSubmission, rescoreMetrics, type MetricScores } from "./scorer";
import { findOutlierMetrics } from "./verifier";
import { embedText, checkDriftGate, storeEmbedding } from "./embedder";

const MAX_VERIFY_RETRIES = 2;

// The fixed 6-step pipeline (BLUEPRINT §8). Not an agent: every step and
// its order is code-controlled.
//
//   1. drift gate  2. extract  3. enrich  4. score  5. verify  6. aggregate
//
// Returns the stored report row. Steps are plain awaits so the caller
// (Inngest function) can wrap them in retryable steps.
export async function runValidationPipeline(
  submissionId: string,
): Promise<ReportRow> {
  const submission = await getSubmissionById(submissionId);
  if (!submission) {
    throw new AppError(`Submission ${submissionId} not found`, "not_found");
  }

  const existing = await getReportBySubmissionId(submissionId);
  if (existing) return existing; // idempotency: pipeline already ran

  const config = await getConfigByUser(submission.userId);

  // [1] Drift gate — embed and compare against this user's prior submissions.
  const vector = await embedText(submission.rawText);
  const driftHit = await checkDriftGate(submission.userId, vector);
  if (driftHit) {
    const cached = await getReportById(driftHit.reportId);
    if (cached) {
      const copied = await createReport({
        ...cached,
        id: undefined,
        submissionId,
        fromCache: true,
        createdAt: undefined,
      });
      await storeEmbedding(submissionId, vector);
      return copied;
    }
  }

  // [2] Haiku extraction (Llama via Groq on economy tier).
  const extraction = await extractFacts(submission.rawText, config.modelTier);

  // [3] Tavily enrichment — additive; null when unavailable.
  const regionContext = await enrichRegionalContext(extraction.facts);

  // [4] Sonnet scoring at temp=0.1 against behavioral anchors.
  const scoreInput = {
    rawText: submission.rawText,
    facts: extraction.facts,
    stage: submission.stage,
    regionContext,
  };
  const scored = await scoreSubmission(scoreInput);
  let metrics: MetricScores = scored.metrics;

  // [5] Haiku verification — selective re-run of outlier metrics, max 2 rounds.
  for (let attempt = 0; attempt < MAX_VERIFY_RETRIES; attempt++) {
    const outliers = await findOutlierMetrics(
      extraction.facts,
      submission.stage,
      metrics,
    );
    if (outliers.length === 0) break;
    const rescored = await rescoreMetrics(scoreInput, outliers);
    metrics = { ...metrics, ...rescored };
  }

  // [6] Deterministic aggregation — code only, never the LLM.
  const metricScores = Object.fromEntries(
    METRIC_ORDER.map((id) => [id, metrics[id].score]),
  ) as Record<MetricId, number>;
  const overallScore = aggregateScore(metricScores, config.weights);

  const reportData: ReportData = {
    metrics,
    verdict: scored.narrative.verdict,
    stageAlignment: scored.narrative.stageAlignment,
    strengths: scored.narrative.strengths,
    weaknesses: scored.narrative.weaknesses,
    recommendations: scored.narrative.recommendations,
    quickWins: scored.narrative.quickWins,
    risks: scored.narrative.risks,
    investorNotes: scored.narrative.investorNotes,
  };

  const report = await createReport({
    submissionId,
    userId: submission.userId,
    overallScore,
    teamScore: metrics.team.score,
    marketScore: metrics.market.score,
    productScore: metrics.product.score,
    competitiveScore: metrics.competitive.score,
    gotomarketScore: metrics.gotomarket.score,
    financialsScore: metrics.financials.score,
    tractionScore: metrics.traction.score,
    scalabilityScore: metrics.scalability.score,
    grade: getGrade(overallScore),
    investmentTier: getInvestmentTier(overallScore),
    reportData,
    weightsSnapshot: config.weights,
    promptVersion: scored.promptVersion,
    scorerModel: scored.scorerModel,
    fromCache: false,
    regionContext,
  });

  await storeEmbedding(submissionId, vector);
  return report;
}
