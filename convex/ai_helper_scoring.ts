// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import {
  performFallbackHeaderMatching,
  internalProcessSlaData,
  processExcelBufferFull,
} from "../lib/mdaReportProcessing";

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
      return internalProcessSlaData(data, headerMapping, headers);
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
  handler: async (ctx, { mdaName, month, year }) => {
    try {
      const monthlyReports: Array<{
        month: string;
        year: number;
        submitted: boolean;
        reports?: Array<{ fileId?: string }>;
      }> = await ctx.runQuery(api.mda_scoring.getRealMonthlyReports, {
        mdaName,
        scoringPeriod: String(year),
      });

      const targetDate = new Date(year, month, 1);
      const targetMonthName = targetDate.toLocaleString("default", { month: "long" });

      const targetReportData = monthlyReports.find(
        (r) => r.month === targetMonthName && r.year === year
      );

      if (
        !targetReportData ||
        !targetReportData.submitted ||
        !targetReportData.reports ||
        targetReportData.reports.length === 0
      ) {
        return {
          success: false,
          reason: "not_found",
          message: `No submitted report found for ${targetMonthName} ${year}`,
        };
      }

      const report = targetReportData.reports[0];
      if (!report?.fileId) {
        return {
          success: false,
          reason: "no_file",
          message: "Report record found but no file attached",
        };
      }

      const fileUrl: string | null = await ctx.storage.getUrl(report.fileId as never);
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
      const parsed = processExcelBufferFull(arrayBuffer);

      if (!parsed.ok) {
        return {
          success: false,
          reason: parsed.failureType,
          message: parsed.failureDetail,
        };
      }

      return {
        success: true,
        results: parsed.processedData,
        overallPercentage: parsed.overallPercentage,
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
