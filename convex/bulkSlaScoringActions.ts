"use node";

/**
 * Bulk SLA scoring — processes reform-champion Excel uploads for a chunk of MDAs
 * using the same scoring rules as Configure Monthly SLA (scoringMode):
 * - pending completion (NIL / N/A / Not yet approved) within timeline → half credit
 * - succeed if at least one row scores (no 20% minimum)
 * - human-readable failure reasons
 *
 * Modes:
 * - full (default): score every month in the window (optionally skip MDAs that already have SLA)
 * - updateLatestOnly: keep existing successful month scores; only score months that
 *   are missing or whose last attempt failed (re-score uses the latest upload)
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
    v.literal("kept"),
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
    v.literal("unchanged"),
    v.literal("error"),
  ),
  previousScore: v.union(v.number(), v.null()),
  newScore: v.number(),
  percentage: v.number(),
  monthsWithData: v.number(),
  monthsScored: v.number(),
  monthsFailed: v.number(),
  monthsMissing: v.number(),
  monthsUpdated: v.optional(v.number()),
  monthsKept: v.optional(v.number()),
  detail: v.string(),
  months: v.array(monthOutcomeValidator),
});

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

type MonthOutcome = {
  monthKey: string;
  monthName: string;
  status: "scored" | "failed" | "no_report" | "no_file" | "unsupported_format" | "kept";
  score: number;
  overallPercentage: number | null;
  validRows?: number;
  totalRows?: number;
  detail: string;
};

type MdaResult = {
  mdaName: string;
  status: "saved" | "would_save" | "excluded" | "kept_existing" | "unchanged" | "error";
  previousScore: number | null;
  newScore: number;
  percentage: number;
  monthsWithData: number;
  monthsScored: number;
  monthsFailed: number;
  monthsMissing: number;
  monthsUpdated?: number;
  monthsKept?: number;
  detail: string;
  months: MonthOutcome[];
};

type BulkSlaChunkResult = {
  dryRun: boolean;
  scoringPeriod: string;
  slaPoints: number;
  pointsPerMonth: number;
  totalMonths: number;
  updateLatestOnly: boolean;
  results: MdaResult[];
};

type ExistingMonthEntry = {
  method?: string;
  overallPercentage?: number | null;
  score?: number;
  scoredSubmittedAt?: number;
  check?: { status?: string; validRows?: number; totalRows?: number; message?: string } | null;
};

/**
 * Update-latest mode: only touch months that still need a score.
 * - Missing / never scored → score
 * - Last attempt failed → re-score (uses latest file)
 * - Already success / partial_success → keep (do not re-score even if a newer upload exists)
 */
function existingMonthNeedsRescore(
  entry: ExistingMonthEntry | undefined,
  _reportSubmittedAt: number | null,
  _reportCount: number,
): boolean {
  if (!entry) return true;
  const status = entry.check?.status;
  if (status === "failed") return true;
  // Successfully scored before (including partial_success) — leave alone
  if (status === "success" || status === "partial_success") return false;
  if (typeof entry.score === "number" && entry.score > 0) return false;
  if (typeof entry.overallPercentage === "number") return false;
  // No usable score yet
  return true;
}

function summarizeMergedMonths(
  monthlySlaData: Record<string, unknown>,
  months: Array<{ monthKey: string }>,
  pointsPerMonth: number,
): { totalScore: number; monthsWithData: number } {
  let totalScore = 0;
  let monthsWithData = 0;
  for (const { monthKey } of months) {
    const entry = monthlySlaData[monthKey] as ExistingMonthEntry | undefined;
    if (!entry) continue;
    if (typeof entry.score === "number" && entry.score > 0) {
      monthsWithData++;
      totalScore += entry.score;
    } else if (typeof entry.overallPercentage === "number") {
      monthsWithData++;
      totalScore += round2((entry.overallPercentage / 100) * pointsPerMonth);
    }
  }
  return { totalScore: round2(totalScore), monthsWithData };
}

