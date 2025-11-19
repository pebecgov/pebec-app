import { mutation } from "../_generated/server";

export const deleteAllInfrastructureScores = mutation({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db
      .query("state_scores")
      .withIndex("byIndicator", (q) => q.eq("indicator", "infrastructure"))
      .collect();

    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }

    return {
      deleted: docs.length,
    };
  },
});

