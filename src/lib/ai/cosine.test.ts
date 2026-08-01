import { describe, it, expect } from "vitest";
import { cosineSimilarity, DRIFT_THRESHOLD } from "./embedder";

describe("cosineSimilarity", () => {
  it("identical vectors → 1", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 10);
  });

  it("orthogonal vectors → 0", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 10);
  });

  it("opposite vectors → -1", () => {
    expect(cosineSimilarity([1, 2], [-1, -2])).toBeCloseTo(-1, 10);
  });

  it("is scale-invariant", () => {
    const a = [0.3, 0.5, 0.2];
    const scaled = a.map((x) => x * 42);
    expect(cosineSimilarity(a, scaled)).toBeCloseTo(1, 10);
  });
});

describe("drift threshold", () => {
  it("is the BLUEPRINT value 0.96", () => {
    expect(DRIFT_THRESHOLD).toBe(0.96);
  });
});
