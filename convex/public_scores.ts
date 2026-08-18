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
    
    const stateScores = await ctx.db
      .query("state_scores")
      .withIndex("byYear", (q) => q.eq("year", currentYear))
      .collect();
    
    if (!stateScores.length) {
      return {
        states: [],
        totalStates: 0,
        indicators: Object.keys(indicatorMaxScores),
      };
    }

    // Group by state and get latest scores
    const stateMap = new Map();
    
    for (const score of stateScores) {
      const stateKey = score.state;
      if (!stateMap.has(stateKey)) {
        stateMap.set(stateKey, {
          state: score.state,
          scores: {},
          totalScore: 0,
          lastUpdated: score._creationTime,
        });
      }
      
      const stateData = stateMap.get(stateKey);
      
      // Use the most recent score for this indicator
      if (!stateData.scores[score.indicator] || score._creationTime > stateData.lastUpdated) {
        stateData.scores[score.indicator] = score.score;
        if (score._creationTime > stateData.lastUpdated) {
          stateData.lastUpdated = score._creationTime;
        }
      }
    }

    // Calculate rankings
    const states = Array.from(stateMap.values()).map(state => {
      const totalScore = Object.values(state.scores).reduce((sum: number, score: any) => sum + (score || 0), 0);
      const percentage = (totalScore / overallMaxScore) * 100;
      
      return {
        state: state.state,
        totalScore,
        percentage: Math.round(percentage * 100) / 100,
        grade: gradeFromPercentage(percentage),
        scores: state.scores,
        lastUpdated: state.lastUpdated,
      };
    });

    // Sort by total score (descending)
    states.sort((a, b) => b.totalScore - a.totalScore);

    // Add ranking
    states.forEach((state, index) => {
      (state as any).rank = index + 1;
    });

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