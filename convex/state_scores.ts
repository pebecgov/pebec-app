import { query } from "./_generated/server";
import { v } from "convex/values";

export const getStateRankings = query({
  args: {},
  handler: async (ctx) => {
    // Fetch all documents from state_scores table
    const allScores = await ctx.db.query("state_scores").collect();
    
    // Group by state and sum scores
    const stateTotals = new Map<string, number>();
    
    for (const score of allScores) {
      const currentTotal = stateTotals.get(score.state) || 0;
      stateTotals.set(score.state, currentTotal + score.score);
    }
    
    // Convert to array and sort by total score (descending)
    const rankings = Array.from(stateTotals.entries())
      .map(([state, totalScore], index) => ({
        state,
        totalScore,
        rank: index + 1
      }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((item, index) => ({
        ...item,
        rank: index + 1
      }));
    
    return rankings;
  },
});
