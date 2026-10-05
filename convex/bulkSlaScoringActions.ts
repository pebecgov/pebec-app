"use node";

/**
 * Bulk SLA scoring — processes reform-champion Excel uploads for a chunk of MDAs
 * using the same scoring rules as Configure Monthly SLA (scoringMode):
 * - pending completion (NIL / N/A / Not yet approved) within timeline → half credit
 * - succeed if at least one row scores (no 20% minimum)
 * - human-readable failure reasons
 */
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  isLikelyNonSpreadsheetFile,
  nonSpreadsheetFileMessage,
  processExcelBufferFull,
} from "../lib/mdaReportProcessing";

const monthOutcomeValidator = v.object({
  monthKey: v.string(),
  monthName: v.string(),
  status: v.union(
    v.literal("scored"),
    v.literal("failed"),
    v.literal("no_report"),
    v.literal("no_file"),
    v.literal("unsupported_format"),
  ),
  score: v.number(),
  overallPercentage: v.union(v.number(), v.null()),
  validRows: v.optional(v.number()),
  totalRows: v.optional(v.number()),
  detail: v.string(),
});

const mdaResultValidator = v.object({
  mdaName: v.string(),
  status: v.union(
    v.literal("saved"),
    v.literal("would_save"),
    v.literal("excluded"),
    v.literal("kept_existing"),
    v.literal("error"),
  ),
  previousScore: v.union(v.number(), v.null()),
  newScore: v.number(),
  percentage: v.number(),
  monthsWithData: v.number(),
  monthsScored: v.number(),
  monthsFailed: v.number(),
  monthsMissing: v.number(),
  detail: v.string(),
  months: v.array(monthOutcomeValidator),
});

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

type MonthOutcome = {
  monthKey: string;
  monthName: string;
  status: "scored" | "failed" | "no_report" | "no_file" | "unsupported_format";
  score: number;
  overallPercentage: number | null;
  validRows?: number;
  totalRows?: number;
  detail: string;
};

type MdaResult = {
  mdaName: string;
  status: "saved" | "would_save" | "excluded" | "kept_existing" | "error";
  previousScore: number | null;
  newScore: number;
  percentage: number;
  monthsWithData: number;
  monthsScored: number;
  monthsFailed: number;
  monthsMissing: number;
  detail: string;
  months: MonthOutcome[];
};

type BulkSlaChunkResult = {
  dryRun: boolean;
  scoringPeriod: string;
  slaPoints: number;
  pointsPerMonth: number;
  totalMonths: number;
  results: MdaResult[];
};

