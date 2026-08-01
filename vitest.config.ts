import { defineConfig, configDefaults } from "vitest/config";
import path from "path";

// Live tests (real API calls: the ±5 scoring-consistency test, DB round
// trips) use the `*.live.test.ts` suffix and are excluded from the default
// `npm test` so it stays fast and free. Run them with `npm run test:live`
// (sets RUN_LIVE=1), which needs the real keys in .env.local.
const runLive = process.env.RUN_LIVE === "1";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    setupFiles: ["./vitest.setup.ts"],
    exclude: [
      ...configDefaults.exclude,
      ...(runLive ? [] : ["**/*.live.test.ts"]),
    ],
    // Live tests hit slow external APIs; the default per-test timeout is
    // too short for a scoring call.
    testTimeout: runLive ? 120_000 : 5_000,
  },
});
