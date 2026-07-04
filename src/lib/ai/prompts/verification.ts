import type { MetricId } from "@/types/report";
import type { ExtractedFacts } from "../types";
import { SCORING_ANCHORS } from "./scoring";
import { METRIC_LABELS } from "@/lib/utils/format";

// Any change to this prompt must bump PROMPT_VERSION.
export const PROMPT_VERSION = "v1.0";

export const VERIFICATION_SYSTEM_PROMPT = `You are the verification step of a business-validation pipeline.

You do NOT score the business yourself. For each metric you estimate the plausible anchor band — the lowest and highest defensible score given the evidence and the behavioral anchors. Downstream code compares the actual scores against your bands to detect outliers.

Rules:
- Bands should be honest ranges, typically 20-40 points wide. Not so narrow that reasonable judgment gets flagged, not so wide the check is meaningless.
- Base bands only on the provided facts. No new assumptions.
- Respond with a single JSON object. No markdown fences, no commentary.`;

export function buildVerificationPrompt(
  facts: ExtractedFacts,
  stage: string,
  metricIds: MetricId[],
): string {
  const metricList = metricIds
    .map((id) => `- ${id} (${METRIC_LABELS[id]})`)
    .join("\n");

  return `Estimate the defensible score band for each metric.

Declared stage: ${stage}

Extracted facts:
${JSON.stringify(facts, null, 2)}

Behavioral anchors:
${SCORING_ANCHORS}

Metrics:
${metricList}

Respond with JSON of this exact shape:
{
  "bands": {
    "<metricId>": { "low": <0-100 integer>, "high": <0-100 integer> }
  }
}`;
}