export const runBulkSlaScoringChunk = action({
  args: {
    scoringPeriod: v.string(),
    mdaNames: v.array(v.string()),
    dryRun: v.optional(v.boolean()),
    /** When false (default), MDAs that already have SLA data are left alone. */
    overwriteExisting: v.optional(v.boolean()),
  },
  returns: v.object({
    dryRun: v.boolean(),
    scoringPeriod: v.string(),
    slaPoints: v.number(),
    pointsPerMonth: v.number(),
    totalMonths: v.number(),
    results: v.array(mdaResultValidator),
  }),
  handler: async (ctx, args): Promise<BulkSlaChunkResult> => {
    if (args.mdaNames.length === 0) {
      throw new Error("No MDAs supplied");
    }
    if (args.mdaNames.length > 5) {
      throw new Error("Process at most 5 MDAs per call; send the list in chunks");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const dryRun = args.dryRun ?? false;
    const overwriteExisting = args.overwriteExisting ?? false;

    const actor = await ctx.runQuery(internal.bulkSlaScoring.getActorForBulkSla, {});
    if (!actor || (actor.role !== "admin" && actor.role !== "staff")) {
      throw new Error("Unauthorized: only admins and staff can run bulk SLA scoring");
    }
    const actorUserId = actor.userId;

    const context: {
      targetYear: number;
      slaPoints: number;
      pointsPerMonth: number;
      totalMonths: number;
      months: Array<{ month: number; year: number; monthName: string; monthKey: string }>;
      existingByMda: Record<string, { totalScore: number; percentage: number; monthsWithData: number }>;
      excludedMdas: string[];
    } = await ctx.runQuery(internal.bulkSlaScoring.getBulkSlaInternalContext, {
      scoringPeriod: args.scoringPeriod,
      mdaNames: args.mdaNames,
    });

    const excludedSet = new Set(context.excludedMdas);
    const results: MdaResult[] = [];

    for (const mdaName of args.mdaNames) {
      const existing = context.existingByMda[mdaName];
      const previousScore = existing?.totalScore ?? null;

      if (excludedSet.has(mdaName)) {
        results.push({
          mdaName,
          status: "excluded",
          previousScore,
          newScore: previousScore ?? 0,
          percentage: existing?.percentage ?? 0,
          monthsWithData: existing?.monthsWithData ?? 0,
          monthsScored: 0,
          monthsFailed: 0,
          monthsMissing: context.totalMonths,
          detail: "SLA metric is excluded for this MDA",
          months: [],
        });
        continue;
      }

      if (existing && !overwriteExisting) {
        results.push({
          mdaName,
          status: "kept_existing",
          previousScore,
          newScore: existing.totalScore,
          percentage: existing.percentage,
          monthsWithData: existing.monthsWithData,
          monthsScored: 0,
          monthsFailed: 0,
          monthsMissing: 0,
          detail: "Kept existing SLA score (enable overwrite to replace)",
          months: [],
        });
        continue;
      }

      try {
        const monthlySlaData: Record<string, unknown> = {};
        const monthOutcomes: MonthOutcome[] = [];
        let totalScore = 0;
        let monthsWithData = 0;
        let monthsScored = 0;
        let monthsFailed = 0;
        let monthsMissing = 0;

        for (const month of context.months) {
          const report = await ctx.runQuery(internal.mda_scoring.getMonthlyReportFileRef, {
            mdaName,
            month: month.month,
            year: month.year,
          });

          if (!report) {
            monthsMissing++;
            monthOutcomes.push({
              monthKey: month.monthKey,
              monthName: month.monthName,
              status: "no_report",
              score: 0,
              overallPercentage: null,
              detail: `No submitted report found for ${month.monthName} ${month.year}`,
            });
            continue;
          }

          if (!report.fileId) {
            monthsFailed++;
            monthOutcomes.push({
              monthKey: month.monthKey,
              monthName: month.monthName,
              status: "no_file",
              score: 0,
              overallPercentage: null,
              detail: "Report record exists but no Excel file is attached",
            });
            continue;
          }

          if (isLikelyNonSpreadsheetFile(report.fileName)) {
            monthsFailed++;
            monthOutcomes.push({
              monthKey: month.monthKey,
              monthName: month.monthName,
              status: "unsupported_format",
              score: 0,
              overallPercentage: null,
              detail: nonSpreadsheetFileMessage(report.fileName),
            });
            continue;
          }

          const fileUrl = await ctx.storage.getUrl(report.fileId);
          if (!fileUrl) {
            monthsFailed++;
            monthOutcomes.push({
              monthKey: month.monthKey,
              monthName: month.monthName,
              status: "failed",
              score: 0,
              overallPercentage: null,
              detail: "Could not open the uploaded file from storage",
            });
            continue;
          }

          const response = await fetch(fileUrl);
          if (!response.ok) {
            monthsFailed++;
            monthOutcomes.push({
              monthKey: month.monthKey,
              monthName: month.monthName,
              status: "failed",
              score: 0,
              overallPercentage: null,
              detail: `Failed to download the report file (${response.statusText})`,
            });
            continue;
          }

          const arrayBuffer = await response.arrayBuffer();
          const monthEnd = new Date(month.year, month.month + 1, 0, 23, 59, 59);
          const asOfDate = monthEnd.getTime() > Date.now() ? new Date() : monthEnd;
          const parsed = processExcelBufferFull(arrayBuffer, report.fileName, {
            scoringMode: true,
            asOfDate,
          });

          if (!parsed.ok) {
            monthsFailed++;
            monthOutcomes.push({
              monthKey: month.monthKey,
              monthName: month.monthName,
              status: "failed",
              score: 0,
              overallPercentage: null,
              validRows: parsed.validRowCount,
              totalRows: parsed.totalRowCount,
              detail: parsed.failureDetail,
            });
            monthlySlaData[month.monthKey] = {
              method: "file",
              file: null,
              rating: 0,
              results: [],
              overallPercentage: null,
              score: 0,
              check: {
                status: "failed",
                failureType: parsed.failureType,
                message: parsed.failureDetail,
                validRows: parsed.validRowCount,
                totalRows: parsed.totalRowCount,
              },
            };
            continue;
          }

          const overallPercentage = parsed.overallPercentage;
          const monthScore =
            overallPercentage !== null
              ? round2((overallPercentage / 100) * context.pointsPerMonth)
              : 0;
          monthsScored++;
          if (overallPercentage !== null) {
            monthsWithData++;
            totalScore += monthScore;
          }

          monthOutcomes.push({
            monthKey: month.monthKey,
            monthName: month.monthName,
            status: "scored",
            score: monthScore,
            overallPercentage,
            validRows: parsed.validRowCount,
            totalRows: parsed.totalRowCount,
            detail:
              parsed.metadata.partialSuccessNote ||
              `${parsed.validRowCount}/${parsed.totalRowCount} rows scored · ${overallPercentage?.toFixed(1) ?? 0}% → ${monthScore.toFixed(2)} pts`,
          });

          monthlySlaData[month.monthKey] = {
            method: "file",
            file: null,
            rating: 0,
            results: [],
            overallPercentage,
            score: monthScore,
            check: {
              status: parsed.processingQuality === "partial_success" ? "partial_success" : "success",
              validRows: parsed.validRowCount,
              totalRows: parsed.totalRowCount,
              message: parsed.metadata.partialSuccessNote,
            },
          };
        }

        totalScore = round2(totalScore);
        const percentage =
          context.slaPoints > 0 ? round2((totalScore / context.slaPoints) * 100) : 0;

        if (!dryRun) {
          await ctx.runMutation(internal.bulkSlaScoring.saveBulkSlaResult, {
            mdaName,
            scoringPeriod: args.scoringPeriod,
            monthlySlaData,
            totalScore,
            monthsWithData,
            totalMonths: context.totalMonths,
            percentage,
            actorUserId,
          });
        }

        results.push({
          mdaName,
          status: dryRun ? "would_save" : "saved",
          previousScore,
          newScore: totalScore,
          percentage,
          monthsWithData,
          monthsScored,
          monthsFailed,
          monthsMissing,
          detail: `${monthsScored} month(s) scored, ${monthsFailed} failed, ${monthsMissing} missing · ${totalScore.toFixed(2)}/${context.slaPoints} pts`,
          months: monthOutcomes,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        results.push({
          mdaName,
          status: "error",
          previousScore,
          newScore: previousScore ?? 0,
          percentage: existing?.percentage ?? 0,
          monthsWithData: existing?.monthsWithData ?? 0,
          monthsScored: 0,
          monthsFailed: 0,
          monthsMissing: 0,
          detail: message,
          months: [],
        });
      }
    }

    return {
      dryRun,
      scoringPeriod: args.scoringPeriod,
      slaPoints: context.slaPoints,
      pointsPerMonth: context.pointsPerMonth,
      totalMonths: context.totalMonths,
      results,
    };
  },
});
