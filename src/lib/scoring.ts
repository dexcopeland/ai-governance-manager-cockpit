import { RiskTier } from "@/lib/db/schema";

const TIER_ORDER: RiskTier[] = ["low", "medium", "high", "critical"];

export function scoreToTier(composite: number): RiskTier {
  if (composite >= 4.25) return "critical";
  if (composite >= 3.25) return "high";
  if (composite >= 2.25) return "medium";
  return "low";
}

export function maxTier(a: RiskTier, b: RiskTier): RiskTier {
  return TIER_ORDER.indexOf(a) >= TIER_ORDER.indexOf(b) ? a : b;
}

export function computeComposite(
  scores: Array<{ score: number; weight: number }>,
): number {
  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight <= 0) return 0;
  const weighted = scores.reduce((sum, s) => sum + s.score * s.weight, 0);
  return Math.round((weighted / totalWeight) * 100) / 100;
}

export function reviewDateForTier(tier: RiskTier, from = new Date()): string {
  const days =
    tier === "critical" ? 30 : tier === "high" ? 90 : tier === "medium" ? 180 : 365;
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