export const runBulkSlaScoringChunk = action({
  args: {
    scoringPeriod: v.string(),
    mdaNames: v.array(v.string()),
    dryRun: v.optional(v.boolean()),
    /** When false (default), MDAs that already have SLA data are left alone (full mode only). */
    overwriteExisting: v.optional(v.boolean()),
    /**
     * Only score months that are missing or previously failed.
     * Successful months are left alone even if a newer file exists.
     */
    updateLatestOnly: v.optional(v.boolean()),
  },
  returns: v.object({
    dryRun: v.boolean(),
    scoringPeriod: v.string(),
    slaPoints: v.number(),
    pointsPerMonth: v.number(),
    totalMonths: v.number(),
    updateLatestOnly: v.boolean(),
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
    const updateLatestOnly = args.updateLatestOnly ?? false;

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
      existingByMda: Record<
        string,
        {
          totalScore: number;
          percentage: number;
          monthsWithData: number;
          monthlySlaData: Record<string, unknown>;
        }
      >;
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

      // Full mode: leave MDAs with existing scores unless overwrite is on
      if (existing && !overwriteExisting && !updateLatestOnly) {
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
          detail: "Kept existing SLA score (enable overwrite to replace, or use Update latest months)",
          months: [],
        });
        continue;
      }

      try {
        const monthlySlaData: Record<string, unknown> = updateLatestOnly
          ? { ...(existing?.monthlySlaData ?? {}) }
          : {};
        const monthOutcomes: MonthOutcome[] = [];
        let monthsScored = 0;
        let monthsFailed = 0;
        let monthsMissing = 0;
        let monthsUpdated = 0;
        let monthsKept = 0;

        for (const month of context.months) {
          const existingEntry = monthlySlaData[month.monthKey] as ExistingMonthEntry | undefined;

          const report = await ctx.runQuery(internal.mda_scoring.getMonthlyReportFileRef, {
            mdaName,
            month: month.month,
            year: month.year,
            scoringPeriod: args.scoringPeriod,
          });

          if (updateLatestOnly) {
            const needsRescore = existingMonthNeedsRescore(
              existingEntry,
              report?.submittedAt ?? null,
              report?.reportCount ?? 0,
            );
            if (!needsRescore && existingEntry) {
              monthsKept++;
              const keptScore =
                typeof existingEntry.score === "number"
                  ? existingEntry.score
                  : typeof existingEntry.overallPercentage === "number"
                    ? round2((existingEntry.overallPercentage / 100) * context.pointsPerMonth)
                    : 0;
              monthOutcomes.push({
                monthKey: month.monthKey,
                monthName: month.monthName,
                status: "kept",
                score: keptScore,
                overallPercentage:
                  typeof existingEntry.overallPercentage === "number"
                    ? existingEntry.overallPercentage
                    : null,
                detail: "Kept previous successful score",
              });
              continue;
            }
            // Missing month with no report — keep as missing, don't invent a score
            if (!report && !existingEntry) {
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
            if (!report && existingEntry) {
              monthsKept++;
              monthOutcomes.push({
                monthKey: month.monthKey,
                monthName: month.monthName,
                status: "kept",
                score: typeof existingEntry.score === "number" ? existingEntry.score : 0,
                overallPercentage:
                  typeof existingEntry.overallPercentage === "number"
                    ? existingEntry.overallPercentage
                    : null,
                detail: "Kept previous score (no report to re-score)",
              });
              continue;
            }
          }

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
            monthsUpdated++;
            monthOutcomes.push({
              monthKey: month.monthKey,
              monthName: month.monthName,
              status: "no_file",
              score: 0,
              overallPercentage: null,
              detail: "Report record exists but no Excel file is attached",
            });
            monthlySlaData[month.monthKey] = {
              method: "file",
              file: null,
              rating: 0,
              results: [],
              overallPercentage: null,
              score: 0,
              scoredSubmittedAt: report.submittedAt,
              check: {
                status: "failed",
                message: "Report record exists but no Excel file is attached",
              },
            };
            continue;
          }

          if (isLikelyNonSpreadsheetFile(report.fileName)) {
            monthsFailed++;
            monthsUpdated++;
            const detail = nonSpreadsheetFileMessage(report.fileName);
            monthOutcomes.push({
              monthKey: month.monthKey,
              monthName: month.monthName,
              status: "unsupported_format",
              score: 0,
              overallPercentage: null,
              detail,
            });
            monthlySlaData[month.monthKey] = {
              method: "file",
              file: null,
              rating: 0,
              results: [],
              overallPercentage: null,
              score: 0,
              scoredSubmittedAt: report.submittedAt,
              check: { status: "failed", message: detail },
            };
            continue;
          }

          const fileUrl = await ctx.storage.getUrl(report.fileId);
          if (!fileUrl) {
            monthsFailed++;
            monthsUpdated++;
            monthOutcomes.push({
              monthKey: month.monthKey,
              monthName: month.monthName,
              status: "failed",
              score: 0,
              overallPercentage: null,
              detail: "Could not open the uploaded file from storage",
            });
            monthlySlaData[month.monthKey] = {
              method: "file",
              file: null,
              rating: 0,
              results: [],
              overallPercentage: null,
              score: 0,
              scoredSubmittedAt: report.submittedAt,
              check: {
                status: "failed",
                message: "Could not open the uploaded file from storage",
              },
            };
            continue;
          }

          const response = await fetch(fileUrl);
          if (!response.ok) {
            monthsFailed++;
            monthsUpdated++;
            monthOutcomes.push({
              monthKey: month.monthKey,
              monthName: month.monthName,
              status: "failed",
              score: 0,
              overallPercentage: null,
              detail: `Failed to download the report file (${response.statusText})`,
            });
            monthlySlaData[month.monthKey] = {
              method: "file",
              file: null,
              rating: 0,
              results: [],
              overallPercentage: null,
              score: 0,
              scoredSubmittedAt: report.submittedAt,
              check: {
                status: "failed",
                message: `Failed to download the report file (${response.statusText})`,
              },
            };
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
            monthsUpdated++;
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
              scoredSubmittedAt: report.submittedAt,
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
          monthsUpdated++;

          const replacedNote =
            updateLatestOnly && existingEntry
              ? report.reportCount > 1
                ? ` · replaced older upload with latest of ${report.reportCount}`
                : " · updated from newer upload"
              : report.reportCount > 1
                ? ` · used latest of ${report.reportCount} uploads`
                : "";

          monthOutcomes.push({
            monthKey: month.monthKey,
            monthName: month.monthName,
            status: "scored",
            score: monthScore,
            overallPercentage,
            validRows: parsed.validRowCount,
            totalRows: parsed.totalRowCount,
            detail:
              (parsed.metadata.partialSuccessNote ||
                `${parsed.validRowCount}/${parsed.totalRowCount} rows scored · ${overallPercentage?.toFixed(1) ?? 0}% → ${monthScore.toFixed(2)} pts`) +
              replacedNote,
          });

          monthlySlaData[month.monthKey] = {
            method: "file",
            file: null,
            rating: 0,
            results: [],
            overallPercentage,
            score: monthScore,
            scoredSubmittedAt: report.submittedAt,
            check: {
              status: parsed.processingQuality === "partial_success" ? "partial_success" : "success",
              validRows: parsed.validRowCount,
              totalRows: parsed.totalRowCount,
              message: parsed.metadata.partialSuccessNote,
            },
          };
        }

        const { totalScore, monthsWithData } = summarizeMergedMonths(
          monthlySlaData,
          context.months,
          context.pointsPerMonth,
        );
        const percentage =
          context.slaPoints > 0 ? round2((totalScore / context.slaPoints) * 100) : 0;

        const nothingChanged =
          updateLatestOnly && monthsUpdated === 0 && previousScore === totalScore;

        if (!dryRun && !nothingChanged) {
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

        const detailParts = updateLatestOnly
          ? [
              `${monthsUpdated} month(s) updated`,
              `${monthsKept} kept`,
              `${monthsFailed} failed`,
              `${monthsMissing} missing`,
              `${totalScore.toFixed(2)}/${context.slaPoints} pts`,
            ]
          : [
              `${monthsScored} month(s) scored`,
              `${monthsFailed} failed`,
              `${monthsMissing} missing`,
              `${totalScore.toFixed(2)}/${context.slaPoints} pts`,
            ];

        results.push({
          mdaName,
          status: nothingChanged
            ? "unchanged"
            : dryRun
              ? "would_save"
              : "saved",
          previousScore,
          newScore: totalScore,
          percentage,
          monthsWithData,
          monthsScored,
          monthsFailed,
          monthsMissing,
          monthsUpdated,
          monthsKept,
          detail: detailParts.join(" · "),
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
      updateLatestOnly,
      results,
    };
  },
});
