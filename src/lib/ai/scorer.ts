import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { env } from "@/lib/env";
import { AppError } from "@/lib/utils/errors";
import type { EnrichmentSource, MetricId, MetricScore } from "@/types/report";
import { validateEvidence } from "./evidence";
import type { ExtractedFacts } from "./types";
import {
  SCORING_SYSTEM_PROMPT,
  buildScoringPrompt,
  PROMPT_VERSION,
} from "./prompts/scoring";
import { METRIC_ORDER } from "@/lib/utils/format";

// Model assignment per CLAUDE.md: Claude Sonnet 4.5, Anthropic direct.
// Temperature is ALWAYS 0.1 (CLAUDE.md rule 5) — not 0, because hardware
// parallelism still causes micro-drift at 0; 0.1 with anchors is the
// consistency sweet spot.
export const SCORER_MODEL = "claude-sonnet-4-5";
const SCORER_TEMPERATURE = 0.1;

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const metricScoreSchema = z.object({
  score: z.number().min(0).max(100),
  note: z.string().optional(), // pre-v1.2 prompts
  strength: z.string(),
  gap: z.string(),
  // v1.2 explanation fields. Optional at the schema so an omission never
  // fails an otherwise valid score; the prompt requires them.
  assessment: z.string().optional(),
  evidence: z.array(z.string()).optional(),
  missing: z.string().optional(),
  // v1.1 audit fields. Lenient by design: a model that omits or garbles one
  // of these should not fail an otherwise valid score — the field just goes
  // missing and the UI reports it as unstated.
  anchorBand: z.string().optional(),
  basis: z.enum(["regional-data", "submission", "rubric-inference"]).optional(),
  confidence: z.enum(["high", "medium", "low"]).optional(),
  sourceRefs: z.array(z.number().int().positive()).optional(),
});

const narrativeSchema = z.object({
  verdict: z.string(),
  stageAlignment: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendations: z.array(z.string()),
  quickWins: z.array(z.string()),
  risks: z.array(z.string()),
  investorNotes: z.string(),
});

// What the model is REQUIRED to emit, enforced by the API as structured
// output. Long prose fields made hand-rolled JSON fragile (an unescaped quote
// in a seven-sentence assessment fails the whole score); the schema makes
// malformed output impossible instead of tolerated. Range checks stay in the
// lenient validation schema above, which is applied to the parsed result.
const metricOutputSchema = z.object({
  score: z.number().int().describe("0-100"),
  assessment: z.string(),
  evidence: z.array(z.string()),
  missing: z.string(),
  strength: z.string(),
  gap: z.string(),
  anchorBand: z.string().describe('e.g. "60-80", "0-20" or "100"'),
  basis: z.enum(["regional-data", "submission", "rubric-inference"]),
  confidence: z.enum(["high", "medium", "low"]),
  sourceRefs: z.array(z.number().int()),
});

function outputSchemaFor(metricIds: MetricId[], includeNarrative: boolean) {
  const metrics = z.object(
    Object.fromEntries(metricIds.map((id) => [id, metricOutputSchema])) as Record<
      MetricId,
      typeof metricOutputSchema
    >,
  );
  return includeNarrative
    ? z.object({ metrics }).merge(narrativeSchema)
    : z.object({ metrics });
}

// The lenient schema above validates what came back; MetricScore in
// src/types is the canonical domain shape and additionally carries fields the
// pipeline sets itself (rescored).
export type MetricScores = Record<MetricId, MetricScore>;
export type ScoringNarrative = z.infer<typeof narrativeSchema>;

export interface ScoringResult {
  metrics: MetricScores;
  narrative: ScoringNarrative;
  promptVersion: string;
  scorerModel: string;
  // How many model-claimed evidence items survived validation against the
  // submission and cited sources. Surfaced in the trace so pruning is
  // visible rather than silent.
  evidence: { kept: number; dropped: number };
}

export interface ScoreInput {
  rawText: string;
  facts: ExtractedFacts;
  stage: string;
  regionContext: string | null;
  sources: EnrichmentSource[];
}

