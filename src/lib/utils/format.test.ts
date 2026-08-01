import { describe, it, expect } from "vitest";
import {
  gradeColor,
  scoreColor,
  sectionDotColor,
  formatDate,
  excerptTitle,
  METRIC_LABELS,
  METRIC_ORDER,
} from "./format";

describe("gradeColor", () => {
  it("maps grade families to their tint", () => {
    expect(gradeColor("A+")).toBe("var(--success)");
    expect(gradeColor("A")).toBe("var(--success)");
    expect(gradeColor("B+")).toBe("var(--grade-b)");
    expect(gradeColor("B")).toBe("var(--grade-b)");
    expect(gradeColor("C+")).toBe("var(--warning)");
    expect(gradeColor("C")).toBe("var(--warning)");
    expect(gradeColor("D")).toBe("var(--danger)");
    expect(gradeColor("F")).toBe("var(--danger)");
  });

  it("never uses the reserved lime accent for grades", () => {
    for (const grade of ["A+", "A", "B+", "B", "C+", "C", "D", "F"] as const) {
      expect(gradeColor(grade)).not.toBe("var(--accent)");
    }
  });
});

describe("scoreColor", () => {
  it("bands scores by the grade thresholds", () => {
    expect(scoreColor(90)).toBe("var(--success)");
    expect(scoreColor(75)).toBe("var(--grade-b)");
    expect(scoreColor(60)).toBe("var(--warning)");
    expect(scoreColor(30)).toBe("var(--danger)");
  });
});

describe("sectionDotColor", () => {
  it("maps every tone to a css variable", () => {
    for (const tone of ["success", "danger", "info", "accent", "warning"] as const) {
      expect(sectionDotColor(tone)).toMatch(/^var\(--/);
    }
  });
});

describe("formatDate", () => {
  it("formats ISO dates as short US dates", () => {
    expect(formatDate("2026-06-28")).toBe("Jun 28, 2026");
  });
});

describe("excerptTitle", () => {
  it("collapses whitespace and truncates at 48 chars with an ellipsis", () => {
    const long = "word ".repeat(30);
    const title = excerptTitle(long);
    expect(title.length).toBe(49); // 48 + ellipsis
    expect(title.endsWith("…")).toBe(true);
    expect(excerptTitle("  Short   idea\n here ")).toBe("Short idea here");
  });
});

describe("metric registry", () => {
  it("labels exist for all 8 metrics in canonical order", () => {
    expect(METRIC_ORDER).toHaveLength(8);
    for (const id of METRIC_ORDER) {
      expect(METRIC_LABELS[id]).toBeTruthy();
    }
  });
});
