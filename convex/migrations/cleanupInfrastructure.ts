import { mutation } from "../_generated/server";

const LEGACY_SUB_INDICATORS = [
  "road_quality",
  "road_motorability",
  "capital_budget",
  "airport",
  "renewable_energy",
];

const CURRENT_SUB_INDICATORS = [
  "renewable_energy_evs_cng",
  "airport_cargo_functional",
  "railway",
];

export const removeLegacyInfrastructureScores = mutation({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db
      .query("state_scores")
      .withIndex("byIndicator", (q) => q.eq("indicator", "infrastructure"))
      .collect();

    let deleted = 0;
    let skipped = 0;

    for (const doc of docs) {
      const sub = doc.subIndicator;
      if (CURRENT_SUB_INDICATORS.includes(sub)) {
        skipped++;
        continue;
      }
      if (LEGACY_SUB_INDICATORS.includes(sub)) {
        await ctx.db.delete(doc._id);
        deleted++;
      } else {
        skipped++;
      }
    }

    return {
      deleted,
      skipped,
      total: docs.length,
    };
  },
});

