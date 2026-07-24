// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { query } from "./_generated/server";
import { v } from "convex/values";
import { indicators } from "./config/indicators";
import {
  getStateDeduction,
  normalizeStateName,
  VALID_NIGERIAN_STATES,
} from "./stateUtils";

const indicatorMaxScores = Object.fromEntries(
  Object.entries(indicators).map(([indicatorKey, indicatorConfig]) => {
    const maxScoreForIndicator = Object.values(
      indicatorConfig.subIndicators
    ).reduce((sum, subIndicator: any) => {
      const options = subIndicator.options as Array<{ score: number }>;
      const maxOptionScore = options.reduce(
        (max, option) => Math.max(max, option.score),
        0
      );
      return sum + maxOptionScore;
    }, 0);

    return [indicatorKey, maxScoreForIndicator];
  })
);

const overallMaxScore = Object.values(indicatorMaxScores).reduce(
  (sum, value) => sum + value,
  0
);

function gradeFromPercentage(
  percentage: number,
  bands: { a: number; b: number; c: number; d: number }
): string {
  if (percentage >= bands.a) return "A";
  if (percentage >= bands.b) return "B";
  if (percentage >= bands.c) return "C";
  if (percentage >= bands.d) return "D";
  return "F";
}

/** Public indicator list for the state rankings filter. */
export const getPublicStateIndicators = query({
  args: {},
  handler: async () => {
    return Object.entries(indicators).map(([key, config]) => ({
      key,
      name: config.name,
      maxScore: indicatorMaxScores[key] ?? 0,
    }));
  },
});

/**
 * Public state rankings. Reads the same `state_scores` rows admins save,
 * so the tracker updates as soon as scores are written.
 */
export const getPublicStateRankings = query({
  args: {
    indicator: v.optional(v.string()),
  },
  handler: async (ctx, { indicator }) => {
    const allScores = indicator
      ? await ctx.db
          .query("state_scores")
          .withIndex("byIndicator", (q) => q.eq("indicator", indicator))
          .collect()
      : await ctx.db.query("state_scores").collect();

    if (allScores.length === 0) {
      return {
        rankings: [],
        maxScore: indicator
          ? (indicatorMaxScores[indicator] ?? 0)
          : overallMaxScore,
        lastUpdatedAt: null as number | null,
        indicator: indicator ?? null,
      };
    }

    const targetMaxScore = indicator
      ? indicatorMaxScores[indicator] ?? null
      : overallMaxScore;

    if (indicator && targetMaxScore === null) {
      return {
        rankings: [],
        maxScore: 0,
        lastUpdatedAt: null as number | null,
        indicator,
      };
    }

    const stateTotals = new Map<string, number>();
    let lastUpdatedAt: number | null = null;

    for (const score of allScores) {
      const normalizedState = normalizeStateName(score.state);
      if (!VALID_NIGERIAN_STATES.has(normalizedState)) continue;

      stateTotals.set(
        normalizedState,
        (stateTotals.get(normalizedState) || 0) + score.score
      );

      if (
        typeof score.createdAt === "number" &&
        (lastUpdatedAt === null || score.createdAt > lastUpdatedAt)
      ) {
        lastUpdatedAt = score.createdAt;
      }
    }

    const denominator = targetMaxScore || 0;

    const rankings = Array.from(stateTotals.entries())
      .map(([state, totalScore]) => {
        const deduction = getStateDeduction(state);
        const adjustedScore = Math.max(totalScore - deduction, 0);
        const percentageScore =
          denominator > 0 ? (adjustedScore / denominator) * 100 : 0;
        return {
          state,
          totalScore: adjustedScore,
          maxScore: denominator,
          percentageScore,
          deduction,
          grade: gradeFromPercentage(percentageScore, {
            a: 85,
            b: 70,
            c: 55,
            d: 40,
          }),
        };
      })
      .sort((a, b) => b.percentageScore - a.percentageScore)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

    return {
      rankings,
      maxScore: denominator,
      lastUpdatedAt,
      indicator: indicator ?? null,
    };
  },
});

/**
 * Public MDA / BFA scorecards from `mda_scoring_history`.
 * Only includes MDAs that have a saved final score.
 */
export const getPublicMdaScores = query({
  args: {
    year: v.optional(v.number()),
  },
  handler: async (ctx, { year }) => {
    const targetYear = year || new Date().getFullYear();
    const allHistory = await ctx.db.query("mda_scoring_history").collect();

    if (allHistory.length === 0) {
      return {
        rankings: [],
        year: targetYear,
        lastUpdatedAt: null as number | null,
        availableYears: [] as number[],
      };
    }

    const availableYears = [
      ...new Set(
        allHistory.map((score) => new Date(score.scoredAt).getFullYear())
      ),
    ].sort((a, b) => b - a);

    const yearScores = allHistory.filter(
      (score) => new Date(score.scoredAt).getFullYear() === targetYear
    );

    let lastUpdatedAt: number | null = null;
    for (const score of yearScores) {
      if (lastUpdatedAt === null || score.scoredAt > lastUpdatedAt) {
        lastUpdatedAt = score.scoredAt;
      }
    }

    const byMda = new Map<string, typeof yearScores>();
    for (const score of yearScores) {
      const list = byMda.get(score.mdaName) || [];
      list.push(score);
      byMda.set(score.mdaName, list);
    }

    const rankings = Array.from(byMda.entries())
      .map(([mdaName, scores]) => {
        const sorted = [...scores].sort((a, b) => b.scoredAt - a.scoredAt);
        const latest = sorted[0];

        const firstHalf = scores.find((s) =>
          s.scoringPeriod.includes("1st Half")
        );
        const secondHalf = scores.find((s) =>
          s.scoringPeriod.includes("2nd Half")
        );

        let percentage = latest.totalPercentage;
        let scoringPeriod = latest.scoringPeriod;
        let grade = latest.grade;
        let status = latest.status;
        let totalScore = latest.totalScore;
        let maxPossiblePoints = latest.maxPossiblePoints ?? 100;

        if (firstHalf && secondHalf) {
          percentage =
            (firstHalf.totalPercentage + secondHalf.totalPercentage) / 2;
          scoringPeriod = `${firstHalf.scoringPeriod} & ${secondHalf.scoringPeriod}`;
          totalScore = (firstHalf.totalScore + secondHalf.totalScore) / 2;
          // Prefer the most recent period's grade/status for display
          grade = latest.grade;
          status = latest.status;
          maxPossiblePoints =
            ((firstHalf.maxPossiblePoints ?? 100) +
              (secondHalf.maxPossiblePoints ?? 100)) /
            2;
        }

        return {
          mdaName,
          percentage,
          totalScore,
          maxPossiblePoints,
          grade,
          status,
          scoringPeriod,
          lastScoredAt: latest.scoredAt,
        };
      })
      .sort((a, b) => b.percentage - a.percentage)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

    return {
      rankings,
      year: targetYear,
      lastUpdatedAt,
      availableYears,
    };
  },
});
