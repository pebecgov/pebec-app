import { mutation } from "../_generated/server";

/**
 * Resets all crisis_resilience data so new sheets can be re-uploaded cleanly.
 */
export const updateCrisisResilience = mutation({
  args: {},
  handler: async (ctx) => {
    const scores = await ctx.db
      .query("state_scores")
      .withIndex("byIndicator", (q) => q.eq("indicator", "crisis_resilience"))
      .collect();

    for (const score of scores) {
      await ctx.db.delete(score._id);
    }

    return { deleted: scores.length };
  },
});

