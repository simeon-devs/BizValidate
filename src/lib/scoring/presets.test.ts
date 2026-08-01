import { describe, it, expect } from "vitest";
import { WEIGHT_PRESETS, RECOMMENDED_PRESET } from "./presets";
import { METRIC_ORDER } from "@/lib/utils/format";

describe("WEIGHT_PRESETS", () => {
  it("every preset's weights sum to exactly 100", () => {
    for (const [id, preset] of Object.entries(WEIGHT_PRESETS)) {
      const total = Object.values(preset.weights).reduce((a, b) => a + b, 0);
      expect(total, `preset ${id}`).toBe(100);
    }
  });

  it("every preset covers all 8 metrics with non-negative weights", () => {
    for (const preset of Object.values(WEIGHT_PRESETS)) {
      for (const metric of METRIC_ORDER) {
        expect(preset.weights[metric]).toBeGreaterThanOrEqual(0);
      }
      expect(Object.keys(preset.weights)).toHaveLength(METRIC_ORDER.length);
    }
  });

  it("the recommended preset is Bill Payne", () => {
    expect(RECOMMENDED_PRESET).toBe("payne");
    expect(WEIGHT_PRESETS[RECOMMENDED_PRESET].weights.team).toBe(30);
  });
});
