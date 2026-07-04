import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { submissions } from "@/lib/db/schema";

export type NewSubmission = typeof submissions.$inferInsert;
export type Submission = typeof submissions.$inferSelect;

export async function createSubmission(input: NewSubmission) {
  const [submission] = await db.insert(submissions).values(input).returning();
  return submission;
}

export async function getSubmissionById(id: string) {
  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, id));
  return submission ?? null;
}

export async function getSubmissionsByUser(userId: string) {
  return db
    .select()
    .from(submissions)
    .where(eq(submissions.userId, userId))
    .orderBy(desc(submissions.createdAt));
}
