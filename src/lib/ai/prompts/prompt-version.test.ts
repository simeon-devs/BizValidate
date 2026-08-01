import { createHash } from "crypto";
import { describe, it, expect } from "vitest";
import { METRIC_ORDER } from "@/lib/utils/format";
import { FIXTURE_FACTS, FIXTURE_RAW_TEXT } from "./prompt-fixtures";
import {
  PROMPT_VERSION as EXTRACTION_VERSION,
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionPrompt,
} from "./extraction";
import {
  PROMPT_VERSION as SCORING_VERSION,
  SCORING_SYSTEM_PROMPT,
  buildScoringPrompt,
} from "./scoring";
import {
  PROMPT_VERSION as VERIFICATION_VERSION,
  VERIFICATION_SYSTEM_PROMPT,
  buildVerificationPrompt,
} from "./verification";

// Golden hashes of each prompt (system + user), built from the frozen
// fixture, keyed by the PROMPT_VERSION they belong to. This enforces
// CLAUDE.md rule 4: any change to prompt text alters the hash, and the only
// way to make the test pass again is to bump PROMPT_VERSION *and* record the
// new golden hash under it. Old scores stay attributable to the exact prompt
// that produced them.
const GOLDEN: Record<string, Record<string, string>> = {
  extraction: {
    "v1.0": "29994bb4a9ce9ba2cc842f778077afae3d11fb2b16241873bc862460bf1be034",
  },
  scoring: {
    "v1.0": "e334ed5df0e8f1e50a7f3f29980cd4638a8db59a211447f0f8086a1f9e8ca4c5",
  },
  verification: {
    "v1.0": "7bf164804928970080a16d920a12ebac4196e69cdd8fffa0ffc4ee576b42afd8",
  },
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

const extractionPrompt =
  EXTRACTION_SYSTEM_PROMPT + "\n" + buildExtractionPrompt(FIXTURE_RAW_TEXT);

const scoringPrompt =
  SCORING_SYSTEM_PROMPT +
  "\n" +
  buildScoringPrompt({
    rawText: FIXTURE_RAW_TEXT,
    facts: FIXTURE_FACTS,
    stage: FIXTURE_FACTS.stage,
    regionContext: null,
    metricIds: METRIC_ORDER,
    includeNarrative: true,
  });

const verificationPrompt =
  VERIFICATION_SYSTEM_PROMPT +
  "\n" +
  buildVerificationPrompt(FIXTURE_FACTS, FIXTURE_FACTS.stage, METRIC_ORDER);

describe.each([
  { name: "extraction", version: EXTRACTION_VERSION, prompt: extractionPrompt },
  { name: "scoring", version: SCORING_VERSION, prompt: scoringPrompt },
  {
    name: "verification",
    version: VERIFICATION_VERSION,
    prompt: verificationPrompt,
  },
])("$name prompt is pinned to its PROMPT_VERSION", ({ name, version, prompt }) => {
  it(`has a golden hash recorded for the current version (${version})`, () => {
    // A new version with no recorded hash means someone bumped the version
    // but forgot to capture the new golden — capture it and add it here.
    expect(
      GOLDEN[name][version],
      `No golden hash for ${name} ${version}. Record the current hash: ${sha256(prompt)}`,
    ).toBeDefined();
  });

  it(`matches the golden hash for ${version} (bump PROMPT_VERSION if this fails)`, () => {
    const expected = GOLDEN[name][version];
    if (!expected) return; // reported by the test above
    expect(
      sha256(prompt),
      `The ${name} prompt changed but PROMPT_VERSION is still ${version}. ` +
        `Bump PROMPT_VERSION and add the new hash to GOLDEN.${name}.`,
    ).toBe(expected);
  });
});
