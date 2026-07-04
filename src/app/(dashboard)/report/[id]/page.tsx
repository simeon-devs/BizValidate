import { notFound } from "next/navigation";
import { ReportHero } from "@/components/report/ReportHero";
import { MetricsGrid } from "@/components/report/MetricsGrid";
import { ReportSections } from "@/components/report/ReportSections";
import { InvestorNotes } from "@/components/report/InvestorNotes";
import { ReportActions } from "@/components/report/ReportActions";
import { sampleReport, sampleValidations, type SampleReport } from "@/lib/fixtures";
import { getInvestmentTier } from "@/lib/scoring/tier";
import { formatDateLong } from "@/lib/utils/format";

// Placeholder lookup until reports live in the DB (BLUEPRINT Phase 4):
// overlays the requested row's identity onto the sample report body.
function getReport(id: string): SampleReport | null {
  const row = sampleValidations.find((v) => v.id === id);
  if (!row) return null;
  return {
    ...sampleReport,
    id: row.id,
    business: row.business,
    type: row.type,
    date: row.date,
    overallScore: row.score,
    grade: row.grade,
    investmentTier: getInvestmentTier(row.score),
  };
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = getReport(id);
  if (!report) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="sticky top-4 z-20 mb-8 flex flex-col gap-4 rounded-xl border border-border bg-surface/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between md:p-6">
        <header className="flex flex-col gap-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-subtle-foreground">
            Validation Report · {report.id}
          </p>
          <h1 className="font-serif text-3xl leading-tight text-foreground text-balance md:text-4xl">
            {report.business}
          </h1>
          <p className="font-sans text-sm text-muted-foreground">
            {report.type} · {report.region} ·{" "}
            <span className="font-mono text-xs">
              {formatDateLong(report.date)}
            </span>
          </p>
        </header>

        <div className="shrink-0">
          <ReportActions report={report} />
        </div>
      </div>

      <div className="flex flex-col gap-8">
        <ReportHero report={report} />
        <MetricsGrid
          metrics={report.reportData.metrics}
          weights={report.weightsSnapshot}
        />
        <ReportSections data={report.reportData} />
        <InvestorNotes notes={report.reportData.investorNotes} />
      </div>
    </div>
  );
}
