import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUserOrThrow } from "./users";
import { resolveReportPeriod } from "../lib/reportPeriod";
import {
  computeMdaSubmissionMatrix,
  monthValueToParts,
  mdaNamesMatch,
} from "../lib/mdaSubmissionMatrix";
import { Id, Doc } from "./_generated/dataModel";
import { ingestionProcessingMetadataValidator } from "../lib/ingestionProcessingMetadata";

const INGESTION_SCHEDULE_DELAY_MS = 500;

export const ingestionStatusValidator = v.union(
  v.literal("pending"),
  v.literal("success"),
  v.literal("failed")
);

/** Max time a cell may stay pending before marked as timed out */
const INGESTION_CELL_TIMEOUT_MS = 2 * 60 * 1000;

export const ingestionFailureTypeValidator = v.optional(
  v.union(
    v.literal("header_row_not_found"),
    v.literal("submission_date_column_missing"),
    v.literal("completion_date_column_missing"),
    v.literal("timeline_column_missing"),
    v.literal("unparseable_dates"),
    v.literal("empty_file"),
    v.literal("unsupported_format"),
    v.literal("processing_timeout"),
    v.literal("cancelled"),
    v.literal("unknown")
  )
);

async function assertAdmin(ctx: QueryCtx) {
  const user = await getCurrentUserOrThrow(ctx);
  if (user.role !== "admin") {
    throw new Error("Unauthorized: Only admins can manage ingestion status.");
  }
  return user;
}

type IngestionCell = {
  mdaName: string;
  reportPeriodMonth: number;
  reportPeriodYear: number;
  submittedReportId: Id<"submitted_reports">;
};

