import type { Grade, MetricId } from "@/types/report";

export const METRIC_LABELS: Record<MetricId, string> = {
  team: "Team",
  market: "Market",
  product: "Product",
  competitive: "Competitive",
  gotomarket: "Go-to-Market",
  financials: "Financials",
  traction: "Traction",
  scalability: "Scalability",
};

export const INPUT_TYPE_LABELS: Record<string, string> = {
  plan: "Business Plan",
  pitch: "Pitch Deck",
  financials: "Financials",
  idea: "Raw Idea",
};

export const STAGE_LABELS: Record<string, string> = {
  idea: "Idea",
  mvp: "MVP",
  "pre-revenue": "Pre-Revenue",
  "early-revenue": "Early Revenue",
  growth: "Growth",
  scale: "Scale",
  established: "Established",
};

export const METRIC_ORDER: MetricId[] = [
  "team",
  "market",
  "product",
  "competitive",
  "gotomarket",
  "financials",
  "traction",
  "scalability",
];

// Grade tier color: A range = success, B range = dedicated B tint,
// C range = warning, D/F = danger. The lime accent stays reserved for
// actions and emphasis — never grades.
export function gradeColor(grade: Grade): string {
  const head = grade[0];
  if (head === "A") return "var(--success)";
  if (head === "B") return "var(--grade-b)";
  if (head === "C") return "var(--warning)";
  return "var(--danger)";
}

export function scoreColor(score: number): string {
  if (score >= 85) return "var(--success)";
  if (score >= 70) return "var(--grade-b)";
  if (score >= 55) return "var(--warning)";
  return "var(--danger)";
}

export type SectionTone = "success" | "danger" | "info" | "accent" | "warning";

const TONE_COLORS: Record<SectionTone, string> = {
  success: "var(--success)",
  danger: "var(--danger)",
  info: "var(--info)",
  accent: "var(--accent)",
  warning: "var(--warning)",
};

export function sectionDotColor(tone: SectionTone): string {
  return TONE_COLORS[tone];
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
