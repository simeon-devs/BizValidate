import { describe, it, expect } from "vitest";
import { validateEvidence } from "./evidence";
import type { EnrichmentSource } from "@/types/report";

const SUBMISSION =
  "PalmLink buys fresh fruit bunches from 84 registered farmers across 6 villages. " +
  "We processed 213 tonnes last quarter and generated 21.4 million FCFA in revenue at a 19% gross margin. " +
  "Payment via MTN Mobile Money within 48 hours.";

const SOURCES: EnrichmentSource[] = [
  {
    id: 1,
    title: "Cameroon Palm Kernel Oil Market (2025-2031)",
    url: "https://a.example/1",
    snippet: "Cameroon produces roughly 400,000 tonnes of palm oil against demand above 500,000 tonnes; smallholders account for close to 70% of output.",
    topic: "market",
  },
  {
    id: 2,
    title: "Unit economics of small-scale oil palm processing",
    url: "https://b.example/2",
    snippet: "Artisanal presses recover 45 to 60 percent of available oil.",
    topic: "financials",
  },
];

describe("validateEvidence", () => {
  it("keeps facts that appear in the submission", () => {
    const { kept, dropped } = validateEvidence(
      ["84 registered farmers across 6 villages", "19% gross margin on 21.4 million FCFA revenue"],
      SUBMISSION,
      SOURCES,
    );
    expect(kept).toHaveLength(2);
    expect(dropped).toHaveLength(0);
  });

  it("keeps a cited fact when the cited source supports it", () => {
    const { kept } = validateEvidence(
      ["[S1] Cameroon produces 400,000 tonnes against demand above 500,000 tonnes"],
      SUBMISSION,
      SOURCES,
    );
    expect(kept).toHaveLength(1);
  });

  it("drops a cited fact when the cited source does not support it", () => {
    const { kept, dropped } = validateEvidence(
      ["[S2] Cameroon produces 400,000 tonnes against demand above 500,000 tonnes"],
      SUBMISSION,
      SOURCES,
    );
    // The fact is true of S1, but the model attributed it to S2.
    expect(kept).toHaveLength(0);
    expect(dropped).toHaveLength(1);
  });

  it("checks an uncited item against every source, not just the submission", () => {
    const { kept } = validateEvidence(
      ["Artisanal presses recover 45 to 60 percent of available oil"],
      SUBMISSION,
      SOURCES,
    );
    expect(kept).toHaveLength(1);
  });

  it("drops an invented fact", () => {
    const { kept, dropped } = validateEvidence(
      ["The company has signed a distribution agreement with Unilever covering twelve countries"],
      SUBMISSION,
      SOURCES,
    );
    expect(kept).toHaveLength(0);
    expect(dropped).toHaveLength(1);
  });

  it("treats numbers and currency as content words", () => {
    // Almost all content is numeric; it must still be recognised.
    const { kept } = validateEvidence(["213 tonnes, 21.4 million FCFA"], SUBMISSION, SOURCES);
    expect(kept).toHaveLength(1);
    const { dropped } = validateEvidence(["999 tonnes, 88.8 million FCFA"], SUBMISSION, SOURCES);
    expect(dropped).toHaveLength(1);
  });

  it("returns empty lists for missing or blank input", () => {
    expect(validateEvidence(undefined, SUBMISSION, SOURCES)).toEqual({ kept: [], dropped: [] });
    expect(validateEvidence(["  "], SUBMISSION, SOURCES)).toEqual({ kept: [], dropped: [] });
  });
});
