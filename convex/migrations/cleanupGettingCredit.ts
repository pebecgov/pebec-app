import { mutation } from "../_generated/server";

/**
 * Removes incorrect getting credit records created with the wrong indicator
 * or sub-indicator keys (e.g. "getting_cre", "collaborate_with_boi").
 */
export const cleanupGettingCredit = mutation({
  args: {},
  handler: async (ctx) => {
    const deletedIds: string[] = [];

    // Delete rows saved under the wrong indicator key ("getting_cre")
    const wrongIndicator = await ctx.db
      .query("state_scores")
      .withIndex("byIndicator", (q) => q.eq("indicator", "getting_cre"))
      .collect();

    for (const doc of wrongIndicator) {
      await ctx.db.delete(doc._id);
      deletedIds.push(doc._id);
    }

    // Delete rows with incorrect sub-indicator keys under the correct indicator
    const wrongSubIndicators = await ctx.db
      .query("state_scores")
      .withIndex("byIndicator", (q) => q.eq("indicator", "getting_credit"))
      .collect();

    for (const doc of wrongSubIndicators) {
      if (
        doc.subIndicator === "collaborate_with_boi" ||
        doc.subIndicator === "state_owned_microfinance_banks"
      ) {
        await ctx.db.delete(doc._id);
        deletedIds.push(doc._id);
      }
    }

    return {
      deletedCount: deletedIds.length,
      details: deletedIds,
    };
  },
});

