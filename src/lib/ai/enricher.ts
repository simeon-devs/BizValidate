import { env } from "@/lib/env";
import { cacheGet, cacheSet } from "@/lib/cache";
import type { ExtractedFacts } from "./types";

const TAVILY_ENDPOINT = "https://api.tavily.com/search";
const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24h per region (BLUEPRINT §8 step 3)

interface TavilyResult {
  title: string;
  content: string;
}

interface TavilyResponse {
  answer?: string;
  results: TavilyResult[];
}

// Fetches live regional market context via Tavily, cached per
// region+industry for 24h in Redis. Enrichment is additive: if Tavily is
// unavailable or unconfigured, scoring proceeds without regional context
// rather than failing the pipeline.
export async function enrichRegionalContext(
  facts: ExtractedFacts,
  targetRegion?: string,
): Promise<string | null> {
  const region = targetRegion?.trim() || facts.region;
  if (!region || region === "not stated") return null;

  const cacheKey = `region-context:${normalize(region)}:${normalize(facts.industry)}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(TAVILY_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.TAVILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `${facts.industry} market size, competition and business climate in ${region}`,
        search_depth: "basic",
        include_answer: true,
        max_results: 5,
      }),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as TavilyResponse;
    const context = [
      data.answer,
      ...data.results.slice(0, 5).map((r) => `- ${r.title}: ${r.content}`),
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 4000);

    if (!context) return null;
    await cacheSet(cacheKey, context, CACHE_TTL_SECONDS);
    return context;
  } catch {
    return null;
  }
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
}
