import { env } from "@/lib/env";

// Upstash Redis over REST. Until real credentials are configured the
// placeholder host is unreachable, so every helper degrades gracefully:
// cache misses instead of pipeline failures. Regional context and job
// status are performance layers, not correctness layers.

async function redis(command: (string | number)[]): Promise<unknown> {
  const res = await fetch(env.UPSTASH_REDIS_REST_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Redis error ${res.status}`);
  const data = (await res.json()) as { result: unknown };
  return data.result;
}

export async function cacheGet(key: string): Promise<string | null> {
  try {
    const result = await redis(["GET", key]);
    return typeof result === "string" ? result : null;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<void> {
  try {
    await redis(["SET", key, value, "EX", ttlSeconds]);
  } catch {
    // Cache write failures are non-fatal.
  }
}
