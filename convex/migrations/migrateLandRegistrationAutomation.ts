import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getSubIndicatorScore } from "../config/indicators";

/**
 * Remaps digitalizing_land_registration scores to the spreadsheet model:
 *   Availability of GIS (yes/no 3)
 *   Automation: full (7) / semi (5) / document downloads (2) / none (0)
 *
 * CLI:
 *   npx convex run migrations/migrateLandRegistrationAutomation:migrateLandRegistrationAutomation '{"dryRun":true,"year":2026}'
 *   npx convex run migrations/migrateLandRegistrationAutomation:migrateLandRegistrationAutomation '{"year":2026}'
 */
export const migrateLandRegistrationAutomation = mutation({
  args: {
    year: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { year, dryRun }) => {
    const dry = !!dryRun;
    const rows = await ctx.db
      .query("state_scores")
      .withIndex("byIndicator", (q) =>
        q.eq("indicator", "digitalizing_land_registration"),
      )
      .collect();

    const scoped = rows.filter((row) => (year == null ? true : row.year === year));
    let updated = 0;
    let unchanged = 0;
    const samples: string[] = [];

    const mapGis = (value: string): string => {
      if (value === "yes" || value === "no") return value;
      if (value === "excellent" || value === "good" || value === "fair") return "yes";
      if (value === "none") return "no";
      return value;
    };

    const mapAutomated = (value: string): string => {
      if (
        value === "full_automation" ||
        value === "semi_automation" ||
        value === "document_downloads" ||
        value === "none"
      ) {
        return value;
      }
      if (value === "yes" || value === "fully-automated") return "full_automation";
      if (value === "hybrid") return "semi_automation";
      if (value === "no" || value === "manual") return "none";
      return value;
    };

    for (const row of scoped) {
      const assessmentYear = row.year ?? new Date().getFullYear();
      let nextValue = row.value ?? "";
      if (row.subIndicator === "gis") nextValue = mapGis(nextValue);
      if (row.subIndicator === "automated") nextValue = mapAutomated(nextValue);

      const nextScore = getSubIndicatorScore(
        row.indicator,
        row.subIndicator,
        nextValue,
        assessmentYear,
      );
      const valueChanged = nextValue !== (row.value ?? "");
      const scoreChanged = Number(row.score) !== nextScore;
      if (!valueChanged && !scoreChanged) {
        unchanged += 1;
        continue;
      }
      if (samples.length < 30) {
        samples.push(
          `${row.state} (${assessmentYear}) ${row.subIndicator}: ${row.value}/${row.score} → ${nextValue}/${nextScore}`,
        );
      }
      if (!dry) {
        await ctx.db.patch(row._id, { value: nextValue, score: nextScore });
      }
      updated += 1;
    }

    return {
      dryRun: dry,
      year: year ?? "all",
      scanned: scoped.length,
      updated,
      unchanged,
      samples,
      message: dry
        ? "Dry run only — re-run without dryRun to apply."
        : "Land registration automation migration applied.",
    };
  },
});
