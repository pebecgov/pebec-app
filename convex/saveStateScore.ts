import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { indicators } from "./config/indicators";
import { normalizeStateName } from "./stateUtils";
import { getCurrentUserOrThrow } from "./users";
import { logAuditEvent } from "./utils/auditLog";

export const saveStateScore = mutation({
  args: {
    state: v.string(),
    indicator: v.string(),
    subIndicator: v.string(),
    value: v.string(),
    linkToSource: v.optional(v.string())
  },
  handler: async (ctx, { state, indicator, subIndicator, value, linkToSource }) => {
    const actor = await getCurrentUserOrThrow(ctx);
    if (actor.role !== "admin" && actor.role !== "staff") {
      throw new Error("Unauthorized");
    }

    const normalizedState = normalizeStateName(state);
    let score = 0;

    // Fetch score dynamically from indicators configuration
    const indicatorKey = indicator as keyof typeof indicators;
    const indicatorConfig = indicators[indicatorKey];
    
    if (indicatorConfig) {
      const subIndicators = indicatorConfig.subIndicators as unknown as Record<string, { label: string; options: Array<{ value: string; label: string; score: number }> }>;
      const subIndicatorConfig = subIndicators[subIndicator];
      
      if (subIndicatorConfig && subIndicatorConfig.options) {
        const selectedOption = subIndicatorConfig.options.find((opt) => opt.value === value);
        score = selectedOption ? selectedOption.score : 0;
      } else {
        console.warn(`No config found for subIndicator: ${subIndicator} in indicator: ${indicator}`);
      }
    } else {
      console.warn(`No config found for indicator: ${indicator}`);
    }
    
    // Check if a record already exists for this combination
    const existingRecord = await ctx.db
      .query("state_scores")
      .withIndex("byStateIndicatorSubIndicator", (q) => 
        q.eq("state", normalizedState).eq("indicator", indicator).eq("subIndicator", subIndicator)
      )
      .first();
    
    if (existingRecord) {
      const before = { value: existingRecord.value, score: existingRecord.score };
      // Update existing record
      await ctx.db.patch(existingRecord._id, {
        value,
        score,
        ...(linkToSource !== undefined && { linkToSource })
      });

      await logAuditEvent(ctx, {
        action: "bfa.state_score_saved",
        category: "bfa",
        summary: `Updated ${normalizedState} score for ${indicator} / ${subIndicator}`,
        actor,
        target: {
          type: "state",
          id: existingRecord._id,
          label: normalizedState,
        },
        metadata: { indicator, subIndicator, before, after: { value, score } },
      });

      return existingRecord._id;
    } else {
      // Create new record
      const scoreId = await ctx.db.insert("state_scores", {
        state: normalizedState,
        indicator,
        subIndicator,
        value,
        score,
        linkToSource,
        createdAt: Date.now()
      });

      await logAuditEvent(ctx, {
        action: "bfa.state_score_saved",
        category: "bfa",
        summary: `Set ${normalizedState} score for ${indicator} / ${subIndicator}`,
        actor,
        target: {
          type: "state",
          id: scoreId,
          label: normalizedState,
        },
        metadata: { indicator, subIndicator, after: { value, score } },
      });

      return scoreId;
    }
  }
});

export const saveStateScoreLink = mutation({
  args: {
    state: v.string(),
    indicator: v.string(),
    subIndicator: v.string(),
    linkToSource: v.string()
  },
  handler: async (ctx, { state, indicator, subIndicator, linkToSource }) => {
    // Check if a record already exists for this combination
    const existingRecord = await ctx.db
      .query("state_scores")
      .withIndex("byStateIndicatorSubIndicator", (q) => 
        q.eq("state", state).eq("indicator", indicator).eq("subIndicator", subIndicator)
      )
      .first();
    
    if (existingRecord) {
      // Update existing record with link
      await ctx.db.patch(existingRecord._id, {
        linkToSource
      });
      return existingRecord._id;
    } else {
      // Create new record with just the link (score will be 0)
      const scoreId = await ctx.db.insert("state_scores", {
        state,
        indicator,
        subIndicator,
        value: "",
        score: 0,
        linkToSource,
        createdAt: Date.now()
      });
      return scoreId;
    }
  }
});

export const getStateScores = query({
  args: {
    state: v.optional(v.string()),
    indicator: v.optional(v.string()),
    year: v.optional(v.number())
  },
  handler: async (ctx, { state, indicator, year }) => {
    const currentYear = year || new Date().getFullYear();
    const normalizedState = state ? normalizeStateName(state) : undefined;
    
    // Start with year-based filtering
    let results = await ctx.db
      .query("state_scores")
      .withIndex("byYear", (q) => q.eq("year", currentYear))
      .collect();
    
    // Apply additional filters in memory
    if (normalizedState) {
      results = results.filter(score => score.state === normalizedState);
    }
    
    if (indicator) {
      results = results.filter(score => score.indicator === indicator);
    }
    
    return results;
  }
});

export const getStateRankings = query({
  args: {
    indicator: v.optional(v.string())
  },
  handler: async (ctx, { indicator }) => {
    const scores = await ctx.db.query("state_scores").collect();
    
    // Total possible points across all indicators
    const TOTAL_POSSIBLE_POINTS = 79;
    
    // Group by state and calculate totals
    const stateTotals: Record<string, number> = {};
    
    scores.forEach(score => {
      if (!indicator || score.indicator === indicator) {
        if (!stateTotals[score.state]) {
          stateTotals[score.state] = 0;
        }
        stateTotals[score.state] += score.score;
      }
    });
    
    // Calculate percentage scores and sort by percentage
    return Object.entries(stateTotals)
      .map(([state, totalScore]) => ({ 
        state, 
        totalScore,
        percentageScore: (totalScore / TOTAL_POSSIBLE_POINTS) * 100
      }))
      .sort((a, b) => b.percentageScore - a.percentageScore);
  }
});
