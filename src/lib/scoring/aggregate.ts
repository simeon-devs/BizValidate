import type { MetricId } from "@/types/report";

// NEVER let an LLM compute this. Code only. (BLUEPRINT §8 — the most
// important file: the final score is a deterministic weighted sum.)
export function aggregateScore(
  metricScores: Record<MetricId, number>,
  weights: Record<MetricId, number>,
): number {
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const factor = Math.abs(totalWeight - 100) > 0.01 ? 100 / totalWeight : 1;

  const weightedSum = (Object.keys(metricScores) as MetricId[]).reduce(
    (sum, metric) =>
      sum + metricScores[metric] * ((weights[metric] * factor) / 100),
    0,
  );
  return Math.round(weightedSum * 10) / 10;
}
