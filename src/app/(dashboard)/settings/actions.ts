"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { normalizeDomain } from "@/lib/utils/domains";
import {
  upsertPreference,
  deletePreference,
} from "@/lib/db/queries/sourcePreferences";

const kindSchema = z.enum(["favorite", "blocked"]);

const addSchema = z.object({
  domain: z.string().trim().min(1, "Enter a domain.").max(2048),
  kind: kindSchema,
  label: z.string().trim().max(120).optional(),
});

const removeSchema = z.object({
  domain: z.string().trim().min(1).max(253),
});

export type SourcePreferenceActionResult =
  | { ok: true; domain: string }
  | { ok: false; error: string };

export async function addSourcePreference(
  input: unknown,
): Promise<SourcePreferenceActionResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const parsed = addSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  // The only place raw user input is shaped into a hostname. Anything that
  // survives this is stored and later handed to Tavily as a domain filter.
  const domain = normalizeDomain(parsed.data.domain);
  if (!domain) {
    return {
      ok: false,
      error: "That doesn't look like a website domain (e.g. example.com).",
    };
  }

  try {
    await upsertPreference({
      userId: user.id,
      domain,
      kind: parsed.data.kind,
      label: parsed.data.label || null,
    });
  } catch (error) {
    console.error("addSourcePreference failed:", error);
    return { ok: false, error: "Could not save that source. Try again." };
  }

  revalidatePath("/settings");
  return { ok: true, domain };
}

export async function removeSourcePreference(
  input: unknown,
): Promise<SourcePreferenceActionResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const parsed = removeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  try {
    await deletePreference(user.id, parsed.data.domain);
  } catch (error) {
    console.error("removeSourcePreference failed:", error);
    return { ok: false, error: "Could not remove that source. Try again." };
  }

  revalidatePath("/settings");
  return { ok: true, domain: parsed.data.domain };
}
