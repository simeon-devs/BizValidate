import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import { cacheGet, cacheSet } from "@/lib/cache";
import type {
  EnrichmentSource,
  RegionalContext,
  SourceTopic,
} from "@/types/report";
import type { ExtractedFacts } from "./types";
import { countryForRegion } from "./countries";

const TAVILY_ENDPOINT = "https://api.tavily.com/search";
const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24h per query (BLUEPRINT §8 step 3)

// One targeted search per evidence-able metric. A single generic query can
// only ever support the Market metric; competitors, channels, margins and
// expansion each need their own question asked.
const PER_TOPIC_CAP = 3;
const MAX_SOURCES = 12;
const MAX_COMPETITORS_IN_QUERY = 3;
const TOPIC_ORDER: SourceTopic[] = [
  "market",
  "competitive",
  "gotomarket",
  "financials",
  "scalability",
];

// A market-research citation should be able to survive an investor clicking
// it. Social platforms and user-upload hosts answer a different kind of
// question and undercut the report's credibility even when the scorer
// declines to cite them, because the source list is shown to the reader
// either way.
const EXCLUDED_DOMAINS = [
  "instagram.com",
  "facebook.com",
  "tiktok.com",
  "x.com",
  "twitter.com",
  "pinterest.com",
  "youtube.com",
  "linkedin.com",
  "scribd.com",
];
const MAX_SUMMARY_CHARS = 5000;
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
// Tavily caps include_domains at 300; well under it is plenty for a personal list.
const MAX_FAVORITE_DOMAINS = 50;
// Of MAX_SOURCES, how many slots favorites may claim ahead of everything
// else. Favorites surface first when relevant but can never crowd out the
// system's own findings.
const FAVORITE_SLOTS = 2;

export interface EnrichmentOptions {
  // Domains this user has said the AI must never cite. Enforced twice: sent
  // to Tavily so they are never fetched, and filtered again on every return
  // path — including cache hits — so a block takes effect on the very next
  // read regardless of what was cached before it was added.
  blockedDomains?: string[];
  // Domains this user trusts. Searched in a second call scoped to them and
  // merged with the market search — never a substitute for it. Tavily's
  // include_domains is a strict whitelist, so passing favorites on the main
  // queries would silently cap what the system can find on its own.
  favoriteDomains?: string[];
  // Scopes the cache for users who have preferences, so their merged result
  // is not served to (or from) users with different lists. Users without
  // preferences share the global entries as before.
  cacheScope?: string;
}

export interface PlannedQuery {
  topic: SourceTopic;
  query: string;
}

// The extractor labels industry as "Broad · Specific" ("B2B Logistics ·
// Last-mile Delivery"). The specific segment finds sector material; the
// broad one mostly finds noise.
function specificIndustry(industry: string): string {
  const segments = industry
    .split(/\s*[·|/]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  return segments[segments.length - 1] ?? industry.trim();
}

export function buildQueries(
  facts: Pick<ExtractedFacts, "industry" | "competitors">,
  region: string,
): PlannedQuery[] {
  const specific = specificIndustry(facts.industry);
  const competitors = (facts.competitors ?? [])
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, MAX_COMPETITORS_IN_QUERY);

  const queries: PlannedQuery[] = [
    {
      topic: "market",
      query: `${specific} market size, competition and business climate in ${region}`,
    },
  ];
  if (competitors.length > 0) {
    queries.push({
      topic: "competitive",
      query: `${competitors.join(", ")} ${specific} competitors in ${region}`,
    });
  }
  queries.push(
    {
      topic: "gotomarket",
      query: `${specific} customer acquisition channels, distribution and CAC in ${region}`,
    },
    {
      topic: "financials",
      query: `${specific} gross margin, pricing and unit economics benchmarks`,
    },
    {
      topic: "scalability",
      query: `${specific} expansion regulation, logistics and payments in ${region}`,
    },
  );
  return queries;
}

// Fetches live regional market context via Tavily — one targeted query per
// evidence-able metric, each cached 24h in Redis. Enrichment is additive: if
// Tavily is unavailable or unconfigured, scoring proceeds without regional
// context rather than failing the pipeline; if one topic fails, the others
// still count.
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
  const favorites = (options.favoriteDomains ?? []).slice(0, MAX_FAVORITE_DOMAINS);
  const excludeDomains = [...EXCLUDED_DOMAINS, ...blocked.slice(0, MAX_BLOCKED_DOMAINS)];
  const country = countryForRegion(region);
  const scope = options.cacheScope ? normalize(options.cacheScope) : "global";
  const planned = buildQueries(facts, region);

  try {
    const topics = await Promise.all(
      planned.map((q) => searchTopic(q, { scope, excludeDomains, country })),
    );
    // Favorites ride alongside the market query only: one extra call, as
    // before, never a restriction on the broad searches.
    const favored =
      favorites.length > 0
        ? await searchTavily({
            query: planned[0].query,
            excludeDomains,
            includeDomains: favorites,
            country,
          }).catch(() => null)
        : null;

    if (topics.every((t) => t === null)) return null;

    const sources = assembleSources(topics, favored?.results ?? []);
    const answer = topics.find((t) => t?.answer)?.answer;
    const summary = buildSummary(answer, sources);
    if (!summary) return null;

    const context: RegionalContext = {
      summary,
      sources,
      query: planned.map((q) => q.query).join(" | "),
      queries: planned.map((q) => q.query),
      fetchedAt: new Date().toISOString(),
    };
    return applyBlocklist(context, blocked);
  } catch {
    return null;
  }
}

interface TopicResult {
  topic: SourceTopic;
  answer?: string;
  sources: EnrichmentSource[]; // unnumbered (id 0) until assembled
}

