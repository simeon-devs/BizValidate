import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildQueries, enrichRegionalContext } from "./enricher";
import { cacheGet } from "@/lib/cache";
import type { ExtractedFacts } from "./types";

// Enrichment is the evidence layer: these tests pin the behaviour the report's
// citations depend on — one targeted search per evidence-able metric, URLs
// that survive, uncitable results dropped, caps and dedupe, and every failure
// degrading rather than breaking the pipeline.

vi.mock("@/lib/cache", () => ({
  cacheGet: vi.fn(async () => null),
  cacheSet: vi.fn(async () => undefined),
}));

const FACTS = {
  industry: "B2B Logistics · Last-mile Delivery",
  region: "Uganda",
  competitors: [],
} as unknown as ExtractedFacts;

const WITH_COMPETITORS = {
  ...FACTS,
  competitors: ["SafeBoda", "Sendy", "DHL", "FedEx"],
} as unknown as ExtractedFacts;

type Body = {
  query: string;
  search_depth: string;
  topic: string;
  country?: string;
  exclude_domains: string[];
  include_domains?: string[];
};

function tavilyResponse(body: unknown) {
  return { ok: true, json: async () => body } as Response;
}

function bodies(): Body[] {
  return vi.mocked(fetch).mock.calls.map((c) => JSON.parse(String(c[1]?.body)) as Body);
}

// Mocks Tavily: the handler receives the parsed body and returns results.
function mockTavily(handler: (body: Body) => unknown) {
  vi.mocked(fetch).mockImplementation(async (_url, init) => {
    const body = JSON.parse(String(init?.body)) as Body;
    const out = handler(body);
    return out === null ? ({ ok: false } as Response) : tavilyResponse(out);
  });
}

const okEverywhere = () =>
  mockTavily((b) => ({
    answer: `answer for ${b.query}`,
    results: [{ title: `r:${b.query.slice(0, 12)}`, url: `https://x.example/${encodeURIComponent(b.query)}`, content: "c" }],
  }));

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  // clearAllMocks keeps implementations; a cache stub set by one test must
  // not leak into the next, so reset it to a miss explicitly.
  vi.mocked(cacheGet).mockReset().mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("buildQueries", () => {
  it("plans one query per evidence-able metric, using the specific industry segment", () => {
    const q = buildQueries(WITH_COMPETITORS, "Uganda");
    expect(q.map((x) => x.topic)).toEqual(["market", "competitive", "gotomarket", "financials", "scalability"]);
    expect(q[0].query).toBe("Last-mile Delivery market size, competition and business climate in Uganda");
    // Competitors verbatim, capped at three
    expect(q[1].query).toBe("SafeBoda, Sendy, DHL Last-mile Delivery competitors in Uganda");
    // Benchmarks are global — no region on the financials query
    expect(q[3].query).not.toContain("Uganda");
  });

  it("skips the competitive query when no competitors were named", () => {
    const topics = buildQueries(FACTS, "Uganda").map((x) => x.topic);
    expect(topics).toEqual(["market", "gotomarket", "financials", "scalability"]);
  });
});

