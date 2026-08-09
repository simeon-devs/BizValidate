import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "@/lib/env";
import { AppError } from "@/lib/utils/errors";
import type { EnrichmentSource, MetricId, MetricScore } from "@/types/report";
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
  note: z.string(),
  strength: z.string(),
  gap: z.string(),
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

// The zod schema above validates what the model returns; MetricScore in
// src/types is the canonical domain shape and additionally carries fields the
// pipeline sets itself (rescored).
export type MetricScores = Record<MetricId, MetricScore>;
export type ScoringNarrative = z.infer<typeof narrativeSchema>;

export interface ScoringResult {
  metrics: MetricScores;
  narrative: ScoringNarrative;
  promptVersion: string;
  scorerModel: string;
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
  return {
    metrics: metrics as MetricScores,
    narrative,
    promptVersion: PROMPT_VERSION,
    scorerModel: SCORER_MODEL,
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
  return pruneInvalidSourceRefs(
    parsed.data.metrics as Partial<MetricScores>,
    input.sources,
  );
}

async function callScorer(
  input: ScoreInput,
  metricIds: MetricId[],
  includeNarrative: boolean,
): Promise<unknown> {
  const response = await anthropic.messages.create({
    model: SCORER_MODEL,
    // v1.1 adds four audit fields per metric on top of the narrative; 4096
    // left no headroom and truncation surfaces as scoring_unparseable.
    max_tokens: 8192,
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
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  return parseJson(text);
}

function parseJson(text: string): unknown {
  // Tolerate accidental markdown fencing despite the no-fences instruction.
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new AppError("Scorer returned unparseable output.", "scoring_unparseable");
  }
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
