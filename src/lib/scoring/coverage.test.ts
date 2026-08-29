import { describe, it, expect } from "vitest";
import { evidenceCoverage } from "./coverage";
import { METRIC_ORDER } from "@/lib/utils/format";
import type { MetricId, MetricScore } from "@/types/report";

function metrics(
  bases: (MetricScore["basis"] | undefined)[],
): Record<MetricId, MetricScore> {
  return Object.fromEntries(
    METRIC_ORDER.map((id, i) => [
      id,
      { score: 50, note: "", strength: "", gap: "", basis: bases[i] },
    ]),
  ) as Record<MetricId, MetricScore>;
}

describe("evidenceCoverage", () => {
  it("counts each evidence class across all eight metrics", () => {
    const coverage = evidenceCoverage(
      metrics([
        "regional-data",
        "regional-data",
        "submission",
        "submission",
        "submission",
        "rubric-inference",
        "submission",
        "submission",
      ]),
    );
    expect(coverage).toEqual({
      evidenced: 2,
      stated: 5,
      inferred: 1,
      unlabelled: 0,
      total: 8,
    });
  });

  it("reports legacy metrics as unlabelled rather than mis-filing them", () => {
    const coverage = evidenceCoverage(metrics(Array(8).fill(undefined)));
    expect(coverage.unlabelled).toBe(8);
    expect(coverage.evidenced + coverage.stated + coverage.inferred).toBe(0);
  });
});
