import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { indicators } from "./config/indicators";
import { STATE_LIST, normalizeStateName, VALID_NIGERIAN_STATES } from "./stateUtils";

/** States held back until scoring is confirmed (Hosted TA + Private Sector bulk). */
const EXCLUDED_FROM_TOUR_BULK = new Set([
  "Lagos",
  "Kano",
  "Ogun",
  "Osun",
  "Ekiti",
  "Federal Capital Territory",
]);

/**
 * Peer-to-peer survey responses — cleaned/normalized unique states (32).
 * FCT/Abuja → Federal Capital Territory.
 */
const PEER_TO_PEER_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Edo",
  "Enugu",
  "Federal Capital Territory",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];

const INDICATOR = "nationwide_tour_engagement" as const;

const SUBS_TO_SCORE = [
  "hosted_ta_session",
  "private_sector_stakeholder_engagement",
] as const;

type TourSubIndicator =
  | (typeof SUBS_TO_SCORE)[number]
  | "peer_to_peer";

function excellentScore(subIndicator: TourSubIndicator): {
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

async function upsertTourSubScores(
  ctx: MutationCtx,
  args: {
    year: number;
    dryRun: boolean;
    targets: string[];
    subIndicators: TourSubIndicator[];
  }
) {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const invalid: string[] = [];

  for (const rawState of args.targets) {
    const state = normalizeStateName(rawState);
    if (!VALID_NIGERIAN_STATES.has(state)) {
      invalid.push(rawState);
      continue;
    }

    for (const subIndicator of args.subIndicators) {
      const { value, score } = excellentScore(subIndicator);

      const yearRows = await ctx.db
        .query("state_scores")
        .withIndex("byYearAndState", (q) => q.eq("year", args.year).eq("state", state))
        .collect();

      const existing = yearRows.find(
        (row) => row.indicator === INDICATOR && row.subIndicator === subIndicator
      );

      if (existing) {
        if (existing.value === value && existing.score === score) {
          skipped += 1;
          continue;
        }
        if (!args.dryRun) {
          await ctx.db.patch(existing._id, { value, score });
        }
        updated += 1;
      } else if (!args.dryRun) {
        await ctx.db.insert("state_scores", {
          state,
          indicator: INDICATOR,
          subIndicator,
          value,
          score,
          year: args.year,
          createdAt: Date.now(),
        });
        inserted += 1;
      } else {
        inserted += 1;
      }
    }
  }

  return { inserted, updated, skipped, invalid };
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

    const result = await upsertTourSubScores(ctx, {
      year,
      dryRun,
      targets,
      subIndicators: [...SUBS_TO_SCORE],
    });

    return {
      year,
      dryRun,
      statesTargeted: targets.length,
      statesExcluded: excluded,
      inserted: result.inserted,
      updated: result.updated,
      skipped: result.skipped,
    };
  },
});

/**
 * Full marks (Excellent / 3) for Peer to Peer for the cleaned survey-response states.
 */
export const applyPeerToPeerFullMarks = internalMutation({
  args: {
    year: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    year: v.number(),
    dryRun: v.boolean(),
    statesTargeted: v.number(),
    states: v.array(v.string()),
    notInList: v.array(v.string()),
    inserted: v.number(),
    updated: v.number(),
    skipped: v.number(),
    invalid: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const year = args.year ?? 2026;
    const dryRun = args.dryRun ?? false;
    const targets = PEER_TO_PEER_STATES.map((s) => normalizeStateName(s));
    const targetSet = new Set(targets);
    const notInList = STATE_LIST.filter((s) => !targetSet.has(s));

    const result = await upsertTourSubScores(ctx, {
      year,
      dryRun,
      targets,
      subIndicators: ["peer_to_peer"],
    });

    return {
      year,
      dryRun,
      statesTargeted: targets.length,
      states: targets,
      notInList,
      inserted: result.inserted,
      updated: result.updated,
      skipped: result.skipped,
      invalid: result.invalid,
    };
  },
});
