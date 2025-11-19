import { mutation } from "../_generated/server";

/**
 * Deletes all access_to_skilled_labour indicator scores from state_scores.
 */
export const resetAccessToSkilledLabour = mutation({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db
      .query("state_scores")
      .withIndex("byIndicator", (q) => q.eq("indicator", "access_to_skilled_labour"))
      .collect();

    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }

    return { deleted: docs.length };
  },
});

