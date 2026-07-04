import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "@/lib/env";
import { AppError } from "@/lib/utils/errors";
import type { MetricId } from "@/types/report";
import { METRIC_ORDER } from "@/lib/utils/format";
import type { ExtractedFacts } from "./types";
import type { MetricScores } from "./scorer";
import {
  VERIFICATION_SYSTEM_PROMPT,
  buildVerificationPrompt,
} from "./prompts/verification";

// Model assignment per CLAUDE.md: Claude Haiku 4.5 — cheap outlier detection.
const VERIFIER_MODEL = "claude-haiku-4-5";

// A score more than this far outside the verifier's anchor band flags the
// metric for a selective re-run (BLUEPRINT consistency rule 6).
const OUTLIER_TOLERANCE = 15;

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const bandsSchema = z.object({
  bands: z.record(
    z.enum(METRIC_ORDER),
    z.object({ low: z.number().min(0).max(100), high: z.number().min(0).max(100) }),
  ),
});

// Returns the metric ids whose scores fall >15pts outside the verifier's
// defensible band. Empty array = scores pass verification.
export async function findOutlierMetrics(
  facts: ExtractedFacts,
  stage: string,
  metrics: MetricScores,
): Promise<MetricId[]> {
  const response = await anthropic.messages.create({
    model: VERIFIER_MODEL,
    max_tokens: 1024,
    system: VERIFICATION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildVerificationPrompt(facts, stage, METRIC_ORDER),
      },
    ],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "");

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new AppError("Verifier returned unparseable output.", "verification_unparseable");
  }

  const parsed = bandsSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError("Verifier output did not match schema.", "verification_invalid");
  }

  return METRIC_ORDER.filter((id) => {
    const band = parsed.data.bands[id];
    if (!band) return false;
    const score = metrics[id].score;
    return (
      score < band.low - OUTLIER_TOLERANCE ||
      score > band.high + OUTLIER_TOLERANCE
    );
  });
}
