import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getSubIndicatorScore } from "../config/indicators";

/**
 * Recomputes state_scores.score from stored value + year framework.
 * Fixes rows where the matrix shows "Yes (3)" but Analysis shows 0
 * because score was saved as 0 when GIS options changed.
 *
 * Run: npx convex run migrations/rescoreStateScoresFromValues:rescoreStateScoresFromValues '{"year":2026}'
 */
export const rescoreStateScoresFromValues = internalMutation({
  args: {
    year: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { year, dryRun }) => {
    const assessmentYear = year ?? new Date().getFullYear();
    const rows = await ctx.db
      .query("state_scores")
      .withIndex("byYear", (q) => q.eq("year", assessmentYear))
      .collect();

    let updated = 0;
    let unchanged = 0;
    const samples: Array<{
      state: string;
      indicator: string;
      subIndicator: string;
      value: string;
      before: number;
      after: number;
    }> = [];

    for (const row of rows) {
      const computed = getSubIndicatorScore(
        row.indicator,
        row.subIndicator,
        row.value ?? "",
        assessmentYear
      );
      const before = Number(row.score) || 0;
      if (before === computed) {
        unchanged += 1;
        continue;
      }
      if (samples.length < 25) {
        samples.push({
          state: row.state,
          indicator: row.indicator,
          subIndicator: row.subIndicator,
          value: row.value ?? "",
          before,
          after: computed,
        });
      }
      if (!dryRun) {
        await ctx.db.patch(row._id, { score: computed });
      }
      updated += 1;
    }

    return {
      year: assessmentYear,
      dryRun: !!dryRun,
      scanned: rows.length,
      updated,
      unchanged,
      samples,
    };
  },
});
