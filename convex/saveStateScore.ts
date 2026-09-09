import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getSubIndicatorScore } from "./config/indicators";
import { normalizeStateName } from "./stateUtils";
import { getCurrentUserOrThrow } from "./users";
import { logAuditEvent } from "./utils/auditLog";

export const saveStateScore = mutation({
  args: {
    state: v.string(),
    indicator: v.string(),
    subIndicator: v.string(),
    value: v.string(),
    linkToSource: v.optional(v.string()),
    year: v.optional(v.number())
  },
  handler: async (ctx, { state, indicator, subIndicator, value, linkToSource, year }) => {
    const actor = await getCurrentUserOrThrow(ctx);
    if (actor.role !== "admin" && actor.role !== "staff") {
      throw new Error("Unauthorized");
    }

    const assessmentYear = year || new Date().getFullYear();
    const normalizedState = normalizeStateName(state);

    // Points come from the framework in force for the year being scored.
    const score = getSubIndicatorScore(indicator, subIndicator, value, assessmentYear);

    // Check if a record already exists for this combination in the same year
    const existingRecord = await ctx.db
      .query("state_scores")
      .withIndex("byYearStateIndicatorSubIndicator", (q) =>
        q
          .eq("year", assessmentYear)
          .eq("state", normalizedState)
          .eq("indicator", indicator)
          .eq("subIndicator", subIndicator)
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
        year: assessmentYear,
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
    linkToSource: v.string(),
    year: v.optional(v.number())
  },
  handler: async (ctx, { state, indicator, subIndicator, linkToSource, year }) => {
    const assessmentYear = year || new Date().getFullYear();
    const normalizedState = normalizeStateName(state);

    // Check if a record already exists for this combination in the same year
    const existingRecord = await ctx.db
      .query("state_scores")
      .withIndex("byYearStateIndicatorSubIndicator", (q) =>
        q
          .eq("year", assessmentYear)
          .eq("state", normalizedState)
          .eq("indicator", indicator)
          .eq("subIndicator", subIndicator)
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
        state: normalizedState,
        indicator,
        subIndicator,
        value: "",
        score: 0,
        linkToSource,
        year: assessmentYear,
        createdAt: Date.now()
      });
      return scoreId;
    }
  }
});

/**
 * Batch upsert for the indicator matrix UI. Saves only the provided cells
 * (typically dirty ones) for one indicator/year.
 */
export const bulkSaveStateScoreCells = mutation({
  args: {
    year: v.number(),
    indicator: v.string(),
    cells: v.array(
      v.object({
        state: v.string(),
        subIndicator: v.string(),
        value: v.string(),
      })
    ),
  },
  returns: v.object({
    saved: v.number(),
    inserted: v.number(),
    updated: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx, { year, indicator, cells }) => {
    const actor = await getCurrentUserOrThrow(ctx);
    if (actor.role !== "admin" && actor.role !== "staff") {
      throw new Error("Unauthorized");
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const cell of cells) {
      if (!cell.value) {
        skipped += 1;
        continue;
      }

      const state = normalizeStateName(cell.state);
      const score = getSubIndicatorScore(indicator, cell.subIndicator, cell.value, year);

      const existing = await ctx.db
        .query("state_scores")
        .withIndex("byYearStateIndicatorSubIndicator", (q) =>
          q
            .eq("year", year)
            .eq("state", state)
            .eq("indicator", indicator)
            .eq("subIndicator", cell.subIndicator)
        )
        .first();

      if (existing) {
        if (existing.value === cell.value && existing.score === score) {
          skipped += 1;
          continue;
        }
        await ctx.db.patch(existing._id, { value: cell.value, score });
        updated += 1;
      } else {
        await ctx.db.insert("state_scores", {
          state,
          indicator,
          subIndicator: cell.subIndicator,
          value: cell.value,
          score,
          year,
          createdAt: Date.now(),
        });
        inserted += 1;
      }
    }

    const saved = inserted + updated;
    if (saved > 0) {
      await logAuditEvent(ctx, {
        action: "bfa.state_score_saved",
        category: "bfa",
        summary: `Matrix saved ${saved} cells for ${indicator} (${year})`,
        actor,
        metadata: {
          indicator,
          year,
          inserted,
          updated,
          skipped,
          cellCount: cells.length,
        },
      });
    }

    return { saved, inserted, updated, skipped };
  },
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
    
    // Start with year-based filtering using indexes for better performance
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


