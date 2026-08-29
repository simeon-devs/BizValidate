import { describe, it, expect } from "vitest";
import { PRIMERS } from "./primers";
import { METRIC_ORDER } from "@/lib/utils/format";

describe("metric primers", () => {
  it("cover every metric with a what, a why and at least three terms", () => {
    for (const id of METRIC_ORDER) {
      const primer = PRIMERS[id];
      expect(primer, id).toBeDefined();
      expect(primer.what.length, `${id}.what`).toBeGreaterThan(40);
      expect(primer.why.length, `${id}.why`).toBeGreaterThan(60);
      expect(primer.terms.length, `${id}.terms`).toBeGreaterThanOrEqual(3);
      for (const t of primer.terms) {
        expect(t.term.trim().length).toBeGreaterThan(1);
        expect(t.definition.trim().length, `${id} · ${t.term}`).toBeGreaterThan(40);
      }
    }
  });

  it("reads as one sentence under a metric title, not a paragraph", () => {
    for (const id of METRIC_ORDER) {
      expect(PRIMERS[id].what.length, id).toBeLessThanOrEqual(140);
    }
  });

  it("never defines the same term two different ways", () => {
    const seen = new Map<string, string>();
    for (const id of METRIC_ORDER) {
      for (const { term, definition } of PRIMERS[id].terms) {
        const key = term.toLowerCase();
        const prior = seen.get(key);
        if (prior) expect(prior, term).toBe(definition);
        seen.set(key, definition);
      }
    }
  });
});
