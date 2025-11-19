import { mutation } from "../_generated/server";

export const deleteAllStateScores = mutation({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("state_scores").collect();

    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }

    return {
      deleted: docs.length,
    };
  },
});


