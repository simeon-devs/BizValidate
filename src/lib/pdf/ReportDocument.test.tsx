import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderReportPdf, type ReportPdfInput } from "./ReportDocument";
import { WEIGHT_PRESETS } from "@/lib/scoring/presets";
import { METRIC_ORDER } from "@/lib/utils/format";
import type { MetricId, MetricScore, ReportData } from "@/types/report";

// The PDF is the artifact a founder forwards to an investor. These tests pin
// that it renders for both prompt generations and that the content a reader
// relies on — score, evidence labels, sources — is really in the file, not
// just in the React tree. Text assertions use pdftotext when available and
// are skipped (not faked) when it is not.

function metrics(extra: Partial<MetricScore> = {}): Record<MetricId, MetricScore> {
  return Object.fromEntries(
    METRIC_ORDER.map((id) => [
      id,
      { score: 61, note: "Two-line note.", strength: "A strength.", gap: "A gap.", ...extra },
    ]),
  ) as Record<MetricId, MetricScore>;
}

const NARRATIVE = {
  verdict: "A solid early-revenue business with real but fragile traction.",
  stageAlignment: "Metrics match the declared stage.",
  strengths: ["Strong retention", "Domain expertise", "Honest reporting", "Clear market"],
  weaknesses: ["Capital intensive", "Short lead", "Working capital"],
  recommendations: ["Hire a second developer", "Hedge prices", "Form a board", "Model seasonality"],
  quickWins: ["Formalise contracts", "Document the playbook"],
  risks: ["Cash crunch", "Buyer concentration", "Fast follower"],
  investorNotes: "Best fit for patient capital rather than venture multiples.",
};

function input(data: ReportData, promptVersion = "v1.1"): ReportPdfInput {
  return {
    id: "81bc8da6-581b-4c0a-ad84-125da7f00df3",
    business: "PalmLink Cameroun SARL",
    type: "Business plan · Early Revenue",
    region: "Cameroon",
    date: "2026-08-15T00:00:00.000Z",
    overallScore: 67.3,
    grade: "C+",
    investmentTier: "Pre-Seed Potential",
    weights: WEIGHT_PRESETS.accelerator.weights,
    data,
    promptVersion,
    scorerModel: "claude-sonnet-4-5",
    fromCache: false,
    preparedFor: "founder@example.com",
  };
}

function hasPdftotext(): boolean {
  try {
    execFileSync("pdftotext", ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function extractText(pdf: Buffer): string {
  const dir = mkdtempSync(join(tmpdir(), "bizvalidate-pdf-"));
  const file = join(dir, "report.pdf");
  writeFileSync(file, pdf);
  return execFileSync("pdftotext", ["-layout", file, "-"]).toString();
}

describe("ReportDocument", () => {
  it("renders a v1.1 report with evidence, sources and methodology", async () => {
    const data: ReportData = {
      metrics: metrics({
        basis: "regional-data",
        confidence: "high",
        anchorBand: "60-80",
        sourceRefs: [1],
      }),
      sources: [
        {
          id: 1,
          title: "Ghana Agriculture Market Size, Trends & Outlook 2031",
          url: "https://www.mordorintelligence.com/industry-reports/agriculture-in-ghana",
          snippet: "x",
        },
      ],
      trace: [
        { step: 3, name: "Market research", status: "ran", detail: "Kept 1 citable source.", durationMs: 5200 },
        { step: 6, name: "Final score", status: "ran", detail: "Weighted sum computed in code.", durationMs: 2 },
      ],
      ...NARRATIVE,
    };

    const pdf = await renderReportPdf(input(data));
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(10_000);

    if (!hasPdftotext()) return;
    const text = extractText(pdf);
    expect(text).toContain("PalmLink Cameroun SARL");
    expect(text).toContain("67.3");
    expect(text).toContain("Executive Summary");
    expect(text).toContain("Evidenced");
    expect(text).toContain("mordorintelligence.com");
    expect(text).toContain("Weighted sum computed in code");
    // The cover carries no running footer; numbering starts on page 2.
    expect(text).toMatch(/PAGE \d+ OF \d+/);
    // Nothing from the app's screen layout may leak into the document.
    expect(text).not.toMatch(/localhost|Export PDF|SHOW/);
  });

  it("renders a v1.0 report that has no trace and no sources", async () => {
    const data: ReportData = { metrics: metrics(), ...NARRATIVE };

    const pdf = await renderReportPdf(input(data, "v1.0"));
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");

    if (!hasPdftotext()) return;
    const text = extractText(pdf);
    expect(text).toContain("before step-by-step tracing was introduced");
    expect(text).toContain("No external sources were retrieved");
    expect(text).toContain("v1.0");
    expect(text).not.toContain("undefined");
  });
});
