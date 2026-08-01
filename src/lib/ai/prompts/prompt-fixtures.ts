import type { ExtractedFacts } from "../types";

// Frozen input for the prompt-hash tests: prompts built from this fixture
// must be byte-stable, so any prompt change is caught and forces a
// PROMPT_VERSION bump.
export const FIXTURE_FACTS: ExtractedFacts = {
  businessName: "Fixture Foods",
  industry: "B2B SaaS · Food & Beverage",
  stage: "early-revenue",
  region: "West Africa",
  team: "2 co-founders with domain experience",
  revenueModel: "SaaS subscription $50-200/month",
  competitors: ["Excel", "WhatsApp"],
  traction: "12 pilots, 3 paying",
  fundraising: "seeking $150k pre-seed",
  keyClaims: ["50,000 restaurants in Lagos", "$200M TAM"],
};

export const FIXTURE_RAW_TEXT = "A fixed submission body used only for prompt hashing.";
