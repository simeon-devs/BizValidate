import { Inngest } from "inngest";
import { env } from "@/lib/env";

// In development the SDK talks to the local Inngest dev server
// (`npx inngest-cli@latest dev`); event/signing keys are only required in
// production.
export const inngest = new Inngest({
  id: "bizvalidate",
  isDev: env.NODE_ENV === "development",
});
