import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { env } from "@/lib/env";
import { userFromClerkEvent } from "@/lib/clerk/user-event";
import { ensureUser } from "@/lib/db/queries/users";
import { isAppError } from "@/lib/utils/errors";

// Mirrors Clerk users into our database at signup, which is what BLUEPRINT
// specifies. Without it, a user exists in Clerk but has no row here until
// their first submission — so a collision (an email already linked to
// another account) surfaces mid-submission instead of at registration.
//
// Authenticated by Svix signature, not by session: Clerk's servers call this,
// so it is a public route in proxy.ts.
export async function POST(request: NextRequest) {
  const secret = env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    // Unconfigured is a deployment state, not a client error. 503 tells
    // Clerk to retry later rather than discarding the event.
    return NextResponse.json(
      { error: "Webhook not configured.", code: "webhook_not_configured" },
      { status: 503 },
    );
  }

  let event;
  try {
    event = await verifyWebhook(request, { signingSecret: secret });
  } catch {
    return NextResponse.json(
      { error: "Invalid signature.", code: "invalid_signature" },
      { status: 400 },
    );
  }

  const user = userFromClerkEvent(event);
  if (!user) {
    // Acknowledged, not acted on. Retrying would never change the outcome.
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  try {
    await ensureUser(user);
  } catch (error) {
    if (isAppError(error)) {
      // Permanent: a duplicate email will still be duplicate on retry, so
      // acknowledge it and leave a record rather than looping forever.
      console.error(`clerk webhook: ${event.type} rejected — ${error.code}`, {
        clerkUserId: user.id,
      });
      return NextResponse.json({ ok: false, code: error.code });
    }
    // Transient (database unreachable, etc.) — let Clerk retry.
    console.error("clerk webhook: user sync failed", error);
    return NextResponse.json(
      { error: "Could not sync user.", code: "sync_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, synced: event.type });
}
