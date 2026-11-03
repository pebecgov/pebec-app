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
const SHEET_TOTALS: ReadonlyArray<{ state: string; total: number }> = [
  { state: "Lagos", total: 4.125506072874494 },
  { state: "Ogun", total: 3.8859649122807016 },
  { state: "Kaduna", total: 3.1390013495276654 },
  { state: "Osun", total: 3.0533063427800267 },
  { state: "Kwara", total: 3.0337381916329287 },
  { state: "Kano", total: 2.9176788124156547 },
  { state: "Oyo", total: 2.854251012145749 },
  { state: "Federal Capital Territory", total: 2.816464237516869 },
  { state: "Delta", total: 2.804993252361673 },
  { state: "Nasarawa", total: 2.3076923076923075 },
  { state: "Niger", total: 2.214574898785425 },
  { state: "Edo", total: 2.144399460188934 },
  { state: "Anambra", total: 2.07085020242915 },
  { state: "Akwa Ibom", total: 1.9831309041835357 },
  { state: "Enugu", total: 1.9723346828609987 },
  { state: "Ondo", total: 1.763157894736842 },
  { state: "Abia", total: 1.7280701754385965 },
  { state: "Katsina", total: 1.703778677462888 },
  { state: "Plateau", total: 1.6815114709851553 },
  { state: "Benue", total: 1.5775978407557354 },
  { state: "Ekiti", total: 1.5465587044534415 },
  { state: "Imo", total: 1.5215924426450744 },
  { state: "Cross River", total: 1.4271255060728745 },
  { state: "Ebonyi", total: 1.3960863697705803 },
  { state: "Bauchi", total: 1.3893387314439947 },
  { state: "Rivers", total: 1.2597840755735492 },
  { state: "Adamawa", total: 1.2557354925775979 },
  { state: "Sokoto", total: 1.248987854251012 },
  { state: "Gombe", total: 1.2179487179487178 },
  { state: "Taraba", total: 1.194331983805668 },
  { state: "Borno", total: 1.1828609986504723 },
  { state: "Kogi", total: 1.1754385964912282 },
  { state: "Kebbi", total: 1.1376518218623481 },
  { state: "Jigawa", total: 1.1295546558704455 },
  { state: "Zamfara", total: 1.0607287449392713 },
  { state: "Yobe", total: 1.00472334682861 },
  { state: "Bayelsa", total: 0.8744939271255061 },
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
      const value = String(entry.total);
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
