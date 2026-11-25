import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getSubIndicatorScore } from "../config/indicators";

/**
 * Remaps grievance_redress_mechanisms (2026) to:
 *   Availability 0.5 + Functionality 2 + Multiple channels 0.5 + Centralized 1
 *
 * - availability_of_grm yes: rescore 1 → 0.5
 * - multiple_channels_functionality → split into functionality + multiple_channels, then deleted
 *   (yes → both yes; no → both no)
 *
 * CLI:
 *   npx convex run migrations/migrateGrmBreakdown:migrateGrmBreakdown '{"dryRun":true,"year":2026}'
 *   npx convex run migrations/migrateGrmBreakdown:migrateGrmBreakdown '{"year":2026}'
 */
export const migrateGrmBreakdown = mutation({
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
        q.eq("indicator", "grievance_redress_mechanisms")
      )
      .collect();

    const scoped = rows.filter((row) => row.year === targetYear);

    type Row = (typeof scoped)[number];
    const byState = new Map<string, Row[]>();
    for (const row of scoped) {
      const list = byState.get(row.state) ?? [];
      list.push(row);
      byState.set(row.state, list);
    }

    let availabilityUpdated = 0;
    let splitCreated = 0;
    let combinedDeleted = 0;
    let unchanged = 0;
    const samples: string[] = [];

    for (const [state, group] of byState) {
      const yearValue = group[0]!.year;
      const availability = group.find(
        (r) => r.subIndicator === "availability_of_grm"
      );
      const combined = group.find(
        (r) => r.subIndicator === "multiple_channels_functionality"
      );
      const existingFunctionality = group.find(
        (r) => r.subIndicator === "functionality"
      );
      const existingChannels = group.find(
        (r) => r.subIndicator === "multiple_channels"
      );

      if (availability) {
        const nextValue = availability.value ?? "";
        const nextScore = getSubIndicatorScore(
          "grievance_redress_mechanisms",
          "availability_of_grm",
          nextValue,
          targetYear
        );
        if (Number(availability.score) !== nextScore) {
          if (samples.length < 40) {
            samples.push(
              `${state} availability: ${availability.value}/${availability.score} → ${nextValue}/${nextScore}`
            );
          }
          if (!dry) {
            await ctx.db.patch(availability._id, { score: nextScore });
          }
          availabilityUpdated += 1;
        } else {
          unchanged += 1;
        }
      }

      if (!existingFunctionality && !existingChannels && combined) {
        const yes = (combined.value ?? "") === "yes";
        const splitValue = yes ? "yes" : "no";
        for (const key of ["functionality", "multiple_channels"] as const) {
          const score = getSubIndicatorScore(
            "grievance_redress_mechanisms",
            key,
            splitValue,
            targetYear
          );
          if (samples.length < 40) {
            samples.push(
              `${state} ${key}: (create) ${splitValue}/${score}`
            );
          }
          if (!dry) {
            await ctx.db.insert("state_scores", {
              state,
              indicator: "grievance_redress_mechanisms",
              subIndicator: key,
              value: splitValue,
              score,
              linkToSource: combined.linkToSource,
              year: yearValue,
              createdAt: Date.now(),
            });
          }
          splitCreated += 1;
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
      year: targetYear,
      statesTouched: byState.size,
      availabilityUpdated,
      splitCreated,
      combinedDeleted,
      unchanged,
      samples,
      message: dry
        ? "Dry run only — re-run without dryRun to apply."
        : "GRM breakdown migrated to Availability 0.5 / Functionality 2 / Channels 0.5 / Centralized 1.",
    };
  },
});
