import type { InvestmentTier } from "@/types/report";

export const INVESTMENT_TIERS: InvestmentTier[] = [
  "Series A Ready",
  "Seed Ready",
  "Pre-Seed Potential",
  "Not Investment Ready",
];

export function getInvestmentTier(score: number): InvestmentTier {
  if (score >= 82) return "Series A Ready";
  if (score >= 68) return "Seed Ready";
  if (score >= 52) return "Pre-Seed Potential";
  return "Not Investment Ready";
}
