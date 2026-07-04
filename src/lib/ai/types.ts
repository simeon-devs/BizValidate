import { z } from "zod";

// Structured facts pulled from the raw submission text by the extraction
// step (BLUEPRINT §8, step 2). Everything downstream — enrichment queries,
// the scoring prompt — consumes this shape, never the raw text directly.
export const extractedFactsSchema = z.object({
  businessName: z
    .string()
    .describe("Name of the business, or a short descriptive label if unnamed"),
  industry: z
    .string()
    .describe("Primary industry/vertical, e.g. 'B2B SaaS · Logistics'"),
  stage: z
    .string()
    .describe(
      "Business stage as evidenced in the text: idea, mvp, pre-revenue, early-revenue, growth, scale, or established",
    ),
  region: z
    .string()
    .describe("Primary target geography, e.g. 'West Africa', 'North America'"),
  team: z
    .string()
    .describe("Summary of founders/team: size, roles, relevant experience"),
  revenueModel: z
    .string()
    .describe("How the business makes or plans to make money, with pricing if stated"),
  competitors: z
    .array(z.string())
    .describe("Named competitors or substitute solutions mentioned"),
  traction: z
    .string()
    .describe("Evidence of traction: users, pilots, revenue, retention, LOIs"),
  fundraising: z
    .string()
    .describe("Funding sought or raised, and intended use, if stated"),
  keyClaims: z
    .array(z.string())
    .describe("Up to 5 of the most load-bearing factual claims made in the text"),
});

export type ExtractedFacts = z.infer<typeof extractedFactsSchema>;
