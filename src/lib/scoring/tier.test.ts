import { describe, it, expect } from "vitest";
import { getInvestmentTier } from "./tier";

describe("getInvestmentTier", () => {
  it("matches BLUEPRINT boundaries exactly", () => {
    expect(getInvestmentTier(82)).toBe("Series A Ready");
    expect(getInvestmentTier(68)).toBe("Seed Ready");
    expect(getInvestmentTier(52)).toBe("Pre-Seed Potential");
    expect(getInvestmentTier(51.9)).toBe("Not Investment Ready");
  });

  it("assigns the lower tier just below each boundary", () => {
    expect(getInvestmentTier(81.9)).toBe("Seed Ready");
    expect(getInvestmentTier(67.9)).toBe("Pre-Seed Potential");
  });

  it("handles the extremes", () => {
    expect(getInvestmentTier(100)).toBe("Series A Ready");
    expect(getInvestmentTier(0)).toBe("Not Investment Ready");
  });
});
