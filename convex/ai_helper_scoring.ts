"use node";
// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  performFallbackHeaderMatching,
  internalProcessSlaData,
  isLikelyNonSpreadsheetFile,
  nonSpreadsheetFileMessage,
  processExcelBufferFull,
  sanitizeRowsForConvex,
  type ProcessingQuality,
} from "../lib/mdaReportProcessing";

type ProcessMonthlyReportResult =
  | {
      success: true;
      results: Record<string, unknown>[];
      overallPercentage: number | null;
      processingQuality: ProcessingQuality;
      validRowCount: number;
      totalRowCount: number;
      message: string;
    }
  | {
      success: false;
      reason: string;
      message: string;
      validRowCount?: number;
      totalRowCount?: number;
    };

export const matchHeaders = action({
  args: {
    headers: v.array(v.string()),
    data: v.array(v.any()),
  },
  returns: v.any(),
  handler: async (_ctx, { headers }) => {
    try {
      const fallbackMapping = performFallbackHeaderMatching(headers);

      return {
        headerMapping: fallbackMapping,
        confidence: Object.fromEntries(
          Object.entries(fallbackMapping).map(([key, value]) => [key, value ? 0.8 : 0])
        ),
        suggestions: ["Using intelligent header matching. AI features coming soon!"],
        dataValidation: {
          hasValidDates: true,
          dateFormat: "DD/MM/YYYY",
          timelineFormat: "number",
        },
        success: true,
      };
    } catch (error) {
      console.error("Header matching error:", error);

      const fallbackMapping = performFallbackHeaderMatching(headers);

      return {
        headerMapping: fallbackMapping,
        confidence: Object.fromEntries(
          Object.entries(fallbackMapping).map(([key, value]) => [key, value ? 0.6 : 0])
        ),
        suggestions: ["Used fallback matching due to error"],
        dataValidation: {
          hasValidDates: true,
          dateFormat: "unknown",
          timelineFormat: "unknown",
        },
        success: false,
        error: (error as Error).message,
      };
    }
  },
});

export const processSlaData = action({
  args: {
    data: v.array(v.any()),
    headerMapping: v.object({
      DATE_OF_SUBMISSION: v.union(v.string(), v.null()),
      DATE_OF_COMPLETION: v.union(v.string(), v.null()),
      EXPECTED_TIMELINE: v.union(v.string(), v.null()),
    }),
  },
  returns: v.any(),
  handler: async (_ctx, { data, headerMapping }) => {
    try {
      const headers =
        data.length > 0
          ? Object.keys(data[0] as Record<string, unknown>)
          : undefined;
      const result = internalProcessSlaData(data, headerMapping, headers);
      return { ...result, processedData: sanitizeRowsForConvex(result.processedData) };
    } catch (error) {
      console.error("Data processing error:", error);
      return {
        processedData: [],
        overallPercentage: null,
        totalRows: 0,
        validRows: 0,
        success: false,
        error: (error as Error).message,
      };
    }
  },
});

export const processMonthlyReportFromDB = action({
  args: {
    mdaName: v.string(),
    month: v.number(),
    year: v.number(),
  },
  returns: v.any(),
  handler: async (ctx, { mdaName, month, year }): Promise<ProcessMonthlyReportResult> => {
    try {
      const report: { fileId?: Id<"_storage">; fileName?: string } | null = await ctx.runQuery(internal.mda_scoring.getMonthlyReportFileRef, {
        mdaName,
        month,
        year,
      });

      const targetMonthName = new Date(year, month, 1).toLocaleString("default", { month: "long" });

      if (!report) {
        return {
          success: false,
          reason: "not_found",
          message: `No submitted report found for ${targetMonthName} ${year}`,
        };
      }

      if (!report.fileId) {
        return {
          success: false,
          reason: "no_file",
          message: "Report record found but no file attached",
        };
      }

      if (isLikelyNonSpreadsheetFile(report.fileName)) {
        return {
          success: false,
          reason: "unsupported_format",
          message: nonSpreadsheetFileMessage(report.fileName),
        };
      }

      const fileUrl: string | null = await ctx.storage.getUrl(report.fileId);
      if (!fileUrl) {
        return { success: false, reason: "url_error", message: "Could not generate file URL" };
      }

      const response: Response = await fetch(fileUrl);
      if (!response.ok) {
        return {
          success: false,
          reason: "fetch_error",
          message: `Failed to fetch file: ${response.statusText}`,
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      const parsed = processExcelBufferFull(arrayBuffer, report.fileName);

      if (!parsed.ok) {
        return {
          success: false,
          reason: parsed.failureType,
          message: parsed.failureDetail,
          validRowCount: parsed.validRowCount,
          totalRowCount: parsed.totalRowCount,
        };
      }

      return {
        success: true,
        results: sanitizeRowsForConvex(parsed.processedData),
        overallPercentage: parsed.overallPercentage,
        processingQuality: parsed.processingQuality,
        validRowCount: parsed.validRowCount,
        totalRowCount: parsed.totalRowCount,
        message: `Successfully processed ${targetMonthName}`,
      };
    } catch (error) {
      console.error("Auto-process error:", error);
      return {
        success: false,
        reason: "exception",
        message: (error as Error).message,
      };
    }
  },
});
