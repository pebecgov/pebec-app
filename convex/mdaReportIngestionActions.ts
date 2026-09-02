"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  isLikelyNonSpreadsheetFile,
  nonSpreadsheetFileMessage,
  processExcelBuffer,
} from "../lib/mdaReportProcessing";

export const processIngestionForCell = internalAction({
  args: {
    mdaName: v.string(),
    reportPeriodMonth: v.number(),
    reportPeriodYear: v.number(),
    submittedReportId: v.id("submitted_reports"),
    checkRunId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const baseArgs = {
      mdaName: args.mdaName,
      reportPeriodMonth: args.reportPeriodMonth,
      reportPeriodYear: args.reportPeriodYear,
      submittedReportId: args.submittedReportId,
      checkRunId: args.checkRunId,
    };

    const runCancelled = async () => {
      if (!args.checkRunId) return false;
      const run = await ctx.runQuery(internal.mdaReportIngestion.getIngestionRunStatus, {
        checkRunId: args.checkRunId,
      });
      return run?.status === "cancelled";
    };

    if (await runCancelled()) {
      return null;
    }

    try {
      const report = await ctx.runQuery(internal.mdaReportIngestion.getSubmittedReportFile, {
        submittedReportId: args.submittedReportId,
      });

      if (!report?.fileId) {
        await ctx.runMutation(internal.mdaReportIngestion.recordIngestionFailure, {
          ...baseArgs,
          failureType: "unknown",
          failureDetail: "Report record found but no file attached",
        });
        return null;
      }

      if (isLikelyNonSpreadsheetFile(report.fileName)) {
        await ctx.runMutation(internal.mdaReportIngestion.recordIngestionFailure, {
          ...baseArgs,
          failureType: "unknown",
          failureDetail: nonSpreadsheetFileMessage(report.fileName),
        });
        return null;
      }

      if (await runCancelled()) {
        return null;
      }

      const fileUrl = await ctx.storage.getUrl(report.fileId);
      if (!fileUrl) {
        await ctx.runMutation(internal.mdaReportIngestion.recordIngestionFailure, {
          ...baseArgs,
          failureType: "unknown",
          failureDetail: "Could not generate file URL",
        });
        return null;
      }

      const response = await fetch(fileUrl);
      if (!response.ok) {
        await ctx.runMutation(internal.mdaReportIngestion.recordIngestionFailure, {
          ...baseArgs,
          failureType: "unknown",
          failureDetail: `Failed to fetch file: ${response.statusText}`,
        });
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();

      if (await runCancelled()) {
        return null;
      }

      const result = processExcelBuffer(arrayBuffer, report.fileName ?? undefined);

      if (await runCancelled()) {
        return null;
      }

      if (result.ok) {
        await ctx.runMutation(internal.mdaReportIngestion.recordIngestionSuccess, {
          ...baseArgs,
          validRowCount: result.validRowCount,
          totalRowCount: result.totalRowCount,
          invalidDateRowCount: result.invalidDateRowCount,
          processingMetadata: result.metadata,
        });
        return null;
      }

      await ctx.runMutation(internal.mdaReportIngestion.recordIngestionFailure, {
        ...baseArgs,
        failureType: result.failureType,
        failureDetail: result.failureDetail,
        invalidDateRowCount: result.invalidDateRowCount,
        totalRowCount: result.totalRowCount,
        processingMetadata: result.metadata,
      });
      return null;
    } catch (error) {
      if (await runCancelled()) {
        return null;
      }
      await ctx.runMutation(internal.mdaReportIngestion.recordIngestionFailure, {
        ...baseArgs,
        failureType: "unknown",
        failureDetail: error instanceof Error ? error.message : "Unknown processing error",
      });
      return null;
    }
  },
});
