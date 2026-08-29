import { describe, it, expect } from "vitest";
import {
  ANCHOR_LEVELS,
  anchorsForBand,
  getAnchors,
  nextAnchor,
  parseAnchors,
  parseBand,
} from "./anchors";
import { METRIC_ORDER } from "@/lib/utils/format";

describe("parseAnchors", () => {
  it("resolves all five levels for every metric, including GO-TO-MARKET", () => {
    const anchors = parseAnchors();
    for (const metric of METRIC_ORDER) {
      for (const level of ANCHOR_LEVELS) {
        expect(anchors[metric]?.[level], `${metric} @ ${level}`).toBeTruthy();
      }
    }
    expect(anchors.gotomarket[20]).toMatch(/No GTM strategy/);
  });

  it("quotes the rubric verbatim", () => {
    expect(getAnchors().team[60]).toBe(
      "Balanced team with domain experience, one prior startup/industry role",
    );
  });

  it("ignores headings it does not recognise instead of throwing", () => {
    const anchors = parseAnchors("MYSTERY:\n  20 = something\nTEAM:\n  40 = a team");
    expect(anchors.team[40]).toBe("a team");
    expect(Object.keys(anchors)).toEqual(["team"]);
  });
});

describe("parseBand", () => {
  it("reads the stored band shapes", () => {
    expect(parseBand("60-80")).toEqual({ lower: 60, upper: 80 });
    expect(parseBand("0-20")).toEqual({ lower: 0, upper: 20 });
    expect(parseBand("100")).toEqual({ lower: 100, upper: 100 });
    expect(parseBand("60–80")).toEqual({ lower: 60, upper: 80 }); // en dash
  });

  it("returns null for anything malformed rather than guessing", () => {
    expect(parseBand(undefined)).toBeNull();
    expect(parseBand("")).toBeNull();
    expect(parseBand("high")).toBeNull();
    expect(parseBand("80-60")).toBeNull();
    expect(parseBand("70")).toBeNull();
  });
});

describe("anchorsForBand / nextAnchor", () => {
  it("returns the two anchors a score sits between", () => {
    const band = anchorsForBand("team", "60-80");
    expect(band?.lower?.level).toBe(60);
    expect(band?.upper?.level).toBe(80);
    expect(band?.upper?.text).toMatch(/prior exits/);
  });

  it("has no lower anchor below the lowest level", () => {
    const band = anchorsForBand("market", "0-20");
    expect(band?.lower).toBeNull();
    expect(band?.upper?.level).toBe(20);
  });

  it("points at the upper anchor as the next target, and null at the top", () => {
    expect(nextAnchor("team", "60-80")?.level).toBe(80);
    expect(nextAnchor("team", "80-100")?.level).toBe(100);
    expect(nextAnchor("team", "100")).toBeNull();
    expect(nextAnchor("team", undefined)).toBeNull();
  });
});
