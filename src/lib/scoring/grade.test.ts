import { describe, it, expect } from "vitest";
import { getGrade, GRADE_THRESHOLDS } from "./grade";

describe("getGrade", () => {
  it("matches BLUEPRINT thresholds exactly at each boundary", () => {
    expect(getGrade(92)).toBe("A+");
    expect(getGrade(85)).toBe("A");
    expect(getGrade(78)).toBe("B+");
    expect(getGrade(70)).toBe("B");
    expect(getGrade(62)).toBe("C+");
    expect(getGrade(55)).toBe("C");
    expect(getGrade(40)).toBe("D");
    expect(getGrade(0)).toBe("F");
  });

  it("assigns the lower grade just below each boundary", () => {
    expect(getGrade(91.9)).toBe("A");
    expect(getGrade(84.9)).toBe("B+");
    expect(getGrade(77.9)).toBe("B");
    expect(getGrade(69.9)).toBe("C+");
    expect(getGrade(61.9)).toBe("C");
    expect(getGrade(54.9)).toBe("D");
    expect(getGrade(39.9)).toBe("F");
  });

  it("handles the extremes", () => {
    expect(getGrade(100)).toBe("A+");
    expect(getGrade(0)).toBe("F");
  });

  it("thresholds are strictly descending (order matters for lookup)", () => {
    const values = Object.values(GRADE_THRESHOLDS);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThan(values[i - 1]);
    }
  });
});
