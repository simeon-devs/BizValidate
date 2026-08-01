// Loads .env.local into process.env before test modules import src/lib/env.ts
// (which Zod-parses the environment at import time). Existing variables win,
// so CI can inject its own values.
import { readFileSync, existsSync } from "fs";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const key = line.slice(0, i).trim();
    const value = line
      .slice(i + 1)
      .trim()
      .replace(/^"|"$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}
