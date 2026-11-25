import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getSubIndicatorScore } from "../config/indicators";
import { normalizeStateName } from "../stateUtils";

/**
 * Imports PEBEC_Access_to_Skilled_Workers_Scores.xlsx Total / 5 into
 * access_to_skilled_labour / skilled_workers_index, and removes retired
 * technical_vocational_training_centers rows for that year.
 *
 * Totals = relative uni/2 + accredited TVET/2 + centres/1 (sheet methodology).
 *
 * CLI:
 *   npx convex run migrations/migrateSkilledWorkersSheetTotals:migrateSkilledWorkersSheetTotals '{"dryRun":true,"year":2026}'
 *   npx convex run migrations/migrateSkilledWorkersSheetTotals:migrateSkilledWorkersSheetTotals '{"year":2026}'
 */
/** Sheet totals rounded to 2dp for readable admin UI and reports. */
const SHEET_TOTALS: ReadonlyArray<{ state: string; total: number }> = [
  { state: "Lagos", total: 4.13 },
  { state: "Ogun", total: 3.89 },
  { state: "Kaduna", total: 3.14 },
  { state: "Osun", total: 3.05 },
  { state: "Kwara", total: 3.03 },
  { state: "Kano", total: 2.92 },
  { state: "Oyo", total: 2.85 },
  { state: "Federal Capital Territory", total: 2.82 },
  { state: "Delta", total: 2.8 },
  { state: "Nasarawa", total: 2.31 },
  { state: "Niger", total: 2.21 },
  { state: "Edo", total: 2.14 },
  { state: "Anambra", total: 2.07 },
  { state: "Akwa Ibom", total: 1.98 },
  { state: "Enugu", total: 1.97 },
  { state: "Ondo", total: 1.76 },
  { state: "Abia", total: 1.73 },
  { state: "Katsina", total: 1.7 },
  { state: "Plateau", total: 1.68 },
  { state: "Benue", total: 1.58 },
  { state: "Ekiti", total: 1.55 },
  { state: "Imo", total: 1.52 },
  { state: "Cross River", total: 1.43 },
  { state: "Ebonyi", total: 1.4 },
  { state: "Bauchi", total: 1.39 },
  { state: "Rivers", total: 1.26 },
  { state: "Adamawa", total: 1.26 },
  { state: "Sokoto", total: 1.25 },
  { state: "Gombe", total: 1.22 },
  { state: "Taraba", total: 1.19 },
  { state: "Borno", total: 1.18 },
  { state: "Kogi", total: 1.18 },
  { state: "Kebbi", total: 1.14 },
  { state: "Jigawa", total: 1.13 },
  { state: "Zamfara", total: 1.06 },
  { state: "Yobe", total: 1.0 },
  { state: "Bayelsa", total: 0.87 },
];

export const migrateSkilledWorkersSheetTotals = mutation({
  args: {
    year: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { year, dryRun }) => {
    const dry = !!dryRun;
    const targetYear = year ?? 2026;
    const linkToSource =
      "PEBEC_Access_to_Skilled_Workers_Scores.xlsx (relative uni+TVET+centres)";

    const existing = await ctx.db
      .query("state_scores")
      .withIndex("byIndicator", (q) =>
        q.eq("indicator", "access_to_skilled_labour")
      )
      .collect();

    const scoped = existing.filter((row) => row.year === targetYear);

    let upserted = 0;
    let deletedLegacy = 0;
    let unchanged = 0;
    const samples: string[] = [];

    for (const entry of SHEET_TOTALS) {
      const state = normalizeStateName(entry.state);
      const rounded = Math.round(entry.total * 100) / 100;
      const value = rounded.toFixed(2);
      const score = getSubIndicatorScore(
        "access_to_skilled_labour",
        "skilled_workers_index",
        value,
        targetYear
      );

      const current = scoped.find(
        (r) =>
          r.state === state && r.subIndicator === "skilled_workers_index"
      );

      if (
        current &&
        current.value === value &&
        Number(current.score) === score
      ) {
        unchanged += 1;
        continue;
      }

      if (samples.length < 15) {
        samples.push(
          `${state}: ${current ? `${current.value}/${current.score}` : "(new)"} → ${value}/${score}`
        );
      }

      if (!dry) {
        if (current) {
          await ctx.db.patch(current._id, {
            value,
            score,
            linkToSource,
          });
        } else {
          await ctx.db.insert("state_scores", {
            state,
            indicator: "access_to_skilled_labour",
            subIndicator: "skilled_workers_index",
            value,
            score,
            linkToSource,
            year: targetYear,
            createdAt: Date.now(),
          });
        }
      }
      upserted += 1;
    }

    for (const row of scoped) {
      if (row.subIndicator === "technical_vocational_training_centers") {
        if (samples.length < 40) {
          samples.push(
            `${row.state}: delete legacy TVET ${row.value}/${row.score}`
          );
        }
        if (!dry) {
          await ctx.db.delete(row._id);
        }
        deletedLegacy += 1;
      }
      // Also drop any leftover tertiary_institutions from older frameworks on 2026 rows.
      if (row.subIndicator === "tertiary_institutions") {
        if (!dry) {
          await ctx.db.delete(row._id);
        }
        deletedLegacy += 1;
      }
    }

    return {
      dryRun: dry,
      year: targetYear,
      sheetRows: SHEET_TOTALS.length,
      upserted,
      unchanged,
      deletedLegacy,
      samples,
      message: dry
        ? "Dry run only — re-run without dryRun to apply."
        : "Skilled workers sheet totals imported; legacy TVET rows removed.",
    };
  },
});
