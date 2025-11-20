import { mutation } from "../_generated/server";
import { normalizeStateName, VALID_NIGERIAN_STATES } from "../stateUtils";

/**
 * Removes state_scores entries for invalid states (like "Data Source", "Data Sourc", etc.)
 * that may have been accidentally imported from spreadsheet headers or metadata rows.
 */
export const cleanupInvalidStates = mutation({
  args: {},
  handler: async (ctx) => {
    const allScores = await ctx.db.query("state_scores").collect();
    
    let deletedCount = 0;
    const invalidStates = new Set<string>();

    for (const score of allScores) {
      const normalizedState = normalizeStateName(score.state);
      const stateForValidation = normalizedState;
        
      if (!VALID_NIGERIAN_STATES.has(stateForValidation)) {
        await ctx.db.delete(score._id);
        deletedCount++;
        invalidStates.add(normalizedState);
      }
    }

    return {
      deleted: deletedCount,
      invalidStatesFound: Array.from(invalidStates),
    };
  },
});

