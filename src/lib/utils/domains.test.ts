import { describe, it, expect } from "vitest";
import { normalizeDomain } from "./domains";

// This is the input boundary for everything users add to their source
// preferences. Anything it accepts is stored and forwarded to Tavily, so
// the shape it produces and the garbage it rejects both matter.
describe("normalizeDomain", () => {
  it("returns a bare lowercase hostname for a plain domain", () => {
    expect(normalizeDomain("Example.COM")).toBe("example.com");
  });

  it("extracts the hostname from a full URL", () => {
    expect(
      normalizeDomain("https://www.mordorintelligence.com/industry-reports/x?y=1#z"),
    ).toBe("mordorintelligence.com");
  });

  it("strips a leading www and a trailing dot", () => {
    expect(normalizeDomain("www.trade.gov.")).toBe("trade.gov");
  });

  it("handles a domain with a path but no scheme", () => {
    expect(normalizeDomain("brr.gov.gh/acc/consultation")).toBe("brr.gov.gh");
  });

  it("keeps multi-level and country-code domains intact", () => {
    expect(normalizeDomain("stats.gov.rw")).toBe("stats.gov.rw");
    expect(normalizeDomain("africantradechamber.org")).toBe(
      "africantradechamber.org",
    );
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeDomain("  example.com  ")).toBe("example.com");
  });

  it("rejects empty and whitespace-only input", () => {
    expect(normalizeDomain("")).toBeNull();
    expect(normalizeDomain("   ")).toBeNull();
  });

  it("rejects bare words and things that are not domains", () => {
    expect(normalizeDomain("localhost")).toBeNull();
    expect(normalizeDomain("not a domain")).toBeNull();
    expect(normalizeDomain("http://")).toBeNull();
    expect(normalizeDomain("just-text")).toBeNull();
  });

  it("rejects raw IP addresses (numeric TLD is not a public hostname)", () => {
    expect(normalizeDomain("192.168.1.1")).toBeNull();
    expect(normalizeDomain("http://10.0.0.1/admin")).toBeNull();
  });

  it("rejects labels with a leading or trailing hyphen", () => {
    expect(normalizeDomain("-bad.com")).toBeNull();
    expect(normalizeDomain("bad-.com")).toBeNull();
  });
});
