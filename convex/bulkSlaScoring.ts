/**
 * Helpers for bulk Service Level Agreement scoring across all MDAs.
 * File processing lives in `bulkSlaScoringActions.ts` ("use node").
 */
import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUserOrThrow } from "./users";
import { logAuditEvent } from "./utils/auditLog";
import {
  buildExclusionLookup,
  normalizeMdaKey,
  splitMdaNameForMatch,
} from "./mda_scoring";
import { mdaNamesMatch } from "./lib/resolveMda";
import {
  MONTH_NAMES,
  filterReportsToWindow,
  resolveScoringWindow,
} from "./utils/efficiencyScoring";

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

/** Max MDAs the preview action will process in one call. */
const PREVIEW_MDA_LIMIT = 60;

const submissionMonthValidator = v.object({
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
});

const submissionPreviewReturns = v.object({
  truncated: v.boolean(),
  rows: v.array(
    v.object({
      mdaName: v.string(),
      months: v.array(submissionMonthValidator),
    }),
  ),
});

type PreviewReport = {
  _id: string;
  mdaName?: string;
  submittedAt: number;
  fileName?: string;
  reportPeriodMonth?: number;
  reportPeriodYear?: number;
};

type SlaMonthStatus = "scored" | "failed" | "missing" | "none";

