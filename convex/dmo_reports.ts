import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users";
import { api } from "./_generated/api";

// Deadline: November 30, 2025 (end of day in Nigeria timezone)
const DMO_REPORT_DEADLINE = new Date("2025-11-30T23:59:59+01:00").getTime();

// Submit DMO report (SABER agent)
export const submitDmoReport = mutation({
  args: {
    linkPublished: v.union(v.literal("yes"), v.literal("no")),
    webLink: v.optional(v.string()),
    publishedDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    
    // Verify user is a SABER agent
    if (user.role !== "saber_agent") {
      throw new Error("Only SABER agents can submit DMO reports");
    }

    // Get state from user profile
    const state = user.state || user.roleRequest?.state;
    if (!state) {
      throw new Error("SABER agent must have a state assigned");
    }

    // Validate: if linkPublished is "yes", webLink and publishedDate are required
    if (args.linkPublished === "yes") {
      if (!args.webLink || !args.publishedDate) {
        throw new Error("Web link and published date are required when link is published");
      }
    }

    // Check if report already exists for this state and agent
    const existingReport = await ctx.db
      .query("dmo_reports")
      .withIndex("bySubmittedBy", (q) => q.eq("submittedBy", user._id))
      .filter((q) => q.eq(q.field("state"), state))
      .first();

    let reportId;
    if (existingReport) {
      // Update existing report
      await ctx.db.patch(existingReport._id, {
        linkPublished: args.linkPublished,
        webLink: args.webLink,
        publishedDate: args.publishedDate,
        updatedAt: Date.now(),
      });
      reportId = existingReport._id;
    } else {
      // Create new report
      reportId = await ctx.db.insert("dmo_reports", {
        submittedBy: user._id,
        state,
        linkPublished: args.linkPublished,
        webLink: args.webLink,
        publishedDate: args.publishedDate,
        deadline: DMO_REPORT_DEADLINE,
        submittedAt: Date.now(),
      });
    }

    // Notify all DMO users
    const dmoUsers = await ctx.db
      .query("users")
      .withIndex("byRole", (q) => q.eq("role", "dmo"))
      .collect();

    for (const dmoUser of dmoUsers) {
      await ctx.db.insert("notifications", {
        userId: dmoUser._id,
        dmoReportId: reportId,
        message: `New DMO report submitted by ${user.firstName || ""} ${user.lastName || ""} for ${state}`,
        isRead: false,
        createdAt: Date.now(),
        type: "dmo_report_submitted",
        metadata: {
          reportId: reportId,
          state: state,
          submittedBy: user._id,
        },
      });
    }

    return reportId;
  },
});

// Get my DMO reports (SABER agent)
export const getMyDmoReports = query({
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    
    if (user.role !== "saber_agent") {
      throw new Error("Only SABER agents can view their DMO reports");
    }

    const reports = await ctx.db
      .query("dmo_reports")
      .withIndex("bySubmittedBy", (q) => q.eq("submittedBy", user._id))
      .order("desc")
      .collect();

    return reports.map((report) => ({
      ...report,
      // Calculate color coding
      statusColor: getReportStatusColor(report),
    }));
  },
});

// Get all DMO reports (DMO users)
export const getAllDmoReports = query({
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    
    if (user.role !== "dmo") {
      throw new Error("Only DMO users can view all reports");
    }

    const reports = await ctx.db
      .query("dmo_reports")
      .order("desc")
      .collect();

    // Enrich with submitter info
    const enrichedReports = await Promise.all(
      reports.map(async (report) => {
        const submitter = await ctx.db.get(report.submittedBy);
        const assessor = report.assessedBy ? await ctx.db.get(report.assessedBy) : null;
        
        return {
          ...report,
          submitterName: submitter
            ? `${submitter.firstName || ""} ${submitter.lastName || ""}`.trim() || submitter.email
            : "Unknown",
          assessorName: assessor
            ? `${assessor.firstName || ""} ${assessor.lastName || ""}`.trim() || assessor.email
            : null,
          statusColor: getReportStatusColor(report),
        };
      })
    );

    return enrichedReports;
  },
});

// Assess DMO report (DMO user)
export const assessDmoReport = mutation({
  args: {
    reportId: v.id("dmo_reports"),
    assessment: v.union(v.literal("met"), v.literal("unmet")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    
    if (user.role !== "dmo") {
      throw new Error("Only DMO users can assess reports");
    }

    const report = await ctx.db.get(args.reportId);
    if (!report) {
      throw new Error("Report not found");
    }

    // Update report
    await ctx.db.patch(args.reportId, {
      dmoAssessment: args.assessment,
      assessedBy: user._id,
      assessedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Notify the SABER agent who submitted the report
    const submitter = await ctx.db.get(report.submittedBy);
    if (submitter) {
      await ctx.db.insert("notifications", {
        userId: report.submittedBy,
        dmoReportId: args.reportId,
        message: `Your DMO report for ${report.state} has been assessed as ${args.assessment === "met" ? "MET" : "UNMET"}`,
        isRead: false,
        createdAt: Date.now(),
        type: "dmo_report_assessed",
        metadata: {
          reportId: args.reportId,
          state: report.state,
          assessment: args.assessment,
          assessedBy: user._id,
        },
      });
    }

    return { success: true };
  },
});

// Helper function to determine status color
function getReportStatusColor(report: {
  dmoAssessment?: "met" | "unmet";
  publishedDate?: number;
  deadline: number;
}): string {
  const now = Date.now();
  const daysUntilDeadline = Math.ceil((report.deadline - now) / (24 * 60 * 60 * 1000));
  const isPastDeadline = now > report.deadline;
  const isCloseToDeadline = daysUntilDeadline <= 7 && daysUntilDeadline > 0;

  // If DMO has assessed, use assessment-based colors
  if (report.dmoAssessment === "met") {
    return "bg-green-100 border-green-500 text-green-800"; // Green for met
  }
  if (report.dmoAssessment === "unmet") {
    return "bg-red-100 border-red-500 text-red-800"; // Red for unmet
  }

  // If not assessed yet, use deadline-based colors
  if (isPastDeadline) {
    return "bg-red-100 border-red-500 text-red-800"; // Red for past deadline
  }
  if (isCloseToDeadline) {
    return "bg-yellow-100 border-yellow-500 text-yellow-800"; // Yellow for close to deadline
  }
  if (report.publishedDate && report.publishedDate <= report.deadline) {
    return "bg-blue-100 border-blue-500 text-blue-800"; // Blue for on time
  }

  return "bg-gray-100 border-gray-500 text-gray-800"; // Default gray
}

// Get DMO report by ID
export const getDmoReportById = query({
  args: {
    reportId: v.id("dmo_reports"),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) {
      return null;
    }

    const submitter = await ctx.db.get(report.submittedBy);
    const assessor = report.assessedBy ? await ctx.db.get(report.assessedBy) : null;

    return {
      ...report,
      submitterName: submitter
        ? `${submitter.firstName || ""} ${submitter.lastName || ""}`.trim() || submitter.email
        : "Unknown",
      assessorName: assessor
        ? `${assessor.firstName || ""} ${assessor.lastName || ""}`.trim() || assessor.email
        : null,
      statusColor: getReportStatusColor(report),
    };
  },
});

