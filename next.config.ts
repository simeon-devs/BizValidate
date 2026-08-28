import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The PDF renderer ships its own layout engine and font loader; bundling
  // it into the route breaks both. Keep it a runtime Node dependency.
  serverExternalPackages: ["@react-pdf/renderer"],
  // The PDF route reads its brand font files from disk at render time;
  // without this they are left out of the serverless bundle.
  outputFileTracingIncludes: {
    "/api/reports/[id]/pdf": ["./src/lib/pdf/fonts/**"],
  },
};

export default nextConfig;
