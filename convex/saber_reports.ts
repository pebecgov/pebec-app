import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users";

// Submit a new saber report
export const submitReport = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    state: v.string(),
    numberOfReports: v.string(),
    fileId: v.optional(v.id("_storage")),
    fileSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Unauthorized");

    const userId = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("clerkUserId"), user.subject))
      .unique();
    if (!userId) throw new Error("User not found");

    return await ctx.db.insert("saber_reports", {
      ...args,
      submittedBy: userId._id,
      userName: `${userId.firstName ?? ""} ${userId.lastName ?? ""}`.trim(),
      status: "pending",
      submittedAt: Date.now(),
    });
  },
});

// Get reports for the current saber agent
export const getMyReports = query({
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    
    const reports = await ctx.db
      .query("saber_reports")
      .withIndex("bySubmittedBy", (q) => q.eq("submittedBy", user._id))
      .order("desc")
      .collect();

    return Promise.all(
      reports.map(async (report) => ({
        ...report,
        fileUrl: report.fileId ? await ctx.storage.getUrl(report.fileId) : undefined,
      }))
    );
  },
});

// Get all reports (for admin)
export const getAllReports = query({
  handler: async (ctx) => {
    const reports = await ctx.db
      .query("saber_reports")
      .order("desc")
      .collect();

    return Promise.all(
      reports.map(async (report) => ({
        ...report,
        fileUrl: report.fileId ? await ctx.storage.getUrl(report.fileId) : undefined,
      }))
    );
  },
});

// Update report status (for admin)
export const updateReportStatus = mutation({
  args: {
    reportId: v.id("saber_reports"),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    comments: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reportId, {
      status: args.status,
      comments: args.comments,
      updatedAt: Date.now(),
    });
  },
});

// Get reports by state
export const getReportsByState = query({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("saber_reports")
      .withIndex("byState", (q) => q.eq("state", args.state))
      .order("desc")
      .collect();

    return Promise.all(
      reports.map(async (report) => ({
        ...report,
        fileUrl: report.fileId ? await ctx.storage.getUrl(report.fileId) : undefined,
      }))
    );
  },
});

// Get reports by status
export const getReportsByStatus = query({
  args: {
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("saber_reports")
      .withIndex("byStatus", (q) => q.eq("status", args.status))
      .order("desc")
      .collect();

    return Promise.all(
      reports.map(async (report) => ({
        ...report,
        fileUrl: report.fileId ? await ctx.storage.getUrl(report.fileId) : undefined,
      }))
    );
  },
});

// Get reports by date range
export const getReportsByDateRange = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("saber_reports")
      .withIndex("byDate")
      .filter((q) => 
        q.and(
          q.gte(q.field("submittedAt"), args.startDate),
          q.lte(q.field("submittedAt"), args.endDate)
        )
      )
      .order("desc")
      .collect();

    return Promise.all(
      reports.map(async (report) => ({
        ...report,
        fileUrl: report.fileId ? await ctx.storage.getUrl(report.fileId) : undefined,
      }))
    );
  },
});

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
}); 