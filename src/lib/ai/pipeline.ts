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
import { findOutlierMetrics, VERIFIER_MODEL } from "./verifier";
import {
  embedText,
  checkDriftGate,
  storeEmbedding,
  EMBEDDING_MODEL,
} from "./embedder";
import { PipelineTrace } from "./trace";

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
  const trace = new PipelineTrace();

  // [1] Drift gate — embed and compare against this user's prior submissions.
  const vector = await embedText(submission.rawText);
  const driftHit = await trace.record(
    1,
    "Duplicate check",
    (hit) => ({
      status: hit ? "cached" : "ran",
      detail: hit
        ? "Matched an earlier submission above 0.96 similarity — reused its report instead of re-scoring."
        : "Embedded the submission and compared it to your earlier ones. No match above 0.96, so it was scored fresh.",
      model: EMBEDDING_MODEL,
    }),
    () => checkDriftGate(submission.userId, vector),
  );
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
  const extraction = await trace.record(
    2,
    "Fact extraction",
    (result) => ({
      status: "ran",
      detail: `Pulled structured facts from your submission: industry, stage, team, traction, competitors and funding as stated (${result.facts.competitors.length} competitor(s) named).`,
      model: result.model,
    }),
    () => extractFacts(submission.rawText, config.modelTier),
  );

  // [3] Tavily enrichment — additive; null when unavailable. The founder's
  // stated market wins over the region the extractor inferred from the text.
  const enrichment = await trace.record(
    3,
    "Market research",
    (result) => ({
      status: result ? "ran" : "skipped",
      detail: result
        ? `Searched "${result.query}" and kept ${result.sources.length} citable source(s). Cached 24h.`
        : "No live market data was retrieved, so scores rest on your submission alone. Metrics that would need external evidence are marked low confidence.",
    }),
    () =>
      enrichRegionalContext(
        extraction.facts,
        submission.targetRegion ?? undefined,
      ),
  );
  const regionContext = enrichment?.summary ?? null;

  // [4] Sonnet scoring at temp=0.1 against behavioral anchors.
  const scoreInput = {
    rawText: submission.rawText,
    facts: extraction.facts,
    stage: submission.stage,
    regionContext,
    sources: enrichment?.sources ?? [],
  };
  const scored = await trace.record(
    4,
    "Scoring",
    (result) => ({
      status: "ran",
      detail: `Scored all ${METRIC_ORDER.length} metrics against the Bill Payne behavioral anchors at temperature 0.1, using prompt ${result.promptVersion}.`,
      model: result.scorerModel,
    }),
    () => scoreSubmission(scoreInput),
  );
  let metrics: MetricScores = scored.metrics;

  // [5] Haiku verification — selective re-run of outlier metrics, max 2 rounds.
  const verifyStart = Date.now();
  const rescoredIds: MetricId[] = [];
  for (let attempt = 0; attempt < MAX_VERIFY_RETRIES; attempt++) {
    const outliers = await findOutlierMetrics(
      extraction.facts,
      submission.stage,
      metrics,
    );
    if (outliers.length === 0) break;
    const rescored = await rescoreMetrics(scoreInput, outliers);
    // Flag the re-run so the report can show which metrics the verifier
    // corrected rather than presenting every score as first-pass.
    for (const id of outliers) {
      const metric = rescored[id];
      if (metric) metric.rescored = true;
      rescoredIds.push(id);
    }
    metrics = { ...metrics, ...rescored };
  }
  trace.add({
    step: 5,
    name: "Outlier check",
    status: rescoredIds.length > 0 ? "ran" : "skipped",
    detail:
      rescoredIds.length > 0
        ? `Flagged ${rescoredIds.join(", ")} as more than 15 points outside the expected anchor band and re-scored ${rescoredIds.length === 1 ? "it" : "them"}.`
        : "Every metric landed inside its expected anchor band, so nothing needed re-scoring.",
    model: VERIFIER_MODEL,
    durationMs: Date.now() - verifyStart,
  });

  // [6] Deterministic aggregation — code only, never the LLM.
  const aggregateStart = Date.now();
  const metricScores = Object.fromEntries(
    METRIC_ORDER.map((id) => [id, metrics[id].score]),
  ) as Record<MetricId, number>;
  const overallScore = aggregateScore(metricScores, config.weights);
  trace.add({
    step: 6,
    name: "Final score",
    status: "ran",
    detail: `Weighted sum computed in code, not by a language model: ${METRIC_ORDER.map((id) => `${id} ${metricScores[id]}×${config.weights[id]}%`).join(" + ")} = ${overallScore}.`,
    durationMs: Date.now() - aggregateStart,
  });

  const reportData: ReportData = {
    metrics,
    sources: enrichment?.sources ?? [],
    trace: trace.toArray(),
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
