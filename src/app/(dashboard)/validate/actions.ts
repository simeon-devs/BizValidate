"use server";

import { createHash } from "crypto";
import { currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { ensureUser } from "@/lib/db/queries/users";
import { createSubmission } from "@/lib/db/queries/submissions";

const submissionSchema = z.object({
  inputType: z.enum(["plan", "pitch", "financials", "idea"]),
  stage: z.enum([
    "idea",
    "mvp",
    "pre-revenue",
    "early-revenue",
    "growth",
    "scale",
    "established",
  ]),
  text: z.string().trim().min(50, "Please provide at least 50 characters."),
  fileUrl: z.string().url().optional(),
  targetRegion: z.string().trim().max(120).optional(),
});

export type SubmitValidationResult =
  | { ok: true; submissionId: string }
  | { ok: false; error: string };

export async function submitValidation(
  input: unknown,
): Promise<SubmitValidationResult> {
  const user = await currentUser();
  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid submission." };
  }
  const data = parsed.data;

  const email = user.emailAddresses[0]?.emailAddress;
  if (!email) {
    return { ok: false, error: "Your account has no email address." };
  }

  try {
    await ensureUser({
      id: user.id,
      email,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || null,
    });

    const contentHash = createHash("sha256").update(data.text).digest("hex");

    const submission = await createSubmission({
      userId: user.id,
      inputType: data.inputType,
      stage: data.stage,
      rawText: data.text,
      fileUrl: data.fileUrl ?? null,
      contentHash,
    });

    // The Inngest event that starts the AI pipeline fires here in Phase 3F.
    return { ok: true, submissionId: submission.id };
  } catch {
    return { ok: false, error: "Could not save your submission. Try again." };
  }
}
