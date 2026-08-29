import type { MetricId, MetricScore } from "@/types/report";

// How much of a report rests on what. Surfaced on the executive summary
// because "5 of 8 metrics rest on the founder's own claims" is the single
// most honest line a board member can read about an AI-produced score.
export interface EvidenceCoverage {
  evidenced: number; // backed by cited external sources
  stated: number; // taken from the submission, unverified
  inferred: number; // rubric calibration only
  unlabelled: number; // reports scored before evidence labels existed
  total: number;
}

export function evidenceCoverage(
  metrics: Record<MetricId, MetricScore>,
): EvidenceCoverage {
  const coverage: EvidenceCoverage = {
    evidenced: 0,
    stated: 0,
    inferred: 0,
    unlabelled: 0,
    total: 0,
  };
  for (const metric of Object.values(metrics)) {
    coverage.total += 1;
    switch (metric.basis) {
      case "regional-data":
        coverage.evidenced += 1;
        break;
      case "submission":
        coverage.stated += 1;
        break;
      case "rubric-inference":
        coverage.inferred += 1;
        break;
      default:
        coverage.unlabelled += 1;
    }
  }
  return coverage;
}
