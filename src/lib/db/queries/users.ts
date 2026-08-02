import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { AppError } from "@/lib/utils/errors";

// BLUEPRINT specifies a Clerk webhook for user sync; webhooks can't reach
// localhost, so in dev we lazily upsert on first authenticated write. The
// production webhook route will call this same helper.
export async function ensureUser(input: {
  id: string;
  email: string;
  name?: string | null;
}) {
  try {
    const [user] = await db
      .insert(users)
      .values({
        id: input.id,
        email: input.email,
        name: input.name ?? null,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: { email: input.email, name: input.name ?? null },
      })
      .returning();
    return user;
  } catch (error) {
    // The upsert's conflict target is id, so a duplicate email (a second
    // Clerk account reusing an address) surfaces as a unique violation.
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      throw new AppError(
        "This email is already linked to another account. Sign in with the account you used before.",
        "email_in_use",
      );
    }
    throw error;
  }
}

export async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ?? null;
}
