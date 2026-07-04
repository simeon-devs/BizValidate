import { env } from "@/lib/env";
import { AppError } from "@/lib/utils/errors";
import { db } from "@/lib/db";
import { embeddings, submissions, reports } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

const EMBEDDING_ENDPOINT = "https://api.openai.com/v1/embeddings";
const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dims

// Cosine similarity above this means "same business content" — return the
// cached report instead of re-running the pipeline (BLUEPRINT drift gate).
export const DRIFT_THRESHOLD = 0.96;

export async function embedText(text: string): Promise<number[]> {
  const res = await fetch(EMBEDDING_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 30_000),
    }),
  });
  if (!res.ok) {
    throw new AppError(`Embedding failed (${res.status})`, "embedding_failed");
  }
  const data = (await res.json()) as { data: Array<{ embedding: number[] }> };
  const vector = data.data[0]?.embedding;
  if (!vector) {
    throw new AppError("Embedding response was empty.", "embedding_empty");
  }
  return vector;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface DriftGateHit {
  submissionId: string;
  reportId: string;
  similarity: number;
}

// Compares the new submission's embedding against the user's recent
// submissions; a >0.96 match with an existing report short-circuits the
// pipeline and reuses that report's scores.
export async function checkDriftGate(
  userId: string,
  vector: number[],
): Promise<DriftGateHit | null> {
  const recent = await db
    .select({
      submissionId: embeddings.submissionId,
      vector: embeddings.vector,
    })
    .from(embeddings)
    .innerJoin(submissions, eq(embeddings.submissionId, submissions.id))
    .where(eq(submissions.userId, userId))
    .orderBy(desc(embeddings.createdAt))
    .limit(50);

  let best: { submissionId: string; similarity: number } | null = null;
  for (const row of recent) {
    const similarity = cosineSimilarity(vector, row.vector as number[]);
    if (similarity > DRIFT_THRESHOLD && (!best || similarity > best.similarity)) {
      best = { submissionId: row.submissionId, similarity };
    }
  }
  if (!best) return null;

  const [report] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(eq(reports.submissionId, best.submissionId));
  if (!report) return null;

  return {
    submissionId: best.submissionId,
    reportId: report.id,
    similarity: best.similarity,
  };
}

export async function storeEmbedding(
  submissionId: string,
  vector: number[],
): Promise<void> {
  await db.insert(embeddings).values({ submissionId, vector });
}
