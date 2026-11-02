import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getSubIndicatorScore } from "../config/indicators";

/**
 * Remaps harmonized_taxes to:
 *   Law 3 + Digitized Tax System 2 + Publication of Fees 2 + Procedures 2 + Incentives 1
 *
 * - digitized: digital/hybrid/yes → yes (2); manual/no → no (0)
 * - publication_of_fees_procedures → split into publication_of_fees + procedures, then deleted
 *
 * CLI:
 *   npx convex run migrations/migrateHarmonizedTaxesBreakdown:migrateHarmonizedTaxesBreakdown '{"dryRun":true,"year":2026}'
 *   npx convex run migrations/migrateHarmonizedTaxesBreakdown:migrateHarmonizedTaxesBreakdown '{"year":2026}'
 */
export const migrateHarmonizedTaxesBreakdown = mutation({
  args: {
    year: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { year, dryRun }) => {
    const dry = !!dryRun;
    const rows = await ctx.db
      .query("state_scores")
      .withIndex("byIndicator", (q) => q.eq("indicator", "harmonized_taxes"))
      .collect();

    const scoped = rows.filter((row) => (year == null ? true : row.year === year));

    type Row = (typeof scoped)[number];
    const byStateYear = new Map<string, Row[]>();
    for (const row of scoped) {
      const key = `${row.state}::${row.year ?? "none"}`;
      const list = byStateYear.get(key) ?? [];
      list.push(row);
      byStateYear.set(key, list);
    }

    let digitizedUpdated = 0;
    let publicationCreated = 0;
    let combinedDeleted = 0;
    let unchanged = 0;
    const samples: string[] = [];

    const mapDigitized = (value: string): "yes" | "no" | string => {
      if (value === "yes" || value === "no") return value;
      if (value === "digital" || value === "hybrid") return "yes";
      if (value === "manual") return "no";
      return value;
    };

    const splitPublication = (
      value: string
    ): { fees: "yes" | "no"; procedures: "yes" | "no" } => {
      if (value === "publicly-available") return { fees: "yes", procedures: "yes" };
      if (value === "partial") return { fees: "yes", procedures: "no" };
      return { fees: "no", procedures: "no" };
    };

    for (const [, group] of byStateYear) {
      const assessmentYear = group[0]?.year ?? new Date().getFullYear();
      const state = group[0]!.state;
      const yearValue = group[0]!.year;

      const digitized = group.find((r) => r.subIndicator === "digitized_tax_payment");
      const combined = group.find(
        (r) => r.subIndicator === "publication_of_fees_procedures"
      );
      const existingFees = group.find((r) => r.subIndicator === "publication_of_fees");
      const existingProcedures = group.find((r) => r.subIndicator === "procedures");

      if (digitized) {
        const nextValue = mapDigitized(digitized.value ?? "");
        const nextScore = getSubIndicatorScore(
          "harmonized_taxes",
          "digitized_tax_payment",
          nextValue,
          assessmentYear
        );
        if (nextValue !== (digitized.value ?? "") || Number(digitized.score) !== nextScore) {
          if (samples.length < 40) {
            samples.push(
              `${state} (${assessmentYear}) digitized: ${digitized.value}/${digitized.score} → ${nextValue}/${nextScore}`
            );
          }
          if (!dry) {
            await ctx.db.patch(digitized._id, { value: nextValue, score: nextScore });
          }
          digitizedUpdated += 1;
        } else {
          unchanged += 1;
        }
      }

      if (!existingFees && !existingProcedures && combined) {
        const split = splitPublication(combined.value ?? "");
        for (const spec of [
          { key: "publication_of_fees" as const, value: split.fees },
          { key: "procedures" as const, value: split.procedures },
        ]) {
          const score = getSubIndicatorScore(
            "harmonized_taxes",
            spec.key,
            spec.value,
            assessmentYear
          );
          if (samples.length < 40) {
            samples.push(
              `${state} (${assessmentYear}) ${spec.key}: (create) ${spec.value}/${score}`
            );
          }
          if (!dry) {
            await ctx.db.insert("state_scores", {
              state,
              indicator: "harmonized_taxes",
              subIndicator: spec.key,
              value: spec.value,
              score,
              linkToSource: combined.linkToSource,
              year: yearValue,
              createdAt: Date.now(),
            });
          }
          publicationCreated += 1;
        }
        if (!dry) {
          await ctx.db.delete(combined._id);
        }
        combinedDeleted += 1;
      } else if (combined) {
        if (!dry) {
          await ctx.db.delete(combined._id);
        }
        combinedDeleted += 1;
      }
    }

    return {
      dryRun: dry,
      year: year ?? "all",
      statesTouched: byStateYear.size,
      digitizedUpdated,
      publicationCreated,
      combinedDeleted,
      unchanged,
      samples,
      message: dry
        ? "Dry run only — re-run without dryRun to apply."
        : "Harmonized taxes breakdown migration applied.",
    };
  },
});
