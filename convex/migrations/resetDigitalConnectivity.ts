import { mutation } from "../_generated/server";

/**
 * Deletes all digital_connectivity indicator scores.
 */
export const resetDigitalConnectivity = mutation({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db
      .query("state_scores")
      .withIndex("byIndicator", (q) => q.eq("indicator", "digital_connectivity"))
      .collect();

    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }

    return { deleted: docs.length };
  },
});

