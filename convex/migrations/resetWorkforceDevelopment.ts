import { mutation } from "../_generated/server";

/**
 * Deletes all workforce_development indicator scores from state_scores.
 */
export const resetWorkforceDevelopment = mutation({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db
      .query("state_scores")
      .withIndex("byIndicator", (q) => q.eq("indicator", "workforce_development"))
      .collect();

    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }

    return { deleted: docs.length };
  },
});

