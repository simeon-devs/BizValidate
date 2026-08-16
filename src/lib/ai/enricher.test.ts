import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { enrichRegionalContext } from "./enricher";
import type { ExtractedFacts } from "./types";

// Enrichment is the evidence layer: these tests pin the behaviour the report's
// citations depend on — URLs survive, uncitable results are dropped, and a
// failed lookup degrades to null instead of breaking the pipeline.

vi.mock("@/lib/cache", () => ({
  cacheGet: vi.fn(async () => null),
  cacheSet: vi.fn(async () => undefined),
}));

const FACTS = {
  industry: "restaurant software",
  region: "Nigeria",
} as unknown as ExtractedFacts;

function tavilyResponse(body: unknown) {
  return { ok: true, json: async () => body } as Response;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("enrichRegionalContext", () => {
  it("keeps source URLs and numbers them for citation", async () => {
    vi.mocked(fetch).mockResolvedValue(
      tavilyResponse({
        answer: "The Nigerian restaurant software market is growing.",
        results: [
          { title: "Nigeria Foodservice 2026", url: "https://a.example/r1", content: "Market grew 18%." },
          { title: "Lagos Restaurant Tech", url: "https://b.example/r2", content: "Adoption is early." },
        ],
      }),
    );

    const result = await enrichRegionalContext(FACTS);

    expect(result).not.toBeNull();
    expect(result!.sources).toHaveLength(2);
    expect(result!.sources[0]).toMatchObject({
      id: 1,
      title: "Nigeria Foodservice 2026",
      url: "https://a.example/r1",
    });
    expect(result!.sources[1].id).toBe(2);
    // Summary carries [S1]/[S2] markers so the scorer can reference them.
    expect(result!.summary).toContain("[S1]");
    expect(result!.summary).toContain("[S2]");
    expect(result!.query).toContain("Nigeria");
  });

  it("asks Tavily to exclude social platforms", async () => {
    vi.mocked(fetch).mockResolvedValue(
      tavilyResponse({ answer: "a", results: [{ title: "t", url: "https://a.example/r", content: "c" }] }),
    );

    await enrichRegionalContext(FACTS);

    const body = JSON.parse(
      String(vi.mocked(fetch).mock.calls[0][1]?.body),
    ) as { exclude_domains: string[] };
    expect(body.exclude_domains).toContain("instagram.com");
    expect(body.exclude_domains).toContain("tiktok.com");
  });

  it("drops results that have no usable URL", async () => {
    vi.mocked(fetch).mockResolvedValue(
      tavilyResponse({
        answer: "Context.",
        results: [
          { title: "No link", content: "Uncitable." },
          { title: "Bad scheme", url: "ftp://x.example/f", content: "Uncitable." },
          { title: "Good", url: "https://c.example/r", content: "Citable." },
        ],
      }),
    );

    const result = await enrichRegionalContext(FACTS);

    expect(result!.sources).toHaveLength(1);
    expect(result!.sources[0].url).toBe("https://c.example/r");
    expect(result!.sources[0].id).toBe(1);
  });

  it("returns null when the region is unknown, without calling Tavily", async () => {
    const result = await enrichRegionalContext({
      ...FACTS,
      region: "not stated",
    } as ExtractedFacts);

    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  describe("blocked domains", () => {
    it("sends the user's blocked domains to Tavily alongside the built-in exclusions", async () => {
      vi.mocked(fetch).mockResolvedValue(
        tavilyResponse({ answer: "a", results: [{ title: "t", url: "https://ok.example/r", content: "c" }] }),
      );

      await enrichRegionalContext(FACTS, undefined, {
        blockedDomains: ["blocked.example"],
      });

      const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body)) as {
        exclude_domains: string[];
      };
      expect(body.exclude_domains).toContain("blocked.example");
      expect(body.exclude_domains).toContain("instagram.com");
    });

    it("drops a blocked domain that Tavily returns anyway and renumbers the rest", async () => {
      vi.mocked(fetch).mockResolvedValue(
        tavilyResponse({
          answer: "Context.",
          results: [
            { title: "Blocked", url: "https://blocked.example/r1", content: "x" },
            { title: "Kept A", url: "https://a.example/r2", content: "y" },
            { title: "Sub of blocked", url: "https://news.blocked.example/r3", content: "z" },
            { title: "Kept B", url: "https://b.example/r4", content: "w" },
          ],
        }),
      );

      const result = await enrichRegionalContext(FACTS, undefined, {
        blockedDomains: ["blocked.example"],
      });

      expect(result!.sources.map((s) => s.url)).toEqual([
        "https://a.example/r2",
        "https://b.example/r4",
      ]);
      // Ids stay contiguous so [S1..N] in the prompt never point at a gap.
      expect(result!.sources.map((s) => s.id)).toEqual([1, 2]);
      expect(result!.summary).not.toContain("blocked.example");
      expect(result!.summary).toContain("[S1] Kept A");
      expect(result!.summary).toContain("[S2] Kept B");
    });

    it("filters a blocked domain out of a CACHE HIT written before the block existed", async () => {
      // The cache is shared across users and predates any given block. This
      // is the read-time layer that makes "never cite" hold regardless of
      // what was cached when.
      const { cacheGet } = await import("@/lib/cache");
      vi.mocked(cacheGet).mockResolvedValueOnce(
        JSON.stringify({
          summary: "Answer.\n[S1] Old: stale\n[S2] Fine: ok",
          sources: [
            { id: 1, title: "Old", url: "https://stale.example/p", snippet: "stale" },
            { id: 2, title: "Fine", url: "https://fine.example/p", snippet: "ok" },
          ],
          query: "q",
          fetchedAt: "2026-01-01T00:00:00.000Z",
        }),
      );

      const result = await enrichRegionalContext(FACTS, undefined, {
        blockedDomains: ["stale.example"],
      });

      expect(fetch).not.toHaveBeenCalled(); // served from cache, not refetched
      expect(result!.sources).toHaveLength(1);
      expect(result!.sources[0]).toMatchObject({ id: 1, url: "https://fine.example/p" });
      expect(result!.summary).not.toContain("stale.example");
    });

    it("leaves results untouched for a user with no blocked domains", async () => {
      vi.mocked(fetch).mockResolvedValue(
        tavilyResponse({
          answer: "a",
          results: [{ title: "t", url: "https://a.example/r", content: "c" }],
        }),
      );

      const result = await enrichRegionalContext(FACTS, undefined, {
        blockedDomains: [],
      });

      expect(result!.sources).toHaveLength(1);
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("favorite domains", () => {
    it("makes exactly ONE Tavily call when the user has no favorites", async () => {
      // The common case must not change: no extra call, no extra credit.
      vi.mocked(fetch).mockResolvedValue(
        tavilyResponse({ answer: "a", results: [{ title: "t", url: "https://a.example/r", content: "c" }] }),
      );

      await enrichRegionalContext(FACTS, undefined, { favoriteDomains: [] });

      expect(fetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body)) as Record<string, unknown>;
      expect(body).not.toHaveProperty("include_domains");
    });

    it("runs a second favorites-scoped call and never restricts the broad search", async () => {
      vi.mocked(fetch).mockResolvedValue(
        tavilyResponse({ answer: "a", results: [{ title: "t", url: "https://a.example/r", content: "c" }] }),
      );

      await enrichRegionalContext(FACTS, undefined, {
        favoriteDomains: ["trusted.example"],
      });

      expect(fetch).toHaveBeenCalledTimes(2);
      const bodies = vi.mocked(fetch).mock.calls.map(
        (c) => JSON.parse(String(c[1]?.body)) as Record<string, unknown>,
      );
      const broad = bodies.find((b) => !("include_domains" in b));
      const scoped = bodies.find((b) => "include_domains" in b);
      // The broad query is unrestricted; only the second call is whitelisted.
      expect(broad).toBeDefined();
      expect(scoped?.include_domains).toEqual(["trusted.example"]);
    });

    it("places favorites first (up to the reserved slots), fills from broad, dedupes by URL, renumbers", async () => {
      vi.mocked(fetch).mockImplementation(async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { include_domains?: string[] };
        if (body.include_domains) {
          return tavilyResponse({
            results: [
              { title: "Fav 1", url: "https://trusted.example/1", content: "f1" },
              { title: "Fav 2", url: "https://trusted.example/2", content: "f2" },
              { title: "Fav 3", url: "https://trusted.example/3", content: "f3" }, // exceeds slots
            ],
          });
        }
        return tavilyResponse({
          answer: "Broad answer.",
          results: [
            { title: "Dup of fav 1", url: "https://trusted.example/1", content: "dup" }, // deduped
            { title: "Broad A", url: "https://a.example/1", content: "a" },
            { title: "Broad B", url: "https://b.example/1", content: "b" },
            { title: "Broad C", url: "https://c.example/1", content: "c" },
            { title: "Broad D", url: "https://d.example/1", content: "d" },
          ],
        });
      });

      const result = await enrichRegionalContext(FACTS, undefined, {
        favoriteDomains: ["trusted.example"],
      });

      expect(result!.sources.map((s) => s.url)).toEqual([
        "https://trusted.example/1", // favorite slot 1
        "https://trusted.example/2", // favorite slot 2 (slot cap = 2)
        "https://a.example/1", // broad fills the rest
        "https://b.example/1",
        "https://c.example/1",
      ]);
      expect(result!.sources.map((s) => s.id)).toEqual([1, 2, 3, 4, 5]);
      // The broad answer is what the scorer reads as context.
      expect(result!.summary.startsWith("Broad answer.")).toBe(true);
    });

    it("never returns fewer sources than the broad search alone when favorites find nothing", async () => {
      vi.mocked(fetch).mockImplementation(async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { include_domains?: string[] };
        if (body.include_domains) return tavilyResponse({ results: [] });
        return tavilyResponse({
          answer: "a",
          results: [
            { title: "A", url: "https://a.example/1", content: "a" },
            { title: "B", url: "https://b.example/1", content: "b" },
          ],
        });
      });

      const result = await enrichRegionalContext(FACTS, undefined, {
        favoriteDomains: ["irrelevant.example"],
      });

      expect(result!.sources).toHaveLength(2);
    });

    it("keeps the broad result even if the favorites-scoped call fails", async () => {
      vi.mocked(fetch).mockImplementation(async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { include_domains?: string[] };
        if (body.include_domains) return { ok: false } as Response;
        return tavilyResponse({
          answer: "a",
          results: [{ title: "A", url: "https://a.example/1", content: "a" }],
        });
      });

      const result = await enrichRegionalContext(FACTS, undefined, {
        favoriteDomains: ["down.example"],
      });

      expect(result).not.toBeNull();
      expect(result!.sources).toHaveLength(1);
    });

    it("scopes the cache key to the user when preferences are set, global otherwise", async () => {
      const { cacheGet } = await import("@/lib/cache");
      vi.mocked(fetch).mockResolvedValue(
        tavilyResponse({ answer: "a", results: [{ title: "t", url: "https://a.example/r", content: "c" }] }),
      );

      await enrichRegionalContext(FACTS, undefined, {});
      await enrichRegionalContext(FACTS, undefined, { cacheScope: "user_abc" });

      const keys = vi.mocked(cacheGet).mock.calls.map((c) => c[0]);
      expect(keys[0]).toMatch(/^region-ctx-v3:global:/);
      expect(keys[1]).toMatch(/^region-ctx-v3:user-abc:/);
    });
  });

  it("degrades to null when the lookup fails", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));
    await expect(enrichRegionalContext(FACTS)).resolves.toBeNull();
  });

  it("degrades to null on a non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    await expect(enrichRegionalContext(FACTS)).resolves.toBeNull();
  });
});
