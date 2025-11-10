import { query } from "./_generated/server";
import { v } from "convex/values";
import { indicators } from "./config/indicators";

const indicatorMaxScores = Object.fromEntries(
  Object.entries(indicators).map(([indicatorKey, indicatorConfig]) => {
    const maxScoreForIndicator = Object.values(indicatorConfig.subIndicators).reduce((sum, subIndicator: any) => {
      const options = subIndicator.options as Array<{ score: number }>;
      const maxOptionScore = options.reduce((max, option) => Math.max(max, option.score), 0);
      return sum + maxOptionScore;
    }, 0);

    return [indicatorKey, maxScoreForIndicator];
  })
);

const overallMaxScore = Object.values(indicatorMaxScores).reduce((sum, value) => sum + value, 0);

export const getStateRankings = query({
  args: {
    indicator: v.optional(v.string()),
  },
  handler: async (ctx, { indicator }) => {
    // Fetch documents from state_scores table, optionally filtered by indicator
    const allScores = indicator
      ? await ctx.db
          .query("state_scores")
          .withIndex("byIndicator", (q) => q.eq("indicator", indicator))
          .collect()
      : await ctx.db.query("state_scores").collect();

    if (allScores.length === 0) {
      return [];
    }

    const targetMaxScore = indicator
      ? indicatorMaxScores[indicator] ?? null
      : overallMaxScore;

    if (indicator && targetMaxScore === null) {
      return [];
    }

    // Group by state and sum scores
    const stateTotals = new Map<string, number>();

    for (const score of allScores) {
      const currentTotal = stateTotals.get(score.state) || 0;
      stateTotals.set(score.state, currentTotal + score.score);
    }

    const denominator = targetMaxScore || 0;

    // Convert to array and sort by percentage score (descending)
    const rankings = Array.from(stateTotals.entries())
      .map(([state, totalScore]) => {
        const percentageScore = denominator > 0 ? (totalScore / denominator) * 100 : 0;
        return {
          state,
          totalScore,
          maxScore: denominator,
          percentageScore,
        };
      })
      .sort((a, b) => b.percentageScore - a.percentageScore)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

    return rankings;
  },
});
