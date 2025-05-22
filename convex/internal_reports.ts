// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users";
export const createReportTemplate = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    role: v.union(v.literal("user"), v.literal("admin"), v.literal("mda"), v.literal("staff"), v.literal("reform_champion"), v.literal("federal"), v.literal("saber_agent"), v.literal("deputies"), v.literal("magistrates"), v.literal("state_governor"), v.literal("president"), v.literal("vice_president")),
    createdBy: v.id("users"),
    headers: v.array(v.object({
      name: v.string(),
      type: v.union(v.literal("text"), v.literal("number"), v.literal("textarea"), v.literal("dropdown"), v.literal("checkbox"), v.literal("date")),
      options: v.optional(v.array(v.string()))
    }))
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("report_templates", args);
    return {
      success: true
    };
  }
});
export const submitReport = mutation({
  args: {
    submittedBy: v.id("users"),
    role: v.union(v.literal("user"), v.literal("admin"), v.literal("mda"), v.literal("staff"), v.literal("reform_champion"), v.literal("federal"), v.literal("saber_agent"), v.literal("deputies"), v.literal("magistrates"), v.literal("state_governor"), v.literal("president"), v.literal("vice_president")),
    fileId: v.optional(v.id("_storage")),
    fileUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
    reportName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    templateId: v.optional(v.id("report_templates")),
    submittedAt: v.number()
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.submittedBy);
    const mdaName = user?.mdaName ?? undefined;
    await ctx.db.insert("submitted_reports", {
      ...args,
      mdaName,
      submittedAt: Date.now()
    });
  }
});
export const getReportTemplates = query({
  args: {
    role: v.optional(v.union(v.literal("user"), v.literal("admin"), v.literal("mda"), v.literal("staff"), v.literal("reform_champion"), v.literal("federal"), v.literal("saber_agent"), v.literal("deputies"), v.literal("magistrates"), v.literal("state_governor"), v.literal("president"), v.literal("vice_president")))
  },
  handler: async (ctx, {
    role
  }) => {
    if (role) {
      return await ctx.db.query("report_templates").filter(q => q.eq(q.field("role"), role)).collect();
    }
    return await ctx.db.query("report_templates").collect();
  }
});
export const getSubmittedReports = query({
  args: {
    submittedBy: v.id("users")
  },
  handler: async (ctx, args) => {
    return await ctx.db.query("submitted_reports").filter(q => q.eq(q.field("submittedBy"), args.submittedBy)).collect();
  }
});
export const deleteReportTemplate = mutation({
  args: {
    id: v.id("report_templates")
  },
  handler: async (ctx, {
    id
  }) => {
    await ctx.db.delete(id);
    return {
      success: true
    };
  }
});
export const deleteSubmittedReport = mutation({
  args: {
    id: v.id("submitted_reports")
  },
  handler: async (ctx, {
    id
  }) => {
    await ctx.db.delete(id);
    return {
      success: true
    };
  }
});
export const updateReportTemplate = mutation({
  args: {
    id: v.id("report_templates"),
    title: v.string(),
    description: v.optional(v.string()),
    role: v.union(v.literal("user"), v.literal("admin"), v.literal("mda"), v.literal("staff"), v.literal("reform_champion"), v.literal("federal"), v.literal("saber_agent"), v.literal("deputies"), v.literal("magistrates"), v.literal("state_governor"), v.literal("president"), v.literal("vice_president")),
    headers: v.array(v.object({
      name: v.string(),
      type: v.union(v.literal("text"), v.literal("number"), v.literal("textarea"), v.literal("dropdown"), v.literal("checkbox"), v.literal("date")),
      options: v.optional(v.array(v.string()))
    }))
  },
  handler: async (ctx, {
    id,
    ...updates
  }) => {
    await ctx.db.patch(id, updates);
  }
});
export const getAllSubmittedReports = query({
  handler: async ctx => {
    const reports = await ctx.db.query("submitted_reports").collect();
    const enrichedReports = await Promise.all(reports.map(async report => {
      const user = await ctx.db.get(report.submittedBy);
      const fileUrl = report.fileId ? await ctx.storage.getUrl(report.fileId) : report.fileUrl || undefined;
      return {
        ...report,
        fileUrl,
        userName: user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Unknown" : "Unknown",
        mdaName: user?.mdaName ?? report.mdaName ?? "Unknown"
      };
    }));
    return enrichedReports;
  }
});
export const getReportsByUser = query({
  handler: async ctx => {
    const user = await getCurrentUserOrThrow(ctx);
    return await ctx.db.query("submitted_reports").withIndex("bySubmittedBy", q => q.eq("submittedBy", user._id)).collect();
  }
});
export const submitInternalReport = mutation({
  args: {
    templateId: v.id("report_templates"),
    submittedBy: v.id("users"),
    role: v.union(v.literal("user"), v.literal("admin"), v.literal("mda"), v.literal("staff"), v.literal("reform_champion"), v.literal("federal"), v.literal("saber_agent"), v.literal("deputies"), v.literal("magistrates"), v.literal("state_governor"), v.literal("president"), v.literal("vice_president")),
    data: v.array(v.array(v.string()))
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.submittedBy);
    const mdaName = user?.mdaName ?? undefined;
    await ctx.db.insert("submitted_reports", {
      templateId: args.templateId,
      submittedBy: args.submittedBy,
      role: args.role,
      data: args.data,
      mdaName,
      submittedAt: Date.now()
    });
  }
});
export const getSubmittedInternalReports = query({
  args: {
    submittedBy: v.id("users")
  },
  handler: async (ctx, {
    submittedBy
  }) => {
    const reports = await ctx.db.query("submitted_reports").filter(q => q.eq(q.field("submittedBy"), submittedBy)).collect();
    const enrichedReports = await Promise.all(reports.map(async report => {
      const fileUrl = report.fileId ? await ctx.storage.getUrl(report.fileId) : report.fileUrl || undefined;
      return {
        ...report,
        fileUrl
      };
    }));
    return enrichedReports;
  }
});
export const generateUploadUrl = mutation({
  handler: async ctx => {
    return await ctx.storage.generateUploadUrl();
  }
});
export const getAvailableReports = query({
  args: {
    role: v.union(v.literal("user"), v.literal("admin"), v.literal("mda"), v.literal("staff"), v.literal("reform_champion"), v.literal("federal"), v.literal("saber_agent"), v.literal("deputies"), v.literal("magistrates"), v.literal("state_governor"), v.literal("president"), v.literal("vice_president"))
  },
  handler: async (ctx, {
    role
  }) => {
    return await ctx.db.query("report_templates").filter(q => q.eq(q.field("role"), role)).collect();
  }
});
export const getAvailableReportsforAdmin = query({
  args: {
    role: v.optional(v.union(v.literal("user"), v.literal("admin"), v.literal("mda"), v.literal("staff"), v.literal("reform_champion"), v.literal("federal"), v.literal("saber_agent"), v.literal("deputies"), v.literal("magistrates"), v.literal("state_governor"), v.literal("president"), v.literal("vice_president"), v.literal("all")))
  },
  handler: async (ctx, {
    role
  }) => {
    console.log("Fetching reports for role:", role);
    if (!role || role === "all") {
      return await ctx.db.query("report_templates").collect();
    }
    return await ctx.db.query("report_templates").filter(q => q.or(q.eq("role", role), q.eq("role", "all"))).collect();
  }
});
export const getSubmittedReportsByDateRange = query({
  args: {
    submittedBy: v.id("users"),
    startDate: v.number(),
    endDate: v.number()
  },
  handler: async (ctx, args) => {
    return await ctx.db.query("submitted_reports").filter(q => q.eq(q.field("submittedBy"), args.submittedBy)).filter(q => q.and(q.gte(q.field("submittedAt"), args.startDate), q.lte(q.field("submittedAt"), args.endDate))).collect();
  }
});
export const getStorageUrl = mutation({
  args: {
    storageId: v.id("_storage")
  },
  handler: async (ctx, {
    storageId
  }) => {
    const url = await ctx.storage.getUrl(storageId);
    if (!url) return null;
    const fileRecord = await ctx.db.query("uploaded_files").filter(q => q.eq(q.field("storageId"), storageId)).first();
    return {
      url,
      fileName: fileRecord?.fileName || "downloaded_file"
    };
  }
});
export const getReportsByTemplateAndDateRange = query({
  args: {
    templateId: v.id("report_templates"),
    fromDate: v.number(),
    toDate: v.number()
  },
  handler: async (ctx, {
    templateId,
    fromDate,
    toDate
  }) => {
    const reports = await ctx.db.query("submitted_reports").withIndex("byTemplate", q => q.eq("templateId", templateId)).collect();
    return reports.filter(r => r.submittedAt >= fromDate && r.submittedAt <= toDate);
  }
});
export const getBFAReports = query({
  args: {},
  handler: async ctx => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "reform_champion") {
      throw new Error("Unauthorized Access: Only Reform Champions users can view BFA Reports.");
    }
    const reports = await ctx.db.query("submitted_reports").filter(q => q.eq(q.field("reportName"), "BFA Report")).collect();
    const enriched = await Promise.all(reports.map(async report => {
      const user = await ctx.db.get(report.submittedBy);
      const fileUrl = report.fileId ? await ctx.storage.getUrl(report.fileId) : report.fileUrl || undefined;
      return {
        ...report,
        userName: user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Unknown" : "Unknown",
        mdaName: user?.mdaName ?? report.mdaName ?? "Unknown",
        state: user?.state ?? "Unknown",
        fileUrl
      };
    }));
    return enriched;
  }
});
export const getDeputyReports = query({
  handler: async ctx => {
    const all = await ctx.db.query("submitted_reports").collect();
    const filtered = all.filter(r => r.role === "deputies");
    return await Promise.all(filtered.map(async report => {
      const user = await ctx.db.get(report.submittedBy);
      const fileUrl = report.fileId ? await ctx.storage.getUrl(report.fileId) : report.fileUrl || undefined;
      return {
        ...report,
        fileUrl,
        userName: user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "Unknown",
        mdaName: user?.mdaName ?? "Unknown",
        state: user?.state ?? "Unknown"
      };
    }));
  }
});
export const getMagistratesReports = query({
  handler: async ctx => {
    const all = await ctx.db.query("submitted_reports").collect();
    const filtered = all.filter(r => r.role === "magistrates");
    return await Promise.all(filtered.map(async report => {
      const user = await ctx.db.get(report.submittedBy);
      const fileUrl = report.fileId ? await ctx.storage.getUrl(report.fileId) : report.fileUrl || undefined;
      return {
        ...report,
        fileUrl,
        userName: user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "Unknown",
        mdaName: user?.mdaName ?? "Unknown",
        state: user?.state ?? "Unknown"
      };
    }));
  }
});
export const getSubmittedReportsWithState = query({
  handler: async ctx => {
    const reports = await ctx.db.query("submitted_reports").collect();
    return await Promise.all(reports.map(async report => {
      const user = await ctx.db.get(report.submittedBy);
      return {
        ...report,
        userName: user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "Unknown",
        state: user?.state ?? "Unknown",
        mdaName: user?.mdaName ?? "Unknown"
      };
    }));
  }
});