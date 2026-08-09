import { describe, it, expect } from "vitest";
import { PipelineTrace } from "./trace";

describe("PipelineTrace", () => {
  it("records a step and passes the result through untouched", async () => {
    const trace = new PipelineTrace();

    const result = await trace.record(
      2,
      "Fact extraction",
      (value: { facts: number }) => ({
        status: "ran" as const,
        detail: `Pulled ${value.facts} facts.`,
        model: "claude-haiku-4-5",
      }),
      async () => ({ facts: 14 }),
    );

    expect(result).toEqual({ facts: 14 });
    const [step] = trace.toArray();
    expect(step).toMatchObject({
      step: 2,
      name: "Fact extraction",
      status: "ran",
      detail: "Pulled 14 facts.",
      model: "claude-haiku-4-5",
    });
    expect(step.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("lets describe() react to the result — skipped vs ran", async () => {
    const trace = new PipelineTrace();

    await trace.record(
      3,
      "Market research",
      (value: string | null) => ({
        status: value ? ("ran" as const) : ("skipped" as const),
        detail: value ? "found data" : "no data available",
      }),
      async () => null,
    );

    expect(trace.toArray()[0]).toMatchObject({
      status: "skipped",
      detail: "no data available",
    });
  });

  it("records a failed step and rethrows so the pipeline still fails", async () => {
    const trace = new PipelineTrace();

    await expect(
      trace.record(
        4,
        "Scoring",
        () => ({ status: "ran" as const, detail: "unreachable" }),
        async () => {
          throw new Error("scorer exploded");
        },
      ),
    ).rejects.toThrow("scorer exploded");

    expect(trace.toArray()[0]).toMatchObject({
      step: 4,
      status: "failed",
      detail: "scorer exploded",
    });
  });

  it("returns steps in pipeline order regardless of completion order", async () => {
    const trace = new PipelineTrace();
    trace.add({ step: 6, name: "Final score", status: "ran", detail: "sum", durationMs: 1 });
    trace.add({ step: 5, name: "Outlier check", status: "skipped", detail: "none", durationMs: 1 });

    expect(trace.toArray().map((s) => s.step)).toEqual([5, 6]);
  });
});