function resolveMonthKey(
  report: PreviewReport,
): string {
  if (
    typeof report.reportPeriodMonth === "number" &&
    typeof report.reportPeriodYear === "number"
  ) {
    return `${report.reportPeriodYear}-${report.reportPeriodMonth}`;
  }
  const d = new Date(report.submittedAt);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function slaStatusForMonth(
  entry: any | undefined,
  hasUpload: boolean,
): SlaMonthStatus {
  const checkStatus = entry?.check?.status;
  if (checkStatus === "failed") return "failed";
  if (
    entry &&
    (checkStatus === "success" ||
      checkStatus === "partial_success" ||
      typeof entry.score === "number" ||
      typeof entry.overallPercentage === "number")
  ) {
    return "scored";
  }
  if (!hasUpload) return "missing";
  return "none";
}

function buildPreviewRows(args: {
  mdaNames: string[];
  monthDefs: Array<{ month: number; year: number; monthName: string; monthKey: string }>;
  windowReports: PreviewReport[];
  slaByMda: Record<string, Record<string, any>>;
}) {
  const monthKeySet = new Set(args.monthDefs.map((m) => m.monthKey));
  return args.mdaNames.map((mdaName) => {
    const matched = args.windowReports.filter(
      (report) => !!report.mdaName && mdaNamesMatch(mdaName, report.mdaName),
    );
    const byMonth = new Map<
      string,
      { submittedAt: number; reportCount: number; fileName: string | null }
    >();
    for (const report of matched) {
      const monthKey = resolveMonthKey(report);
      if (!monthKeySet.has(monthKey)) continue;
      const prev = byMonth.get(monthKey);
      if (!prev || report.submittedAt >= prev.submittedAt) {
        byMonth.set(monthKey, {
          submittedAt: report.submittedAt,
          reportCount: (prev?.reportCount ?? 0) + 1,
          fileName: report.fileName ?? null,
        });
      } else {
        byMonth.set(monthKey, { ...prev, reportCount: prev.reportCount + 1 });
      }
    }

    const monthlySla = args.slaByMda[mdaName] ?? {};
    return {
      mdaName,
      months: args.monthDefs.map((m) => {
        const ref = byMonth.get(m.monthKey);
        return {
          monthKey: m.monthKey,
          monthName: m.monthName,
          year: m.year,
          submittedAt: ref?.submittedAt ?? null,
          reportCount: ref?.reportCount ?? 0,
          fileName: ref?.fileName ?? null,
          slaStatus: slaStatusForMonth(monthlySla[m.monthKey], !!ref),
        };
      }),
    };
  });
}

/** Window + lookback for the action-driven preview. */
export const getBulkSlaPreviewMeta = internalQuery({
  args: { scoringPeriod: v.string() },
  returns: v.object({
    lookbackStart: v.number(),
    startDate: v.number(),
    endDate: v.number(),
    monthsToCheck: v.array(v.object({ month: v.number(), year: v.number() })),
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
    const window = await resolveScoringWindow(ctx, args.scoringPeriod, "yearToDate");
    const earliestMonthStart = Math.min(
      ...window.monthsToCheck.map(({ month, year }) => Date.UTC(year, month, 1)),
    );
    return {
      lookbackStart: Math.max(0, earliestMonthStart - 1000 * 60 * 60 * 24 * 45),
      startDate: window.startDate,
      endDate: window.endDate,
      monthsToCheck: window.monthsToCheck,
      months: window.monthsToCheck.map(({ month, year }) => ({
        month,
        year,
        monthName: MONTH_NAMES[month] ?? `Month ${month + 1}`,
        monthKey: `${year}-${month}`,
      })),
    };
  },
});

/** Paginated reform-champion reports — keeps each query under the 1s limit. */
export const pageReformReportsForPreview = internalQuery({
  args: {
    lookbackStart: v.number(),
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.object({
    reports: v.array(
      v.object({
        _id: v.string(),
        mdaName: v.optional(v.string()),
        submittedAt: v.number(),
        fileName: v.optional(v.string()),
        reportPeriodMonth: v.optional(v.number()),
        reportPeriodYear: v.optional(v.number()),
      }),
    ),
    continueCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("submitted_reports")
      .withIndex("byDate", (q) => q.gte("submittedAt", args.lookbackStart))
      .paginate({ numItems: 150, cursor: args.cursor });

    const reports = page.page
      .filter((r) => r.role === "reform_champion" && !r.isDraft)
      .map((r) => ({
        _id: String(r._id),
        mdaName: r.mdaName,
        submittedAt: r.submittedAt,
        fileName: r.fileName,
        reportPeriodMonth: r.reportPeriodMonth,
        reportPeriodYear: r.reportPeriodYear,
      }));

    return {
      reports,
      continueCursor: page.isDone ? null : page.continueCursor,
      isDone: page.isDone,
    };
  },
});

export const getSlaMonthlyForPreview = internalQuery({
  args: {
    scoringPeriod: v.string(),
    mdaNames: v.array(v.string()),
  },
  returns: v.array(
    v.object({
      mdaName: v.string(),
      monthlySlaData: v.any(),
    }),
  ),
  handler: async (ctx, args) => {
    const out: Array<{ mdaName: string; monthlySlaData: Record<string, any> }> = [];
    for (const mdaName of args.mdaNames.slice(0, PREVIEW_MDA_LIMIT)) {
      const existing = await ctx.db
        .query("mda_sla_data")
        .withIndex("byMdaAndPeriod", (q) =>
          q.eq("mdaName", mdaName).eq("scoringPeriod", args.scoringPeriod),
        )
        .first();
      out.push({
        mdaName,
        monthlySlaData:
          existing?.monthlySlaData && typeof existing.monthlySlaData === "object"
            ? (existing.monthlySlaData as Record<string, any>)
            : {},
      });
    }
    return out;
  },
});

/**
 * Submission-date preview for selected MDAs.
 * Runs as an action so report loading can paginate past the 1s query limit
 * (the old query timed out by scanning all reports once per MDA).
 */
export const previewBulkSlaSubmissions = action({
  args: {
    scoringPeriod: v.string(),
    mdaNames: v.array(v.string()),
  },
  returns: submissionPreviewReturns,
  handler: async (ctx, args): Promise<{
    truncated: boolean;
    rows: Array<{
      mdaName: string;
      months: Array<{
        monthKey: string;
        monthName: string;
        year: number;
        submittedAt: number | null;
        reportCount: number;
        fileName: string | null;
        slaStatus: SlaMonthStatus;
      }>;
    }>;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const uniqueNames = Array.from(
      new Set(args.mdaNames.map((n) => n.trim()).filter(Boolean)),
    );
    if (uniqueNames.length === 0) {
      return { truncated: false, rows: [] };
    }

    const truncated = uniqueNames.length > PREVIEW_MDA_LIMIT;
    const mdaNames = uniqueNames.slice(0, PREVIEW_MDA_LIMIT);

    const meta: {
      lookbackStart: number;
      startDate: number;
      endDate: number;
      monthsToCheck: Array<{ month: number; year: number }>;
      months: Array<{ month: number; year: number; monthName: string; monthKey: string }>;
    } = await ctx.runQuery(internal.bulkSlaScoring.getBulkSlaPreviewMeta, {
      scoringPeriod: args.scoringPeriod,
    });

    const collected: PreviewReport[] = [];
    let cursor: string | null = null;
    let isDone = false;
    let pages = 0;
    while (!isDone && pages < 40) {
      const page: {
        reports: PreviewReport[];
        continueCursor: string | null;
        isDone: boolean;
      } = await ctx.runQuery(internal.bulkSlaScoring.pageReformReportsForPreview, {
        lookbackStart: meta.lookbackStart,
        cursor,
      });
      collected.push(...page.reports);
      cursor = page.continueCursor;
      isDone = page.isDone;
      pages += 1;
    }

    const windowReports = filterReportsToWindow(collected, {
      targetYear: 0,
      startDate: meta.startDate,
      endDate: meta.endDate,
      monthsToCheck: meta.monthsToCheck,
      usedDynamicPeriod: false,
    });

    const slaRows: Array<{ mdaName: string; monthlySlaData: Record<string, any> }> =
      await ctx.runQuery(internal.bulkSlaScoring.getSlaMonthlyForPreview, {
        scoringPeriod: args.scoringPeriod,
        mdaNames,
      });
    const slaByMda: Record<string, Record<string, any>> = {};
    for (const row of slaRows) {
      slaByMda[row.mdaName] = row.monthlySlaData ?? {};
    }

    return {
      truncated,
      rows: buildPreviewRows({
        mdaNames,
        monthDefs: meta.months,
        windowReports,
        slaByMda,
      }),
    };
  },
});

/**
 * @deprecated Prefer previewBulkSlaSubmissions action — kept so old clients don't crash.
 * Only accepts a tiny chunk; still may timeout on large report tables.
 */
export const getBulkSlaSubmissionPreview = query({
  args: {
    scoringPeriod: v.string(),
    mdaNames: v.array(v.string()),
  },
  returns: submissionPreviewReturns,
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin" && user.role !== "staff") {
      throw new Error("Unauthorized");
    }
    // Force clients onto the action path — return empty so UI must use the action.
    // (Returning an error breaks useQuery consumers.)
    void args;
    return { truncated: true, rows: [] };
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
