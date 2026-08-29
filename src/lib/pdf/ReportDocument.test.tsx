import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DISCLAIMER, renderReportPdf, type ReportPdfInput } from "./ReportDocument";
import { WEIGHT_PRESETS } from "@/lib/scoring/presets";
import { METRIC_ORDER } from "@/lib/utils/format";
import type { MetricId, MetricScore, ReportData } from "@/types/report";

// The PDF is the artifact a founder forwards to a board. These tests pin
// that it renders for both prompt generations and that the content a reader
// relies on is really in the file, not just in the React tree. Text
// assertions use pdftotext when available and are skipped (not faked)
// when it is not.

function metrics(extra: Partial<MetricScore> = {}): Record<MetricId, MetricScore> {
  return Object.fromEntries(
    METRIC_ORDER.map((id) => [
      id,
      { score: 61, note: "Two-line note.", strength: "A strength.", gap: "A gap.", ...extra },
    ]),
  ) as Record<MetricId, MetricScore>;
}

const NARRATIVE = {
  verdict: "A solid early-revenue business with real but fragile traction. Scale is the open question.",
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
    subtitle: "Digitally coordinated oil palm milling",
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

// After the disclaimer, only running chrome (footer / page number) may appear.
function expectDisclaimerLast(flat: string): void {
  const at = flat.indexOf(DISCLAIMER);
  expect(at, "disclaimer present").toBeGreaterThan(-1);
  const tail = flat.slice(at + DISCLAIMER.length).trim();
  expect(tail).toMatch(/^(REPORT [0-9A-F]+ · CONFIDENTIAL|PAGE \d+ OF \d+|\s)*$/);
}

function extractText(pdf: Buffer): string {
  const dir = mkdtempSync(join(tmpdir(), "bizvalidate-pdf-"));
  const file = join(dir, "report.pdf");
  writeFileSync(file, pdf);
  return execFileSync("pdftotext", ["-layout", file, "-"]).toString();
}

describe("ReportDocument", () => {
  it("renders a v1.1 report as a complete board document", async () => {
    const data: ReportData = {
      businessName: "PalmLink Cameroun SARL",
      metrics: metrics({ basis: "regional-data", confidence: "high", anchorBand: "60-80", sourceRefs: [1] }),
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
    const flat = text.replace(/\s+/g, " ");

    // Identity and structure
    expect(flat).toContain("BizValidate");
    expect(flat).toContain("Contents");
    expect(flat).toContain("1 · Executive Summary");
    expect(flat).toContain("2 · Metric Analysis");
    expect(flat).toContain("3 · Findings");
    expect(flat).toContain("4 · What Would Move the Score");
    expect(flat).toContain("5 · Investor Memo");
    // Rubric anchors quoted verbatim for the 60-80 band, and the next one up
    expect(flat).toContain("Balanced team with domain experience");
    expect(flat).toContain("To reach the 80 band");
    expect(flat).toContain("Appendix A · Methodology");
    expect(flat).toContain("Appendix B · Sources");
    expect(flat).toContain("Appendix C · Provenance");
    expect(flat).toContain("Appendix D · Glossary");
    // Cover grid (keys are set in small caps) and headline
    expect(flat).toContain("PREPARED BY");
    expect(flat).toContain("Top Accelerator");
    expect(flat).toContain("Scale is the open question.");
    // At a glance: 8 of 8 evidenced in this fixture
    expect(flat).toContain("8 of 8");
    // Evidence and sources
    expect(flat).toContain("EVIDENCED");
    expect(flat).toContain("mordorintelligence.com");
    expect(flat).toContain("Weighted sum computed in code");
    // Disclaimer is the last content in the document — only the running
    // footer may follow it in the text layer.
    expectDisclaimerLast(flat);
    // Running footer on every page after the cover
    expect(text).toMatch(/PAGE 2 OF \d+/);
    // Nothing from the app's screen layout may leak into the document.
    expect(text).not.toMatch(/localhost|Export PDF|SHOW|undefined/);
  });

  it("renders a v1.0 report that has no trace, labels or sources", async () => {
    const data: ReportData = { metrics: metrics(), ...NARRATIVE };

    const pdf = await renderReportPdf(input(data, "v1.0"));
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");

    if (!hasPdftotext()) return;
    const flat = extractText(pdf).replace(/\s+/g, " ");
    expect(flat).toContain("before step-by-step tracing and rubric bands were introduced");
    expect(flat).toContain("No external sources were retrieved");
    expect(flat).toContain("evidence labels predate this report");
    expect(flat).toContain("v1.0");
    // No bands → no anchor section, and the memo takes its number.
    expect(flat).not.toContain("What Would Move the Score");
    expect(flat).toContain("4 · Investor Memo");
    expect(flat).toContain("no anchor comparison is shown");
    expectDisclaimerLast(flat);
    expect(flat).not.toContain("undefined");
  });

  it("keeps the running header to one line for a long business name", async () => {
    const data: ReportData = { metrics: metrics(), ...NARRATIVE };
    const long = input(data);
    long.business = "Tulip Logistics runs a same-day parcel delivery network for online sellers in Kampala";

    const pdf = await renderReportPdf(long);
    if (!hasPdftotext()) return;
    const text = extractText(pdf);
    // The full sentence must not be repeated as a header; the capped form is.
    expect(text).not.toMatch(/SELLERS IN KAMPALA/);
    expect(text).toMatch(/TULIP LOGISTICS RUNS A SAME-DAY/);
  });
});
