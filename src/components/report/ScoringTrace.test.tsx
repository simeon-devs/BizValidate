import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ScoringTrace } from "./ScoringTrace";
import { WEIGHT_PRESETS } from "@/lib/scoring/presets";
import { METRIC_ORDER } from "@/lib/utils/format";
import type { MetricId, MetricScore, ReportData } from "@/types/report";

// The panel must render for both prompt versions: v1.1 reports carry a trace
// and sources, v1.0 reports carry neither and must degrade rather than break.

const weights = WEIGHT_PRESETS.payne.weights;

function metrics(extra: Partial<MetricScore> = {}): Record<MetricId, MetricScore> {
  return Object.fromEntries(
    METRIC_ORDER.map((id) => [
      id,
      { score: 60, note: "n", strength: "s", gap: "g", ...extra },
    ]),
  ) as Record<MetricId, MetricScore>;
}

const NARRATIVE = {
  verdict: "v",
  stageAlignment: "s",
  strengths: [],
  weaknesses: [],
  recommendations: [],
  quickWins: [],
  risks: [],
  investorNotes: "n",
};

describe("ScoringTrace", () => {
  it("renders steps, cited sources and provenance for a v1.1 report", () => {
    const data: ReportData = {
      metrics: metrics({ confidence: "high", basis: "regional-data", sourceRefs: [1], anchorBand: "60-80" }),
      sources: [
        { id: 1, title: "Nigeria Foodservice 2026", url: "https://a.example/r1", snippet: "x" },
      ],
      trace: [
        { step: 3, name: "Market research", status: "ran", detail: "Kept 1 citable source.", durationMs: 1200 },
        { step: 6, name: "Final score", status: "ran", detail: "Weighted sum computed in code.", durationMs: 2 },
      ],
      ...NARRATIVE,
    };

    const html = renderToStaticMarkup(
      <ScoringTrace data={data} promptVersion="v1.1" scorerModel="claude-sonnet-4-5" weights={weights} fromCache={false} />,
    );

    expect(html).toContain("Market research");
    expect(html).toContain("Weighted sum computed in code.");
    expect(html).toContain("https://a.example/r1");
    expect(html).toContain("Nigeria Foodservice 2026");
    expect(html).toContain("v1.1");
    expect(html).toContain("claude-sonnet-4-5");
    expect(html).toContain("Bill Payne Angel Standard");
    // Source links must not hand the opener window over.
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("scored fresh");
  });

  it("degrades for a v1.0 report with no trace and no sources", () => {
    const data: ReportData = { metrics: metrics(), ...NARRATIVE };

    const html = renderToStaticMarkup(
      <ScoringTrace data={data} promptVersion="v1.0" scorerModel="claude-sonnet-4-5" weights={weights} />,
    );

    expect(html).toContain("before evidence tracing was introduced");
    expect(html).toContain("No external sources were retrieved");
    // Missing audit fields render as em-dashes, never as "undefined".
    expect(html).not.toContain("undefined");
    expect(html).toContain("v1.0");
  });

  it("reports a cached result honestly", () => {
    const data: ReportData = { metrics: metrics(), trace: [], ...NARRATIVE };

    const html = renderToStaticMarkup(
      <ScoringTrace data={data} weights={weights} fromCache />,
    );

    expect(html).toContain("reused from an earlier run");
  });
});
