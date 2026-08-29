import { describe, it, expect } from "vitest";
import {
  gradeColor,
  scoreColor,
  sectionDotColor,
  formatDate,
  excerptTitle,
  businessTitle,
  reportTitle,
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

  it("uses a markdown heading as the title and drops its marker", () => {
    expect(excerptTitle("# PalmLink Cameroun SARL\nWe buy fruit.")).toBe(
      "PalmLink Cameroun SARL",
    );
  });
});

describe("businessTitle", () => {
  it("splits a heading into title and subtitle on a dash", () => {
    expect(
      businessTitle("# PalmLink Cameroun SARL — Digitally coordinated milling\n\nBody."),
    ).toEqual({
      title: "PalmLink Cameroun SARL",
      subtitle: "Digitally coordinated milling",
    });
  });

  it("treats a short line followed by a blank line as a heading", () => {
    expect(businessTitle("AdReach Kigali\n\nI am a developer.")).toEqual({
      title: "AdReach Kigali",
    });
  });

  it("leaves short flowing prose intact — no split, no subtitle", () => {
    expect(businessTitle("We sell solar - powered pumps\nto farms.")).toEqual({
      title: "We sell solar - powered pumps to farms.",
    });
  });

  it("reportTitle prefers a stored business name and keeps the heading's subtitle", () => {
    const raw = "# PalmLink Cameroun SARL — Digitally coordinated milling\n\nBody.";
    expect(reportTitle(raw, "PalmLink Cameroun")).toEqual({
      title: "PalmLink Cameroun",
      subtitle: "Digitally coordinated milling",
    });
    // No stored name (legacy report) → derived from the text.
    expect(reportTitle(raw).title).toBe("PalmLink Cameroun SARL");
    // A stored "name" that is really a description is not used as a title.
    expect(reportTitle("Tulip runs couriers.", "x".repeat(120)).title).toBe(
      "Tulip runs couriers.",
    );
  });

  it("caps a long pitch with no heading at its opening clause", () => {
    const pitch =
      "Tulip Logistics runs a same-day parcel delivery network for online sellers in Kampala, Uganda. Riders are contracted, dispatch is coordinated by an in-house app.";
    const { title, subtitle } = businessTitle(pitch);
    expect(title.length).toBeLessThanOrEqual(65);
    expect(title.startsWith("Tulip Logistics runs a same-day")).toBe(true);
    expect(title.endsWith("…")).toBe(true);
    expect(subtitle).toBeUndefined();
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
