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

export const RECOMMENDED_PRESET: WeightPresetId = "payne"; // Reset button restores this
