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
  buildMonthlyReportFileRefs,
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

const PREVIEW_MDA_LIMIT = 25;

/**
 * Submission dates for selected MDAs (latest upload per month) + current SLA month status.
 * Cap the list so the query stays under Convex's 1s limit.
 */
export const getBulkSlaSubmissionPreview = query({
  args: {
    scoringPeriod: v.string(),
    mdaNames: v.array(v.string()),
  },
  returns: v.object({
    truncated: v.boolean(),
    rows: v.array(
      v.object({
        mdaName: v.string(),
        months: v.array(
          v.object({
            monthKey: v.string(),
            monthName: v.string(),
            year: v.number(),
            submittedAt: v.union(v.number(), v.null()),
            reportCount: v.number(),
            fileName: v.union(v.string(), v.null()),
            slaStatus: v.union(
              v.literal("scored"),
              v.literal("failed"),
              v.literal("missing"),
              v.literal("none"),
            ),
          }),
        ),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin" && user.role !== "staff") {
      throw new Error("Unauthorized");
    }

    const uniqueNames = Array.from(
      new Set(args.mdaNames.map((n) => n.trim()).filter(Boolean)),
    );
    const truncated = uniqueNames.length > PREVIEW_MDA_LIMIT;
    const mdaNames = uniqueNames.slice(0, PREVIEW_MDA_LIMIT);

    const window = await resolveScoringWindow(ctx, args.scoringPeriod, "yearToDate");
    const monthDefs = window.monthsToCheck.map(({ month, year }) => ({
      month,
      year,
      monthName: MONTH_NAMES[month] ?? `Month ${month + 1}`,
      monthKey: `${year}-${month}`,
    }));

    const rows: Array<{
      mdaName: string;
      months: Array<{
        monthKey: string;
        monthName: string;
        year: number;
        submittedAt: number | null;
        reportCount: number;
        fileName: string | null;
        slaStatus: "scored" | "failed" | "missing" | "none";
      }>;
    }> = [];

    for (const mdaName of mdaNames) {
      const refs = await buildMonthlyReportFileRefs(ctx, {
        mdaName,
        scoringPeriod: args.scoringPeriod,
        months: monthDefs.map(({ month, year }) => ({ month, year })),
        includeFileSize: false,
      });

      const existing = await ctx.db
        .query("mda_sla_data")
        .withIndex("byMdaAndPeriod", (q) =>
          q.eq("mdaName", mdaName).eq("scoringPeriod", args.scoringPeriod),
        )
        .first();
      const monthlySla =
        existing?.monthlySlaData && typeof existing.monthlySlaData === "object"
          ? (existing.monthlySlaData as Record<string, any>)
          : {};

      rows.push({
        mdaName,
        months: monthDefs.map((m) => {
          const ref = refs[m.monthKey];
          const entry = monthlySla[m.monthKey];
          const checkStatus = entry?.check?.status;
          let slaStatus: "scored" | "failed" | "missing" | "none" = "none";
          if (checkStatus === "failed") slaStatus = "failed";
          else if (
            entry &&
            (checkStatus === "success" ||
              checkStatus === "partial_success" ||
              typeof entry.score === "number" ||
              typeof entry.overallPercentage === "number")
          ) {
            slaStatus = "scored";
          } else if (!ref) {
            slaStatus = "missing";
          }

          return {
            monthKey: m.monthKey,
            monthName: m.monthName,
            year: m.year,
            submittedAt: ref?.submittedAt ?? null,
            reportCount: ref?.reportCount ?? 0,
            fileName: ref?.fileName ?? null,
            slaStatus,
          };
        }),
      });
    }

    return { truncated, rows };
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
    // A list, not a record: MDA names like "Nigerian Shippers’ Council" aren't valid field names.
    existing: v.array(
      v.object({
        mdaName: v.string(),
        totalScore: v.number(),
        percentage: v.number(),
        monthsWithData: v.number(),
        monthlySlaData: v.any(),
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

    const existingRows: Array<{
      mdaName: string;
      totalScore: number;
      percentage: number;
      monthsWithData: number;
      monthlySlaData: Record<string, unknown>;
    }> = [];
    for (const mdaName of args.mdaNames) {
      const existing = await ctx.db
        .query("mda_sla_data")
        .withIndex("byMdaAndPeriod", (q) =>
          q.eq("mdaName", mdaName).eq("scoringPeriod", args.scoringPeriod),
        )
        .first();
      if (existing) {
        existingRows.push({
          mdaName,
          totalScore: existing.totalScore,
          percentage: existing.percentage,
          monthsWithData: existing.monthsWithData,
          monthlySlaData:
            existing.monthlySlaData && typeof existing.monthlySlaData === "object"
              ? (existing.monthlySlaData as Record<string, unknown>)
              : {},
        });
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
      existing: existingRows,
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
