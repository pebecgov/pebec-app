import { query } from "./_generated/server";
import { v } from "convex/values";
import { getIndicatorsForYear } from "./config/indicators";
import { STATE_LIST } from "./stateUtils";

/**
 * Generate a comprehensive audit of state scoring progress.
 * Returns data suitable for CSV export showing what's scored vs missing.
 */
export const generateStateScoringAudit = query({
  args: {
    year: v.optional(v.number()),
  },
  returns: v.object({
    year: v.number(),
    generatedAt: v.string(),
    totalStates: v.number(),
    totalIndicators: v.number(),
    totalSubIndicators: v.number(),
    overallCompletionRate: v.number(),
    auditRows: v.array(v.object({
      state: v.string(),
      indicator: v.string(),
      indicatorName: v.string(),
      subIndicator: v.string(),
      subIndicatorName: v.string(),
      maxPoints: v.number(),
      currentScore: v.number(),
      currentValue: v.string(),
      isScored: v.boolean(),
      completionStatus: v.string(), // "Scored", "Missing", "Partial"
    })),
    summaryByState: v.array(v.object({
      state: v.string(),
      totalSubIndicators: v.number(),
      scoredSubIndicators: v.number(),
      missingSubIndicators: v.number(),
      completionRate: v.number(),
      totalPossiblePoints: v.number(),
      currentPoints: v.number(),
    })),
    summaryByIndicator: v.array(v.object({
      indicator: v.string(),
      indicatorName: v.string(),
      totalStates: v.number(),
      scoredStates: v.number(),
      missingStates: v.number(),
      completionRate: v.number(),
    })),
  }),
  handler: async (ctx, args) => {
    const year = args.year ?? 2026;
    const indicators = getIndicatorsForYear(year);
    
    // Get all existing scores for the year
    const allScores = await ctx.db
      .query("state_scores")
      .withIndex("byYear", q => q.eq("year", year))
      .collect();
    
    // Build lookup map for quick access
    const scoresMap = new Map<string, typeof allScores[0]>();
    allScores.forEach(score => {
      const key = `${score.state}:${score.indicator}:${score.subIndicator}`;
      scoresMap.set(key, score);
    });
    
    const auditRows: any[] = [];
    const stateCompletionMap = new Map<string, {
      scored: number;
      total: number;
      points: number;
      maxPoints: number;
    }>();
    
    const indicatorCompletionMap = new Map<string, {
      scored: number;
      total: number;
    }>();
    
    let totalSubIndicators = 0;
    
    // Initialize state tracking
    STATE_LIST.forEach(state => {
      stateCompletionMap.set(state, { scored: 0, total: 0, points: 0, maxPoints: 0 });
    });
    
    // Process each indicator and sub-indicator
    Object.entries(indicators).forEach(([indicatorKey, indicatorConfig]) => {
      const indicatorStats = { scored: 0, total: 0 };
      
      Object.entries(indicatorConfig.subIndicators).forEach(([subIndicatorKey, subIndicatorConfig]) => {
        totalSubIndicators++;
        
        // Get max possible score for this sub-indicator
        const maxScore = Math.max(...subIndicatorConfig.options.map(opt => opt.score));
        
        STATE_LIST.forEach(state => {
          const key = `${state}:${indicatorKey}:${subIndicatorKey}`;
          const existingScore = scoresMap.get(key);
          
          const isScored = !!existingScore;
          const currentScore = existingScore?.score ?? 0;
          const currentValue = existingScore?.value ?? "";
          
          // Update state stats
          const stateStats = stateCompletionMap.get(state)!;
          stateStats.total++;
          stateStats.maxPoints += maxScore;
          stateStats.points += currentScore;
          if (isScored) {
            stateStats.scored++;
          }
          
          // Update indicator stats
          indicatorStats.total++;
          if (isScored) {
            indicatorStats.scored++;
          }
          
          // Create audit row
          auditRows.push({
            state,
            indicator: indicatorKey,
            indicatorName: indicatorConfig.name,
            subIndicator: subIndicatorKey,
            subIndicatorName: subIndicatorConfig.label,
            maxPoints: maxScore,
            currentScore,
            currentValue,
            isScored,
            completionStatus: isScored ? "Scored" : "Missing",
          });
        });
      });
      
      indicatorCompletionMap.set(indicatorKey, indicatorStats);
    });
    
    // Calculate summaries
    const summaryByState = STATE_LIST.map(state => {
      const stats = stateCompletionMap.get(state)!;
      return {
        state,
        totalSubIndicators: stats.total,
        scoredSubIndicators: stats.scored,
        missingSubIndicators: stats.total - stats.scored,
        completionRate: stats.total > 0 ? Math.round((stats.scored / stats.total) * 100) : 0,
        totalPossiblePoints: stats.maxPoints,
        currentPoints: stats.points,
      };
    });
    
    const summaryByIndicator = Object.entries(indicators).map(([indicatorKey, indicatorConfig]) => {
      const stats = indicatorCompletionMap.get(indicatorKey)!;
      return {
        indicator: indicatorKey,
        indicatorName: indicatorConfig.name,
        totalStates: STATE_LIST.length,
        scoredStates: Math.floor(stats.scored / Object.keys(indicatorConfig.subIndicators).length),
        missingStates: STATE_LIST.length - Math.floor(stats.scored / Object.keys(indicatorConfig.subIndicators).length),
        completionRate: stats.total > 0 ? Math.round((stats.scored / stats.total) * 100) : 0,
      };
    });
    
    // Calculate overall completion
    const totalPossibleEntries = STATE_LIST.length * totalSubIndicators;
    const totalScoredEntries = auditRows.filter(row => row.isScored).length;
    const overallCompletionRate = totalPossibleEntries > 0 
      ? Math.round((totalScoredEntries / totalPossibleEntries) * 100) 
      : 0;
    
    return {
      year,
      generatedAt: new Date().toISOString(),
      totalStates: STATE_LIST.length,
      totalIndicators: Object.keys(indicators).length,
      totalSubIndicators: totalSubIndicators / STATE_LIST.length, // Per state
      overallCompletionRate,
      auditRows,
      summaryByState,
      summaryByIndicator,
    };
  },
});