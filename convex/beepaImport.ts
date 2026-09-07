import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users";
import { canonicalizeMdaName } from "../lib/mdaNameAliases";
import {
  beepaPointsToScaleValue,
  resolveBeepaMdaName,
} from "../lib/beepaImport";

function normalizeKey(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findBeepaItem(
  items: Array<{ itemId: string; itemName: string; weight: number; answerType?: string; _id: any }>
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

export const importBeepaCsvScores = mutation({
  args: {
    year: v.number(),
    scoringPeriod: v.string(),
    knownMdas: v.optional(
      v.array(
        v.object({
          name: v.string(),
          abbreviation: v.optional(v.string()),
        })
      )
    ),
    rows: v.array(
      v.object({
        mdaName: v.string(),
        abbreviation: v.optional(v.string()),
        points: v.optional(v.union(v.number(), v.null())),
        exempted: v.boolean(),
      })
    ),
  },
  returns: v.object({
    beepaItemId: v.string(),
    beepaItemName: v.string(),
    beepaWeight: v.number(),
    updated: v.number(),
    exempted: v.number(),
    unmatched: v.array(v.string()),
    matchedNames: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin" && user.role !== "staff") {
      throw new Error("Unauthorized: Only admins and staff can import BEEPA scores");
    }

    const othersItems = await ctx.db
      .query("transparency_items")
      .withIndex("byYearAndActive", (q) => q.eq("year", args.year).eq("isActive", true))
      .collect();

    const beepaItem = findBeepaItem(othersItems);
    if (!beepaItem) {
      throw new Error(
        `No BEEPA item found in Others configuration for ${args.year}. Add a BEEPA metric first.`
      );
    }

    if (beepaItem.answerType !== "scale_1_10") {
      await ctx.db.patch(beepaItem._id, {
        answerType: "scale_1_10",
        updatedAt: Date.now(),
      });
    }

    const dbMdas = await ctx.db.query("mdas").collect();
    const candidates = [
      ...(args.knownMdas || []).map((mda) => ({
        name: canonicalizeMdaName(mda.name),
        abbreviation: mda.abbreviation,
      })),
      ...dbMdas.map((mda) => ({
        name: canonicalizeMdaName(mda.name),
        abbreviation: undefined as string | undefined,
      })),
    ];

    const uniqueCandidates: Array<{ name: string; abbreviation?: string }> = [];
    const byName = new Map<string, { name: string; abbreviation?: string }>();
    for (const candidate of candidates) {
      const key = normalizeKey(candidate.name);
      if (!key) continue;
      const existing = byName.get(key);
      if (!existing) {
        const entry = {
          name: candidate.name,
          abbreviation: candidate.abbreviation,
        };
        byName.set(key, entry);
        uniqueCandidates.push(entry);
      } else if (!existing.abbreviation && candidate.abbreviation) {
        existing.abbreviation = candidate.abbreviation;
      }
    }

    // Attach CSV abbreviations onto known MDAs when names/abbrs align.
    for (const row of args.rows) {
      if (!row.abbreviation) continue;
      const matched = resolveBeepaMdaName(
        { mdaName: row.mdaName, abbreviation: row.abbreviation },
        uniqueCandidates
      );
      if (!matched) continue;
      const entry = byName.get(normalizeKey(matched));
      if (entry && !entry.abbreviation) {
        entry.abbreviation = row.abbreviation;
      }
    }

    if (uniqueCandidates.length === 0) {
      throw new Error("No MDAs available to match against. Add MDAs first, then re-import.");
    }

    let updated = 0;
    let exemptedCount = 0;
    const unmatched: string[] = [];
    const matchedNames: string[] = [];
    const now = Date.now();
    const exclusionKey = `others:${beepaItem.itemId}`;

    for (const row of args.rows) {
      const resolvedName = resolveBeepaMdaName(
        { mdaName: row.mdaName, abbreviation: row.abbreviation || "" },
        uniqueCandidates
      );

      if (!resolvedName) {
        unmatched.push(
          row.abbreviation ? `${row.abbreviation} - ${row.mdaName}` : row.mdaName
        );
        continue;
      }

      const mdaName = canonicalizeMdaName(resolvedName);
      matchedNames.push(mdaName);

      if (row.exempted) {
        exemptedCount += 1;
        const exclusions = await ctx.db
          .query("mda_metric_exclusions")
          .withIndex("byYear", (q) => q.eq("year", args.year))
          .collect();
        const existing = exclusions.find(
          (entry) => normalizeKey(canonicalizeMdaName(entry.mdaName)) === normalizeKey(mdaName)
        );
        const nextExcluded = new Set(existing?.excludedMetrics || []);
        nextExcluded.add(exclusionKey);
        if (existing) {
          await ctx.db.patch(existing._id, {
            excludedMetrics: Array.from(nextExcluded),
            updatedAt: now,
            updatedBy: user._id,
          });
        } else {
          await ctx.db.insert("mda_metric_exclusions", {
            year: args.year,
            mdaName,
            excludedMetrics: Array.from(nextExcluded),
            updatedAt: now,
            updatedBy: user._id,
          });
        }

        const existingOthers = await ctx.db
          .query("saved_others_data")
          .withIndex("byMdaPeriod", (q) =>
            q.eq("mdaName", mdaName).eq("scoringPeriod", args.scoringPeriod)
          )
          .first();
        if (existingOthers) {
          const values = { ...(existingOthers.values || {}) } as Record<string, boolean | number>;
          const scores = { ...(existingOthers.scores || {}) } as Record<string, number>;
          delete values[beepaItem.itemId];
          delete scores[beepaItem.itemId];
          await ctx.db.patch(existingOthers._id, {
            values,
            scores,
            totalScore: recomputeOthersTotal(scores),
            updatedAt: now,
          });
        }
        continue;
      }

      if (row.points == null || !Number.isFinite(row.points)) {
        unmatched.push(
          row.abbreviation ? `${row.abbreviation} - ${row.mdaName}` : row.mdaName
        );
        continue;
      }

      const points = Math.max(0, Math.min(beepaItem.weight, Number(row.points)));
      const scaleValue = beepaPointsToScaleValue(points, beepaItem.weight);

      const existingOthers = await ctx.db
        .query("saved_others_data")
        .withIndex("byMdaPeriod", (q) =>
          q.eq("mdaName", mdaName).eq("scoringPeriod", args.scoringPeriod)
        )
        .first();

      const values = {
        ...((existingOthers?.values as Record<string, boolean | number> | undefined) || {}),
        [beepaItem.itemId]: scaleValue,
      };
      const scores = {
        ...((existingOthers?.scores as Record<string, number> | undefined) || {}),
        [beepaItem.itemId]: points,
      };
      const totalScore = recomputeOthersTotal(scores);

      if (existingOthers) {
        await ctx.db.patch(existingOthers._id, {
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

      // If previously excluded as exempted, remove only the BEEPA exclusion.
      const exclusions = await ctx.db
        .query("mda_metric_exclusions")
        .withIndex("byYear", (q) => q.eq("year", args.year))
        .collect();
      const existingExclusion = exclusions.find(
        (entry) => normalizeKey(canonicalizeMdaName(entry.mdaName)) === normalizeKey(mdaName)
      );
      if (existingExclusion?.excludedMetrics?.includes(exclusionKey)) {
        await ctx.db.patch(existingExclusion._id, {
          excludedMetrics: existingExclusion.excludedMetrics.filter((key) => key !== exclusionKey),
          updatedAt: now,
          updatedBy: user._id,
        });
      }

      updated += 1;
    }

    return {
      beepaItemId: beepaItem.itemId,
      beepaItemName: beepaItem.itemName,
      beepaWeight: beepaItem.weight,
      updated,
      exempted: exemptedCount,
      unmatched,
      matchedNames: Array.from(new Set(matchedNames)),
    };
  },
});
