import { mutation } from "../_generated/server";

/**
 * Deletes all market_access indicator scores from state_scores.
 * Use this before re-importing with the updated one_stop_shop scoring (now 2 points instead of 1).
 */
export const resetMarketAccess = mutation({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db
      .query("state_scores")
      .withIndex("byIndicator", (q) => q.eq("indicator", "market_access"))
      .collect();

    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }

    return { deleted: docs.length };
  },
});

