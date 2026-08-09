import type { MetricId } from "@/types/report";
import type { WeightPresetId } from "@/types/config";

export interface WeightPreset {
  name: string;
  source: string;
  weights: Record<MetricId, number>;
}

export const WEIGHT_PRESETS: Record<WeightPresetId, WeightPreset> = {
  payne: {
    name: "Bill Payne Angel Standard",
    source: "Angel Capital Association — industry default since 2011",
    weights: {
      team: 30,
      market: 25,
      product: 15,
      competitive: 10,
      gotomarket: 10,
      financials: 10,
      traction: 0,
      scalability: 0,
    },
  },
  accelerator: {
    name: "Top Accelerator (YC/Techstars)",
    source: "Framework used by 80%+ of top accelerator programs",
    weights: {
      team: 25,
      market: 20,
      product: 15,
      competitive: 10,
      gotomarket: 10,
      financials: 5,
      traction: 10,
      scalability: 5,
    },
  },
  smb: {
    name: "SMB / Traditional Business",
    source: "SCORE & SBA advisory framework",
    weights: {
      team: 15,
      market: 15,
      product: 12,
      competitive: 12,
      gotomarket: 15,
      financials: 18,
      traction: 8,
      scalability: 5,
    },
  },
  equal: {
    name: "Equal Weights",
    source: "Neutral baseline — no prior thesis",
    weights: {
      team: 12,
      market: 12,
      product: 13,
      competitive: 12,
      gotomarket: 13,
      financials: 12,
      traction: 13,
      scalability: 13,
    },
  },
};

// Reset button restores this, and it is what new users score against.
//
// Not "payne": the real Bill Payne method has six factors, so that preset
// weights traction and scalability at 0 — a founder would see two of their
// eight scores change nothing. The accelerator framework is an equally
// citable rubric that does count them. Payne stays available, and stays
// faithful to the published method, for anyone who wants the strict standard.
export const RECOMMENDED_PRESET: WeightPresetId = "accelerator";

// Names the rubric behind a stored weightsSnapshot so a report can say which
// framework produced it. Returns null when a user has customised the weights.
export function identifyPreset(
  weights: Record<MetricId, number>,
): WeightPreset | null {
  return (
    Object.values(WEIGHT_PRESETS).find((preset) =>
      (Object.keys(preset.weights) as MetricId[]).every(
        (id) => preset.weights[id] === weights[id],
      ),
    ) ?? null
  );
}
