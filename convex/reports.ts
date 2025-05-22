// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow } from "./users";
export const uploadReport = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    fileId: v.id("_storage"),
    fileSize: v.number(),
    publishedAt: v.number(),
    uploadedBy: v.id("users"),
    reportCoverUrl: v.optional(v.id("_storage"))
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin") {
      throw new Error("Unauthorized: Only admins can upload reports.");
    }
    const reportId = await ctx.db.insert("reports", {
      title: args.title,
      description: args.description,
      fileId: args.fileId,
      fileSize: args.fileSize,
      publishedAt: args.publishedAt,
      uploadedBy: args.uploadedBy,
      reportCoverUrl: args.reportCoverUrl
    });
    return reportId;
  }
});
export const generateUploadUrl = mutation({
  args: {},
  handler: async ctx => {
    return await ctx.storage.generateUploadUrl();
  }
});
export const getByClerkUserId = query({
  args: {
    clerkUserId: v.string()
  },
  handler: async (ctx, {
    clerkUserId
  }) => {
    return await ctx.db.query("users").withIndex("byClerkUserId", q => q.eq("clerkUserId", clerkUserId)).first();
  }
});
export const getAllReports = query({
  args: {},
  handler: async ctx => {
    const reports = await ctx.db.query("reports").order("desc").collect();
    return await Promise.all(reports.map(async report => {
      const coverUrl = report.reportCoverUrl ? await ctx.storage.getUrl(report.reportCoverUrl) : undefined;
      return {
        ...report,
        coverUrl
      };
    }));
  }
});
export const deleteReport = mutation({
  args: {
    reportId: v.id("reports")
  },
  handler: async (ctx, {
    reportId
  }) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin") {
      throw new Error("Unauthorized: Only admins can delete reports.");
    }
    await ctx.db.delete(reportId);
  }
});
export const getStorageUrl = query({
  args: {
    storageId: v.id("_storage")
  },
  handler: async (ctx, {
    storageId
  }) => {
    return await ctx.storage.getUrl(storageId);
  }
});
export const getReportsByDateRange = query({
  args: {
    startDate: v.number(),
    endDate: v.number()
  },
  handler: async (ctx, {
    startDate,
    endDate
  }) => {
    return await ctx.db.query("reports").filter(q => q.gte(q.field("publishedAt"), startDate)).filter(q => q.lte(q.field("publishedAt"), endDate)).collect();
  }
});
export const getUserReportsPerMonth = query({
  args: {
    userId: v.id("users")
  },
  handler: async (ctx, {
    userId
  }) => {
    const reports = await ctx.db.query("reports").withIndex("byUploadedBy", q => q.eq("uploadedBy", userId)).collect();
    const reportCounts = reports.reduce((acc, report) => {
      const month = new Date(report.publishedAt).toLocaleString("default", {
        month: "short"
      });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return reportCounts;
  }
});
export const getUserLettersPerMonth = query({
  args: {
    userId: v.id("users")
  },
  handler: async (ctx, {
    userId
  }) => {
    const letters = await ctx.db.query("letters").withIndex("byUser", q => q.eq("userId", userId)).collect();
    const lettersPerMonth: {
      [key: string]: number;
    } = {};
    letters.forEach(letter => {
      const month = new Date(letter.letterDate).toLocaleString("default", {
        month: "long"
      });
      lettersPerMonth[month] = (lettersPerMonth[month] || 0) + 1;
    });
    return lettersPerMonth;
  }
});