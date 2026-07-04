import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

// BLUEPRINT specifies a Clerk webhook for user sync; webhooks can't reach
// localhost, so in dev we lazily upsert on first authenticated write. The
// production webhook route will call this same helper.
export async function ensureUser(input: {
  id: string;
  email: string;
  name?: string | null;
}) {
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
}

export async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ?? null;
}
