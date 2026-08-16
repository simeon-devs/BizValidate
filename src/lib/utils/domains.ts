// Turns whatever a user pastes — a full URL, "www.example.com/reports",
// "Example.COM" — into the bare hostname Tavily's include_domains /
// exclude_domains parameters expect. Returns null for anything that isn't a
// plausible public hostname, so the save action can reject it before it is
// ever stored or passed to an external API.
//
// This is the only place raw user input is shaped; the enricher reads
// already-normalized values from the database and never touches this.

const MAX_DOMAIN_LENGTH = 253;
// One or more dot-separated labels, each 1-63 chars of letters, digits or
// hyphens (no leading/trailing hyphen), ending in an alphabetic TLD of 2+.
const HOSTNAME_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function normalizeDomain(input: string): string | null {
  let value = input.trim().toLowerCase();
  if (!value) return null;

  // Accept a pasted URL: pull the hostname out of it. Prepend a scheme when
  // absent so URL() parses "example.com/path" instead of rejecting it.
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//.test(value)
      ? value
      : `https://${value}`;
    value = new URL(withScheme).hostname;
  } catch {
    return null;
  }

  value = value.replace(/^www\./, "").replace(/\.$/, "");

  if (value.length === 0 || value.length > MAX_DOMAIN_LENGTH) return null;
  if (!HOSTNAME_PATTERN.test(value)) return null;

  return value;
}
