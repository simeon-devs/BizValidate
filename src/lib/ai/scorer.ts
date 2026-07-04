import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "@/lib/env";
import { AppError } from "@/lib/utils/errors";
import type { MetricId } from "@/types/report";
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

export type MetricScores = Record<MetricId, z.infer<typeof metricScoreSchema>>;
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
  return parsed.data.metrics as Partial<MetricScores>;
}

async function callScorer(
  input: ScoreInput,
  metricIds: MetricId[],
  includeNarrative: boolean,
): Promise<unknown> {
  const response = await anthropic.messages.create({
    model: SCORER_MODEL,
    max_tokens: 4096,
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

function assertAllMetrics(metrics: Partial<MetricScores>): void {
  const missing = METRIC_ORDER.filter((id) => !metrics[id]);
  if (missing.length > 0) {
    throw new AppError(
      `Scorer omitted metrics: ${missing.join(", ")}`,
      "scoring_incomplete",
    );
  }
}
