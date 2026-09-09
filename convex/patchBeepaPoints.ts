import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { canonicalizeMdaName } from "../lib/mdaNameAliases";
import { beepaPointsToScaleValue } from "../lib/beepaImport";

function normalizeKey(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findBeepaItem(
  items: Array<{ itemId: string; itemName: string; weight: number }>
) {
  return (
    items.find((item) => normalizeKey(item.itemName) === "beepa") ||
    items.find((item) => normalizeKey(item.itemName).includes("beepa")) ||
    null
  );
}

function recomputeOthersTotal(scores: Record<string, number>): number {
  return Object.values(scores).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

/**
 * Set or clear BEEPA points on saved_others_data (supports decimals like 8.4).
 * Pass points: null to remove BEEPA from that MDA's Others record.
 * Optionally mark the MDA as BEEPA-exempt in mda_metric_exclusions.
 */
export const patchBeepaPoints = internalMutation({
  args: {
    year: v.number(),
    scoringPeriod: v.string(),
    mdaName: v.string(),
    points: v.union(v.number(), v.null()),
    ensureExempted: v.optional(v.boolean()),
  },
  returns: v.object({
    mdaName: v.string(),
    beepaItemId: v.string(),
    before: v.union(
      v.object({
        value: v.union(v.number(), v.boolean(), v.null()),
        score: v.union(v.number(), v.null()),
        totalScore: v.number(),
      }),
      v.null()
    ),
    after: v.union(
      v.object({
        value: v.union(v.number(), v.boolean(), v.null()),
        score: v.union(v.number(), v.null()),
        totalScore: v.number(),
      }),
      v.null()
    ),
    exclusionUpdated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const mdaName = canonicalizeMdaName(args.mdaName);
    const othersItems = await ctx.db
      .query("transparency_items")
      .withIndex("byYearAndActive", (q) => q.eq("year", args.year).eq("isActive", true))
      .collect();

    const beepaItem = findBeepaItem(othersItems);
    if (!beepaItem) {
      throw new Error(`No BEEPA item configured for year ${args.year}`);
    }

    const existingOthers = await ctx.db
      .query("saved_others_data")
      .withIndex("byMdaPeriod", (q) =>
        q.eq("mdaName", mdaName).eq("scoringPeriod", args.scoringPeriod)
      )
      .first();

    // Also try non-canonical name match if needed
    let othersRow = existingOthers;
    if (!othersRow) {
      const periodRows = await ctx.db
        .query("saved_others_data")
        .withIndex("byPeriod", (q) => q.eq("scoringPeriod", args.scoringPeriod))
        .collect();
      othersRow =
        periodRows.find(
          (row) =>
            normalizeKey(canonicalizeMdaName(row.mdaName)) === normalizeKey(mdaName)
        ) || null;
    }

    const before = othersRow
      ? {
          value: (othersRow.values as Record<string, number | boolean> | undefined)?.[
            beepaItem.itemId
          ] ?? null,
          score: (othersRow.scores as Record<string, number> | undefined)?.[
            beepaItem.itemId
          ] ?? null,
          totalScore: othersRow.totalScore,
        }
      : null;

    const now = Date.now();
    let after: {
      value: number | boolean | null;
      score: number | null;
      totalScore: number;
    } | null = null;

    if (args.points === null) {
      if (othersRow) {
        const values = {
          ...((othersRow.values as Record<string, boolean | number> | undefined) || {}),
        };
        const scores = {
          ...((othersRow.scores as Record<string, number> | undefined) || {}),
        };
        delete values[beepaItem.itemId];
        delete scores[beepaItem.itemId];
        const totalScore = recomputeOthersTotal(scores);
        await ctx.db.patch(othersRow._id, {
          values,
          scores,
          totalScore,
          updatedAt: now,
        });
        after = {
          value: null,
          score: null,
          totalScore,
        };
      }
    } else {
      const points = Math.max(0, Math.min(beepaItem.weight, args.points));
      const scaleValue = beepaPointsToScaleValue(points, beepaItem.weight);
      const values = {
        ...((othersRow?.values as Record<string, boolean | number> | undefined) || {}),
        [beepaItem.itemId]: scaleValue,
      };
      const scores = {
        ...((othersRow?.scores as Record<string, number> | undefined) || {}),
        [beepaItem.itemId]: points,
      };
      const totalScore = recomputeOthersTotal(scores);

      if (othersRow) {
        await ctx.db.patch(othersRow._id, {
          values,
          scores,
          totalScore,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("saved_others_data", {
          mdaName,
          scoringPeriod: args.scoringPeriod,
          values,
          scores,
          totalScore,
          updatedAt: now,
        });
      }
      after = { value: scaleValue, score: points, totalScore };
    }

    let exclusionUpdated = false;
    if (args.ensureExempted) {
      const exclusionKey = `others:${beepaItem.itemId}`;
      const exclusions = await ctx.db
        .query("mda_metric_exclusions")
        .withIndex("byYear", (q) => q.eq("year", args.year))
        .collect();
      const existing = exclusions.find(
        (entry) =>
          normalizeKey(canonicalizeMdaName(entry.mdaName)) === normalizeKey(mdaName)
      );
      const nextExcluded = new Set(existing?.excludedMetrics || []);
      if (!nextExcluded.has(exclusionKey)) {
        nextExcluded.add(exclusionKey);
        const admin =
          (await ctx.db
            .query("users")
            .withIndex("byRole", (q) => q.eq("role", "admin"))
            .first()) ||
          (await ctx.db.query("users").first());
        if (!admin) {
          throw new Error("No user found to attribute BEEPA exclusion update");
        }
        if (existing) {
          await ctx.db.patch(existing._id, {
            excludedMetrics: Array.from(nextExcluded),
            updatedAt: now,
            updatedBy: admin._id,
          });
        } else {
          await ctx.db.insert("mda_metric_exclusions", {
            year: args.year,
            mdaName,
            excludedMetrics: Array.from(nextExcluded),
            updatedAt: now,
            updatedBy: admin._id,
          });
        }
        exclusionUpdated = true;
      }
    }

    return {
      mdaName,
      beepaItemId: beepaItem.itemId,
      before,
      after,
      exclusionUpdated,
    };
  },
});
