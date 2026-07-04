import type { Grade, MetricId } from "./report";

export type WeightPresetId = "payne" | "accelerator" | "smb" | "equal";
export type ModelTier = "economy" | "balanced" | "premium";

export interface AdminConfig {
  weights: Record<MetricId, number>; // Must sum to 100
  thresholds: Record<Grade, number>;
  activePreset: WeightPresetId | "custom";
  modelTier: ModelTier;
}
