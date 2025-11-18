import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

/**
 * Bulk import state scores from parsed Excel/CSV data
 * Expected format: Array of objects with:
 * - state: string
 * - indicator: string (indicator key)
 * - subIndicator: string (sub-indicator key)
 * - value: string (selected option value)
 * - linkToSource?: string (optional)
 */
export const bulkImportStateScores = mutation({
  args: {
    scores: v.array(
      v.object({
        state: v.string(),
        indicator: v.string(),
        subIndicator: v.string(),
        value: v.string(),
        linkToSource: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { scores }) => {
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const scoreData of scores) {
      try {
        // Use the existing saveStateScore mutation logic
        await ctx.runMutation(api.saveStateScore.saveStateScore, {
          state: scoreData.state,
          indicator: scoreData.indicator,
          subIndicator: scoreData.subIndicator,
          value: scoreData.value,
          linkToSource: scoreData.linkToSource,
        });
        successCount++;
      } catch (error) {
        errorCount++;
        errors.push(
          `${scoreData.state} - ${scoreData.indicator} - ${scoreData.subIndicator}: ${error}`
        );
      }
    }

    return {
      success: true,
      imported: successCount,
      errors: errorCount,
      errorMessages: errors,
    };
  },
});

