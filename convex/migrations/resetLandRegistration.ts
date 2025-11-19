import { mutation } from "../_generated/server";

/**
 * Deletes all land_registration indicator scores from state_scores.
 * Use this before re-importing with the updated scoring structure (process_automation now 2 points, certificate_time now 1 point max, gis_functionality now 2 points).
 */
export const resetLandRegistration = mutation({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db
      .query("state_scores")
      .withIndex("byIndicator", (q) => q.eq("indicator", "land_registration"))
      .collect();

    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }

    return { deleted: docs.length };
  },
});

