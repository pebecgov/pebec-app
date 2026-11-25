import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getSubIndicatorScore } from "../config/indicators";

/**
 * Remaps Technical & Vocational Training Centers options to:
 *   13 and above → 5
 *   12 and below → 2
 *
 * Legacy: seven-plus → thirteen-plus (5);
 *         four-to-six / one-to-three / zero → twelve-or-below (2)
 *
 * CLI:
 *   npx convex run migrations/migrateTvetCentreTiers:migrateTvetCentreTiers '{"dryRun":true,"year":2026}'
 *   npx convex run migrations/migrateTvetCentreTiers:migrateTvetCentreTiers '{"year":2026}'
 */
export const migrateTvetCentreTiers = mutation({
  args: {
    year: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { year, dryRun }) => {
    const dry = !!dryRun;
    const targetYear = year ?? 2026;
    const rows = await ctx.db
      .query("state_scores")
      .withIndex("byIndicator", (q) =>
        q.eq("indicator", "access_to_skilled_labour")
      )
      .collect();

    const scoped = rows.filter(
      (row) =>
        row.subIndicator === "technical_vocational_training_centers" &&
        row.year === targetYear
    );

    let updated = 0;
    let unchanged = 0;
    const samples: string[] = [];

    const mapValue = (value: string): string => {
      if (value === "thirteen-plus" || value === "twelve-or-below") return value;
      if (value === "seven-plus") return "thirteen-plus";
      if (
        value === "four-to-six" ||
        value === "one-to-three" ||
        value === "zero"
      ) {
        return "twelve-or-below";
      }
      return value;
    };

    for (const row of scoped) {
      const nextValue = mapValue(row.value ?? "");
      const nextScore = getSubIndicatorScore(
        "access_to_skilled_labour",
        "technical_vocational_training_centers",
        nextValue,
        targetYear
      );
      if (nextValue === (row.value ?? "") && Number(row.score) === nextScore) {
        unchanged += 1;
        continue;
      }
      if (samples.length < 40) {
        samples.push(
          `${row.state}: ${row.value}/${row.score} → ${nextValue}/${nextScore}`
        );
      }
      if (!dry) {
        await ctx.db.patch(row._id, { value: nextValue, score: nextScore });
      }
      updated += 1;
    }

    return {
      dryRun: dry,
      year: targetYear,
      scanned: scoped.length,
      updated,
      unchanged,
      samples,
      message: dry
        ? "Dry run only — re-run without dryRun to apply."
        : "TVET centre tiers migrated to 13+ / 12-and-below.",
    };
  },
});
