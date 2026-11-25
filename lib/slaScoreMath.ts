/**
 * Single source of truth for SLA point math used by:
 * - Admin scoring UI (ScoringTab)
 * - Bulk SLA save
 * - Dashboard / public tracker aggregation
 *
 * Contract: each month's `score` is already in final BFA points:
 *   (overallPercentage / 100) * pointsPerMonth
 * or for ratings:
 *   (rating / 10) * pointsPerMonth
 * Never treat month scores as a 0–5 "raw" scale and re-convert.
 */

export type SlaMonthScoreEntry = {
  method?: string;
  overallPercentage?: number | null;
  rating?: number;
  score?: number;
};

export type SlaMonthRef = {
  monthKey: string;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Whether this month contributes to the SLA total (same rules as admin). */
export function isSlaMonthScored(entry: SlaMonthScoreEntry | null | undefined): boolean {
  if (!entry) return false;
  if (entry.method === "file") return entry.overallPercentage != null;
  if (entry.method === "rating") return (entry.rating ?? 0) > 0;
  return (entry.score ?? 0) > 0 || entry.overallPercentage != null;
}

/**
 * Points for one month on the BFA scale (capped at pointsPerMonth).
 * Prefers stored `score`; derives from % or rating when needed.
 */
export function slaMonthPoints(
  entry: SlaMonthScoreEntry | null | undefined,
  pointsPerMonth: number,
): number {
  if (!entry || !isSlaMonthScored(entry)) return 0;

  let points = typeof entry.score === "number" && Number.isFinite(entry.score) ? entry.score : 0;

  if (points <= 0 && typeof entry.overallPercentage === "number") {
    points = (entry.overallPercentage / 100) * pointsPerMonth;
  } else if (points <= 0 && (entry.rating ?? 0) > 0) {
    points = ((entry.rating ?? 0) / 10) * pointsPerMonth;
  }

  if (pointsPerMonth > 0) {
    points = Math.min(Math.max(points, 0), pointsPerMonth);
  }
  return round2(points);
}

/**
 * Same total as admin `calculateMonthlySlaScore`: sum month points for the
 * scoring window, capped at slaMaxPoints.
 */
export function computeSlaTotalFromMonthly(args: {
  monthlySlaData: Record<string, SlaMonthScoreEntry> | null | undefined;
  /** Ordered month keys for the period, e.g. "2025-8" */
  monthKeys: string[];
  pointsPerMonth: number;
  slaMaxPoints: number;
}): { totalScore: number; monthsWithData: number; percentage: number } {
  const { monthlySlaData, monthKeys, pointsPerMonth, slaMaxPoints } = args;
  const data = monthlySlaData && typeof monthlySlaData === "object" ? monthlySlaData : {};

  let totalScore = 0;
  let monthsWithData = 0;

  for (const monthKey of monthKeys) {
    const entry = data[monthKey];
    if (!isSlaMonthScored(entry)) continue;
    monthsWithData++;
    totalScore += slaMonthPoints(entry, pointsPerMonth);
  }

  totalScore = round2(Math.min(Math.max(totalScore, 0), slaMaxPoints));
  const percentage = slaMaxPoints > 0 ? round2((totalScore / slaMaxPoints) * 100) : 0;

  return { totalScore, monthsWithData, percentage };
}
