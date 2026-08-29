import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { getSubmissionById } from "@/lib/db/queries/submissions";
import { getReportBySubmissionId } from "@/lib/db/queries/reports";
import { renderReportPdf } from "@/lib/pdf/ReportDocument";
import type { Grade, MetricId, ReportData } from "@/types/report";
import {
  reportTitle,
  INPUT_TYPE_LABELS,
  STAGE_LABELS,
} from "@/lib/utils/format";

const paramsSchema = z.object({ id: z.string().uuid() });

// Rendering is CPU-bound and can take a few seconds for a long report.
export const maxDuration = 60;

// Streams the report as a generated PDF document. Same ownership rule as
// the report page: a user only ever gets their own.
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Not signed in.", code: "unauthorized" },
      { status: 401 },
    );
  }

  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid report id.", code: "invalid_id" },
      { status: 400 },
    );
  }

  const submission = await getSubmissionById(parsed.data.id).catch(() => null);
  if (!submission || submission.userId !== userId) {
    return NextResponse.json(
      { error: "Report not found.", code: "not_found" },
      { status: 404 },
    );
  }
  const report = await getReportBySubmissionId(submission.id).catch(() => null);
  if (!report) {
    return NextResponse.json(
      { error: "Report is not ready yet.", code: "pending" },
      { status: 404 },
    );
  }

  const user = await currentUser();
  const preparedFor =
    user?.emailAddresses[0]?.emailAddress ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    "the account holder";

  const data = report.reportData as ReportData;
  const { title, subtitle } = reportTitle(submission.rawText, data.businessName);
  const pdf = await renderReportPdf({
    id: submission.id,
    business: title,
    subtitle,
    type: `${INPUT_TYPE_LABELS[submission.inputType] ?? submission.inputType} · ${STAGE_LABELS[submission.stage] ?? submission.stage}`,
    region: submission.targetRegion ?? "—",
    date: (report.createdAt ?? new Date()).toISOString(),
    overallScore: report.overallScore,
    grade: report.grade as Grade,
    investmentTier: report.investmentTier,
    weights: report.weightsSnapshot as Record<MetricId, number>,
    data: report.reportData as ReportData,
    promptVersion: report.promptVersion,
    scorerModel: report.scorerModel,
    fromCache: report.fromCache ?? false,
    preparedFor,
  });

  const filename = `bizvalidate-${submission.id.slice(0, 8)}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
