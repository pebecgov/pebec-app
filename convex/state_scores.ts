import { query } from "./_generated/server";
import { v } from "convex/values";
import {
  getIndicatorMaxScoresForYear,
  getOverallMaxScoreForYear,
} from "./config/indicators";
import { normalizeStateName, VALID_NIGERIAN_STATES } from "./stateUtils";

export const getStateRankings = query({
  args: {
    indicator: v.optional(v.string()),
    year: v.optional(v.number()),
  },
  handler: async (ctx, { indicator, year }) => {
    const currentYear = year || new Date().getFullYear();
    
    // Fetch documents from state_scores table, filtered by year and optionally by indicator
    let allScores;
    
    if (indicator) {
      // Filter by both year and indicator
      allScores = await ctx.db
        .query("state_scores")
        .withIndex("byYearAndIndicator", (q) => q.eq("year", currentYear).eq("indicator", indicator))
        .collect();
    } else {
      // Filter by year only
      allScores = await ctx.db
        .query("state_scores")
        .withIndex("byYear", (q) => q.eq("year", currentYear))
        .collect();
    }

    if (allScores.length === 0) {
      return [];
    }

    const targetMaxScore = indicator
      ? getIndicatorMaxScoresForYear(currentYear)[indicator] ?? null
      : getOverallMaxScoreForYear(currentYear);

    if (indicator && targetMaxScore === null) {
      return [];
    }

    // Group by state and sum scores, filtering out invalid states and normalizing FCT
    const stateTotals = new Map<string, number>();

    for (const score of allScores) {
      // Normalize state name (e.g., FCT -> Federal Capital Territory)
      const normalizedState = normalizeStateName(score.state);
      
      // Filter out invalid states (like "Data Source", "Data Sourc", etc.)
      if (!VALID_NIGERIAN_STATES.has(normalizedState)) {
        continue; // Skip invalid states
      }
      
      const currentTotal = stateTotals.get(normalizedState) || 0;
      stateTotals.set(normalizedState, currentTotal + score.score);
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
