import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sourcePreferences } from "@/lib/db/schema";

export type SourcePreferenceKind = "favorite" | "blocked";
export type SourcePreferenceRow = typeof sourcePreferences.$inferSelect;

// The two lists the enricher actually consumes, already split by kind so
// step 3 does no filtering of its own.
export interface UserSourcePreferences {
  favorites: string[];
  blocked: string[];
}

export async function getPreferencesByUser(
  userId: string,
): Promise<UserSourcePreferences> {
  const rows = await db
    .select({ kind: sourcePreferences.kind, domain: sourcePreferences.domain })
    .from(sourcePreferences)
    .where(eq(sourcePreferences.userId, userId));

  return {
    favorites: rows.filter((r) => r.kind === "favorite").map((r) => r.domain),
    blocked: rows.filter((r) => r.kind === "blocked").map((r) => r.domain),
  };
}

export async function listPreferencesByUser(
  userId: string,
): Promise<SourcePreferenceRow[]> {
  return db
    .select()
    .from(sourcePreferences)
    .where(eq(sourcePreferences.userId, userId))
    .orderBy(sourcePreferences.kind, sourcePreferences.domain);
}

// A domain is either favorited or blocked for a user, never both. Saving it
// under the other kind is a change of mind, so the (userId, domain) conflict
// updates kind rather than surfacing as an error. `domain` is expected to be
// already normalized by the caller (see src/lib/utils/domains.ts).
export async function upsertPreference(input: {
  userId: string;
  domain: string;
  kind: SourcePreferenceKind;
  label?: string | null;
}): Promise<SourcePreferenceRow> {
  const [row] = await db
    .insert(sourcePreferences)
    .values({
      userId: input.userId,
      domain: input.domain,
      kind: input.kind,
      label: input.label ?? null,
    })
    .onConflictDoUpdate({
      target: [sourcePreferences.userId, sourcePreferences.domain],
      set: { kind: input.kind, label: input.label ?? null },
    })
    .returning();
  return row;
}

export async function deletePreference(
  userId: string,
  domain: string,
): Promise<void> {
  await db
    .delete(sourcePreferences)
    .where(
      and(
        eq(sourcePreferences.userId, userId),
        eq(sourcePreferences.domain, domain),
      ),
    );
}
