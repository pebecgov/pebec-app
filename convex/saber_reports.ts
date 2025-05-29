import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users";

// Submit a new saber report
export const submitReport = mutation({
  args: {
    title: v.string(),
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
      state: userId.state ?? "Unknown",
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

// Migration to clean up existing documents with old schema fields
export const cleanupOldReports = internalMutation({
  handler: async (ctx) => {
    const reports = await ctx.db.query("saber_reports").collect();
    
    for (const report of reports) {
      // Check if report has the old fields
      if ("description" in report || "numberOfReports" in report) {
        // Create a new object without the old fields
        const cleanedReport = {
          submittedBy: report.submittedBy,
          userName: report.userName,
          title: report.title,
          state: report.state,
          fileId: report.fileId,
          fileUrl: report.fileUrl,
          fileSize: report.fileSize,
          status: report.status,
          submittedAt: report.submittedAt,
          updatedAt: report.updatedAt,
          comments: report.comments,
        };
        
        // Delete the old document and insert the cleaned one
        await ctx.db.delete(report._id);
        await ctx.db.insert("saber_reports", cleanedReport);
      }
    }
    
    return { message: "Migration completed" };
  },
});

// Delete specific problematic document
export const deleteProblematicReport = internalMutation({
  args: {
    reportId: v.id("saber_reports"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.reportId);
    return { message: `Deleted report ${args.reportId}` };
  },
}); 