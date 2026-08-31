import { v } from "convex/values";
import { internalMutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { canonicalizeMdaName } from "../lib/mdaNameAliases";
import {
  buildMdaReportCompliance,
  isWatDueDate,
} from "./lib/mdaReportCompliance";

const monthValidator = v.object({
  month: v.number(),
  year: v.number(),
  monthName: v.string(),
  status: v.union(
    v.literal("submitted"),
    v.literal("outstanding"),
    v.literal("upcoming")
  ),
  submitted: v.boolean(),
  onTime: v.optional(v.boolean()),
});

const mdaComplianceValidator = v.object({
  mdaName: v.string(),
  submitted: v.number(),
  due: v.number(),
  outstanding: v.number(),
  months: v.array(monthValidator),
});

async function loadCompliance(
  ctx: QueryCtx | MutationCtx,
  year: number,
  asOf: number,
  extraMdaName?: string
) {
  const [efficiency, mdas, reports] = await Promise.all([
    ctx.db.query("efficiency_periods").withIndex("byYear", (q) => q.eq("year", year)).first(),
    ctx.db.query("mdas").collect(),
    ctx.db
      .query("submitted_reports")
      .withIndex("byDate", (q) => q.gte("submittedAt", Date.UTC(year - 1, 0, 1)))
      .collect(),
  ]);

  const mdaNames = mdas.map((mda) => mda.name);
  if (extraMdaName) {
    mdaNames.push(extraMdaName);
  }
  return buildMdaReportCompliance({
    year,
    asOf,
    efficiency: efficiency
      ? {
          startMonth: efficiency.startMonth,
          endMonth: efficiency.endMonth,
          startYear: efficiency.startYear,
          endYear: efficiency.endYear,
          totalMonths: efficiency.totalMonths,
        }
      : null,
    mdaNames,
    reports,
  });
}

export const getPublicMdaReportCompliance = query({
  args: {
    year: v.number(),
    asOf: v.number(),
    mdaName: v.optional(v.string()),
  },
  returns: v.object({
    year: v.number(),
    asOf: v.number(),
    lastClosedAt: v.union(v.number(), v.null()),
    mdas: v.array(mdaComplianceValidator),
  }),
  handler: async (ctx, args) => {
    const all = await loadCompliance(ctx, args.year, args.asOf, args.mdaName);
    const wanted = args.mdaName ? canonicalizeMdaName(args.mdaName) : null;
    const mdas = wanted ? all.filter((mda) => mda.mdaName === wanted) : all;

    const latestSnapshot = await ctx.db
      .query("mda_report_compliance_snapshots")
      .withIndex("byYear", (q) => q.eq("year", args.year))
      .order("desc")
      .first();

    return {
      year: args.year,
      asOf: args.asOf,
      lastClosedAt: latestSnapshot?.refreshedAt ?? null,
      mdas,
    };
  },
});

export const refreshMonthlyReportCompliance = internalMutation({
  args: {
    year: v.optional(v.number()),
    force: v.optional(v.boolean()),
  },
  returns: v.object({
    ran: v.boolean(),
    year: v.number(),
    mdaCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const year = args.year ?? new Date(now).getUTCFullYear();
    if (!args.force && !isWatDueDate(now)) {
      return { ran: false, year, mdaCount: 0 };
    }

    const computed = await loadCompliance(ctx, year, now);
    const existing = await ctx.db
      .query("mda_report_compliance_snapshots")
      .withIndex("byYear", (q) => q.eq("year", year))
      .collect();

    for (const row of existing) {
      await ctx.db.delete(row._id);
    }

    for (const mda of computed) {
      await ctx.db.insert("mda_report_compliance_snapshots", {
        year,
        refreshedAt: now,
        mdaName: mda.mdaName,
        submitted: mda.submitted,
        due: mda.due,
        outstanding: mda.outstanding,
        months: mda.months,
      });
    }

    return { ran: true, year, mdaCount: computed.length };
  },
});
