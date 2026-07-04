import type { MetricId } from "@/types/report";
import type { ExtractedFacts } from "../types";
import { METRIC_LABELS } from "@/lib/utils/format";

// Any change to this prompt (including the anchors) must bump PROMPT_VERSION.
// Old reports keep the version they were scored with — scores never
// retroactively change (CLAUDE.md score-consistency rules).
export const PROMPT_VERSION = "v1.0";

// Behavioral anchors (BLUEPRINT §9) — the LLM calibrates against explicit
// descriptions at 20/40/60/80/100 instead of open-range guessing.
export const SCORING_ANCHORS = `TEAM:
  20 = Solo founder, no relevant domain experience, no advisors
  40 = Small team, some skills, gaps in key functions
  60 = Balanced team with domain experience, one prior startup/industry role
  80 = Strong team, complementary skills, prior exits or deep expertise
  100 = World-class team, serial entrepreneurs, fully staffed, strong advisors

MARKET:
  20 = No market size mentioned, local/niche, no growth thesis
  40 = Small/medium market, limited data, unclear TAM
  60 = Clear $1B+ TAM, some market data, growing segment
  80 = Well-researched TAM/SAM/SOM, timing argument, validated trends
  100 = Massive expanding market, perfect timing, blue ocean thesis

PRODUCT:
  20 = No product described, just an idea, no differentiation
  40 = Basic concept, limited tech detail, no IP or moat
  60 = Working product or clear MVP, some technical differentiation
  80 = Product built and validated, clear technical advantage
  100 = Patented tech, deep tech moat, or 10x better with evidence

COMPETITIVE:
  20 = No competitor analysis, "no competition" stated (red flag)
  40 = Competitors listed, no differentiation strategy
  60 = Clear landscape, 2-3 differentiators identified
  80 = Detailed competitive matrix, strong positioning, barriers
  100 = Dominant position or clear path, network effects or switching costs

GO-TO-MARKET:
  20 = No GTM strategy mentioned
  40 = Vague plan (social media, word of mouth), no channels or CAC thinking
  60 = Defined channels, some customer acquisition thinking
  80 = Detailed GTM, CAC estimates, channel mix, early traction from strategy
  100 = Proven GTM engine with data, scalable paid/organic mix

FINANCIALS:
  20 = No financial info, no revenue model clarity
  40 = Basic revenue model, no projections or unit economics
  60 = Revenue model clear, basic projections, some CAC/LTV
  80 = Detailed projections, solid unit economics, path to profitability
  100 = Audited financials or strong actuals, exceptional unit economics

TRACTION:
  20 = Idea stage, no users, no validation
  40 = Some early users/pilots, no revenue, anecdotal
  60 = Active users, some revenue or LOIs, measurable growth
  80 = Strong revenue growth, retention data, MoM growth metrics
  100 = Exceptional traction, viral growth, clear PMF evidence

SCALABILITY:
  20 = Highly manual, geography-limited, no path to scale
  40 = Some scalability, heavy operational dependency
  60 = Tech-enabled, clear international/vertical expansion path
  80 = Built to scale, low marginal cost, platform dynamics
  100 = Network effects, winner-take-most, global scalability proven`;

export const SCORING_SYSTEM_PROMPT = `You are the scoring step of a business-validation pipeline, acting as a rigorous but fair startup analyst.

You score a business across metrics using behavioral anchors. For each metric you are given explicit descriptions of what a 20, 40, 60, 80, and 100 look like. Calibrate every score against those anchors — interpolate between them, never guess on an open scale.

Rules:
- Score each metric independently on 0-100.
- Base scores only on the extracted facts, submission text, and regional context provided. Do not reward claims with no supporting evidence.
- Judge relative to the declared business stage: an idea-stage business is not penalized for lacking audited financials, but it cannot score high on traction it does not have.
- "No competition" claims are a red flag per the COMPETITIVE anchor.
- Respond with a single JSON object exactly matching the requested structure. No markdown fences, no commentary.`;

export interface ScoringPromptInput {
  rawText: string;
  facts: ExtractedFacts;
  stage: string;
  regionContext: string | null;
  metricIds: MetricId[];
  includeNarrative: boolean;
}

export function buildScoringPrompt(input: ScoringPromptInput): string {
  const metricList = input.metricIds
    .map((id) => `- ${id} (${METRIC_LABELS[id]})`)
    .join("\n");

  const narrativeSpec = input.includeNarrative
    ? `,
  "verdict": "2-3 sentence overall verdict",
  "stageAlignment": "1-2 sentences on whether metrics match the declared stage",
  "strengths": ["exactly 4 items"],
  "weaknesses": ["exactly 3 items"],
  "recommendations": ["exactly 4 items"],
  "quickWins": ["exactly 2 items"],
  "risks": ["exactly 3 items"],
  "investorNotes": "a short first-person investor memo paragraph"`
    : "";

  return `Score this business.

Declared stage: ${input.stage}

Extracted facts:
${JSON.stringify(input.facts, null, 2)}

${input.regionContext ? `Live regional market context:\n${input.regionContext}\n` : ""}
Original submission:
<submission>
${input.rawText}
</submission>

Behavioral anchors:
${SCORING_ANCHORS}

Score these metrics:
${metricList}

Respond with JSON of this exact shape:
{
  "metrics": {
    "<metricId>": {
      "score": <0-100 integer>,
      "note": "2-line justification",
      "strength": "strongest aspect of this metric",
      "gap": "biggest gap in this metric"
    }
  }${narrativeSpec}
}`;
}
