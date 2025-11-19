import { mutation } from "../_generated/server";

/**
 * Removes state_scores entries for invalid states (like "Data Source", "Data Sourc", etc.)
 * that may have been accidentally imported from spreadsheet headers or metadata rows.
 */
export const cleanupInvalidStates = mutation({
  args: {},
  handler: async (ctx) => {
    // Valid Nigerian states list (FCT is normalized to "Federal Capital Territory")
    const validNigerianStates = new Set([
      "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", 
      "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", 
      "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna", 
      "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", 
      "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", 
      "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara", 
      "Federal Capital Territory"
    ]);

    const allScores = await ctx.db.query("state_scores").collect();
    
    let deletedCount = 0;
    const invalidStates = new Set<string>();

    for (const score of allScores) {
      const normalizedState = score.state.trim();
      // Normalize FCT to Federal Capital Territory for validation
      const stateForValidation = (normalizedState === "FCT" || normalizedState.toUpperCase() === "FCT") 
        ? "Federal Capital Territory" 
        : normalizedState;
        
      if (!validNigerianStates.has(stateForValidation)) {
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