async function findIngestionCellsInRange(
  ctx: QueryCtx,
  fromMonthValue: string,
  toMonthValue: string
): Promise<IngestionCell[]> {
  const fromParts = monthValueToParts(fromMonthValue);
  const toParts = monthValueToParts(toMonthValue);
  if (!fromParts || !toParts) {
    throw new Error("Invalid month range.");
  }

  const fromMs = new Date(fromParts.year, fromParts.monthIndex, 1).getTime();
  const toMs = new Date(toParts.year, toParts.monthIndex, 1).getTime();
  if (fromMs > toMs) {
    throw new Error("From month must be before or equal to To month.");
  }

  const allReports = await ctx.db
    .query("submitted_reports")
    .withIndex("byDate", (q) => q.gte("submittedAt", 0))
    .collect();

  const reformReports = (
    await Promise.all(
      allReports.map(async (report) => {
        if (report.role !== "reform_champion" || report.isDraft === true || !report.fileId) {
          return null;
        }
        const user = await ctx.db.get(report.submittedBy);
        const mdaName = user?.mdaName ?? report.mdaName;
        if (!mdaName) return null;
        return { ...report, mdaName };
      })
    )
  ).filter((r): r is NonNullable<typeof r> => r !== null);

  const matrix = computeMdaSubmissionMatrix(reformReports, fromMonthValue, toMonthValue);

  const cells: IngestionCell[] = [];
  const seen = new Set<string>();

  for (const report of reformReports) {
    const period = resolveReportPeriod(report);
    if (!period) continue;

    const monthKey = `${period.year}-${String(period.month + 1).padStart(2, "0")}`;
    const colIdx = matrix.monthKeys.indexOf(monthKey);
    if (colIdx === -1) continue;

    const rowIdx = matrix.mdaNames.findIndex((name) => mdaNamesMatch(name, report.mdaName!));
    if (rowIdx === -1) continue;
    if (!matrix.statusGrid[rowIdx]?.[colIdx]) continue;

    const dedupeKey = `${matrix.mdaNames[rowIdx]}:${monthKey}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    cells.push({
      mdaName: matrix.mdaNames[rowIdx]!,
      reportPeriodMonth: period.month,
      reportPeriodYear: period.year,
      submittedReportId: report._id,
    });
  }

  return cells;
}

async function getIngestionRunByCheckRunId(ctx: QueryCtx, checkRunId: string) {
  return await ctx.db
    .query("mda_report_ingestion_runs")
    .withIndex("by_check_run", (q) => q.eq("checkRunId", checkRunId))
    .first();
}

async function getIngestionCell(
  ctx: QueryCtx,
  mdaName: string,
  reportPeriodYear: number,
  reportPeriodMonth: number
) {
  return await ctx.db
    .query("mda_report_ingestion_status")
    .withIndex("by_mda_period", (q) =>
      q
        .eq("mdaName", mdaName)
        .eq("reportPeriodYear", reportPeriodYear)
        .eq("reportPeriodMonth", reportPeriodMonth)
    )
    .first();
}

async function isRunCancelled(ctx: QueryCtx, checkRunId: string | undefined): Promise<boolean> {
  if (!checkRunId) return false;
  const run = await getIngestionRunByCheckRunId(ctx, checkRunId);
  return run?.status === "cancelled";
}

export const getActiveIngestionRun = query({
  args: {
    fromMonthValue: v.string(),
    toMonthValue: v.string(),
  },
  returns: v.union(
    v.object({
      checkRunId: v.string(),
      status: v.union(v.literal("running"), v.literal("cancelled"), v.literal("completed")),
      queuedCount: v.number(),
      pendingCount: v.number(),
      startedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    const runs = await ctx.db.query("mda_report_ingestion_runs").collect();
    const active = runs
      .filter(
        (r) =>
          r.status === "running" &&
          r.fromMonthValue === args.fromMonthValue &&
          r.toMonthValue === args.toMonthValue
      )
      .sort((a, b) => b.startedAt - a.startedAt)[0];

    if (!active) return null;

    const statuses = await ctx.db
      .query("mda_report_ingestion_status")
      .withIndex("by_check_run", (q) => q.eq("checkRunId", active.checkRunId))
      .collect();

    const pendingCount = statuses.filter((s) => s.status === "pending").length;

    return {
      checkRunId: active.checkRunId,
      status: active.status,
      queuedCount: active.queuedCount,
      pendingCount,
      startedAt: active.startedAt,
    };
  },
});

export const getIngestionRunStatus = internalQuery({
  args: { checkRunId: v.string() },
  returns: v.union(
    v.object({
      status: v.union(v.literal("running"), v.literal("cancelled"), v.literal("completed")),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const run = await getIngestionRunByCheckRunId(ctx, args.checkRunId);
    if (!run) return null;
    return { status: run.status };
  },
});

export const getIngestionStatusForRange = query({
  args: {
    fromMonthValue: v.string(),
    toMonthValue: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("mda_report_ingestion_status"),
      submittedReportId: v.optional(v.id("submitted_reports")),
      mdaName: v.string(),
      reportPeriodMonth: v.number(),
      reportPeriodYear: v.number(),
      status: ingestionStatusValidator,
      failureType: ingestionFailureTypeValidator,
      failureDetail: v.optional(v.string()),
      invalidDateRowCount: v.optional(v.number()),
      validRowCount: v.optional(v.number()),
      totalRowCount: v.optional(v.number()),
      processedAt: v.optional(v.number()),
      pendingStartedAt: v.optional(v.number()),
      checkRunId: v.optional(v.string()),
      processingMetadata: v.optional(ingestionProcessingMetadataValidator),
    })
  ),
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    const fromParts = monthValueToParts(args.fromMonthValue);
    const toParts = monthValueToParts(args.toMonthValue);
    if (!fromParts || !toParts) return [];

    const statuses = await ctx.db.query("mda_report_ingestion_status").collect();

    return statuses
      .filter((row) => {
        const rowMs = new Date(row.reportPeriodYear, row.reportPeriodMonth, 1).getTime();
        const fromMs = new Date(fromParts.year, fromParts.monthIndex, 1).getTime();
        const toMs = new Date(toParts.year, toParts.monthIndex, 1).getTime();
        return rowMs >= fromMs && rowMs <= toMs;
      })
      .map((row) => ({
        _id: row._id,
        submittedReportId: row.submittedReportId,
        mdaName: row.mdaName,
        reportPeriodMonth: row.reportPeriodMonth,
        reportPeriodYear: row.reportPeriodYear,
        status: row.status,
        failureType: row.failureType,
        failureDetail: row.failureDetail,
        invalidDateRowCount: row.invalidDateRowCount,
        validRowCount: row.validRowCount,
        totalRowCount: row.totalRowCount,
        processedAt: row.processedAt,
        pendingStartedAt: row.pendingStartedAt,
        checkRunId: row.checkRunId,
        processingMetadata: row.processingMetadata,
      }));
  },
});

export const getIngestionFailureSummary = query({
  args: {
    fromMonthValue: v.string(),
    toMonthValue: v.string(),
  },
  returns: v.array(
    v.object({
      failureType: v.string(),
      count: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    const rows = await ctx.db.query("mda_report_ingestion_status").collect();
    const fromParts = monthValueToParts(args.fromMonthValue);
    const toParts = monthValueToParts(args.toMonthValue);
    if (!fromParts || !toParts) return [];

    const fromMs = new Date(fromParts.year, fromParts.monthIndex, 1).getTime();
    const toMs = new Date(toParts.year, toParts.monthIndex, 1).getTime();

    const counts = new Map<string, number>();
    for (const row of rows) {
      if (row.status !== "failed" || !row.failureType) continue;
      const rowMs = new Date(row.reportPeriodYear, row.reportPeriodMonth, 1).getTime();
      if (rowMs < fromMs || rowMs > toMs) continue;
      counts.set(row.failureType, (counts.get(row.failureType) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([failureType, count]) => ({ failureType, count }))
      .sort((a, b) => b.count - a.count);
  },
});

export const startIngestionCheck = mutation({
  args: {
    fromMonthValue: v.string(),
    toMonthValue: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    queuedCount: v.number(),
    checkRunId: v.string(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    const cells = await findIngestionCellsInRange(ctx, args.fromMonthValue, args.toMonthValue);
    if (cells.length === 0) {
      return {
        success: false,
        queuedCount: 0,
        checkRunId: "",
        message: "No submitted reports with files found in this range.",
      };
    }

    const checkRunId = crypto.randomUUID();
    const startedAt = Date.now();

    await ctx.db.insert("mda_report_ingestion_runs", {
      checkRunId,
      fromMonthValue: args.fromMonthValue,
      toMonthValue: args.toMonthValue,
      status: "running",
      queuedCount: cells.length,
      startedAt,
    });

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i]!;
      const scheduleDelayMs = i * INGESTION_SCHEDULE_DELAY_MS;

      const existing = await getIngestionCell(
        ctx,
        cell.mdaName,
        cell.reportPeriodYear,
        cell.reportPeriodMonth
      );

      const pendingPatch = {
        submittedReportId: cell.submittedReportId,
        status: "pending" as const,
        failureType: undefined,
        failureDetail: undefined,
        invalidDateRowCount: undefined,
        validRowCount: undefined,
        totalRowCount: undefined,
        processedAt: undefined,
        pendingStartedAt: startedAt,
        checkRunId,
      };

      if (existing) {
        await ctx.db.patch(existing._id, pendingPatch);
      } else {
        await ctx.db.insert("mda_report_ingestion_status", {
          mdaName: cell.mdaName,
          reportPeriodMonth: cell.reportPeriodMonth,
          reportPeriodYear: cell.reportPeriodYear,
          ...pendingPatch,
        });
      }

      await ctx.scheduler.runAfter(
        scheduleDelayMs,
        internal.mdaReportIngestionActions.processIngestionForCell,
        {
          mdaName: cell.mdaName,
          reportPeriodMonth: cell.reportPeriodMonth,
          reportPeriodYear: cell.reportPeriodYear,
          submittedReportId: cell.submittedReportId,
          checkRunId,
        }
      );

      await ctx.scheduler.runAfter(
        scheduleDelayMs + INGESTION_CELL_TIMEOUT_MS,
        internal.mdaReportIngestion.expirePendingIngestionCell,
        {
          mdaName: cell.mdaName,
          reportPeriodMonth: cell.reportPeriodMonth,
          reportPeriodYear: cell.reportPeriodYear,
          checkRunId,
        }
      );
    }

    const totalDurationMs =
      (cells.length - 1) * INGESTION_SCHEDULE_DELAY_MS + INGESTION_CELL_TIMEOUT_MS + 5000;
    await ctx.scheduler.runAfter(
      totalDurationMs,
      internal.mdaReportIngestion.finalizeIngestionRun,
      { checkRunId }
    );

    return {
      success: true,
      queuedCount: cells.length,
      checkRunId,
      message: `Queued processing for ${cells.length} MDA/month cell(s).`,
    };
  },
});

export const cancelIngestionCheck = mutation({
  args: {
    checkRunId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    cancelledCount: v.number(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    const run = await getIngestionRunByCheckRunId(ctx, args.checkRunId);
    if (!run) {
      return { success: false, cancelledCount: 0, message: "Processing run not found." };
    }
    if (run.status !== "running") {
      return { success: false, cancelledCount: 0, message: "This run is no longer active." };
    }

    await ctx.db.patch(run._id, {
      status: "cancelled",
      cancelledAt: Date.now(),
    });

    const pendingCells = await ctx.db
      .query("mda_report_ingestion_status")
      .withIndex("by_check_run", (q) => q.eq("checkRunId", args.checkRunId))
      .collect();

    let cancelledCount = 0;
    for (const cell of pendingCells) {
      if (cell.status !== "pending") continue;
      await ctx.db.patch(cell._id, {
        status: "failed",
        failureType: "cancelled",
        failureDetail: "Processing was cancelled by an admin.",
        processedAt: Date.now(),
      });
      cancelledCount++;
    }

    return {
      success: true,
      cancelledCount,
      message:
        cancelledCount > 0
          ? `Cancelled ${cancelledCount} pending item(s).`
          : "Run cancelled (no pending items remained).",
    };
  },
});

/** Mark all still-pending cells in a month range as timed out (e.g. orphaned from an old run). */
export const clearStuckPendingInRange = mutation({
  args: {
    fromMonthValue: v.string(),
    toMonthValue: v.string(),
  },
  returns: v.object({
    clearedCount: v.number(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    const fromParts = monthValueToParts(args.fromMonthValue);
    const toParts = monthValueToParts(args.toMonthValue);
    if (!fromParts || !toParts) {
      throw new Error("Invalid month range.");
    }

    const fromMs = new Date(fromParts.year, fromParts.monthIndex, 1).getTime();
    const toMs = new Date(toParts.year, toParts.monthIndex, 1).getTime();

    const all = await ctx.db.query("mda_report_ingestion_status").collect();
    let clearedCount = 0;

    for (const cell of all) {
      if (cell.status !== "pending") continue;
      const rowMs = new Date(cell.reportPeriodYear, cell.reportPeriodMonth, 1).getTime();
      if (rowMs < fromMs || rowMs > toMs) continue;

      await ctx.db.patch(cell._id, {
        status: "failed",
        failureType: "processing_timeout",
        failureDetail:
          "Processing did not complete. Re-run the check — if the Excel layout differs from the BFA template, you should see an layout mismatch error.",
        processedAt: Date.now(),
      });
      clearedCount++;
    }

    return {
      clearedCount,
      message:
        clearedCount > 0
          ? `Cleared ${clearedCount} stuck pending item(s).`
          : "No stuck pending items found in this range.",
    };
  },
});

export const expirePendingIngestionCell = internalMutation({
  args: {
    mdaName: v.string(),
    reportPeriodMonth: v.number(),
    reportPeriodYear: v.number(),
    checkRunId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const cell = await getIngestionCell(
      ctx,
      args.mdaName,
      args.reportPeriodYear,
      args.reportPeriodMonth
    );
    if (!cell || cell.status !== "pending" || cell.checkRunId !== args.checkRunId) {
      return null;
    }

    if (await isRunCancelled(ctx, args.checkRunId)) {
      return null;
    }

    await ctx.db.patch(cell._id, {
      status: "failed",
      failureType: "processing_timeout",
      failureDetail:
        "Processing timed out — the file may be very large or the server could not finish in time. Try re-running the check.",
      processedAt: Date.now(),
    });
    return null;
  },
});

export const finalizeIngestionRun = internalMutation({
  args: { checkRunId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await getIngestionRunByCheckRunId(ctx, args.checkRunId);
    if (!run || run.status !== "running") return null;

    const cells = await ctx.db
      .query("mda_report_ingestion_status")
      .withIndex("by_check_run", (q) => q.eq("checkRunId", args.checkRunId))
      .collect();

    for (const cell of cells) {
      if (cell.status !== "pending") continue;
      await ctx.db.patch(cell._id, {
        status: "failed",
        failureType: "processing_timeout",
        failureDetail:
          "Processing did not complete in time. Try re-running the check or cancel and retry.",
        processedAt: Date.now(),
      });
    }

    await ctx.db.patch(run._id, {
      status: "completed",
      completedAt: Date.now(),
    });
    return null;
  },
});

export const getSubmittedReportFile = internalQuery({
  args: {
    submittedReportId: v.id("submitted_reports"),
  },
  returns: v.union(
    v.object({
      fileId: v.optional(v.id("_storage")),
      fileName: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const report = (await ctx.db.get(args.submittedReportId)) as Doc<"submitted_reports"> | null;
    if (!report) return null;
    return { fileId: report.fileId, fileName: report.fileName };
  },
});

export const upsertIngestionPending = internalMutation({
  args: {
    mdaName: v.string(),
    reportPeriodMonth: v.number(),
    reportPeriodYear: v.number(),
    submittedReportId: v.optional(v.id("submitted_reports")),
    checkRunId: v.optional(v.string()),
  },
  returns: v.id("mda_report_ingestion_status"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("mda_report_ingestion_status")
      .withIndex("by_mda_period", (q) =>
        q
          .eq("mdaName", args.mdaName)
          .eq("reportPeriodYear", args.reportPeriodYear)
          .eq("reportPeriodMonth", args.reportPeriodMonth)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        submittedReportId: args.submittedReportId,
        status: "pending",
        failureType: undefined,
        failureDetail: undefined,
        invalidDateRowCount: undefined,
        validRowCount: undefined,
        totalRowCount: undefined,
        processedAt: undefined,
        checkRunId: args.checkRunId,
      });
      return existing._id;
    }

    return await ctx.db.insert("mda_report_ingestion_status", {
      mdaName: args.mdaName,
      reportPeriodMonth: args.reportPeriodMonth,
      reportPeriodYear: args.reportPeriodYear,
      submittedReportId: args.submittedReportId,
      status: "pending",
      checkRunId: args.checkRunId,
    });
  },
});

export const recordIngestionSuccess = internalMutation({
  args: {
    mdaName: v.string(),
    reportPeriodMonth: v.number(),
    reportPeriodYear: v.number(),
    submittedReportId: v.optional(v.id("submitted_reports")),
    validRowCount: v.number(),
    totalRowCount: v.number(),
    invalidDateRowCount: v.number(),
    checkRunId: v.optional(v.string()),
    processingMetadata: v.optional(ingestionProcessingMetadataValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (await isRunCancelled(ctx, args.checkRunId)) return null;

    const existing = await getIngestionCell(
      ctx,
      args.mdaName,
      args.reportPeriodYear,
      args.reportPeriodMonth
    );

    if (!existing || existing.status !== "pending") return null;

    await ctx.db.patch(existing._id, {
      submittedReportId: args.submittedReportId,
      status: "success",
      failureType: undefined,
      failureDetail: undefined,
      validRowCount: args.validRowCount,
      totalRowCount: args.totalRowCount,
      invalidDateRowCount: args.invalidDateRowCount,
      processedAt: Date.now(),
      checkRunId: args.checkRunId ?? existing.checkRunId,
      processingMetadata: args.processingMetadata,
    });
    return null;
  },
});

export const recordIngestionFailure = internalMutation({
  args: {
    mdaName: v.string(),
    reportPeriodMonth: v.number(),
    reportPeriodYear: v.number(),
    submittedReportId: v.optional(v.id("submitted_reports")),
    failureType: v.union(
      v.literal("header_row_not_found"),
      v.literal("submission_date_column_missing"),
      v.literal("completion_date_column_missing"),
      v.literal("timeline_column_missing"),
      v.literal("unparseable_dates"),
      v.literal("empty_file"),
      v.literal("unsupported_format"),
      v.literal("processing_timeout"),
      v.literal("cancelled"),
      v.literal("unknown")
    ),
    failureDetail: v.string(),
    invalidDateRowCount: v.optional(v.number()),
    totalRowCount: v.optional(v.number()),
    checkRunId: v.optional(v.string()),
    processingMetadata: v.optional(ingestionProcessingMetadataValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (await isRunCancelled(ctx, args.checkRunId)) return null;

    const existing = await getIngestionCell(
      ctx,
      args.mdaName,
      args.reportPeriodYear,
      args.reportPeriodMonth
    );

    if (!existing || existing.status !== "pending") return null;

    await ctx.db.patch(existing._id, {
      submittedReportId: args.submittedReportId,
      status: "failed",
      failureType: args.failureType,
      failureDetail: args.failureDetail,
      invalidDateRowCount: args.invalidDateRowCount,
      totalRowCount: args.totalRowCount,
      validRowCount: undefined,
      processedAt: Date.now(),
      checkRunId: args.checkRunId ?? existing.checkRunId,
      processingMetadata: args.processingMetadata,
    });
    return null;
  },
});
