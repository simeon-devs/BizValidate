import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reports } from "@/lib/db/schema";

export type NewReport = typeof reports.$inferInsert;
export type ReportRow = typeof reports.$inferSelect;

export async function createReport(input: NewReport) {
  const [report] = await db.insert(reports).values(input).returning();
  return report;
}

export async function getReportById(id: string) {
  const [report] = await db.select().from(reports).where(eq(reports.id, id));
  return report ?? null;
}

export async function getReportBySubmissionId(submissionId: string) {
  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.submissionId, submissionId));
  return report ?? null;
}

export async function getReportsByUser(userId: string) {
  return db
    .select()
    .from(reports)
    .where(eq(reports.userId, userId))
    .orderBy(desc(reports.createdAt));
}
