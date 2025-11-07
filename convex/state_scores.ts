import { query } from "./_generated/server";
import { v } from "convex/values";

export const getStateRankings = query({
  args: {},
  handler: async (ctx) => {
    // Fetch all documents from state_scores table
    const allScores = await ctx.db.query("state_scores").collect();
    
    // Total possible points across all indicators
    const TOTAL_POSSIBLE_POINTS = 79;
    
    // Group by state and sum scores
    const stateTotals = new Map<string, number>();
    
    for (const score of allScores) {
      const currentTotal = stateTotals.get(score.state) || 0;
      stateTotals.set(score.state, currentTotal + score.score);
    }
    
    // Convert to array and sort by percentage score (descending)
    const rankings = Array.from(stateTotals.entries())
      .map(([state, totalScore]) => ({
        state,
        totalScore,
        percentageScore: (totalScore / TOTAL_POSSIBLE_POINTS) * 100
      }))
      .sort((a, b) => b.percentageScore - a.percentageScore)
      .map((item, index) => ({
        ...item,
        rank: index + 1
      }));
    
    return rankings;
  },
});