// Full scoring pass: all 8 metrics + the written report sections.
export async function scoreSubmission(input: ScoreInput): Promise<ScoringResult> {
  const raw = await callScorer(input, METRIC_ORDER, true);

  const metricsSchema = z.object({
    metrics: z.record(z.enum(METRIC_ORDER), metricScoreSchema),
  });
  const parsed = metricsSchema.merge(narrativeSchema).safeParse(raw);
  if (!parsed.success) {
    throw new AppError("Scorer output did not match schema.", "scoring_invalid");
  }
  assertAllMetrics(parsed.data.metrics);

  const { metrics, ...narrative } = parsed.data;
  pruneInvalidSourceRefs(metrics as MetricScores, input.sources);
  const evidence = checkEvidence(metrics as MetricScores, input);
  return {
    metrics: metrics as MetricScores,
    narrative,
    promptVersion: PROMPT_VERSION,
    scorerModel: SCORER_MODEL,
    evidence,
  };
}

// Selective re-run for outlier metrics only (BLUEPRINT §8 step 5) — the
// verifier flags metrics, this rescoring pass replaces just those.
export async function rescoreMetrics(
  input: ScoreInput,
  metricIds: MetricId[],
): Promise<Partial<MetricScores>> {
  const raw = await callScorer(input, metricIds, false);
  const schema = z.object({
    metrics: z.record(z.enum(METRIC_ORDER), metricScoreSchema),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError("Rescore output did not match schema.", "scoring_invalid");
  }
  const metrics = pruneInvalidSourceRefs(
    parsed.data.metrics as Partial<MetricScores>,
    input.sources,
  );
  checkEvidence(metrics, input);
  return metrics;
}

async function callScorer(
  input: ScoreInput,
  metricIds: MetricId[],
  includeNarrative: boolean,
): Promise<unknown> {
  const response = await anthropic.messages.parse({
    model: SCORER_MODEL,
    // v1.2 adds an assessment paragraph, an evidence list and a "missing"
    // line per metric on top of v1.1's audit fields and the narrative;
    // observed ~4.2k output tokens for eight metrics, so this is headroom.
    max_tokens: 12288,
    temperature: SCORER_TEMPERATURE,
    system: SCORING_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildScoringPrompt({
          rawText: input.rawText,
          facts: input.facts,
          stage: input.stage,
          regionContext: input.regionContext,
          sources: input.sources,
          metricIds,
          includeNarrative,
        }),
      },
    ],
    output_config: {
      format: zodOutputFormat(outputSchemaFor(metricIds, includeNarrative)),
    },
  });

  if (!response.parsed_output) {
    throw new AppError("Scorer returned no structured output.", "scoring_unparseable");
  }
  return response.parsed_output;
}

// The evidence list is printed as fact, so each item is checked against the
// submission and the cited sources; unsupported items are dropped and the
// count is returned so the trace can say so.
function checkEvidence<T extends Partial<MetricScores>>(
  metrics: T,
  input: ScoreInput,
): { kept: number; dropped: number } {
  let kept = 0;
  let dropped = 0;
  for (const metric of Object.values(metrics)) {
    if (!metric?.evidence) continue;
    const result = validateEvidence(metric.evidence, input.rawText, input.sources);
    metric.evidence = result.kept;
    kept += result.kept.length;
    dropped += result.dropped.length;
  }
  return { kept, dropped };
}

// A citation is only worth something if it points at a source we actually
// supplied. Drop any id the model invented rather than surfacing a dead
// reference in the report.
function pruneInvalidSourceRefs<T extends Partial<MetricScores>>(
  metrics: T,
  sources: EnrichmentSource[],
): T {
  const validIds = new Set(sources.map((s) => s.id));
  for (const metric of Object.values(metrics)) {
    if (!metric?.sourceRefs) continue;
    metric.sourceRefs = metric.sourceRefs.filter((id) => validIds.has(id));
  }
  return metrics;
}

function assertAllMetrics(metrics: Partial<MetricScores>): void {
  const missing = METRIC_ORDER.filter((id) => !metrics[id]);
  if (missing.length > 0) {
    throw new AppError(
      `Scorer omitted metrics: ${missing.join(", ")}`,
      "scoring_incomplete",
    );
  }
}
