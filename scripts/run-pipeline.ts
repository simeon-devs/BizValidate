// Dev utility: run the AI pipeline on the newest unscored submission.
//   npx tsx --env-file=.env.local scripts/run-pipeline.ts
// Useful for exercising the pipeline without the Inngest round trip.
import { db } from "@/lib/db";
import { submissions, reports } from "@/lib/db/schema";
import { desc, notInArray } from "drizzle-orm";
import { runValidationPipeline } from "@/lib/ai/pipeline";

async function main() {
  const scored = db.select({ id: reports.submissionId }).from(reports);
  const [pending] = await db
    .select({
      id: submissions.id,
      rawText: submissions.rawText,
      stage: submissions.stage,
    })
    .from(submissions)
    .where(notInArray(submissions.id, scored))
    .orderBy(desc(submissions.createdAt))
    .limit(1);

  if (!pending) {
    console.log("No pending submissions — all scored.");
    return;
  }
  console.log("Running pipeline on submission:", pending.id);
  console.log(
    "Text preview:",
    pending.rawText.replace(/\s+/g, " ").slice(0, 80) + "…",
  );

  const started = Date.now();
  const report = await runValidationPipeline(pending.id);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  console.log(`\n=== REPORT (in ${seconds}s) ===`);
  console.log(
    "overall:",
    report.overallScore,
    "| grade:",
    report.grade,
    "| tier:",
    report.investmentTier,
  );
  console.log(
    "metrics: team",
    report.teamScore,
    "market",
    report.marketScore,
    "product",
    report.productScore,
    "competitive",
    report.competitiveScore,
    "gtm",
    report.gotomarketScore,
    "financials",
    report.financialsScore,
    "traction",
    report.tractionScore,
    "scalability",
    report.scalabilityScore,
  );
  console.log(
    "model:",
    report.scorerModel,
    "| prompt:",
    report.promptVersion,
    "| fromCache:",
    report.fromCache,
  );
  const data = report.reportData as { verdict: string };
  console.log("verdict:", data.verdict);
  process.exit(0);
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
