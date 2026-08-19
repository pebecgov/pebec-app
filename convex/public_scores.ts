import { v } from "convex/values";
import { query } from "./_generated/server";
import { api } from "./_generated/api";

// Max scores for each indicator based on the PEBEC framework
const indicatorMaxScores = {
  "electricity": 8,
  "infrastructure": 6,
  "digital_connectivity": 3,
  "getting_credit": 5,
  "digitalizing_land": 3,
  "grievance_redress_mechanisms": 3,
  "access_to_skilled_labour": 3,
} as const;

// Helper function for grade calculation
function gradeFromPercentage(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 85) return "A";
  if (percentage >= 80) return "B+";
  if (percentage >= 75) return "B";
  if (percentage >= 70) return "C+";
  if (percentage >= 65) return "C";
  if (percentage >= 60) return "D+";
  if (percentage >= 55) return "D";
  return "F";
}

export const getPublicStateIndicators = query({
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
    
    // Get all state scores for the year
    let allScores;
    try {
      allScores = await ctx.db
        .query("state_scores")
        .withIndex("byYear", (q) => q.eq("year", currentYear))
        .collect();
    } catch (error) {
      // If year index doesn't exist, use in-memory filtering
      const allRecords = await ctx.db.query("state_scores").collect();
      allScores = allRecords.filter((record) => 
        record.year === currentYear || (!record.year && currentYear === 2025)
      );
    }

    if (allScores.length === 0) {
      return {
        states: [],
        totalStates: 0,
        indicators: Object.keys(indicatorMaxScores),
      };
    }

    // Calculate total max score across all indicators
    const overallMaxScore = Object.values(indicatorMaxScores).reduce((sum: number, score: number) => sum + score, 0);

    // Group by state and collect detailed breakdown
    const stateDetails = new Map<string, {
      totalScore: number;
      indicators: Record<string, { score: number; maxScore: number; subIndicators: Record<string, number> }>;
      lastUpdated: number;
    }>();

    const validStateKeywords = ['Lagos', 'Kano', 'Rivers', 'Kaduna', 'Oyo', 'Edo', 'Delta', 'Imo', 'Enugu', 'Plateau', 'Cross River', 'Akwa Ibom', 'Ondo', 'Osun', 'Ogun', 'Kwara', 'Benue', 'Anambra', 'Borno', 'Niger', 'Abia', 'Taraba', 'Adamawa', 'Sokoto', 'Kebbi', 'Katsina', 'Jigawa', 'Yobe', 'Bauchi', 'Gombe', 'Zamfara', 'Nasarawa', 'Kogi', 'Ekiti', 'Ebonyi', 'Bayelsa', 'Federal Capital Territory', 'FCT'];

    for (const score of allScores) {
      const stateName = score.state;
      
      // Filter out invalid state names like "Data Sources"
      const isValidState = validStateKeywords.some(keyword => 
        stateName.toLowerCase().includes(keyword.toLowerCase()) ||
        keyword.toLowerCase().includes(stateName.toLowerCase())
      );
      
      if (!isValidState) {
        continue; // Skip invalid state entries
      }

      if (!stateDetails.has(stateName)) {
        stateDetails.set(stateName, {
          totalScore: 0,
          indicators: {},
          lastUpdated: score.createdAt || Date.now(),
        });
      }
      
      const stateData = stateDetails.get(stateName)!;
      stateData.totalScore += score.score;
      
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
      
      stateData.indicators[score.indicator].score += score.score;
      stateData.indicators[score.indicator].subIndicators[score.subIndicator] = score.score;
    }

    // Convert to final format
    const denominator: number = overallMaxScore;
    const states = Array.from(stateDetails.entries())
      .map(([stateName, data]) => {
        const percentage = denominator > 0 ? (data.totalScore / denominator) * 100 : 0;
        return {
          state: stateName,
          totalScore: data.totalScore,
          maxScore: denominator,
          percentage: Math.round(percentage * 100) / 100,
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

// Public MDA scoring query that uses the same data source as admin
export const getPublicMdaScores = query({
  args: {
    year: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const requestedYear = args.year || new Date().getFullYear();
    
    try {
      // Check if we have any MDA data for the requested year by checking SLA data
      const [firstHalf, secondHalf, fullYear] = await Promise.all([
        ctx.db.query("mda_sla_data")
          .withIndex("byPeriod", q => q.eq("scoringPeriod", `1st Half ${requestedYear}`))
          .first(),
        ctx.db.query("mda_sla_data")
          .withIndex("byPeriod", q => q.eq("scoringPeriod", `2nd Half ${requestedYear}`))
          .first(),
        ctx.db.query("mda_sla_data")
          .withIndex("byPeriod", q => q.eq("scoringPeriod", String(requestedYear)))
          .first()
      ]);

      const hasData = firstHalf || secondHalf || fullYear;

      if (!hasData) {
        return {
          mdas: [],
          totalMdas: 0,
          year: requestedYear,
          availableYears: [],
          hasDataForRequestedYear: false,
          message: `No MDA scoring data available for ${requestedYear}. Federal MDAs have not been scored for this assessment period.`,
        };
      }

      // Use the same admin query to get MDA rankings
      const adminRankings = await ctx.runQuery(api.mda_scoring.getAllMDAsLatestScores, { 
        year: requestedYear 
      }) as any[];
      
      // Filter to only show MDAs that have been scored (not "Not Scored")
      const scoredMdas = (adminRankings || [])
        .filter((mda: any) => mda && mda.currentScore > 0 && mda.status !== "Not Scored")
        .map((mda: any) => ({
          mdaName: mda.mdaName,
          finalScore: Math.round((mda.currentScore || 0) * 100) / 100,
          maxPossibleScore: mda.maxPossiblePoints || 100,
          percentage: Math.round((mda.currentScore || 0) * 100) / 100,
          grade: mda.grade || "N/A",
          scoringPeriod: mda.scoringPeriod || String(requestedYear),
          lastUpdated: mda.lastScoredAt || Date.now(),
        }))
        .sort((a: any, b: any) => b.finalScore - a.finalScore)
        .map((mda: any, index: number) => ({ ...mda, rank: index + 1 }));

      const limitedMdas = args.limit ? scoredMdas.slice(0, args.limit) : scoredMdas;

      return {
        mdas: limitedMdas,
        totalMdas: scoredMdas.length,
        year: requestedYear,
        requestedYear: args.year,
        availableYears: scoredMdas.length > 0 ? [requestedYear] : [],
        hasDataForRequestedYear: scoredMdas.length > 0,
      };

    } catch (error) {
      console.error("Error fetching public MDA scores:", error);
      return {
        mdas: [],
        totalMdas: 0,
        year: requestedYear,
        availableYears: [],
        hasDataForRequestedYear: false,
        message: "Error loading MDA scoring data. Please try again later.",
      };
    }
  },
});