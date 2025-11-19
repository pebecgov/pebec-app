import { mutation } from "../_generated/server";

/**
 * Removes deprecated crisis_resilience sub-indicators and updates scores.
 * - Deletes any `export_strategy` rows.
 * - Ensures `sema_funding` rows award 2 points when the value is "yes".
 */
export const updateCrisisResilience = mutation({
  args: {},
  handler: async (ctx) => {
    const scores = await ctx.db
      .query("state_scores")
      .withIndex("byIndicator", (q) => q.eq("indicator", "crisis_resilience"))
      .collect();

    let deleted = 0;
    let updated = 0;

    for (const score of scores) {
      if (score.subIndicator === "export_strategy") {
        await ctx.db.delete(score._id);
        deleted++;
        continue;
      }

      if (score.subIndicator === "sema_funding") {
        const newScore = score.value === "yes" ? 2 : 0;
        if (score.score !== newScore) {
          await ctx.db.patch(score._id, { score: newScore });
          updated++;
        }
      }
    }

    return {
      deletedExportStrategy: deleted,
      updatedSemaFunding: updated,
    };
  },
});

