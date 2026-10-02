/**
 * "Run all" for the automatic Efficiency & Compliance metrics.
 *
 * Monthly Report Submission, Deadline Compliance and Report Gov Resolution are
 * derived entirely from platform data (reform-champion report submissions and
 * ReportGov tickets), so they can be computed and saved for every MDA without
 * an admin opening each one. SLA and Mystery Shopping need manual input and
 * are deliberately not covered here.
 *
 * The mutation processes a *chunk* of MDAs per call so a single transaction
 * stays well inside Convex read limits; the client iterates over chunks.
 */
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { getCurrentUserOrThrow } from "./users";
import { logAuditEvent } from "./utils/auditLog";
import {
  buildExclusionLookup,
  findMdaByName,
  normalizeMdaKey,
  splitMdaNameForMatch,
} from "./mda_scoring";
import {
  buildMonthlyReportData,
  computeReportGovScore,
  computeTicketStats,
  filterReportsToWindow,
  proportionalScore,
  resolveScoringWindow,
} from "./utils/efficiencyScoring";

export const AUTOMATIC_EFFICIENCY_METRICS = ["reportSubmission", "timeliness", "reportGov"] as const;
export type AutomaticEfficiencyMetric = (typeof AUTOMATIC_EFFICIENCY_METRICS)[number];

const metricValidator = v.union(
  v.literal("reportSubmission"),
  v.literal("timeliness"),
  v.literal("reportGov"),
);

const statusValidator = v.union(
  v.literal("saved"),
  v.literal("would_save"),
  v.literal("excluded"),
  v.literal("manual_override"),
  v.literal("error"),
);

export type BulkMetricStatus =
  | "saved"
  | "would_save"
  | "excluded"
  | "manual_override"
  | "error";

type MetricOutcome = {
  metric: AutomaticEfficiencyMetric;
  status: BulkMetricStatus;
  previousScore: number | null;
  newScore: number;
  detail: string;
};

const DEFAULT_POINTS = { reportSubmission: 3, timeliness: 2, reportGov: 15 } as const;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function resolvePoints(ctx: MutationCtx, targetYear: number) {
  if (targetYear < 2026) return { ...DEFAULT_POINTS };
  const config = await ctx.db
    .query("efficiency_periods")
    .withIndex("byYear", (q) => q.eq("year", targetYear))
    .first();
  return {
    reportSubmission: config?.reportSubmissionPoints ?? DEFAULT_POINTS.reportSubmission,
    timeliness: config?.timelinessPoints ?? DEFAULT_POINTS.timeliness,
    reportGov: config?.reportGovPoints ?? DEFAULT_POINTS.reportGov,
  };
}

function excludedMetricsFor(
  exclusionMap: Map<string, Set<string>>,
  mdaName: string,
): Set<string> {
  const parts = splitMdaNameForMatch(mdaName);
  return (
    exclusionMap.get(normalizeMdaKey(mdaName)) ||
    (parts.fullName ? exclusionMap.get(parts.fullName) : undefined) ||
    (parts.abbr ? exclusionMap.get(parts.abbr) : undefined) ||
    new Set<string>()
  );
}

