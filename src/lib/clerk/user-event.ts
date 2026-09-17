import type { WebhookEvent } from "@clerk/backend/webhooks";

// The subset of a Clerk user this app stores. Kept separate from the route
// so the mapping — which email is authoritative, what counts as a name —
// is testable without a signed request.
export interface ClerkUserSync {
  id: string;
  email: string;
  name: string | null;
}

// Maps a Clerk webhook event to a user row, or null when the event is not
// one we mirror. Returning null is the "ignore this, acknowledge it" path:
// unknown event types must not look like failures or Clerk will retry them.
//
// user.deleted is deliberately NOT handled here. Removing a user cascades to
// their submissions and reports, and what should happen to a paying
// customer's history is a product decision, not a default. Until that is
// decided the event is acknowledged and logged, never acted on.
export function userFromClerkEvent(event: WebhookEvent): ClerkUserSync | null {
  if (event.type !== "user.created" && event.type !== "user.updated") {
    return null;
  }

  const data = event.data;
  // Clerk allows several addresses; the primary one is authoritative. Fall
  // back to the first only when the primary id does not resolve, which can
  // happen mid-verification.
  const primary =
    data.email_addresses.find((e) => e.id === data.primary_email_address_id) ??
    data.email_addresses[0];

  const email = primary?.email_address?.trim();
  if (!email) return null;

  const name =
    [data.first_name, data.last_name].filter(Boolean).join(" ").trim() || null;

  return { id: data.id, email, name };
}
