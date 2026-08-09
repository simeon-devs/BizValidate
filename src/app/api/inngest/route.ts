import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { validateSubmission } from "../../../../inngest/functions/validate";

// The pipeline runs as a single Inngest step and takes 60-90s with live
// enrichment, so this route must be allowed to run well past a default
// serverless budget. 300s is Inngest's documented value for Vercel.
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [validateSubmission],
});
