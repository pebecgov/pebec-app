import { mutation } from "../_generated/server";

/**
 * Deletes all investor_aftercare_service indicator scores.
 */
export const resetInvestorAftercare = mutation({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db
      .query("state_scores")
      .withIndex("byIndicator", (q) => q.eq("indicator", "investor_aftercare_service"))
      .collect();

    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }

    return { deleted: docs.length };
  },
});

