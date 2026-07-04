"use client";

import { Download, Share2 } from "lucide-react";
import type { SampleReport } from "@/lib/fixtures";

export function ReportActions({ report }: { report: SampleReport }) {
  // Placeholder export until the styled jsPDF exporter lands (BLUEPRINT Phase 4).
  function handleExport() {
    window.print();
  }

  function handleShare() {
    const subject = `Validation Report — ${report.business} (${report.grade}, ${report.overallScore}/100)`;
    const body = [
      `Business: ${report.business}`,
      `Type: ${report.type}`,
      `Score: ${report.overallScore}/100`,
      `Grade: ${report.grade}`,
      `Investment Tier: ${report.investmentTier}`,
      "",
      report.reportData.verdict,
    ].join("\n");
    window.location.href = `mailto:?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleExport}
        className="inline-flex items-center gap-2 rounded-lg border border-border-strong bg-card px-4 py-2 text-sm text-foreground transition-colors hover:bg-input"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Export PDF
      </button>
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
        Share
      </button>
    </div>
  );
}
