import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { ReportHero } from "@/components/report/ReportHero";
import { MetricsGrid } from "@/components/report/MetricsGrid";
import { ReportSections } from "@/components/report/ReportSections";
import { InvestorNotes } from "@/components/report/InvestorNotes";
import { ReportActions } from "@/components/report/ReportActions";
import { sampleReport, sampleValidations, type SampleReport } from "@/lib/fixtures";
import { getSubmissionById } from "@/lib/db/queries/submissions";
import { getReportBySubmissionId } from "@/lib/db/queries/reports";
import type { Grade, InvestmentTier, MetricId, ReportData } from "@/types/report";
import { getInvestmentTier } from "@/lib/scoring/tier";
import {
  formatDateLong,
  excerptTitle,
  INPUT_TYPE_LABELS,
  STAGE_LABELS,
} from "@/lib/utils/format";

// The route param is a submission id for real data; sample ids (v-00x)
// fall back to fixtures until real reports fully replace them.
async function getReport(id: string, userId: string): Promise<SampleReport | null> {
  const row = sampleValidations.find((v) => v.id === id);
  if (row) {
    if (row.score === null || row.grade === null) return null;
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

  const submission = await getSubmissionById(id).catch(() => null);
  if (!submission || submission.userId !== userId) return null;
  const report = await getReportBySubmissionId(id);
  if (!report) return null;

  return {
    id: submission.id,
    business: excerptTitle(submission.rawText),
    type: `${INPUT_TYPE_LABELS[submission.inputType] ?? submission.inputType} · ${STAGE_LABELS[submission.stage] ?? submission.stage}`,
    region: report.regionContext ? "See report" : "—",
    date: (report.createdAt ?? new Date()).toISOString(),
    overallScore: report.overallScore,
    grade: report.grade as Grade,
    investmentTier: report.investmentTier as InvestmentTier,
    weightsSnapshot: report.weightsSnapshot as Record<MetricId, number>,
    reportData: report.reportData as ReportData,
  };
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) notFound();
  const report = await getReport(id, user.id);
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
