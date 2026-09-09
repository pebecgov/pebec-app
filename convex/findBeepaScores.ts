import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import { canonicalizeMdaName } from "../lib/mdaNameAliases";

function normalizeKey(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findBeepaItemId(
  items: Array<{ itemId: string; itemName: string }>
): string | null {
  const hit =
    items.find((item) => normalizeKey(item.itemName) === "beepa") ||
    items.find((item) => normalizeKey(item.itemName).includes("beepa"));
  return hit?.itemId ?? null;
}

export const findBeepaScores = internalQuery({
  args: {
    year: v.number(),
    scoringPeriod: v.string(),
    nameHints: v.array(v.string()),
  },
  returns: v.object({
    beepaItemId: v.union(v.string(), v.null()),
    matches: v.array(
      v.object({
        mdaName: v.string(),
        scoringPeriod: v.string(),
        value: v.union(v.number(), v.boolean(), v.null()),
        score: v.union(v.number(), v.null()),
        totalScore: v.number(),
        allScores: v.any(),
      })
    ),
    anyWithScoreSix: v.array(
      v.object({
        mdaName: v.string(),
        scoringPeriod: v.string(),
        score: v.number(),
        value: v.union(v.number(), v.boolean(), v.null()),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const othersItems = await ctx.db
      .query("transparency_items")
      .withIndex("byYearAndActive", (q) => q.eq("year", args.year).eq("isActive", true))
      .collect();
    const beepaItemId = findBeepaItemId(othersItems);

    const periodRows = await ctx.db
      .query("saved_others_data")
      .withIndex("byPeriod", (q) => q.eq("scoringPeriod", args.scoringPeriod))
      .collect();

    const hintKeys = args.nameHints.map((h) => normalizeKey(h));
    const matches = [];

    for (const row of periodRows) {
      const key = normalizeKey(canonicalizeMdaName(row.mdaName));
      const rawKey = normalizeKey(row.mdaName);
      const hit = hintKeys.some(
        (hint) => key.includes(hint) || rawKey.includes(hint) || hint.includes(key)
      );
      if (!hit) continue;
      const scores = (row.scores || {}) as Record<string, number>;
      const values = (row.values || {}) as Record<string, number | boolean>;
      matches.push({
        mdaName: row.mdaName,
        scoringPeriod: row.scoringPeriod,
        value: beepaItemId ? values[beepaItemId] ?? null : null,
        score: beepaItemId ? scores[beepaItemId] ?? null : null,
        totalScore: row.totalScore,
        allScores: scores,
      });
    }

    const anyWithScoreSix = [];
    if (beepaItemId) {
      for (const row of periodRows) {
        const scores = (row.scores || {}) as Record<string, number>;
        const values = (row.values || {}) as Record<string, number | boolean>;
        const score = scores[beepaItemId];
        if (score === 6 || score === 6.0 || values[beepaItemId] === 6) {
          anyWithScoreSix.push({
            mdaName: row.mdaName,
            scoringPeriod: row.scoringPeriod,
            score: Number(score),
            value: values[beepaItemId] ?? null,
          });
        }
      }
    }

    return { beepaItemId, matches, anyWithScoreSix };
  },
});
