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

  it("degrades to null when the lookup fails", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));
    await expect(enrichRegionalContext(FACTS)).resolves.toBeNull();
  });

  it("degrades to null on a non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    await expect(enrichRegionalContext(FACTS)).resolves.toBeNull();
  });
});
