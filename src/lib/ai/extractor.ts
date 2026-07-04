import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import Groq from "groq-sdk";
import { env } from "@/lib/env";
import { AppError } from "@/lib/utils/errors";
import type { ModelTier } from "@/types/config";
import { extractedFactsSchema, type ExtractedFacts } from "./types";
import {
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionPrompt,
} from "./prompts/extraction";

// Model assignments per CLAUDE.md — never swap without updating BLUEPRINT.md.
const EXTRACTION_MODEL = "claude-haiku-4-5";
const ECONOMY_MODEL = "llama-3.3-70b-versatile";

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
const groq = new Groq({ apiKey: env.GROQ_API_KEY });

export interface ExtractionResult {
  facts: ExtractedFacts;
  model: string;
}

export async function extractFacts(
  rawText: string,
  tier: ModelTier = "balanced",
): Promise<ExtractionResult> {
  return tier === "economy"
    ? extractWithGroq(rawText)
    : extractWithHaiku(rawText);
}

async function extractWithHaiku(rawText: string): Promise<ExtractionResult> {
  const response = await anthropic.messages.parse({
    model: EXTRACTION_MODEL,
    max_tokens: 2048,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildExtractionPrompt(rawText) }],
    output_config: {
      format: zodOutputFormat(extractedFactsSchema),
    },
  });

  if (!response.parsed_output) {
    throw new AppError("Extraction returned no structured output.", "extraction_failed");
  }
  return { facts: response.parsed_output, model: EXTRACTION_MODEL };
}

// Economy tier: Llama 3.3 70B on Groq. JSON mode guarantees syntactically
// valid JSON but not our schema, so the zod parse is the contract here.
async function extractWithGroq(rawText: string): Promise<ExtractionResult> {
  const completion = await groq.chat.completions.create({
    model: ECONOMY_MODEL,
    temperature: 0,
    max_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `${EXTRACTION_SYSTEM_PROMPT}

Respond with a single JSON object with exactly these keys:
businessName, industry, stage, region, team, revenueModel (strings),
competitors, keyClaims (arrays of strings), traction, fundraising (strings).`,
      },
      { role: "user", content: buildExtractionPrompt(rawText) },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new AppError("Extraction returned no output.", "extraction_failed");
  }

  const parsed = extractedFactsSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new AppError(
      "Extraction output did not match the expected schema.",
      "extraction_invalid",
    );
  }
  return { facts: parsed.data, model: ECONOMY_MODEL };
}
