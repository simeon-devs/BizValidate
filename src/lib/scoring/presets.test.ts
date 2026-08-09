import { describe, it, expect } from "vitest";
import { WEIGHT_PRESETS, RECOMMENDED_PRESET, identifyPreset } from "./presets";
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

  it("the recommended preset scores every metric it shows", () => {
    // A default that zero-weights a metric shows founders a number that
    // cannot move their score. Whatever the default becomes, it must count
    // all eight.
    const weights = WEIGHT_PRESETS[RECOMMENDED_PRESET].weights;
    for (const metric of METRIC_ORDER) {
      expect(weights[metric]).toBeGreaterThan(0);
    }
  });

  it("keeps the Bill Payne preset faithful to the published six-factor method", () => {
    // Payne is cited by name in reports, so its weights must not drift to
    // suit us: team 30 / market 25 / product 15 and no traction weighting.
    const payne = WEIGHT_PRESETS.payne.weights;
    expect(payne.team).toBe(30);
    expect(payne.market).toBe(25);
    expect(payne.product).toBe(15);
    expect(payne.traction).toBe(0);
    expect(payne.scalability).toBe(0);
  });

  it("identifies which preset a stored weights snapshot came from", () => {
    expect(identifyPreset(WEIGHT_PRESETS.accelerator.weights)?.name).toBe(
      WEIGHT_PRESETS.accelerator.name,
    );
    expect(identifyPreset(WEIGHT_PRESETS.payne.weights)?.name).toBe(
      WEIGHT_PRESETS.payne.name,
    );
    // Customised weights belong to no preset and must not be mislabelled.
    const custom = { ...WEIGHT_PRESETS.payne.weights, team: 31 };
    expect(identifyPreset(custom)).toBeNull();
  });
});
