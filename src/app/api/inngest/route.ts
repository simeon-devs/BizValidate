import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { validateSubmission } from "../../../../inngest/functions/validate";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [validateSubmission],
});
