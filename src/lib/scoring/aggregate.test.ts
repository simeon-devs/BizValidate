import { describe, it, expect } from "vitest";
import { aggregateScore } from "./aggregate";
import { WEIGHT_PRESETS } from "./presets";
import type { MetricId } from "@/types/report";

const uniformScores = (score: number): Record<MetricId, number> => ({
  team: score,
  market: score,
  product: score,
  competitive: score,
  gotomarket: score,
  financials: score,
  traction: score,
  scalability: score,
});

const SAMPLE_SCORES: Record<MetricId, number> = {
  team: 60,
  market: 70,
  product: 55,
  competitive: 45,
  gotomarket: 40,
  financials: 50,
  traction: 55,
  scalability: 60,
};

describe("aggregateScore", () => {
  it("returns the uniform score when every metric is equal", () => {
    for (const preset of Object.values(WEIGHT_PRESETS)) {
      expect(aggregateScore(uniformScores(70), preset.weights)).toBe(70);
    }
  });

  it("is deterministic: same input always yields the same output", () => {
    const first = aggregateScore(SAMPLE_SCORES, WEIGHT_PRESETS.payne.weights);
    for (let i = 0; i < 100; i++) {
      expect(aggregateScore(SAMPLE_SCORES, WEIGHT_PRESETS.payne.weights)).toBe(
        first,
      );
    }
  });

  it("computes the exact weighted sum for the Payne preset", () => {
    // team 60*.30 + market 70*.25 + product 55*.15 + competitive 45*.10
    // + gtm 40*.10 + financials 50*.10 (traction/scalability weight 0)
    // = 18 + 17.5 + 8.25 + 4.5 + 4 + 5 = 57.25 → rounds to 57.3
    expect(aggregateScore(SAMPLE_SCORES, WEIGHT_PRESETS.payne.weights)).toBe(
      57.3,
    );
  });

  it("different weight presets produce different scores from the same metrics", () => {
    const payne = aggregateScore(SAMPLE_SCORES, WEIGHT_PRESETS.payne.weights);
    const equal = aggregateScore(SAMPLE_SCORES, WEIGHT_PRESETS.equal.weights);
    expect(payne).not.toBe(equal);
  });

  it("normalizes weights that do not sum to 100", () => {
    const halfWeights = Object.fromEntries(
      Object.entries(WEIGHT_PRESETS.equal.weights).map(([k, v]) => [k, v / 2]),
    ) as Record<MetricId, number>;
    expect(aggregateScore(uniformScores(80), halfWeights)).toBe(80);
  });

  it("rounds to one decimal place", () => {
    const score = aggregateScore(SAMPLE_SCORES, WEIGHT_PRESETS.smb.weights);
    expect(score).toBe(Math.round(score * 10) / 10);
  });

  it("stays within [0, 100] at the extremes", () => {
    expect(aggregateScore(uniformScores(0), WEIGHT_PRESETS.payne.weights)).toBe(0);
    expect(aggregateScore(uniformScores(100), WEIGHT_PRESETS.payne.weights)).toBe(
      100,
    );
  });
});
