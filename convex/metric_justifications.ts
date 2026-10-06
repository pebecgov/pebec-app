import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users";

const frameworkValidator = v.union(v.literal("bfa"), v.literal("state"));

export const list = query({
  args: {
    framework: frameworkValidator,
    year: v.number(),
  },
  returns: v.array(
    v.object({
      metricKey: v.string(),
      metricLabel: v.string(),
      justification: v.string(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, { framework, year }) => {
    const rows = await ctx.db
      .query("metric_justifications")
      .withIndex("byFrameworkYear", (q) => q.eq("framework", framework).eq("year", year))
      .collect();
    return rows.map((row) => ({
      metricKey: row.metricKey,
      metricLabel: row.metricLabel,
      justification: row.justification,
      updatedAt: row.updatedAt,
    }));
  },
});

/** Map of metricKey → justification for public tracker / clients. */
export const getMap = query({
  args: {
    framework: frameworkValidator,
    year: v.number(),
  },
  returns: v.record(v.string(), v.string()),
  handler: async (ctx, { framework, year }) => {
    const rows = await ctx.db
      .query("metric_justifications")
      .withIndex("byFrameworkYear", (q) => q.eq("framework", framework).eq("year", year))
      .collect();
    const map: Record<string, string> = {};
    for (const row of rows) {
      const text = row.justification.trim();
      if (text) map[row.metricKey] = text;
    }
    return map;
  },
});

export const save = mutation({
  args: {
    framework: frameworkValidator,
    year: v.number(),
    metricKey: v.string(),
    metricLabel: v.string(),
    justification: v.string(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin" && user.role !== "staff") {
      throw new Error("Unauthorized");
    }

    const trimmed = args.justification.trim();
    const existing = await ctx.db
      .query("metric_justifications")
      .withIndex("byFrameworkYearMetric", (q) =>
        q
          .eq("framework", args.framework)
          .eq("year", args.year)
          .eq("metricKey", args.metricKey)
      )
      .first();

    if (!trimmed) {
      if (existing) {
        await ctx.db.delete(existing._id);
      }
      return { success: true };
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        metricLabel: args.metricLabel,
        justification: trimmed,
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    } else {
      await ctx.db.insert("metric_justifications", {
        framework: args.framework,
        year: args.year,
        metricKey: args.metricKey,
        metricLabel: args.metricLabel,
        justification: trimmed,
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    }

    return { success: true };
  },
});
