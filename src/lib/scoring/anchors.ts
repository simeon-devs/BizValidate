import type { MetricId } from "@/types/report";
import { SCORING_ANCHORS } from "@/lib/ai/prompts/scoring";

// The behavioural anchors the scorer calibrates against, parsed from the
// prompt text so the report can quote exactly what a 60 or an 80 means.
// Reading the string does not change it: the prompt's golden hash is
// unaffected, and this module never feeds anything back into scoring.

export const ANCHOR_LEVELS = [20, 40, 60, 80, 100] as const;
export type AnchorLevel = (typeof ANCHOR_LEVELS)[number];
export type MetricAnchors = Record<AnchorLevel, string>;

const HEADING_TO_METRIC: Record<string, MetricId> = {
  TEAM: "team",
  MARKET: "market",
  PRODUCT: "product",
  COMPETITIVE: "competitive",
  "GO-TO-MARKET": "gotomarket",
  FINANCIALS: "financials",
  TRACTION: "traction",
  SCALABILITY: "scalability",
};

export function parseAnchors(
  text: string = SCORING_ANCHORS,
): Record<MetricId, MetricAnchors> {
  const result = {} as Record<MetricId, MetricAnchors>;
  let current: MetricId | null = null;

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    const heading = line.match(/^([A-Z-]+):$/);
    if (heading) {
      current = HEADING_TO_METRIC[heading[1]] ?? null;
      if (current) result[current] = {} as MetricAnchors;
      continue;
    }

    const level = line.match(/^(20|40|60|80|100)\s*=\s*(.+)$/);
    if (level && current) {
      result[current][Number(level[1]) as AnchorLevel] = level[2].trim();
    }
  }
  return result;
}

let parsed: Record<MetricId, MetricAnchors> | null = null;
export function getAnchors(): Record<MetricId, MetricAnchors> {
  parsed ??= parseAnchors();
  return parsed;
}

export interface Anchor {
  level: AnchorLevel;
  text: string;
}

// Stored bands look like "60-80", "0-20" or "100". Anything else is
// treated as absent rather than guessed at.
export function parseBand(
  band: string | undefined,
): { lower: number; upper: number } | null {
  if (!band) return null;
  const value = band.trim();

  const single = value.match(/^(\d{1,3})$/);
  if (single) {
    return Number(single[1]) === 100 ? { lower: 100, upper: 100 } : null;
  }

  const range = value.match(/^(\d{1,3})\s*[-–]\s*(\d{1,3})$/);
  if (!range) return null;
  const lower = Number(range[1]);
  const upper = Number(range[2]);
  if (lower > upper || upper > 100) return null;
  return { lower, upper };
}

function anchorAt(metric: MetricId, level: number): Anchor | null {
  const metricAnchors = getAnchors()[metric];
  const known = ANCHOR_LEVELS.find((l) => l === level);
  if (!metricAnchors || !known) return null;
  const text = metricAnchors[known];
  return text ? { level: known, text } : null;
}

export interface BandAnchors {
  lower: Anchor | null; // null below the lowest anchor ("0-20")
  upper: Anchor | null;
}

// The two anchors a score sits between — what the number was judged against.
export function anchorsForBand(
  metric: MetricId,
  band: string | undefined,
): BandAnchors | null {
  const range = parseBand(band);
  if (!range) return null;
  return {
    lower: anchorAt(metric, range.lower),
    upper: anchorAt(metric, range.upper),
  };
}

// The anchor a score would need to satisfy to leave its band upward. Null
// when the metric already sits at the top.
export function nextAnchor(
  metric: MetricId,
  band: string | undefined,
): Anchor | null {
  const range = parseBand(band);
  if (!range || range.lower >= 100) return null;
  return anchorAt(metric, range.upper);
}