export const runAutomaticEfficiencyScoring = mutation({
  args: {
    scoringPeriod: v.string(),
    /** The MDAs to process in this call (the client sends the full list in chunks). */
    mdaNames: v.array(v.string()),
    metrics: v.array(metricValidator),
    /** When true nothing is written; results show what *would* be saved. */
    dryRun: v.optional(v.boolean()),
    /**
     * By default an MDA whose Report Gov is set to "Skip (0 points)" or whose
     * submission/timeliness was entered manually is left alone. Set this to
     * replace those with the automatic result.
     */
    overwriteManual: v.optional(v.boolean()),
  },
  returns: v.object({
    dryRun: v.boolean(),
    scoringPeriod: v.string(),
    points: v.object({
      reportSubmission: v.number(),
      timeliness: v.number(),
      reportGov: v.number(),
    }),
    totalMonths: v.number(),
    results: v.array(
      v.object({
        mdaName: v.string(),
        onPlatform: v.boolean(),
        outcomes: v.array(
          v.object({
            metric: metricValidator,
            status: statusValidator,
            previousScore: v.union(v.number(), v.null()),
            newScore: v.number(),
            detail: v.string(),
          }),
        ),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin" && user.role !== "staff") {
      throw new Error("Unauthorized: only admins and staff can run bulk scoring");
    }
    if (args.mdaNames.length === 0) {
      throw new Error("No MDAs supplied");
    }
    if (args.mdaNames.length > 15) {
      throw new Error("Process at most 15 MDAs per call; send the list in chunks");
    }
    const metrics = new Set<AutomaticEfficiencyMetric>(args.metrics);
    if (metrics.size === 0) {
      throw new Error("Select at least one metric to run");
    }

    const dryRun = args.dryRun ?? false;
    const overwriteManual = args.overwriteManual ?? false;
    const now = Date.now();

    const reportWindow = await resolveScoringWindow(ctx, args.scoringPeriod, "yearToDate");
    const ticketWindow = metrics.has("reportGov")
      ? await resolveScoringWindow(ctx, args.scoringPeriod, "currentMonth")
      : reportWindow;
    const points = await resolvePoints(ctx, reportWindow.targetYear);
    const totalMonths = reportWindow.monthsToCheck.length;

    const exclusionRows = await ctx.db
      .query("mda_metric_exclusions")
      .withIndex("byYear", (q) => q.eq("year", reportWindow.targetYear))
      .collect();
    const exclusionMap = buildExclusionLookup(exclusionRows);

    // One scan of reform-champion reports for the whole chunk (the per-MDA
    // query does this scan once *per MDA*, so this is strictly cheaper).
    const needsReports = metrics.has("reportSubmission") || metrics.has("timeliness");
    const reportsByMda = new Map<string, Doc<"submitted_reports">[]>();
    if (needsReports) {
      const allReports = await ctx.db
        .query("submitted_reports")
        .withIndex("byDate", (q) => q.gte("submittedAt", 0))
        .filter((q) => q.eq(q.field("role"), "reform_champion"))
        .collect();
      for (const report of filterReportsToWindow(allReports, reportWindow)) {
        const key = report.mdaName ?? "";
        const bucket = reportsByMda.get(key);
        if (bucket) bucket.push(report);
        else reportsByMda.set(key, [report]);
      }
    }

    const results: Array<{ mdaName: string; onPlatform: boolean; outcomes: MetricOutcome[] }> = [];
    let savedCount = 0;

    for (const mdaName of args.mdaNames) {
      const outcomes: MetricOutcome[] = [];
      const mda = await findMdaByName(ctx, mdaName);
      const actualMdaName: string = mda ? mda.name : mdaName;
      const excluded = excludedMetricsFor(exclusionMap, mdaName);

      // ---- Monthly Report Submission & Deadline Compliance ----
      if (needsReports) {
        const monthly = buildMonthlyReportData(
          reportsByMda.get(actualMdaName) ?? [],
          reportWindow.monthsToCheck,
        );
        const submitted = monthly.filter((m) => m.submitted).length;
        const onTime = monthly.filter((m) => m.onTime).length;

        if (metrics.has("reportSubmission")) {
          const newScore = round2(proportionalScore(submitted, totalMonths, points.reportSubmission));
          const detail = `${submitted}/${totalMonths} months submitted`;
          const existing = await ctx.db
            .query("mda_monthly_report_data")
            .withIndex("byMdaAndPeriod", (q) =>
              q.eq("mdaName", mdaName).eq("scoringPeriod", args.scoringPeriod),
            )
            .first();

          if (excluded.has("reportSubmission")) {
            outcomes.push({ metric: "reportSubmission", status: "excluded", previousScore: existing?.score ?? null, newScore, detail: "Metric excluded for this MDA" });
          } else if (existing?.useManual && !overwriteManual) {
            outcomes.push({ metric: "reportSubmission", status: "manual_override", previousScore: existing.score, newScore, detail: "Kept manual entry" });
          } else {
            if (!dryRun) {
              if (existing) {
                await ctx.db.patch(existing._id, { manualMonthlyReports: {}, useManual: false, score: newScore, updatedAt: now, updatedBy: user._id });
              } else {
                await ctx.db.insert("mda_monthly_report_data", { mdaName, scoringPeriod: args.scoringPeriod, manualMonthlyReports: {}, useManual: false, score: newScore, createdAt: now, updatedAt: now, createdBy: user._id, updatedBy: user._id });
              }
              savedCount++;
            }
            outcomes.push({ metric: "reportSubmission", status: dryRun ? "would_save" : "saved", previousScore: existing?.score ?? null, newScore, detail });
          }
        }

        if (metrics.has("timeliness")) {
          const newScore = round2(proportionalScore(onTime, totalMonths, points.timeliness));
          const detail = `${onTime}/${totalMonths} months on time`;
          const existing = await ctx.db
            .query("mda_timeliness_data")
            .withIndex("byMdaAndPeriod", (q) =>
              q.eq("mdaName", mdaName).eq("scoringPeriod", args.scoringPeriod),
            )
            .first();

          if (excluded.has("timeliness")) {
            outcomes.push({ metric: "timeliness", status: "excluded", previousScore: existing?.score ?? null, newScore, detail: "Metric excluded for this MDA" });
          } else if (existing?.useManual && !overwriteManual) {
            outcomes.push({ metric: "timeliness", status: "manual_override", previousScore: existing.score, newScore, detail: "Kept manual entry" });
          } else {
            if (!dryRun) {
              if (existing) {
                await ctx.db.patch(existing._id, { manualTimeliness: {}, useManual: false, score: newScore, updatedAt: now, updatedBy: user._id });
              } else {
                await ctx.db.insert("mda_timeliness_data", { mdaName, scoringPeriod: args.scoringPeriod, manualTimeliness: {}, useManual: false, score: newScore, createdAt: now, updatedAt: now, createdBy: user._id, updatedBy: user._id });
              }
              savedCount++;
            }
            outcomes.push({ metric: "timeliness", status: dryRun ? "would_save" : "saved", previousScore: existing?.score ?? null, newScore, detail });
          }
        }
      }

      // ---- Report Gov Resolution ----
      if (metrics.has("reportGov")) {
        const existing = await ctx.db
          .query("mda_reportgov_data")
          .withIndex("byMdaAndPeriod", (q) =>
            q.eq("mdaName", mdaName).eq("scoringPeriod", args.scoringPeriod),
          )
          .first();

        if (excluded.has("reportGov")) {
          outcomes.push({ metric: "reportGov", status: "excluded", previousScore: existing?.score ?? null, newScore: 0, detail: "Metric excluded for this MDA" });
        } else if ((existing?.isSkipped || existing?.isManual) && !overwriteManual) {
          outcomes.push({ metric: "reportGov", status: "manual_override", previousScore: existing.score, newScore: existing.score, detail: existing.isSkipped ? "Kept \"Skip (0 points)\"" : "Kept manual entry" });
        } else {
          // Mirrors the one-MDA screen: an MDA not on the platform has no tickets → 0.
          const tickets = mda
            ? await ctx.db
                .query("tickets")
                .withIndex("byMDA", (q) => q.eq("assignedMDA", mda._id))
                .collect()
            : [];
          const stats = computeTicketStats(tickets, ticketWindow.startDate, ticketWindow.endDate);
          const newScore = round2(computeReportGovScore(stats, points.reportGov));
          const detail = mda
            ? `${stats.totalTickets} tickets, ${stats.resolvedTickets} resolved (${stats.resolutionRate.toFixed(0)}%)`
            : "MDA not on platform — no tickets";

          if (!dryRun) {
            const payload = {
              totalTickets: stats.totalTickets,
              resolvedTickets: stats.resolvedTickets,
              averageResponseTime: stats.averageResponseTime,
              averageResolutionTime: stats.averageResolutionTime,
              resolutionRate: stats.resolutionRate,
              score: newScore,
              isManual: false,
              isSkipped: false,
              updatedAt: now,
              updatedBy: user._id,
            };
            if (existing) {
              await ctx.db.patch(existing._id, payload);
            } else {
              await ctx.db.insert("mda_reportgov_data", { mdaName, scoringPeriod: args.scoringPeriod, ...payload, createdAt: now, createdBy: user._id });
            }
            savedCount++;
          }
          outcomes.push({ metric: "reportGov", status: dryRun ? "would_save" : "saved", previousScore: existing?.score ?? null, newScore, detail });
        }
      }

      results.push({ mdaName, onPlatform: !!mda, outcomes });
    }

    if (!dryRun && savedCount > 0) {
      await logAuditEvent(ctx, {
        action: "bfa.mda_score_saved",
        category: "bfa",
        summary: `Bulk automatic scoring (${[...metrics].join(", ")}) for ${args.mdaNames.length} MDAs — ${args.scoringPeriod}`,
        actor: user,
        target: { type: "bfa_bulk_efficiency", label: args.scoringPeriod },
        metadata: { scoringPeriod: args.scoringPeriod, metrics: [...metrics], mdaCount: args.mdaNames.length, savedCount },
      });
    }

    return { dryRun, scoringPeriod: args.scoringPeriod, points, totalMonths, results };
  },
});
