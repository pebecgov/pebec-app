import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { indicators } from "./config/indicators";
import { STATE_LIST, normalizeStateName } from "./stateUtils";

/** States held back until scoring is confirmed. */
const EXCLUDED_FROM_TOUR_BULK = new Set([
  "Lagos",
  "Kano",
  "Ogun",
  "Osun",
  "Ekiti",
  "Federal Capital Territory",
]);

const INDICATOR = "nationwide_tour_engagement" as const;

const SUBS_TO_SCORE = [
  "hosted_ta_session",
  "private_sector_stakeholder_engagement",
] as const;

function excellentScore(subIndicator: (typeof SUBS_TO_SCORE)[number]): {
  value: string;
  score: number;
} {
  const options = indicators[INDICATOR].subIndicators[subIndicator].options;
  const excellent = options.find((opt) => opt.value === "excellent");
  if (!excellent) {
    throw new Error(`No excellent option for ${subIndicator}`);
  }
  return { value: excellent.value, score: excellent.score };
}

/**
 * One-off: full marks (Excellent) for Hosted TA Session + Private Sector Stakeholder
 * Engagement for all states except the six still under review. Year defaults to 2026.
 */
export const applyNationwideTourFullMarks = internalMutation({
  args: {
    year: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    year: v.number(),
    dryRun: v.boolean(),
    statesTargeted: v.number(),
    statesExcluded: v.array(v.string()),
    inserted: v.number(),
    updated: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx, args) => {
    const year = args.year ?? 2026;
    const dryRun = args.dryRun ?? false;
    const excluded = Array.from(EXCLUDED_FROM_TOUR_BULK).sort();
    const targets = STATE_LIST.filter((state) => !EXCLUDED_FROM_TOUR_BULK.has(state));

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const rawState of targets) {
      const state = normalizeStateName(rawState);

      for (const subIndicator of SUBS_TO_SCORE) {
        const { value, score } = excellentScore(subIndicator);

        const yearRows = await ctx.db
          .query("state_scores")
          .withIndex("byYearAndState", (q) => q.eq("year", year).eq("state", state))
          .collect();

        const existing = yearRows.find(
          (row) =>
            row.indicator === INDICATOR && row.subIndicator === subIndicator
        );

        if (existing) {
          if (existing.value === value && existing.score === score) {
            skipped += 1;
            continue;
          }
          if (!dryRun) {
            await ctx.db.patch(existing._id, { value, score });
          }
          updated += 1;
        } else if (!dryRun) {
          await ctx.db.insert("state_scores", {
            state,
            indicator: INDICATOR,
            subIndicator,
            value,
            score,
            year,
            createdAt: Date.now(),
          });
          inserted += 1;
        } else {
          inserted += 1;
        }
      }
    }

    return {
      year,
      dryRun,
      statesTargeted: targets.length,
      statesExcluded: excluded,
      inserted,
      updated,
      skipped,
    };
  },
});
