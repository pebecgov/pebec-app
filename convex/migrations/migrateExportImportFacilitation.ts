import { mutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Migration to update export_import_facilitation scoring system
 * 
 * Old system:
 * - >999 (1000+) → 3 points
 * - 500-999 → 2 points
 * - 0-499 → 1 point
 * 
 * New system:
 * - >=1000 → 3 points
 * - 500-999 → 2 points
 * - 100-499 → 1 point
 * - 0-99 → 0 points
 * 
 * Migration mapping:
 * - ">999" → ">=1000" (same score, 3 points)
 * - "500-999" → "500-999" (no change)
 * - "0-499" → "100-499" (preserves 1 point, but may need manual review for states with <100 exporters)
 * 
 * IMPORTANT: States with "0-499" are mapped to "100-499" to preserve their score.
 * You may want to manually review states that likely have <100 exporters and update them to "0-99".
 */
export const migrateExportImportFacilitation = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all state scores for export_import_facilitation indicator
    const allScores = await ctx.db
      .query("state_scores")
      .withIndex("byIndicator", (q) => q.eq("indicator", "export_import_facilitation"))
      .collect();

    let updatedCount = 0;
    let skippedCount = 0;
    const migrationResults: string[] = [];

    for (const score of allScores) {
      // Only migrate totalExporters_perState sub-indicator
      if (score.subIndicator !== "totalExporters_perState") {
        continue;
      }

      let newValue: string | null = null;
      let newScore: number = score.score;

      // Map old values to new values
      switch (score.value) {
        case ">999":
          newValue = ">=1000";
          newScore = 3; // Same score
          break;
        case "500-999":
          newValue = "500-999";
          newScore = 2; // No change
          break;
        case "0-499":
          // Map to "100-499" to preserve the 1 point score
          // Note: This may need manual review for states with <100 exporters
          newValue = "100-499";
          newScore = 1; // Preserves score
          migrationResults.push(
            `⚠️ ${score.state}: "0-499" → "100-499" (may need review if <100 exporters)`
          );
          break;
        default:
          // Already using new values or unknown value
          skippedCount++;
          continue;
      }

      if (newValue) {
        await ctx.db.patch(score._id, {
          value: newValue,
          score: newScore,
        });
        updatedCount++;
      }
    }

    return {
      success: true,
      updated: updatedCount,
      skipped: skippedCount,
      total: allScores.length,
      migrationResults,
      message: `Migration complete. Updated ${updatedCount} records. ${skippedCount} skipped.`,
    };
  },
});

