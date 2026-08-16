import { env } from "@/lib/env";
import { cacheGet, cacheSet } from "@/lib/cache";
import type { EnrichmentSource, RegionalContext } from "@/types/report";
import type { ExtractedFacts } from "./types";

const TAVILY_ENDPOINT = "https://api.tavily.com/search";
const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24h per region (BLUEPRINT §8 step 3)
const MAX_SOURCES = 5;

// A market-research citation should be able to survive an investor clicking
// it. Social and video platforms answer a different kind of question and
// undercut the report's credibility even when the scorer declines to cite
// them, because the source list is shown to the reader either way.
const EXCLUDED_DOMAINS = [
  "instagram.com",
  "facebook.com",
  "tiktok.com",
  "x.com",
  "twitter.com",
  "pinterest.com",
  "youtube.com",
];
const MAX_SUMMARY_CHARS = 4000;
const MAX_SNIPPET_CHARS = 600;

interface TavilyResult {
  title?: string;
  content?: string;
  url?: string;
}

interface TavilyResponse {
  answer?: string;
  results?: TavilyResult[];
}

// Tavily caps exclude_domains at 150 entries; leave room for the built-in
// exclusions and never send a request the API will reject outright.
const MAX_BLOCKED_DOMAINS = 140;

export interface EnrichmentOptions {
  // Domains this user has said the AI must never cite. Enforced twice: sent
  // to Tavily so they are never fetched, and filtered again on every return
  // path — including cache hits — so a block takes effect on the very next
  // read regardless of what was cached before it was added.
  blockedDomains?: string[];
}

// Fetches live regional market context via Tavily, cached per
// region+industry for 24h in Redis. Enrichment is additive: if Tavily is
// unavailable or unconfigured, scoring proceeds without regional context
// rather than failing the pipeline.
//
// Results keep their URLs so every regionally-informed claim in a report can
// be traced back to the page it came from.
export async function enrichRegionalContext(
  facts: ExtractedFacts,
  targetRegion?: string,
  options: EnrichmentOptions = {},
): Promise<RegionalContext | null> {
  const region = targetRegion?.trim() || facts.region;
  if (!region || region === "not stated") return null;

  const blocked = options.blockedDomains ?? [];
  const query = buildQuery(facts.industry, region);
  // Versioned key: bumped whenever the stored shape or the retrieval rules
  // change, so entries fetched under the old rules are not served. Old keys
  // simply expire. v2 = JSON shape, v3 = social domains excluded.
  const cacheKey = `region-ctx-v3:${normalize(region)}:${normalize(facts.industry)}`;

  const cached = await cacheGet(cacheKey);
  if (cached) {
    const parsed = parseCached(cached);
    // The cache is shared, so a hit may predate this user's block list.
    // Filter on read: this is the layer that makes "never" actually true.
    if (parsed) return applyBlocklist(parsed, blocked);
  }

  try {
    const res = await fetch(TAVILY_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.TAVILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        search_depth: "basic",
        include_answer: true,
        max_results: MAX_SOURCES,
        exclude_domains: [
          ...EXCLUDED_DOMAINS,
          ...blocked.slice(0, MAX_BLOCKED_DOMAINS),
        ],
      }),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as TavilyResponse;
    const sources = toSources(data.results ?? []);
    const summary = buildSummary(data.answer, sources);
    if (!summary) return null;

    const context: RegionalContext = {
      summary,
      sources,
      query,
      fetchedAt: new Date().toISOString(),
    };
    // Cache the unfiltered result: the shared entry must stay useful to
    // users with different (or no) block lists. Each reader filters itself.
    await cacheSet(cacheKey, JSON.stringify(context), CACHE_TTL_SECONDS);
    return applyBlocklist(context, blocked);
  } catch {
    return null;
  }
}

// Drops any source whose hostname is, or is a subdomain of, a blocked domain,
// then renumbers ids and rebuilds the summary so [S1..N] stay contiguous and
// the prompt never references a source that was removed.
function applyBlocklist(
  context: RegionalContext,
  blocked: string[],
): RegionalContext {
  if (blocked.length === 0) return context;
  const kept = context.sources.filter((s) => !isBlockedUrl(s.url, blocked));
  if (kept.length === context.sources.length) return context;

  const sources = kept.map((s, index) => ({ ...s, id: index + 1 }));
  return {
    ...context,
    sources,
    summary: buildSummary(extractAnswer(context.summary), sources),
  };
}

function isBlockedUrl(url: string, blocked: string[]): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return true; // an unparseable URL is not a citation we want to keep
  }
  return blocked.some((d) => host === d || host.endsWith(`.${d}`));
}

// The stored summary is Tavily's answer followed by one "[Sn] title: snippet"
// line per source. Recover just the answer so the summary can be rebuilt
// against a filtered source list.
function extractAnswer(summary: string): string | undefined {
  const firstSourceLine = summary.search(/^\[S\d+\] /m);
  const answer = (firstSourceLine === -1 ? summary : summary.slice(0, firstSourceLine)).trim();
  return answer || undefined;
}

function buildQuery(industry: string, region: string): string {
  return `${industry} market size, competition and business climate in ${region}`;
}

// Only results with a usable URL become sources — an uncitable result would
// undermine the point of collecting them.
function toSources(results: TavilyResult[]): EnrichmentSource[] {
  return results
    .filter((r): r is TavilyResult & { url: string } => isHttpUrl(r.url))
    .slice(0, MAX_SOURCES)
    .map((r, index) => ({
      id: index + 1,
      title: r.title?.trim() || r.url,
      url: r.url,
      snippet: (r.content ?? "").trim().slice(0, MAX_SNIPPET_CHARS),
    }));
}

function buildSummary(
  answer: string | undefined,
  sources: EnrichmentSource[],
): string {
  return [
    answer?.trim(),
    ...sources.map((s) => `[S${s.id}] ${s.title}: ${s.snippet}`),
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, MAX_SUMMARY_CHARS);
}

function parseCached(raw: string): RegionalContext | null {
  try {
    const value = JSON.parse(raw) as Partial<RegionalContext>;
    if (typeof value.summary !== "string" || !Array.isArray(value.sources)) {
      return null;
    }
    return {
      summary: value.summary,
      sources: value.sources,
      query: value.query ?? "",
      fetchedAt: value.fetchedAt ?? "",
    };
  } catch {
    return null;
  }
}

function isHttpUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
}
