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

    // Group by state and collect detailed breakdown
    const stateDetails = new Map<string, {
      totalScore: number;
      indicators: Record<string, { score: number; maxScore: number; subIndicators: Record<string, number> }>;
      lastUpdated: number;
    }>();

    // Valid Nigerian states (filter out invalid entries like "Data Sources")
    const validStateKeywords = ['Lagos', 'Kano', 'Rivers', 'Kaduna', 'Oyo', 'Edo', 'Delta', 'Imo', 'Enugu', 'Plateau', 'Cross River', 'Akwa Ibom', 'Ondo', 'Osun', 'Ogun', 'Kwara', 'Benue', 'Anambra', 'Borno', 'Niger', 'Abia', 'Taraba', 'Adamawa', 'Sokoto', 'Kebbi', 'Katsina', 'Jigawa', 'Yobe', 'Bauchi', 'Gombe', 'Zamfara', 'Nasarawa', 'Kogi', 'Ekiti', 'Ebonyi', 'Bayelsa', 'Federal Capital Territory', 'FCT'];

    for (const score of allScores) {
      const stateName = score.state;
      
      // Filter out invalid entries like "Data Sources", "Data Sourc", etc.
      const isValidState = validStateKeywords.some(validState => 
        stateName.toLowerCase().includes(validState.toLowerCase()) || 
        validState.toLowerCase().includes(stateName.toLowerCase())
      );
      
      if (!isValidState || stateName.toLowerCase().includes('data') || stateName.toLowerCase().includes('source')) {
        continue; // Skip invalid entries
      }
      
      // Initialize state if not exists
      if (!stateDetails.has(stateName)) {
        stateDetails.set(stateName, {
          totalScore: 0,
          indicators: {},
          lastUpdated: score.createdAt || Date.now(),
        });
      }
      
      const stateData = stateDetails.get(stateName)!;
      
      // Add to total score
      stateData.totalScore += score.score;
      
      // Update last updated time
      if (score.createdAt > stateData.lastUpdated) {
        stateData.lastUpdated = score.createdAt;
      }
      
      // Initialize indicator if not exists
      if (!stateData.indicators[score.indicator]) {
        const indicatorConfig = (indicatorMaxScores as Record<string, number>)[score.indicator];
        stateData.indicators[score.indicator] = {
          score: 0,
          maxScore: indicatorConfig || 0,
          subIndicators: {},
        };
      }
      
      // Add sub-indicator score
      stateData.indicators[score.indicator].score += score.score;
      stateData.indicators[score.indicator].subIndicators[score.subIndicator] = score.score;
    }

    const denominator = overallMaxScore;

    // Convert to array and sort by percentage score (same as admin method)
    const states = Array.from(stateDetails.entries())
      .map(([stateName, data]) => {
        const percentage = denominator > 0 ? (data.totalScore / denominator) * 100 : 0;
        return {
          state: stateName,
          totalScore: data.totalScore,
          maxScore: denominator,
          percentage: Math.round(percentage * 100) / 100,
          grade: gradeFromPercentage(percentage),
          lastUpdated: data.lastUpdated,
          indicators: data.indicators, // Include detailed breakdown
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
    const requestedYear = args.year;
    
    // Get all MDA scoring history
    const scoringHistory = await ctx.db.query("mda_scoring_history").collect();

    if (!scoringHistory.length) {
      return {
        mdas: [],
        totalMdas: 0,
        year: requestedYear,
        availableYears: [],
      };
    }

    // Get available years from the data (using scoredAt like admin does)
    const availableYears = new Set<number>();
    scoringHistory.forEach(record => {
      const scoredYear = new Date(record.scoredAt).getFullYear();
      availableYears.add(scoredYear);
    });

    // If no year specified or year not available, use the most recent available year
    const sortedYears = Array.from(availableYears).sort((a, b) => b - a);
    const actualYear = requestedYear && availableYears.has(requestedYear) 
      ? requestedYear 
      : sortedYears[0] || new Date().getFullYear();

    // Filter by the actual year we're using (same logic as admin)
    const filteredHistory = scoringHistory.filter(record => {
      const scoreYear = new Date(record.scoredAt).getFullYear();
      return scoreYear === actualYear;
    });

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
      year: actualYear,
      requestedYear: requestedYear,
      availableYears: sortedYears,
      hasDataForRequestedYear: requestedYear ? availableYears.has(requestedYear) : true,
    };
  },
});