import { z } from "zod";
import { inngest } from "@/lib/inngest";
import { runValidationPipeline } from "@/lib/ai/pipeline";

const eventDataSchema = z.object({ submissionId: z.string().uuid() });

// Background AI pipeline job (BLUEPRINT §3): the API/action returns
// immediately; Inngest runs the 10-20s pipeline with no serverless timeout
// and automatic retries. The pipeline is idempotent (returns the existing
// report if one exists), so retrying the whole step is safe.
export const validateSubmission = inngest.createFunction(
  {
    id: "validate-submission",
    retries: 2,
    triggers: [{ event: "validation/submitted" }],
  },
  async ({ event, step }) => {
    const { submissionId } = eventDataSchema.parse(event.data);
    const report = await step.run("run-pipeline", () =>
      runValidationPipeline(submissionId),
    );
    return { reportId: report.id, fromCache: report.fromCache };
  },
);
