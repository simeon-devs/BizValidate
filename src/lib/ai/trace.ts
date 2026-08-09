import type { PipelineStep } from "@/types/report";

// Collects what each pipeline step did so a report can show its own work.
// Timing only — the recorder never influences control flow, and a report
// whose trace is missing is still a valid report.
export class PipelineTrace {
  private readonly steps: PipelineStep[] = [];

  // Times `fn`, records the step, and returns the result untouched. `describe`
  // runs after `fn` so the detail can reflect what actually came back.
  async record<T>(
    step: number,
    name: string,
    describe: (result: T) => { status: PipelineStep["status"]; detail: string; model?: string },
    fn: () => Promise<T>,
  ): Promise<T> {
    const startedAt = Date.now();
    try {
      const result = await fn();
      const { status, detail, model } = describe(result);
      this.steps.push({
        step,
        name,
        status,
        detail,
        model,
        durationMs: Date.now() - startedAt,
      });
      return result;
    } catch (error) {
      this.steps.push({
        step,
        name,
        status: "failed",
        detail: error instanceof Error ? error.message : "Step failed.",
        durationMs: Date.now() - startedAt,
      });
      throw error;
    }
  }

  // For steps that are pure computation rather than an awaited call.
  add(entry: PipelineStep): void {
    this.steps.push(entry);
  }

  toArray(): PipelineStep[] {
    return [...this.steps].sort((a, b) => a.step - b.step);
  }
}
