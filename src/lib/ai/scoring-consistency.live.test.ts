import { describe, it, expect } from "vitest";
import { TEST_SUBMISSION } from "@/lib/fixtures";
import { extractFacts } from "./extractor";
import { scoreSubmission } from "./scorer";
import { aggregateScore } from "@/lib/scoring/aggregate";
import { WEIGHT_PRESETS, RECOMMENDED_PRESET } from "@/lib/scoring/presets";
import { METRIC_ORDER } from "@/lib/utils/format";
import type { MetricId } from "@/types/report";

// The headline consistency guarantee (BLUEPRINT §8): the same submission
// scored repeatedly must land within a ±5 point band. This is the product
// claim that justifies temp=0.1 + behavioral anchors + deterministic
// aggregation. Hits the real Anthropic API — run via `npm run test:live`.
const RUNS = 5;
const MAX_SPREAD = 5;

describe("scoring consistency (live)", () => {
  it(
    `scores TEST_SUBMISSION ${RUNS}x within a ${MAX_SPREAD}-point band`,
    async () => {
      // Extract once so all runs score identical facts — isolates scorer
      // variance, which is what the band protects.
      const { facts } = await extractFacts(TEST_SUBMISSION);
      const input = {
        rawText: TEST_SUBMISSION,
        facts,
        stage: "early-revenue",
        regionContext: null,
        sources: [],
      };
      const weights = WEIGHT_PRESETS[RECOMMENDED_PRESET].weights;

      const results = await Promise.all(
        Array.from({ length: RUNS }, () => scoreSubmission(input)),
      );
      const overallScores = results.map((result) =>
        aggregateScore(
          Object.fromEntries(
            METRIC_ORDER.map((id) => [id, result.metrics[id].score]),
          ) as Record<MetricId, number>,
          weights,
        ),
      );

      const spread = Math.max(...overallScores) - Math.min(...overallScores);
      // stdout directly — vitest swallows console.log in run mode, and every
      // live run should leave a record of the actual band observed.
      process.stdout.write(
        `consistency: scores=[${overallScores.join(", ")}] spread=${spread.toFixed(1)}\n`,
      );
      expect(spread).toBeLessThanOrEqual(MAX_SPREAD);
    },
    120_000,
  );
});
