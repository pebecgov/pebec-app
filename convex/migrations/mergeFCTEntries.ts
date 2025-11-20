import { mutation } from "../_generated/server";
import { normalizeStateName } from "../stateUtils";

/**
 * Merges all "FCT" entries to "Federal Capital Territory" to consolidate data.
 * This ensures FCT and Federal Capital Territory are treated as the same state.
 */
export const mergeFCTEntries = mutation({
  args: {},
  handler: async (ctx) => {
    // Find all scores with "FCT" as the state name
    const allScores = await ctx.db.query("state_scores").collect();
    
    const fctScores = allScores.filter(
      (score) => normalizeStateName(score.state) === "Federal Capital Territory" && score.state.trim().toUpperCase() === "FCT"
    );

    if (fctScores.length === 0) {
      return {
        merged: 0,
        message: "No FCT entries found to merge",
      };
    }

    let mergedCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;

    // Group FCT scores by indicator and subIndicator to check for duplicates
    const fctScoresByKey = new Map<string, typeof fctScores[0][]>();
    
    for (const score of fctScores) {
      const key = `${score.indicator}|${score.subIndicator}`;
      if (!fctScoresByKey.has(key)) {
        fctScoresByKey.set(key, []);
      }
      fctScoresByKey.get(key)!.push(score);
    }

    // For each unique indicator+subIndicator combination
    for (const [key, scores] of fctScoresByKey.entries()) {
      // Check if "Federal Capital Territory" already has a score for this combination
      const existingFCTScore = await ctx.db
        .query("state_scores")
        .withIndex("byStateIndicatorSubIndicator", (q) =>
          q
            .eq("state", "Federal Capital Territory")
            .eq("indicator", scores[0].indicator)
            .eq("subIndicator", scores[0].subIndicator)
        )
        .first();

      if (existingFCTScore) {
        // If Federal Capital Territory already exists, keep the one with the higher score
        // or the most recent one, then delete FCT entries
        for (const fctScore of scores) {
          if (fctScore.score > existingFCTScore.score) {
            // Update existing entry with higher score
            await ctx.db.patch(existingFCTScore._id, {
              value: fctScore.value,
              score: fctScore.score,
              linkToSource: fctScore.linkToSource || existingFCTScore.linkToSource,
            });
            updatedCount++;
          }
          // Delete FCT entry
          await ctx.db.delete(fctScore._id);
          deletedCount++;
        }
      } else {
        // No existing Federal Capital Territory entry, update the first FCT entry
        const firstScore = scores[0];
        await ctx.db.patch(firstScore._id, {
          state: "Federal Capital Territory",
        });
        mergedCount++;
        
        // Delete any additional FCT entries for the same indicator+subIndicator
        for (let i = 1; i < scores.length; i++) {
          await ctx.db.delete(scores[i]._id);
          deletedCount++;
        }
      }
    }

    return {
      merged: mergedCount,
      updated: updatedCount,
      deleted: deletedCount,
      totalProcessed: fctScores.length,
    };
  },
});

