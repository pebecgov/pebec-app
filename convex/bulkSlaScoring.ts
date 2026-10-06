/**
 * Helpers for bulk Service Level Agreement scoring across all MDAs.
 * File processing lives in `bulkSlaScoringActions.ts` ("use node").
 */
import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users";
import { logAuditEvent } from "./utils/auditLog";
import {
  buildExclusionLookup,
  normalizeMdaKey,
  splitMdaNameForMatch,
} from "./mda_scoring";
import { MONTH_NAMES, resolveScoringWindow } from "./utils/efficiencyScoring";

const DEFAULT_SLA_POINTS = 30;

export const getActorForBulkSla = internalQuery({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      userId: v.id("users"),
      role: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!user) return null;
    return { userId: user._id, role: user.role ?? "user" };
  },
});

export const getBulkSlaContext = query({
  args: { scoringPeriod: v.string() },
  returns: v.object({
    targetYear: v.number(),
    slaPoints: v.number(),
    pointsPerMonth: v.number(),
    totalMonths: v.number(),
    months: v.array(
      v.object({
        month: v.number(),
        year: v.number(),
        monthName: v.string(),
        monthKey: v.string(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin" && user.role !== "staff") {
      throw new Error("Unauthorized");
    }
    const window = await resolveScoringWindow(ctx, args.scoringPeriod, "yearToDate");
    let slaPoints = DEFAULT_SLA_POINTS;
    if (window.targetYear >= 2026) {
      const config = await ctx.db
        .query("efficiency_periods")
        .withIndex("byYear", (q) => q.eq("year", window.targetYear))
        .first();
      slaPoints = config?.slaPoints ?? DEFAULT_SLA_POINTS;
    }
    const totalMonths = window.monthsToCheck.length;
    const pointsPerMonth = totalMonths > 0 ? slaPoints / totalMonths : slaPoints;
    return {
      targetYear: window.targetYear,
      slaPoints,
      pointsPerMonth,
      totalMonths,
      months: window.monthsToCheck.map(({ month, year }) => ({
        month,
        year,
        monthName: MONTH_NAMES[month] ?? `Month ${month + 1}`,
        monthKey: `${year}-${month}`,
      })),
    };
  },
});

export const getBulkSlaInternalContext = internalQuery({
  args: {
    scoringPeriod: v.string(),
    mdaNames: v.array(v.string()),
  },
  returns: v.object({
    targetYear: v.number(),
    slaPoints: v.number(),
    pointsPerMonth: v.number(),
    totalMonths: v.number(),
    months: v.array(
      v.object({
        month: v.number(),
        year: v.number(),
        monthName: v.string(),
        monthKey: v.string(),
      }),
    ),
    existingByMda: v.record(
      v.string(),
      v.object({
        totalScore: v.number(),
        percentage: v.number(),
        monthsWithData: v.number(),
      }),
    ),
    excludedMdas: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const window = await resolveScoringWindow(ctx, args.scoringPeriod, "yearToDate");
    let slaPoints = DEFAULT_SLA_POINTS;
    if (window.targetYear >= 2026) {
      const config = await ctx.db
        .query("efficiency_periods")
        .withIndex("byYear", (q) => q.eq("year", window.targetYear))
        .first();
      slaPoints = config?.slaPoints ?? DEFAULT_SLA_POINTS;
    }
    const totalMonths = window.monthsToCheck.length;
    const pointsPerMonth = totalMonths > 0 ? slaPoints / totalMonths : slaPoints;

    const exclusionRows = await ctx.db
      .query("mda_metric_exclusions")
      .withIndex("byYear", (q) => q.eq("year", window.targetYear))
      .collect();
    const exclusionMap = buildExclusionLookup(exclusionRows);
    const excludedMdas: string[] = [];
    for (const mdaName of args.mdaNames) {
      const parts = splitMdaNameForMatch(mdaName);
      const excluded =
        exclusionMap.get(normalizeMdaKey(mdaName)) ||
        (parts.fullName ? exclusionMap.get(parts.fullName) : undefined) ||
        (parts.abbr ? exclusionMap.get(parts.abbr) : undefined) ||
        new Set<string>();
      if (excluded.has("sla")) excludedMdas.push(mdaName);
    }

    const existingByMda: Record<
      string,
      { totalScore: number; percentage: number; monthsWithData: number }
    > = {};
    for (const mdaName of args.mdaNames) {
      const existing = await ctx.db
        .query("mda_sla_data")
        .withIndex("byMdaAndPeriod", (q) =>
          q.eq("mdaName", mdaName).eq("scoringPeriod", args.scoringPeriod),
        )
        .first();
      if (existing) {
        existingByMda[mdaName] = {
          totalScore: existing.totalScore,
          percentage: existing.percentage,
          monthsWithData: existing.monthsWithData,
        };
      }
    }

    return {
      targetYear: window.targetYear,
      slaPoints,
      pointsPerMonth,
      totalMonths,
      months: window.monthsToCheck.map(({ month, year }) => ({
        month,
        year,
        monthName: MONTH_NAMES[month] ?? `Month ${month + 1}`,
        monthKey: `${year}-${month}`,
      })),
      existingByMda,
      excludedMdas,
    };
  },
});

export const saveBulkSlaResult = internalMutation({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string(),
    monthlySlaData: v.any(),
    totalScore: v.number(),
    monthsWithData: v.number(),
    totalMonths: v.number(),
    percentage: v.number(),
    actorUserId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("mda_sla_data")
      .withIndex("byMdaAndPeriod", (q) =>
        q.eq("mdaName", args.mdaName).eq("scoringPeriod", args.scoringPeriod),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        monthlySlaData: args.monthlySlaData,
        totalScore: args.totalScore,
        monthsWithData: args.monthsWithData,
        totalMonths: args.totalMonths,
        percentage: args.percentage,
        updatedAt: now,
        updatedBy: args.actorUserId,
      });
    } else {
      await ctx.db.insert("mda_sla_data", {
        mdaName: args.mdaName,
        scoringPeriod: args.scoringPeriod,
        monthlySlaData: args.monthlySlaData,
        totalScore: args.totalScore,
        monthsWithData: args.monthsWithData,
        totalMonths: args.totalMonths,
        percentage: args.percentage,
        createdAt: now,
        updatedAt: now,
        createdBy: args.actorUserId,
        updatedBy: args.actorUserId,
      });
    }
    return null;
  },
});

export const logBulkSlaAudit = mutation({
  args: {
    scoringPeriod: v.string(),
    mdaCount: v.number(),
    savedCount: v.number(),
    dryRun: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin" && user.role !== "staff") {
      throw new Error("Unauthorized");
    }
    if (args.dryRun || args.savedCount === 0) return null;
    await logAuditEvent(ctx, {
      action: "bfa.mda_score_saved",
      category: "bfa",
      summary: `Bulk SLA scoring for ${args.mdaCount} MDAs — ${args.scoringPeriod}`,
      actor: user,
      target: { type: "bfa_bulk_sla", label: args.scoringPeriod },
      metadata: {
        scoringPeriod: args.scoringPeriod,
        mdaCount: args.mdaCount,
        savedCount: args.savedCount,
      },
    });
    return null;
  },
});
