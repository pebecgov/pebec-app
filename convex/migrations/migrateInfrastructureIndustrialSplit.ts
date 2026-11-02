import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getSubIndicatorScore } from "../config/indicators";

/**
 * Remaps infrastructure to:
 *   Presence of Industrial Layout (2) + Functional Industrial Park (6)
 *
 * Legacy `industrial_zones` / `roads_within_state_capital` are expanded or dropped.
 *
 * Mapping from industrial_zones:
 *   eight / excellent / very_good / good → layout yes + park yes
 *   four / fair → layout yes + park no
 *   zero / poor / none → both no
 *
 * CLI:
 *   npx convex run migrations/migrateInfrastructureIndustrialSplit:migrateInfrastructureIndustrialSplit '{"dryRun":true,"year":2026}'
 *   npx convex run migrations/migrateInfrastructureIndustrialSplit:migrateInfrastructureIndustrialSplit '{"year":2026}'
 */
export const migrateInfrastructureIndustrialSplit = mutation({
  args: {
    year: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { year, dryRun }) => {
    const dry = !!dryRun;
    const rows = await ctx.db
      .query("state_scores")
      .withIndex("byIndicator", (q) => q.eq("indicator", "infrastructure"))
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

    let created = 0;
    let deleted = 0;
    let unchanged = 0;
    const samples: string[] = [];

    const mapZones = (
      value: string
    ): { layout: "yes" | "no"; park: "yes" | "no" } => {
      if (
        value === "eight" ||
        value === "excellent" ||
        value === "very_good" ||
        value === "good" ||
        value === "yes"
      ) {
        return { layout: "yes", park: "yes" };
      }
      if (value === "four" || value === "fair") {
        return { layout: "yes", park: "no" };
      }
      return { layout: "no", park: "no" };
    };

    for (const [, group] of byStateYear) {
      const assessmentYear = group[0]?.year ?? new Date().getFullYear();
      const state = group[0]!.state;
      const yearValue = group[0]!.year;

      const zones = group.find((r) => r.subIndicator === "industrial_zones");
      const roads = group.find((r) => r.subIndicator === "roads_within_state_capital");
      const existingLayout = group.find(
        (r) => r.subIndicator === "industrial_layout_presence"
      );
      const existingPark = group.find(
        (r) => r.subIndicator === "functional_industrial_park"
      );

      if (!existingLayout && !existingPark && zones) {
        const mapped = mapZones(zones.value ?? "");
        for (const spec of [
          {
            key: "industrial_layout_presence" as const,
            value: mapped.layout,
          },
          {
            key: "functional_industrial_park" as const,
            value: mapped.park,
          },
        ]) {
          const score = getSubIndicatorScore(
            "infrastructure",
            spec.key,
            spec.value,
            assessmentYear
          );
          if (samples.length < 40) {
            samples.push(
              `${state} (${assessmentYear}) ${spec.key}: (create) ${spec.value}/${score} from zones=${zones.value}`
            );
          }
          if (!dry) {
            await ctx.db.insert("state_scores", {
              state,
              indicator: "infrastructure",
              subIndicator: spec.key,
              value: spec.value,
              score,
              linkToSource: zones.linkToSource,
              year: yearValue,
              createdAt: Date.now(),
            });
          }
          created += 1;
        }
      } else if (existingLayout || existingPark) {
        for (const row of [existingLayout, existingPark]) {
          if (!row) continue;
          const computed = getSubIndicatorScore(
            "infrastructure",
            row.subIndicator,
            row.value ?? "",
            assessmentYear
          );
          if (Number(row.score) === computed) {
            unchanged += 1;
            continue;
          }
          if (!dry) {
            await ctx.db.patch(row._id, { score: computed });
          }
          created += 1;
        }
      }

      for (const legacy of [zones, roads]) {
        if (!legacy) continue;
        if (!dry) {
          await ctx.db.delete(legacy._id);
        }
        deleted += 1;
      }
    }

    return {
      dryRun: dry,
      year: year ?? "all",
      statesTouched: byStateYear.size,
      created,
      deleted,
      unchanged,
      samples,
      message: dry
        ? "Dry run only — re-run without dryRun to apply."
        : "Infrastructure industrial split migration applied.",
    };
  },
});