// One topic's search, served from its own cache entry when possible. Cached
// unfiltered: the shared entry must stay useful to users with different (or
// no) block lists; each reader filters itself on the way out.
async function searchTopic(
  planned: PlannedQuery,
  ctx: { scope: string; excludeDomains: string[]; country: string | null },
): Promise<TopicResult | null> {
  // Versioned key: bumped whenever the stored shape or the retrieval rules
  // change, so entries fetched under the old rules are not served. Old keys
  // simply expire. v5 = one entry per targeted query, topic-tagged.
  const cacheKey = `region-ctx-v5:${ctx.scope}:${planned.topic}:${hashQuery(planned.query)}`;

  const cached = await cacheGet(cacheKey);
  if (cached) {
    const parsed = parseCachedTopic(cached, planned.topic);
    if (parsed) return parsed;
  }

  const response = await searchTavily({
    query: planned.query,
    excludeDomains: ctx.excludeDomains,
    country: ctx.country,
    depth: "advanced",
  }).catch(() => null);
  if (!response) return null;

  const result: TopicResult = {
    topic: planned.topic,
    answer: response.answer?.trim() || undefined,
    sources: toSources(response.results ?? [], planned.topic),
  };
  await cacheSet(cacheKey, JSON.stringify(result), CACHE_TTL_SECONDS);
  return result;
}

interface TavilyQuery {
  query: string;
  excludeDomains: string[];
  includeDomains?: string[];
  // Tavily boosts (does not restrict) results from this nation. Only sent
  // when the region resolved to one; a wrong boost is worse than none.
  country?: string | null;
  depth?: "basic" | "advanced";
}

async function searchTavily(input: TavilyQuery): Promise<TavilyResponse | null> {
  const res = await fetch(TAVILY_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.TAVILY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: input.query,
      search_depth: input.depth ?? "basic",
      topic: "general", // required for `country` to apply
      include_answer: true,
      max_results: PER_TOPIC_CAP + 2, // headroom for dedupe and url filtering
      exclude_domains: input.excludeDomains,
      ...(input.includeDomains ? { include_domains: input.includeDomains } : {}),
      ...(input.country ? { country: input.country } : {}),
    }),
  });
  if (!res.ok) return null;
  return (await res.json()) as TavilyResponse;
}

// Favorites lead (up to FAVORITE_SLOTS), then topics are filled round-robin
// — one source per topic per pass, up to the per-topic cap — until
// MAX_SOURCES. Round-robin rather than topic-by-topic so a later topic can
// never be starved by earlier ones filling every slot. Deduped by URL; ids
// are assigned in final order so [S1..N] in the prompt always match what the
// reader sees. A favorite that finds nothing costs no slot.
function assembleSources(
  topics: (TopicResult | null)[],
  favored: TavilyResult[],
): EnrichmentSource[] {
  const seen = new Set<string>();
  const ordered: Omit<EnrichmentSource, "id">[] = [];
  const take = (s: Omit<EnrichmentSource, "id">) => {
    if (ordered.length >= MAX_SOURCES || seen.has(s.url)) return false;
    seen.add(s.url);
    ordered.push(s);
    return true;
  };

  let favoriteSlots = FAVORITE_SLOTS;
  for (const s of toSources(favored, "market")) {
    if (favoriteSlots === 0) break;
    if (take(s)) favoriteSlots -= 1;
  }

  const queues = TOPIC_ORDER.map((topic) => ({
    topic,
    pending: [...(topics.find((t) => t?.topic === topic)?.sources ?? [])],
    taken: 0,
  }));
  let progressed = true;
  while (progressed && ordered.length < MAX_SOURCES) {
    progressed = false;
    for (const q of queues) {
      if (q.taken >= PER_TOPIC_CAP) continue;
      let next = q.pending.shift();
      while (next && !take(next)) next = q.pending.shift(); // skip dupes
      if (next) {
        q.taken += 1;
        progressed = true;
      }
      if (ordered.length >= MAX_SOURCES) break;
    }
  }
  return ordered.map((s, index) => ({ ...s, id: index + 1 }));
}

// Only results with a usable URL become sources — an uncitable result would
// undermine the point of collecting them.
function toSources(results: TavilyResult[], topic: SourceTopic): EnrichmentSource[] {
  return results
    .filter((r): r is TavilyResult & { url: string } => isHttpUrl(r.url))
    .map((r) => ({
      id: 0,
      title: r.title?.trim() || r.url,
      url: r.url,
      snippet: (r.content ?? "").trim().slice(0, MAX_SNIPPET_CHARS),
      topic,
    }));
}

// Drops any source whose hostname is, or is a subdomain of, a blocked domain,
// then renumbers ids and rebuilds the summary so [S1..N] stay contiguous and
// the prompt never references a source that was removed.
function applyBlocklist(context: RegionalContext, blocked: string[]): RegionalContext {
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

function buildSummary(answer: string | undefined, sources: EnrichmentSource[]): string {
  return [answer?.trim(), ...sources.map((s) => `[S${s.id}] ${s.title}: ${s.snippet}`)]
    .filter(Boolean)
    .join("\n")
    .slice(0, MAX_SUMMARY_CHARS);
}

function parseCachedTopic(raw: string, topic: SourceTopic): TopicResult | null {
  try {
    const value = JSON.parse(raw) as Partial<TopicResult>;
    if (!Array.isArray(value.sources)) return null;
    return {
      topic,
      answer: typeof value.answer === "string" ? value.answer : undefined,
      sources: value.sources.map((s) => ({ ...s, topic })),
    };
  } catch {
    return null;
  }
}

function hashQuery(query: string): string {
  return createHash("sha1").update(query.toLowerCase().trim()).digest("hex").slice(0, 16);
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
