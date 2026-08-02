import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getSubmissionById } from "@/lib/db/queries/submissions";
import { getReportBySubmissionId } from "@/lib/db/queries/reports";

const paramsSchema = z.object({ id: z.string().uuid() });

// Thin polling endpoint for the report page: is this submission scored yet?
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
      { error: "Invalid submission id.", code: "invalid_id" },
      { status: 400 },
    );
  }

  const submission = await getSubmissionById(parsed.data.id).catch(() => null);
  if (!submission || submission.userId !== userId) {
    return NextResponse.json(
      { error: "Submission not found.", code: "not_found" },
      { status: 404 },
    );
  }

  const report = await getReportBySubmissionId(submission.id).catch(() => null);
  return NextResponse.json({ status: report ? "scored" : "pending" });
}