describe("enrichRegionalContext", () => {
  it("runs one Tavily call per planned query, advanced depth, with the country boost", async () => {
    okEverywhere();
    await enrichRegionalContext(FACTS, "Uganda");

    const b = bodies();
    expect(b).toHaveLength(4);
    expect(b.every((x) => x.search_depth === "advanced")).toBe(true);
    expect(b.every((x) => x.topic === "general")).toBe(true);
    expect(b.every((x) => x.country === "uganda")).toBe(true);
    expect(b.every((x) => x.exclude_domains.includes("instagram.com"))).toBe(true);
    expect(b.every((x) => x.exclude_domains.includes("scribd.com"))).toBe(true);
  });

  it("sends no country boost for a region that is not one nation", async () => {
    okEverywhere();
    await enrichRegionalContext(FACTS, "West Africa");
    expect(bodies().every((x) => !("country" in x))).toBe(true);
  });

  it("tags every source with its topic, numbers ids contiguously, and records the queries", async () => {
    okEverywhere();
    const result = await enrichRegionalContext(WITH_COMPETITORS, "Uganda");

    expect(result).not.toBeNull();
    expect(result!.sources.map((s) => s.topic)).toEqual([
      "market", "competitive", "gotomarket", "financials", "scalability",
    ]);
    expect(result!.sources.map((s) => s.id)).toEqual([1, 2, 3, 4, 5]);
    expect(result!.queries).toHaveLength(5);
    expect(result!.summary.startsWith("answer for Last-mile Delivery market size")).toBe(true);
    expect(result!.summary).toContain("[S5]");
  });

  it("caps each topic at three sources and the whole set at twelve, deduped by URL", async () => {
    mockTavily((b) => ({
      answer: "a",
      results: Array.from({ length: 5 }, (_, i) => ({
        title: `${b.query.slice(0, 6)} ${i}`,
        // The first result of every topic is the same URL: it must appear once.
        url: i === 0 ? "https://shared.example/one" : `https://x.example/${encodeURIComponent(b.query)}/${i}`,
        content: "c",
      })),
    }));

    const result = await enrichRegionalContext(WITH_COMPETITORS, "Uganda");
    const urls = result!.sources.map((s) => s.url);

    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.filter((u) => u === "https://shared.example/one")).toHaveLength(1);
    for (const topic of ["market", "competitive", "gotomarket", "financials", "scalability"]) {
      expect(result!.sources.filter((s) => s.topic === topic).length).toBeLessThanOrEqual(3);
    }
    expect(result!.sources.length).toBeLessThanOrEqual(12);
    expect(result!.sources.map((s) => s.id)).toEqual(result!.sources.map((_, i) => i + 1));
  });

  it("drops results that have no usable URL", async () => {
    mockTavily(() => ({
      answer: "Context.",
      results: [
        { title: "No link", content: "Uncitable." },
        { title: "Bad scheme", url: "ftp://x.example/f", content: "Uncitable." },
        { title: "Good", url: "https://c.example/r", content: "Citable." },
      ],
    }));

    const result = await enrichRegionalContext(FACTS, "Uganda");
    // Same URL from every topic collapses to one citable source.
    expect(result!.sources).toHaveLength(1);
    expect(result!.sources[0].url).toBe("https://c.example/r");
  });

  it("keeps the other topics when one search fails, and returns null only when all do", async () => {
    mockTavily((b) => (b.query.includes("gross margin") ? null : {
      answer: "a",
      results: [{ title: "t", url: `https://x.example/${encodeURIComponent(b.query)}`, content: "c" }],
    }));
    const partial = await enrichRegionalContext(FACTS, "Uganda");
    expect(partial!.sources.map((s) => s.topic)).toEqual(["market", "gotomarket", "scalability"]);

    vi.clearAllMocks();
    mockTavily(() => null);
    await expect(enrichRegionalContext(FACTS, "Uganda")).resolves.toBeNull();
  });

  it("returns null when the region is unknown, without calling Tavily", async () => {
    const result = await enrichRegionalContext({ ...FACTS, region: "not stated" } as ExtractedFacts);
    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("degrades to null when the network fails", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));
    await expect(enrichRegionalContext(FACTS, "Uganda")).resolves.toBeNull();
  });

  describe("cache", () => {
    it("uses one versioned key per query, scoped to the user when preferences are set", async () => {
      okEverywhere();

      await enrichRegionalContext(FACTS, "Uganda", {});
      await enrichRegionalContext(FACTS, "Uganda", { cacheScope: "user_abc" });

      const keys = vi.mocked(cacheGet).mock.calls.map((c) => String(c[0]));
      expect(keys).toHaveLength(8); // 4 queries × 2 runs
      expect(keys.slice(0, 4).every((k) => /^region-ctx-v5:global:(market|gotomarket|financials|scalability):[0-9a-f]{16}$/.test(k))).toBe(true);
      expect(keys.slice(4).every((k) => k.startsWith("region-ctx-v5:user-abc:"))).toBe(true);
    });

    it("serves a topic from cache without refetching it, and still fetches the others", async () => {
      vi.mocked(cacheGet).mockImplementation(async (key) =>
        String(key).includes(":market:")
          ? JSON.stringify({
              answer: "cached market answer",
              sources: [{ id: 0, title: "Cached", url: "https://cached.example/m", snippet: "s" }],
            })
          : null,
      );
      okEverywhere();

      const result = await enrichRegionalContext(FACTS, "Uganda");

      expect(bodies().map((b) => b.query)).not.toContain(
        "Last-mile Delivery market size, competition and business climate in Uganda",
      );
      expect(bodies()).toHaveLength(3);
      expect(result!.sources[0]).toMatchObject({ id: 1, url: "https://cached.example/m", topic: "market" });
      expect(result!.summary.startsWith("cached market answer")).toBe(true);
    });
  });

  describe("blocked domains", () => {
    it("sends the user's blocked domains on every query", async () => {
      okEverywhere();
      await enrichRegionalContext(FACTS, "Uganda", { blockedDomains: ["blocked.example"] });
      expect(bodies().every((b) => b.exclude_domains.includes("blocked.example"))).toBe(true);
    });

    it("drops a blocked domain from any topic and renumbers the rest", async () => {
      mockTavily((b) => ({
        answer: "a",
        results: [
          { title: "Blocked", url: `https://news.blocked.example/${encodeURIComponent(b.query)}`, content: "x" },
          { title: "Kept", url: `https://ok.example/${encodeURIComponent(b.query)}`, content: "y" },
        ],
      }));

      const result = await enrichRegionalContext(FACTS, "Uganda", { blockedDomains: ["blocked.example"] });

      expect(result!.sources.every((s) => s.url.startsWith("https://ok.example/"))).toBe(true);
      expect(result!.sources.map((s) => s.id)).toEqual([1, 2, 3, 4]);
      expect(result!.summary).not.toContain("blocked.example");
    });

    it("filters a blocked domain out of a CACHE HIT written before the block existed", async () => {
      vi.mocked(cacheGet).mockImplementation(async () =>
        JSON.stringify({
          answer: "old",
          sources: [
            { id: 0, title: "Stale", url: "https://stale.example/p", snippet: "s" },
            { id: 0, title: "Fine", url: "https://fine.example/p", snippet: "ok" },
          ],
        }),
      );

      const result = await enrichRegionalContext(FACTS, "Uganda", { blockedDomains: ["stale.example"] });

      expect(fetch).not.toHaveBeenCalled(); // every topic served from cache
      expect(result!.sources.every((s) => !s.url.includes("stale.example"))).toBe(true);
      expect(result!.sources.length).toBeGreaterThan(0);
    });
  });

  describe("favorite domains", () => {
    it("adds exactly one favorites-scoped call, on the market query, at basic depth", async () => {
      okEverywhere();
      await enrichRegionalContext(FACTS, "Uganda", { favoriteDomains: ["trusted.example"] });

      const b = bodies();
      expect(b).toHaveLength(5);
      const scoped = b.filter((x) => x.include_domains);
      expect(scoped).toHaveLength(1);
      expect(scoped[0].include_domains).toEqual(["trusted.example"]);
      expect(scoped[0].search_depth).toBe("basic");
      expect(scoped[0].query).toContain("market size");
      // No broad query is ever whitelisted.
      expect(b.filter((x) => !x.include_domains).every((x) => x.search_depth === "advanced")).toBe(true);
    });

    it("places favorites first (up to the reserved slots) and never crowds out the topics", async () => {
      mockTavily((b) =>
        b.include_domains
          ? { results: [1, 2, 3].map((i) => ({ title: `Fav ${i}`, url: `https://trusted.example/${i}`, content: "f" })) }
          : { answer: "a", results: [{ title: "t", url: `https://x.example/${encodeURIComponent(b.query)}`, content: "c" }] },
      );

      const result = await enrichRegionalContext(FACTS, "Uganda", { favoriteDomains: ["trusted.example"] });
      const urls = result!.sources.map((s) => s.url);

      expect(urls.slice(0, 2)).toEqual(["https://trusted.example/1", "https://trusted.example/2"]);
      expect(urls.filter((u) => u.startsWith("https://trusted.example/"))).toHaveLength(2);
      expect(result!.sources.map((s) => s.topic).slice(2)).toEqual(["market", "gotomarket", "financials", "scalability"]);
    });

    it("keeps everything else when the favorites call fails", async () => {
      mockTavily((b) => (b.include_domains ? null : { answer: "a", results: [{ title: "t", url: `https://x.example/${encodeURIComponent(b.query)}`, content: "c" }] }));
      const result = await enrichRegionalContext(FACTS, "Uganda", { favoriteDomains: ["down.example"] });
      expect(result!.sources).toHaveLength(4);
    });
  });
});
