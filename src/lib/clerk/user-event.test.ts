import { describe, it, expect } from "vitest";
import type { WebhookEvent } from "@clerk/backend/webhooks";
import { userFromClerkEvent } from "./user-event";

// Builds the shape of a Clerk user event without pulling in the full
// UserJSON surface, which carries dozens of fields this mapping ignores.
function event(
  type: string,
  data: {
    id?: string;
    emails?: { id: string; email_address: string }[];
    primary?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } = {},
): WebhookEvent {
  return {
    type,
    data: {
      id: data.id ?? "user_123",
      email_addresses: data.emails ?? [
        { id: "idn_1", email_address: "founder@example.com" },
      ],
      // Presence checks, not ??: an explicitly null name is a case under
      // test and must not fall back to the default.
      primary_email_address_id: "primary" in data ? data.primary : "idn_1",
      first_name: "first_name" in data ? data.first_name : "Ada",
      last_name: "last_name" in data ? data.last_name : "Lovelace",
    },
  } as unknown as WebhookEvent;
}

describe("userFromClerkEvent", () => {
  it("maps a created user to the row we store", () => {
    expect(userFromClerkEvent(event("user.created"))).toEqual({
      id: "user_123",
      email: "founder@example.com",
      name: "Ada Lovelace",
    });
  });

  it("mirrors updates too, so a changed email does not go stale", () => {
    expect(userFromClerkEvent(event("user.updated"))?.email).toBe(
      "founder@example.com",
    );
  });

  it("prefers the primary address over the first one listed", () => {
    const mapped = userFromClerkEvent(
      event("user.created", {
        emails: [
          { id: "idn_1", email_address: "old@example.com" },
          { id: "idn_2", email_address: "primary@example.com" },
        ],
        primary: "idn_2",
      }),
    );
    expect(mapped?.email).toBe("primary@example.com");
  });

  it("falls back to the first address when the primary id does not resolve", () => {
    const mapped = userFromClerkEvent(
      event("user.created", {
        emails: [{ id: "idn_1", email_address: "only@example.com" }],
        primary: "idn_missing",
      }),
    );
    expect(mapped?.email).toBe("only@example.com");
  });

  it("stores a null name rather than an empty string", () => {
    const mapped = userFromClerkEvent(
      event("user.created", { first_name: null, last_name: null }),
    );
    expect(mapped?.name).toBeNull();
  });

  it("handles a single given name without a trailing space", () => {
    const mapped = userFromClerkEvent(
      event("user.created", { first_name: "Ada", last_name: null }),
    );
    expect(mapped?.name).toBe("Ada");
  });

  it("ignores an account with no usable email instead of guessing", () => {
    expect(userFromClerkEvent(event("user.created", { emails: [] }))).toBeNull();
  });

  it("ignores events we do not mirror — including deletion", () => {
    // Deleting cascades to submissions and reports; that needs a product
    // decision, so the event is acknowledged and never acted on here.
    expect(userFromClerkEvent(event("user.deleted"))).toBeNull();
    expect(userFromClerkEvent(event("session.created"))).toBeNull();
    expect(userFromClerkEvent(event("organization.created"))).toBeNull();
  });
});
