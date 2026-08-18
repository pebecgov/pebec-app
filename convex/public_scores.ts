import { query } from "./_generated/server";
import { v } from "convex/values";

// Helper function to calculate indicator scores
const indicatorMaxScores = {
  "business_registration": 100,
  "construction_permits": 100,
  "land_registration": 100,
  "paying_taxes": 100,
  "trading_across_borders": 100,
  "contract_enforcement": 100,
  "resolving_insolvency": 100,
};

const overallMaxScore = Object.values(indicatorMaxScores).reduce((a, b) => a + b, 0);

function gradeFromPercentage(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C+";
  if (percentage >= 40) return "C";
  if (percentage >= 30) return "D+";
  if (percentage >= 20) return "D";
  return "F";
}

export const getPublicStateIndicators = query({
  args: {},
  handler: async (ctx) => {
    return Object.keys(indicatorMaxScores);
  },
});

export const getPublicStateRankings = query({
  args: {
    limit: v.optional(v.number()),
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentYear = args.year || new Date().getFullYear();
    
    // Use the same calculation method as admin rankings (state_scores.ts)
    const allScores = await ctx.db
      .query("state_scores")
      .withIndex("byYear", (q) => q.eq("year", currentYear))
      .collect();

    if (allScores.length === 0) {
      return {
        states: [],
        totalStates: 0,
        indicators: Object.keys(indicatorMaxScores),
      };
    }

    // Group by state and sum scores (same method as admin)
    const stateTotals = new Map<string, number>();

    for (const score of allScores) {
      const stateName = score.state;
      const currentTotal = stateTotals.get(stateName) || 0;
      stateTotals.set(stateName, currentTotal + score.score);
    }

    const denominator = overallMaxScore;

    // Convert to array and sort by percentage score (same as admin method)
    const states = Array.from(stateTotals.entries())
      .map(([state, totalScore]) => {
        const percentage = denominator > 0 ? (totalScore / denominator) * 100 : 0;
        return {
          state,
          totalScore,
          maxScore: denominator,
          percentage: Math.round(percentage * 100) / 100,
          grade: gradeFromPercentage(percentage),
          lastUpdated: Date.now(),
        };
      })
      .sort((a, b) => b.percentage - a.percentage)
      .map((state, index) => ({
        ...state,
        rank: index + 1,
      }));

    const limitedStates = args.limit ? states.slice(0, args.limit) : states;

    return {
      states: limitedStates,
      totalStates: states.length,
      indicators: Object.keys(indicatorMaxScores),
    };
  },
});

export const getPublicMdaScores = query({
  args: {
    year: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentYear = args.year || new Date().getFullYear();
    
    // Get all MDA scoring history
    const scoringHistory = await ctx.db.query("mda_scoring_history").collect();

    if (!scoringHistory.length) {
      return {
        mdas: [],
        totalMdas: 0,
        year: currentYear,
      };
    }

    // Filter by year if specified (extract year from scoringPeriod or scoredAt)
    const filteredHistory = currentYear ? scoringHistory.filter(record => {
      // Try to extract year from scoringPeriod (e.g., "Q1 2025", "2025")
      const yearMatch = record.scoringPeriod.match(/\b(20\d{2})\b/);
      if (yearMatch) {
        return parseInt(yearMatch[0]) === currentYear;
      }
      // Fallback to scoredAt timestamp
      const recordYear = new Date(record.scoredAt).getFullYear();
      return recordYear === currentYear;
    }) : scoringHistory;

    // Group by MDA and get the latest score for each
    const mdaMap = new Map();
    
    for (const record of filteredHistory) {
      const mdaKey = record.mdaName;
      if (!mdaMap.has(mdaKey) || record.scoredAt > mdaMap.get(mdaKey).scoredAt) {
        mdaMap.set(mdaKey, record);
      }
    }

    // Process for public display
    const mdaScores = Array.from(mdaMap.values()).map(record => {
      const finalScore = record.totalScore || 0;
      const maxPossibleScore = record.maxPossiblePoints || 100;
      const percentage = record.totalPercentage || 0;
      
      return {
        mdaName: record.mdaName,
        finalScore: Math.round(finalScore * 100) / 100,
        maxPossibleScore,
        percentage: Math.round(percentage * 100) / 100,
        grade: record.grade || gradeFromPercentage(percentage),
        scoringPeriod: record.scoringPeriod,
        lastUpdated: record.scoredAt,
      };
    });

    // Sort by final score (descending)
    mdaScores.sort((a, b) => b.finalScore - a.finalScore);

    // Add ranking
    mdaScores.forEach((mda, index) => {
      (mda as any).rank = index + 1;
    });

    const limitedMdas = args.limit ? mdaScores.slice(0, args.limit) : mdaScores;

    return {
      mdas: limitedMdas,
      totalMdas: mdaScores.length,
      year: currentYear,
    };
  },
});