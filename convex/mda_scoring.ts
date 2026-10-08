import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id, TableNames } from "./_generated/dataModel";
import { getCurrentUserOrThrow } from "./users";
import { logAuditEvent } from "./utils/auditLog";
import { resolveReportPeriod } from "../lib/reportPeriod";
import { canonicalizeMdaName } from "../lib/mdaNameAliases";
import { applyOthersEdit, mergeOthersSavedRows } from "../lib/othersScoreMerge";
import { mdaMatchKey, mdaNamesMatch } from "./lib/resolveMda";
import {
  buildMonthlyReportData,
  calculateAdjustedResolutionRate,
  computeReportGovScore,
  computeTicketStats,
  filterReportsToWindow,
  getMonthNumber,
  loadSystemResolutionContext,
  MONTH_NAMES,
  proportionalScore,
  resolveScoringWindow,
} from "./utils/efficiencyScoring";
import {
  buildSlaMonthStatuses,
  mergeMonthlySlaData,
  slaIssuesFromStatuses,
} from "../lib/slaPublicMessages";
import { computeSlaTotalFromMonthly } from "../lib/slaScoreMath";
import {
  BEEPA_STANDARD_MDA_MAX,
  BEEPA_SUPER_MDA_MAX,
  beepaMaxPointsForMda,
} from "../lib/beepaTrackerRoster";

export function normalizeMdaKey(name: string) {
  return String(name || "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitMdaNameForMatch(name: string) {
  const normalized = normalizeMdaKey(name);
  const parts = normalized.split(" - ").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { abbr: parts[0], fullName: parts.slice(1).join(" - ") };
  }
  return { fullName: normalized };
}

export function buildExclusionLookup(entries: Array<{ mdaName: string; excludedMetrics: string[] }>) {
  const map = new Map<string, Set<string>>();
  for (const entry of entries) {
    const excluded = new Set(entry.excludedMetrics || []);
    const raw = entry.mdaName || "";
    const normalized = normalizeMdaKey(raw);
    const parts = splitMdaNameForMatch(raw);
    const canonical = normalizeMdaKey(canonicalizeMdaName(raw));

    map.set(normalized, excluded);
    map.set(canonical, excluded);
    if (parts.fullName) map.set(parts.fullName, excluded);
    if (parts.abbr) map.set(parts.abbr, excluded);
  }
  return map;
}

// Helper function to find MDA by flexible name matching
export async function findMdaByName(ctx: any, mdaName: string) {
  const canonical = canonicalizeMdaName(mdaName);

  let mda = await ctx.db.query("mdas")
    .withIndex("byName", (q: any) => q.eq("name", mdaName))
    .first();

  if (mda) return mda;

  if (canonical !== mdaName) {
    mda = await ctx.db.query("mdas")
      .withIndex("byName", (q: any) => q.eq("name", canonical))
      .first();
    if (mda) return mda;
  }

  const allMdas = await ctx.db.query("mdas").collect();
  mda = allMdas.find((m: any) => canonicalizeMdaName(m.name) === canonical);
  if (mda) return mda;

  mda = allMdas.find((m: any) => mdaNamesMatch(m.name, mdaName));
  if (mda) return mda;

  mda = allMdas.find((m: any) => {
    const nameWithoutPrefix = m.name.replace(/^[^-]+ - /, '');
    return nameWithoutPrefix === mdaName || m.name.includes(mdaName) || mdaName.includes(nameWithoutPrefix);
  });

  return mda || null;
}

// Get all MDAs with their latest scores from scoring history
export const getMDAsWithScores = query({
  args: {},
  handler: async (ctx) => {
    const mdas = await ctx.db.query("mdas").collect();

    // Get latest scores for each MDA from scoring history
    const enrichedMdas = await Promise.all(
      mdas.map(async (mda) => {
        // Get the latest scoring record for this MDA
        const latestScore = await ctx.db.query("mda_scoring_history")
          .withIndex("byMda", q => q.eq("mdaId", mda._id))
          .order("desc")
          .first();

        // Get current year ticket statistics
        const currentYear = new Date().getFullYear();
        const yearStart = new Date(currentYear, 0, 1).getTime();
        const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59).getTime();

        const tickets = await ctx.db.query("tickets")
          .withIndex("byMDA", q => q.eq("assignedMDA", mda._id))
          .filter(q => q.and(
            q.gte(q.field("createdAt"), yearStart),
            q.lte(q.field("createdAt"), yearEnd)
          ))
          .collect();

        const totalTickets = tickets.length;
        const resolvedTickets = tickets.filter(t => t.status === "resolved" || t.status === "closed").length;
        const resolutionRate = totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0;

        // Calculate average response and resolution times
        const responseTimes = tickets
          .filter(t => t.firstResponseAt)
          .map(t => (t.firstResponseAt! - t.createdAt) / (1000 * 60 * 60));

        const resolutionTimes = tickets
          .filter(t => t.status === "resolved" || t.status === "closed")
          .map(t => (t.updatedAt - t.createdAt) / (1000 * 60 * 60));

        const averageResponseTime = responseTimes.length > 0
          ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
          : 0;

        const averageResolutionTime = resolutionTimes.length > 0
          ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
          : 0;

        return {
          ...mda,
          latestScore: latestScore || null,
          totalTickets,
          resolvedTickets,
          resolutionRate,
          averageResponseTime,
          averageResolutionTime
        };
      })
    );

    return enrichedMdas;
  }
});

// Get scoring history for a specific MDA
export const getMDAScoringHistory = query({
  args: { mdaId: v.id("mdas") },
  handler: async (ctx, { mdaId }) => {
    const history = await ctx.db.query("mda_scoring_history")
      .withIndex("byMda", q => q.eq("mdaId", mdaId))
      .order("desc")
      .collect();

    return history;
  }
});

export const getScorecardEntries = query({
  args: {
    scoringPeriod: v.string()
  },
  handler: async (ctx, { scoringPeriod }) => {
    const entries = await ctx.db.query("mda_scorecard_entries")
      .withIndex("byPeriod", q => q.eq("scoringPeriod", scoringPeriod))
      .collect();

    return entries.sort((a, b) => b.scorePercentage - a.scorePercentage);
  }
});

export const saveScorecardEntry = mutation({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string(),
    systemTotalTickets: v.number(),
    systemResolvedTickets: v.number(),
    manualTotalTickets: v.number(),
    manualResolvedTickets: v.number(),
    totalTickets: v.number(),
    resolvedTickets: v.number(),
    resolvedRate: v.number(),
    scorePercentage: v.number()
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    if (user.role !== "admin" && user.role !== "staff") {
      throw new Error("Unauthorized: Only admins and staff can save scorecard entries");
    }

    const now = Date.now();

    const existing = await ctx.db.query("mda_scorecard_entries")
      .withIndex("byMdaPeriod", q => q.eq("mdaName", args.mdaName).eq("scoringPeriod", args.scoringPeriod))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        calculatedBy: user._id,
        calculatedAt: now
      });

      return { success: true, entryId: existing._id, isUpdate: true };
    }

    const entryId = await ctx.db.insert("mda_scorecard_entries", {
      ...args,
      calculatedBy: user._id,
      calculatedAt: now
    });

    return { success: true, entryId, isUpdate: false };
  }
});

// Get monthly reports for a specific MDA
export const getMDAMonthlyReports = query({
  args: { mdaId: v.id("mdas") },
  handler: async (ctx, { mdaId }) => {
    const reports = await ctx.db.query("mda_monthly_reports")
      .withIndex("byMda", q => q.eq("mdaId", mdaId))
      .order("desc")
      .collect();

    return reports;
  }
});

// Calculate and save MDA score
export const calculateAndSaveMDAScore = mutation({
  args: {
    mdaId: v.optional(v.id("mdas")),
    mdaName: v.string(),
    scoringPeriod: v.string(),
    // Individual metric scores
    serviceLevelAgreementScore: v.number(),
    mysteryShoppingScore: v.number(),
    controversialScore: v.number(),
    innovationScore: v.number(),
    stakeholderEngagementScore: v.number(),
    transparencyScore: v.number(),
    reportGovernanceResolutionScore: v.number(),
    monthlyReportSubmissionScore: v.number(),
    timelinessInSubmittingScore: v.number(),
    othersScore: v.optional(v.number()),
    penaltiesScore: v.optional(v.number()),
    bonusesScore: v.optional(v.number()),
    // Performance data
    totalTickets: v.number(),
    resolvedTickets: v.number(),
    averageResponseTime: v.number(),
    averageResolutionTime: v.number(),
    resolutionRate: v.number(),
    // Website indicators
    hasActiveWebsite: v.boolean(),
    hasReportGovLink: v.boolean(),
    hasActiveUsers: v.boolean(),
    // Additional fields
    notes: v.optional(v.string()),
    recommendations: v.optional(v.string()),
    // Scoring method fields
    maxPossiblePoints: v.optional(v.number()),
    scoringMethod: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Only admins and staff can score MDAs
    if (user.role !== "admin" && user.role !== "staff") {
      throw new Error("Unauthorized: Only admins and staff can score MDAs");
    }

    const yearMatch = args.scoringPeriod.match(/\d{4}/);
    const scoringYear = yearMatch ? parseInt(yearMatch[0], 10) : new Date().getFullYear();
    const yearExclusions = await ctx.db.query("mda_metric_exclusions")
      .withIndex("byYear", q => q.eq("year", scoringYear))
      .collect();
    const exclusionLookup = buildExclusionLookup(yearExclusions as Array<{ mdaName: string; excludedMetrics: string[] }>);
    const mdaParts = splitMdaNameForMatch(args.mdaName);
    const excludedMetrics =
      exclusionLookup.get(normalizeMdaKey(args.mdaName)) ||
      (mdaParts.fullName ? exclusionLookup.get(mdaParts.fullName) : undefined) ||
      (mdaParts.abbr ? exclusionLookup.get(mdaParts.abbr) : undefined) ||
      new Set<string>();
    const isExcluded = (metricKey: string) => excludedMetrics.has(metricKey);

    const effectiveServiceLevelAgreementScore = isExcluded("sla") ? 0 : args.serviceLevelAgreementScore;
    const effectiveMysteryShoppingScore = isExcluded("mystery") ? 0 : args.mysteryShoppingScore;
    const effectiveControversialScore = isExcluded("controversial") ? 0 : args.controversialScore;
    const effectiveInnovationScore = isExcluded("innovation") ? 0 : args.innovationScore;
    const effectiveStakeholderEngagementScore = isExcluded("stakeholder") ? 0 : args.stakeholderEngagementScore;
    const effectiveTransparencyScore = isExcluded("transparency") ? 0 : args.transparencyScore;
    const effectiveReportGovScore = isExcluded("reportGov") ? 0 : args.reportGovernanceResolutionScore;
    const effectiveMonthlyReportScore = isExcluded("reportSubmission") ? 0 : args.monthlyReportSubmissionScore;
    const effectiveTimelinessScore = isExcluded("timeliness") ? 0 : args.timelinessInSubmittingScore;
    const effectiveOthersScore = isExcluded("others") ? 0 : (args.othersScore || 0);
    const effectivePenaltiesScore = isExcluded("penalties") ? 0 : (args.penaltiesScore || 0);
    const effectiveBonusesScore = isExcluded("bonuses") ? 0 : (args.bonusesScore || 0);

    // Calculate total score and percentage
    const totalScore =
      effectiveServiceLevelAgreementScore +
      effectiveMysteryShoppingScore +
      effectiveControversialScore +
      effectiveInnovationScore +
      effectiveStakeholderEngagementScore +
      effectiveTransparencyScore +
      effectiveReportGovScore +
      effectiveMonthlyReportScore +
      effectiveTimelinessScore +
      effectiveOthersScore +
      effectivePenaltiesScore +
      effectiveBonusesScore;

    // Use provided maxPossiblePoints or default to 100
    const maxPossiblePoints = args.maxPossiblePoints || 100;
    const totalPercentage = (totalScore / maxPossiblePoints) * 100;

    // Determine grade
    let grade = "F";
    if (totalPercentage >= 90) grade = "A";
    else if (totalPercentage >= 80) grade = "B";
    else if (totalPercentage >= 70) grade = "C";
    else if (totalPercentage >= 60) grade = "D";

    // Determine status
    const status = totalPercentage >= 70 ? "Compliant" : "Non-Compliant";

    // Save to scoring history
    const historyId = await ctx.db.insert("mda_scoring_history", {
      mdaId: args.mdaId,
      mdaName: args.mdaName,
      scoringPeriod: args.scoringPeriod,
      scoredBy: user._id,
      scoredAt: Date.now(),
      serviceLevelAgreementScore: effectiveServiceLevelAgreementScore,
      mysteryShoppingScore: effectiveMysteryShoppingScore,
      controversialScore: effectiveControversialScore,
      innovationScore: effectiveInnovationScore,
      stakeholderEngagementScore: effectiveStakeholderEngagementScore,
      transparencyScore: effectiveTransparencyScore,
      reportGovernanceResolutionScore: effectiveReportGovScore,
      monthlyReportSubmissionScore: effectiveMonthlyReportScore,
      timelinessInSubmittingScore: effectiveTimelinessScore,
      othersScore: effectiveOthersScore,
      penaltiesScore: effectivePenaltiesScore,
      bonusesScore: effectiveBonusesScore,
      totalScore,
      totalPercentage,
      maxPossiblePoints: maxPossiblePoints,
      scoringMethod: args.scoringMethod || "standard",
      grade,
      status,
      totalTickets: args.totalTickets,
      resolvedTickets: args.resolvedTickets,
      averageResponseTime: args.averageResponseTime,
      averageResolutionTime: args.averageResolutionTime,
      resolutionRate: args.resolutionRate,
      notes: args.notes,
      recommendations: args.recommendations
    });

    await logAuditEvent(ctx, {
      action: "bfa.mda_score_saved",
      category: "bfa",
      summary: `Saved BFA score for ${args.mdaName} (${args.scoringPeriod}): ${totalPercentage.toFixed(1)}%`,
      actor: user,
      target: {
        type: "mda",
        id: args.mdaId,
        label: args.mdaName,
      },
      metadata: {
        scoringPeriod: args.scoringPeriod,
        totalScore,
        totalPercentage,
        grade,
        status,
        historyId,
      },
    });

    // No need to update MDA table anymore - all scoring data is in mda_scoring_history

    return {
      success: true,
      historyId,
      totalScore,
      totalPercentage,
      grade,
      status
    };
  }
});

// Get scoring analytics and leaderboard
export const getScoringAnalytics = query({
  args: { year: v.optional(v.number()) },
  handler: async (ctx, { year }) => {
    const targetYear = year || new Date().getFullYear();
    // Get all unique MDA names from scoring history (only scored MDAs)
    const allScoringHistory = await ctx.db.query("mda_scoring_history").collect();
    const uniqueMdaNames = [...new Set(allScoringHistory.map(score => score.mdaName))];

    // Get MDAs from mdas table
    const mdas = await ctx.db.query("mdas").collect();
    const mdaNamesFromTable = mdas.map(mda => mda.name);

    // Combine all MDA names (from table + from scoring history)
    const allMdaNames = [...new Set([...mdaNamesFromTable, ...uniqueMdaNames])];

    // Get latest scores for each MDA from scoring history
    const mdasWithLatestScores = await Promise.all(
      allMdaNames.map(async (mdaName) => {
        // Find MDA in table if it exists
        const mda = mdas.find(m => m.name === mdaName);

        // Get all scores for this MDA (by name, since mdaId might be null)
        const allScores = await ctx.db.query("mda_scoring_history")
          .withIndex("byMdaName", q => q.eq("mdaName", mdaName))
          .order("desc")
          .collect();

        if (allScores.length === 0) {
          return {
            _id: mda?._id || null,
            name: mdaName,
            description: mda?.description,
            email: mda?.email,
            phoneNumber: mda?.phoneNumber,
            assignedUsers: mda?.assignedUsers || [],
            createdAt: mda?.createdAt || 0,
            currentScore: 0,
            latestScore: null,
            isActiveOnPlatform: !!mda
          };
        }

        // Get target year scores
        const targetYearScores = allScores.filter(score => {
          const scoreYear = new Date(score.scoredAt).getFullYear();
          return scoreYear === targetYear;
        });

        let rankingScore = 0;
        let latestScore = allScores[0]; // Most recent score for display

        if (targetYearScores.length > 0) {
          // Check if we have both 1st and 2nd half scores for target year
          const firstHalf = targetYearScores.find(s => s.scoringPeriod.includes('1st Half'));
          const secondHalf = targetYearScores.find(s => s.scoringPeriod.includes('2nd Half'));

          if (firstHalf && secondHalf) {
            // Both periods available - use average for ranking
            rankingScore = (firstHalf.totalPercentage + secondHalf.totalPercentage) / 2;
          } else {
            // Only one period available - use that score for ranking
            rankingScore = targetYearScores[0].totalPercentage;
          }
        } else {
          // No target year scores, use latest score
          rankingScore = latestScore.totalPercentage;
        }

        return {
          _id: mda?._id || null,
          name: mdaName,
          description: mda?.description,
          email: mda?.email,
          phoneNumber: mda?.phoneNumber,
          assignedUsers: mda?.assignedUsers || [],
          createdAt: mda?.createdAt || 0,
          currentScore: rankingScore,
          latestScore,
          isActiveOnPlatform: !!mda
        };
      })
    );

    // Filter to only include MDAs that have been scored (currentScore > 0)
    const scoredMdas = mdasWithLatestScores.filter(m => m.currentScore > 0);

    // Sort by current score
    const sortedMdas = scoredMdas.sort((a, b) => b.currentScore - a.currentScore);

    // Calculate statistics
    const totalMDAs = sortedMdas.length;
    const compliantMDAs = sortedMdas.filter(m => m.currentScore >= 70).length;
    const averageScore = totalMDAs > 0 ? sortedMdas.reduce((sum, m) => sum + m.currentScore, 0) / totalMDAs : 0;

    // Grade distribution
    const gradeDistribution = {
      A: sortedMdas.filter(m => m.currentScore >= 90).length,
      B: sortedMdas.filter(m => m.currentScore >= 80 && m.currentScore < 90).length,
      C: sortedMdas.filter(m => m.currentScore >= 70 && m.currentScore < 80).length,
      D: sortedMdas.filter(m => m.currentScore >= 60 && m.currentScore < 70).length,
      F: sortedMdas.filter(m => m.currentScore < 60).length
    };

    return {
      totalMDAs,
      compliantMDAs,
      nonCompliantMDAs: totalMDAs - compliantMDAs,
      complianceRate: totalMDAs > 0 ? (compliantMDAs / totalMDAs) * 100 : 0,
      averageScore,
      gradeDistribution,
      topPerformers: sortedMdas.slice(0, 10),
      bottomPerformers: sortedMdas.slice(-10).reverse()
    };
  }
});

// Initialize monthly reports for all MDAs
export const initializeMonthlyReports = mutation({
  args: {
    month: v.string(),
    year: v.number(),
    deadline: v.number()
  },
  handler: async (ctx, { month, year, deadline }) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin" && user.role !== "staff") {
      throw new Error("Unauthorized");
    }

    const mdas = await ctx.db.query("mdas").collect();
    const now = Date.now();

    for (const mda of mdas) {
      // Check if report already exists for this month/year
      const existingReport = await ctx.db.query("mda_monthly_reports")
        .withIndex("byMonth", q => q.eq("month", month))
        .filter(q => q.eq(q.field("year"), year) && q.eq(q.field("mdaId"), mda._id))
        .first();

      if (!existingReport) {
        await ctx.db.insert("mda_monthly_reports", {
          mdaId: mda._id,
          mdaName: mda.name,
          month,
          year,
          deadline,
          submittedDate: undefined,
          submitted: false,
          onTime: false,
          reportFileId: undefined,
          reportFileName: undefined,
          submittedBy: undefined,
          status: "pending",
          notes: undefined
        });
      }
    }

    return { success: true, message: `Initialized monthly reports for ${mdas.length} MDAs` };
  }
});

// Get real monthly reports for MDA scoring
export const getRealMonthlyReports = query({
  args: {
    mdaName: v.optional(v.string()),
    scoringPeriod: v.optional(v.string())
  },
  handler: async (ctx, args) => loadRealMonthlyReports(ctx, args),
});

// Returns only the file reference, so actions don't receive the embedded report data.
// When an MDA re-uploads the same reporting month later, use the latest submission.
export const getMonthlyReportFileRef = internalQuery({
  args: {
    mdaName: v.string(),
    month: v.number(),
    year: v.number(),
    /** Scoring window period (e.g. "2026") — needed when the window spans prior calendar years. */
    scoringPeriod: v.optional(v.string()),
  },
  returns: v.union(
    v.null(),
    v.object({
      fileId: v.optional(v.id("_storage")),
      fileName: v.optional(v.string()),
      submittedAt: v.number(),
      reportCount: v.number(),
    })
  ),
  handler: async (ctx, { mdaName, month, year, scoringPeriod }) => {
    const period = scoringPeriod ?? String(year);
    const monthlyData = await loadRealMonthlyReports(ctx, {
      mdaName,
      scoringPeriod: period,
    });
    const monthName = new Date(year, month, 1).toLocaleString("default", { month: "long" });
    const entry = monthlyData.find((m) => m.month === monthName && m.year === year);

    if (!entry?.submitted || entry.reports.length === 0) return null;

    const latest = [...entry.reports].sort((a, b) => b.submittedAt - a.submittedAt)[0]!;
    return {
      fileId: latest.fileId,
      fileName: latest.fileName,
      submittedAt: latest.submittedAt,
      reportCount: entry.reports.length,
    };
  },
});

type RealMonthlyReportEntry = {
  month: string;
  year: number;
  deadline: number;
  submittedDate: number | null;
  submitted: boolean;
  onTime: boolean;
  reportCount: number;
  reports: Doc<"submitted_reports">[];
};

async function loadRealMonthlyReports(
  ctx: QueryCtx,
  { mdaName, scoringPeriod }: { mdaName?: string; scoringPeriod?: string }
): Promise<RealMonthlyReportEntry[]> {
    // Get all submitted reports from reform champions for the specified MDA
    let allReports: Doc<"submitted_reports">[];
    if (mdaName) {
      // Find the MDA using flexible matching (optional — many MDAs without
      // ReportGov agents are not in the `mdas` table at all).
      const mda = await findMdaByName(ctx, mdaName);
      const nameCandidates = [mdaName, mda?.name].filter(
        (name): name is string => !!name
      );

      // Match flexibly: uploads often store "NAMA - Nigerian Airspace…" while
      // the scoring selector uses just "Nigerian Airspace Management Agency".
      const reformReports = await ctx.db.query("submitted_reports")
        .withIndex("byDate", q => q.gte("submittedAt", 0))
        .filter(q => q.eq(q.field("role"), "reform_champion"))
        .collect();

      allReports = reformReports.filter(
        (report) =>
          !!report.mdaName &&
          nameCandidates.some((candidate) => mdaNamesMatch(candidate, report.mdaName!))
      );
    } else {
      // Get all reports for the current user
      const user = await getCurrentUserOrThrow(ctx);
      allReports = await ctx.db.query("submitted_reports")
        .withIndex("bySubmittedBy", q => q.eq("submittedBy", user._id))
        .filter(q => q.eq(q.field("role"), "reform_champion"))
        .collect();
    }

    // Without a scoring period there are no months to evaluate (matches prior behaviour).
    if (!scoringPeriod) {
      return buildMonthlyReportData(allReports, []);
    }

    // Resolve the scoring window (dynamic 2026+ config, half-year, full year, or
    // Jan→current month) and keep only reports inside it.
    const window = await resolveScoringWindow(ctx, scoringPeriod, "yearToDate");
    const filteredReports = filterReportsToWindow(allReports, window);
    return buildMonthlyReportData(filteredReports, window.monthsToCheck);
}

// Get past scoring data for averaging
export const getPastScoringData = query({
  args: {
    mdaName: v.string(),
    currentPeriod: v.string()
  },
  handler: async (ctx, { mdaName, currentPeriod }) => {
    // First get the MDA ID from the name using flexible matching
    const mda = await findMdaByName(ctx, mdaName);

    if (!mda) {
      return null;
    }

    // Get all past scoring history for this MDA
    const pastScores = await ctx.db.query("mda_scoring_history")
      .withIndex("byMda", q => q.eq("mdaId", mda._id))
      .filter(q => q.neq(q.field("scoringPeriod"), currentPeriod))
      .order("desc")
      .collect();

    if (pastScores.length === 0) {
      return null;
    }

    // Calculate averages for each metric
    const totalScores = pastScores.length;
    const averages = {
      serviceLevelAgreement: pastScores.reduce((sum, score) => sum + score.serviceLevelAgreementScore, 0) / totalScores,
      mysteryShopping: pastScores.reduce((sum, score) => sum + score.mysteryShoppingScore, 0) / totalScores,
      controversial: pastScores.reduce((sum, score) => sum + (score.controversialScore || 0), 0) / totalScores,
      innovation: pastScores.reduce((sum, score) => sum + (score.innovationScore || 0), 0) / totalScores,
      stakeholderEngagement: pastScores.reduce((sum, score) => sum + score.stakeholderEngagementScore, 0) / totalScores,
      transparency: pastScores.reduce(
        (sum, score) =>
          sum +
          (typeof score.transparencyScore === "number"
            ? score.transparencyScore
            : (score as any).reportGovernanceScore || 0),
        0
      ) / totalScores,
      reportGovernanceResolution: pastScores.reduce((sum, score) => sum + score.reportGovernanceResolutionScore, 0) / totalScores,
      monthlyReportSubmission: pastScores.reduce((sum, score) => sum + score.monthlyReportSubmissionScore, 0) / totalScores,
      timelinessInSubmitting: pastScores.reduce((sum, score) => sum + score.timelinessInSubmittingScore, 0) / totalScores,
      totalScore: pastScores.reduce((sum, score) => sum + score.totalScore, 0) / totalScores,
      totalPercentage: pastScores.reduce((sum, score) => sum + score.totalPercentage, 0) / totalScores
    };

    return {
      pastScores: pastScores.length,
      averages,
      lastScored: pastScores[0]?.scoredAt || null
    };
  }
});

// Get yearly scoring data for dashboard
export const getYearlyScoringData = query({
  args: {
    year: v.optional(v.number())
  },
  handler: async (ctx, { year }) => {
    const currentYear = year || new Date().getFullYear();

    // Get all scoring history for the specified year
    const yearlyScores = await ctx.db.query("mda_scoring_history")
      .withIndex("byDate", q => q.gte("scoredAt", new Date(currentYear, 0, 1).getTime()))
      .filter(q => q.lt(q.field("scoredAt"), new Date(currentYear + 1, 0, 1).getTime()))
      .collect();

    // Group by MDA and calculate yearly averages
    const mdaYearlyData = new Map();

    yearlyScores.forEach(score => {
      if (!mdaYearlyData.has(score.mdaName)) {
        mdaYearlyData.set(score.mdaName, {
          mdaName: score.mdaName,
          periods: [],
          yearlyAverage: 0
        });
      }

      const mdaData = mdaYearlyData.get(score.mdaName);
      mdaData.periods.push({
        period: score.scoringPeriod,
        score: score.totalPercentage,
        scoredAt: score.scoredAt
      });
    });

    // Calculate yearly average for each MDA
    // For MDAs with both 1st and 2nd half: use average of both
    // For MDAs with only one period: use that score
    mdaYearlyData.forEach(mdaData => {
      if (mdaData.periods.length > 0) {
        // Check if we have both 1st and 2nd half scores
        const firstHalf = mdaData.periods.find((p: any) => p.period.includes('1st Half'));
        const secondHalf = mdaData.periods.find((p: any) => p.period.includes('2nd Half'));

        if (firstHalf && secondHalf) {
          // Both periods available - use average
          mdaData.yearlyAverage = (firstHalf.score + secondHalf.score) / 2;
        } else {
          // Only one period available - use that score
          mdaData.yearlyAverage = mdaData.periods[0].score;
        }
      }
    });

    return Array.from(mdaYearlyData.values());
  }
});

// Get period-specific ticket data for MDA scoring
export const getPeriodTicketData = query({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string()
  },
  returns: v.union(
    v.null(),
    v.object({
      totalTickets: v.number(),
      resolvedTickets: v.number(),
      resolutionRate: v.number(),
      averageResponseTime: v.number(),
      averageResolutionTime: v.number(),
      systemTotalTickets: v.union(v.number(), v.null()),
      systemResolvedTickets: v.union(v.number(), v.null()),
      systemAverageResolutionRate: v.union(v.number(), v.null()),
      minimumThreshold: v.union(v.number(), v.null()),
      adjustedResolutionRate: v.union(v.number(), v.null()),
      period: v.string(),
      startDate: v.number(),
      endDate: v.number(),
      dateRange: v.object({ start: v.string(), end: v.string() }),
    })
  ),
  handler: async (ctx, { mdaName, scoringPeriod }) => {
    // First get the MDA ID from the name using flexible matching
    const mda = await findMdaByName(ctx, mdaName);

    if (!mda) {
      return null;
    }

    const { startDate, endDate, targetYear } = await resolveScoringWindow(ctx, scoringPeriod, "currentMonth");

    const allTickets = await ctx.db.query("tickets")
      .withIndex("byMDA", q => q.eq("assignedMDA", mda._id))
      .collect();

    const {
      totalTickets,
      resolvedTickets,
      resolutionRate,
      averageResponseTime,
      averageResolutionTime,
    } = computeTicketStats(allTickets, startDate, endDate);

    let systemTotalTickets: number | null = null;
    let systemResolvedTickets: number | null = null;
    let systemAverageResolutionRate: number | null = null;
    let minimumThreshold: number | null = null;
    let adjustedResolutionRate: number | null = null;

    if (targetYear >= 2026) {
      const system = await loadSystemResolutionContext(ctx, targetYear, startDate, endDate);
      systemTotalTickets = system.systemTotalTickets;
      systemResolvedTickets = system.systemResolvedTickets;
      systemAverageResolutionRate = system.systemAverageResolutionRate;
      minimumThreshold = system.minimumThreshold;
      adjustedResolutionRate = calculateAdjustedResolutionRate({
        complaintsReceived: totalTickets,
        resolutionRate,
        minimumThreshold,
        systemAverageResolutionRate,
      });
    }

    return {
      totalTickets,
      resolvedTickets,
      resolutionRate,
      averageResponseTime,
      averageResolutionTime,
      systemTotalTickets,
      systemResolvedTickets,
      systemAverageResolutionRate,
      minimumThreshold,
      adjustedResolutionRate,
      period: scoringPeriod,
      startDate,
      endDate,
      dateRange: {
        start: new Date(startDate).toLocaleDateString(),
        end: new Date(endDate).toLocaleDateString()
      }
    };
  }
});

// Get latest scores for all MDAs from scoring history
export const getAllMDAsLatestScores = query({
  args: { year: v.optional(v.number()) },
  handler: async (ctx, { year }) => {
    const targetYear = year || new Date().getFullYear();
    // Get all unique MDA names from scoring history
    const allScoringHistory = await ctx.db.query("mda_scoring_history").collect();
    const uniqueMdaNames = [...new Set(allScoringHistory.map(score => score.mdaName))];

    // Get MDAs from mdas table
    const mdas = await ctx.db.query("mdas").collect();
    const mdaNamesFromTable = mdas.map(mda => mda.name);

    // Combine all MDA names (from table + from scoring history)
    const allMdaNames = [...new Set([...mdaNamesFromTable, ...uniqueMdaNames])];

    const mdasWithLatestScores = await Promise.all(
      allMdaNames.map(async (mdaName) => {
        // Find MDA in table if it exists
        const mda = mdas.find(m => m.name === mdaName);

        // Get all scores for this MDA (by name, since mdaId might be null)
        const allScores = await ctx.db.query("mda_scoring_history")
          .withIndex("byMdaName", q => q.eq("mdaName", mdaName))
          .order("desc")
          .collect();

        if (allScores.length === 0) {
          return {
            mdaId: mda?._id || null,
            mdaName: mdaName,
            isActiveOnPlatform: !!mda,
            currentScore: 0,
            grade: "N/A",
            status: "Not Scored",
            lastScoredAt: null,
            scoringPeriod: "N/A"
          };
        }

        // Get target year scores
        const targetYearScores = allScores.filter(score => {
          const scoreYear = new Date(score.scoredAt).getFullYear();
          return scoreYear === targetYear;
        });

        let rankingScore = 0;
        let latestScore = allScores[0]; // Most recent score for display
        let grade = latestScore.grade;
        let status = latestScore.status;
        let lastScoredAt = latestScore.scoredAt;
        let scoringPeriod = latestScore.scoringPeriod;

        if (targetYearScores.length > 0) {
          // Check if we have both 1st and 2nd half scores for target year
          const firstHalf = targetYearScores.find(s => s.scoringPeriod.includes('1st Half'));
          const secondHalf = targetYearScores.find(s => s.scoringPeriod.includes('2nd Half'));

          if (firstHalf && secondHalf) {
            // Both periods available - use average for ranking
            rankingScore = (firstHalf.totalPercentage + secondHalf.totalPercentage) / 2;
            // Use the most recent score for grade/status display
            grade = latestScore.grade;
            status = latestScore.status;
            scoringPeriod = `${firstHalf.scoringPeriod} & ${secondHalf.scoringPeriod}`;
          } else {
            // Only one period available - use that score for ranking
            rankingScore = targetYearScores[0].totalPercentage;
            grade = targetYearScores[0].grade;
            status = targetYearScores[0].status;
            lastScoredAt = targetYearScores[0].scoredAt;
            scoringPeriod = targetYearScores[0].scoringPeriod;
          }
        } else {
          // No target year scores, use latest score
          rankingScore = latestScore.totalPercentage;
        }

        return {
          mdaId: mda?._id || null,
          mdaName: mdaName,
          isActiveOnPlatform: !!mda,
          currentScore: rankingScore,
          grade: grade,
          status: status,
          lastScoredAt: lastScoredAt,
          scoringPeriod: scoringPeriod,
          maxPossiblePoints: latestScore?.maxPossiblePoints ?? 100,
          scoringMethod: latestScore?.scoringMethod ?? "standard"
        };
      })
    );

    // Sort by current score (highest first)
    return mdasWithLatestScores.sort((a, b) => b.currentScore - a.currentScore);
  }
});

// Get MDA leaderboard with latest scores
export const getMDALeaderboard = query({
  args: {
    limit: v.optional(v.number()),
    year: v.optional(v.number())
  },
  handler: async (ctx, { limit = 10, year }) => {
    const mdasWithScores = await getAllMDAsLatestScores(ctx, { year });
    return mdasWithScores.slice(0, limit);
  }
});

// Check if an MDA already has a score for a specific period
export const checkMdaScoringStatus = query({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string()
  },
  handler: async (ctx, { mdaName, scoringPeriod }) => {
    // Check if this MDA already has a score for this specific period
    const existingScore = await ctx.db.query("mda_scoring_history")
      .withIndex("byMdaName", q => q.eq("mdaName", mdaName))
      .filter(q => q.eq(q.field("scoringPeriod"), scoringPeriod))
      .first();

    return {
      hasScore: !!existingScore,
      existingScore: existingScore ? {
        totalPercentage: existingScore.totalPercentage,
        grade: existingScore.grade,
        status: existingScore.status,
        scoredAt: existingScore.scoredAt
      } : null
    };
  }
});

// Helper function to sanitize MDA names for use as object keys
function sanitizeMdaName(mdaName: string): string {
  return mdaName
    .replace(/[–—]/g, '-') // Replace em dash and en dash with regular dash
    .replace(/[^\w\s-]/g, '') // Remove all non-word characters except spaces and dashes
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/-+/g, '_') // Replace multiple dashes with underscores
    .toLowerCase();
}

// Get all MDA scoring statuses for a specific period
export const getAllMdaScoringStatuses = query({
  args: {
    scoringPeriod: v.string()
  },
  handler: async (ctx, { scoringPeriod }) => {
    // Get all scoring history for this specific period
    const periodScores = await ctx.db.query("mda_scoring_history")
      .withIndex("byPeriod", q => q.eq("scoringPeriod", scoringPeriod))
      .collect();

    // Create an object of sanitized MDA names to their scores for this period
    const mdaScoresObject: { [key: string]: any } = {};
    periodScores.forEach(score => {
      const sanitizedKey = sanitizeMdaName(score.mdaName);
      mdaScoresObject[sanitizedKey] = {
        originalName: score.mdaName, // Keep original name for reference
        totalPercentage: score.totalPercentage,
        grade: score.grade,
        status: score.status,
        scoredAt: score.scoredAt
      };
    });

    return mdaScoresObject;
  }
});

// Migration function to update existing records with default values
export const migrateScoringHistory = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Only admins can run migrations
    if (user.role !== "admin") {
      throw new Error("Unauthorized: Only admins can run migrations");
    }

    // Get all scoring history records
    const allRecords = await ctx.db.query("mda_scoring_history").collect();

    let updatedCount = 0;

    for (const record of allRecords) {
      // Check if record needs migration
      if (record.maxPossiblePoints === undefined || record.scoringMethod === undefined) {
        await ctx.db.patch(record._id, {
          maxPossiblePoints: record.maxPossiblePoints ?? 100,
          scoringMethod: record.scoringMethod ?? "standard"
        });
        updatedCount++;
      }
    }

    return {
      success: true,
      updatedRecords: updatedCount,
      totalRecords: allRecords.length
    };
  }
});

// Debug function to check ticket dates for a specific MDA
export const debugTicketDates = query({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string()
  },
  handler: async (ctx, { mdaName, scoringPeriod }) => {
    // First get the MDA ID from the name
    const mda = await ctx.db.query("mdas")
      .withIndex("byName", q => q.eq("name", mdaName))
      .first();

    if (!mda) {
      return { error: "MDA not found" };
    }

    // Get all tickets for this MDA
    const allTickets = await ctx.db.query("tickets")
      .withIndex("byMDA", q => q.eq("assignedMDA", mda._id))
      .collect();

    // Calculate date range based on scoring period
    const currentYear = new Date().getFullYear();
    const yearMatch = scoringPeriod.match(/\d{4}/);
    const targetYear = yearMatch ? parseInt(yearMatch[0]) : currentYear;

    let startDate: number, endDate: number;

    if (scoringPeriod.includes("1st Half")) {
      startDate = new Date(targetYear, 0, 1).getTime(); // January 1
      endDate = new Date(targetYear, 5, 30, 23, 59, 59).getTime();   // June 30 end of day
    } else if (scoringPeriod.includes("2nd Half")) {
      startDate = new Date(targetYear, 6, 1).getTime();  // July 1
      endDate = new Date(targetYear, 11, 31, 23, 59, 59).getTime();  // December 31 end of day
    } else {
      // Default - use current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();
    }

    // Filter tickets by date range
    const filteredTickets = allTickets.filter(ticket =>
      ticket.createdAt >= startDate && ticket.createdAt <= endDate
    );

    return {
      mdaName,
      scoringPeriod,
      targetYear,
      dateRange: {
        start: new Date(startDate).toLocaleDateString(),
        end: new Date(endDate).toLocaleDateString()
      },
      totalTickets: allTickets.length,
      filteredTickets: filteredTickets.length,
      allTicketDates: allTickets.map(t => ({
        id: t._id,
        createdAt: new Date(t.createdAt).toLocaleDateString(),
        createdAtTimestamp: t.createdAt,
        status: t.status
      })),
      filteredTicketDates: filteredTickets.map(t => ({
        id: t._id,
        createdAt: new Date(t.createdAt).toLocaleDateString(),
        createdAtTimestamp: t.createdAt,
        status: t.status
      }))
    };
  }
});

// Submit monthly report for an MDA
export const submitMonthlyReport = mutation({
  args: {
    mdaId: v.id("mdas"),
    month: v.string(),
    year: v.number(),
    reportFileId: v.id("_storage"),
    reportFileName: v.string()
  },
  handler: async (ctx, { mdaId, month, year, reportFileId, reportFileName }) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Find the monthly report
    const report = await ctx.db.query("mda_monthly_reports")
      .withIndex("byMonth", q => q.eq("month", month))
      .filter(q => q.eq(q.field("year"), year) && q.eq(q.field("mdaId"), mdaId))
      .first();

    if (!report) {
      throw new Error("Monthly report not found");
    }

    const now = Date.now();
    const isOnTime = now <= report.deadline;
    const status = isOnTime ? "submitted" : "late";

    // Update the report
    await ctx.db.patch(report._id, {
      submittedDate: now,
      submitted: true,
      onTime: isOnTime,
      reportFileId,
      reportFileName,
      submittedBy: user._id,
      status
    });

    return { success: true, isOnTime, status };
  }
});

// Save SLA data for a specific MDA and period
export const saveSLAData = mutation({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string(),
    monthlySlaData: v.any(), // The monthly SLA data object
    totalScore: v.number(),
    monthsWithData: v.number(),
    totalMonths: v.number(),
    percentage: v.number()
  },
  handler: async (ctx, { mdaName, scoringPeriod, monthlySlaData, totalScore, monthsWithData, totalMonths, percentage }) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Check if SLA data already exists for this MDA and period
    const existingSla = await ctx.db.query("mda_sla_data")
      .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();

    if (existingSla) {
      // Update existing record
      await ctx.db.patch(existingSla._id, {
        monthlySlaData,
        totalScore,
        monthsWithData,
        totalMonths,
        percentage,
        updatedAt: Date.now(),
        updatedBy: user._id
      });
    } else {
      // Create new record
      await ctx.db.insert("mda_sla_data", {
        mdaName,
        scoringPeriod,
        monthlySlaData,
        totalScore,
        monthsWithData,
        totalMonths,
        percentage,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: user._id,
        updatedBy: user._id
      });
    }

    return { success: true, message: "SLA data saved successfully" };
  }
});

// Get SLA data for a specific MDA and period
export const getSLAData = query({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string()
  },
  handler: async (ctx, { mdaName, scoringPeriod }) => {
    const slaData = await ctx.db.query("mda_sla_data")
      .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();

    return slaData;
  }
});

// Save Report Governance Resolution data for a specific MDA and period
export const saveReportGovData = mutation({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string(),
    totalTickets: v.number(),
    resolvedTickets: v.number(),
    averageResponseTime: v.number(),
    averageResolutionTime: v.number(),
    resolutionRate: v.number(),
    adjustedResolutionRate: v.optional(v.number()),
    systemAverageResolutionRate: v.optional(v.number()),
    minimumThreshold: v.optional(v.number()),
    score: v.number(),
    isManual: v.boolean(),
    isSkipped: v.optional(v.boolean())
  },
  handler: async (ctx, { mdaName, scoringPeriod, totalTickets, resolvedTickets, averageResponseTime, averageResolutionTime, resolutionRate, adjustedResolutionRate, systemAverageResolutionRate, minimumThreshold, score, isManual, isSkipped }) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Check if Report Gov data already exists for this MDA and period
    const existingReportGov = await ctx.db.query("mda_reportgov_data")
      .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();

    if (existingReportGov) {
      // Update existing record
      await ctx.db.patch(existingReportGov._id, {
        totalTickets,
        resolvedTickets,
        averageResponseTime,
        averageResolutionTime,
        resolutionRate,
        adjustedResolutionRate,
        systemAverageResolutionRate,
        minimumThreshold,
        score,
        isManual,
        isSkipped: isSkipped ?? false,
        updatedAt: Date.now(),
        updatedBy: user._id
      });
    } else {
      // Create new record
      await ctx.db.insert("mda_reportgov_data", {
        mdaName,
        scoringPeriod,
        totalTickets,
        resolvedTickets,
        averageResponseTime,
        averageResolutionTime,
        resolutionRate,
        adjustedResolutionRate,
        systemAverageResolutionRate,
        minimumThreshold,
        score,
        isManual,
        isSkipped: isSkipped ?? false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: user._id,
        updatedBy: user._id
      });
    }

    return { success: true, message: "Report Governance data saved successfully" };
  }
});

// Get Report Governance Resolution data for a specific MDA and period
export const getReportGovData = query({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string()
  },
  handler: async (ctx, { mdaName, scoringPeriod }) => {
    const reportGovData = await ctx.db.query("mda_reportgov_data")
      .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();

    return reportGovData;
  }
});

// Save Mystery Shopping data for a specific MDA and period
export const saveMysteryShoppingData = mutation({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string(),
    mysteryType: v.string(),
    ratings: v.any(),
    totalScore: v.number(),
    maxPossibleScore: v.number(),
    percentage: v.number()
  },
  handler: async (ctx, { mdaName, scoringPeriod, mysteryType, ratings, totalScore, maxPossibleScore, percentage }) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Check if Mystery Shopping data already exists for this MDA and period
    const existingMysteryData = await ctx.db.query("mda_mystery_shopping_data")
      .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();

    if (existingMysteryData) {
      // Update existing record
      await ctx.db.patch(existingMysteryData._id, {
        mysteryType,
        ratings,
        totalScore,
        maxPossibleScore,
        percentage,
        updatedAt: Date.now(),
        updatedBy: user._id
      });
    } else {
      // Create new record
      await ctx.db.insert("mda_mystery_shopping_data", {
        mdaName,
        scoringPeriod,
        mysteryType,
        ratings,
        totalScore,
        maxPossibleScore,
        percentage,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: user._id,
        updatedBy: user._id
      });
    }

    return { success: true, message: "Mystery Shopping data saved successfully" };
  }
});

// Get Mystery Shopping data for a specific MDA and period
export const getMysteryShoppingData = query({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string()
  },
  handler: async (ctx, { mdaName, scoringPeriod }) => {
    const mysteryData = await ctx.db.query("mda_mystery_shopping_data")
      .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();

    return mysteryData;
  }
});

// Get Controversial data for a specific MDA and period
export const getControversialData = query({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string()
  },
  handler: async (ctx, { mdaName, scoringPeriod }) => {
    const controversialData = await ctx.db.query("mda_controversial_data")
      .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();

    return controversialData;
  }
});

// Get Innovation data for a specific MDA and period
export const getInnovationData = query({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string()
  },
  handler: async (ctx, { mdaName, scoringPeriod }) => {
    const innovationData = await ctx.db.query("mda_innovation_data")
      .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();

    return innovationData;
  }
});

// Get Stakeholder Engagement data for a specific MDA and period
export const getStakeholderData = query({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string()
  },
  handler: async (ctx, { mdaName, scoringPeriod }) => {
    const stakeholderData = await ctx.db.query("mda_stakeholder_data")
      .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();

    return stakeholderData;
  }
});

// Get Transparency data for a specific MDA and period
export const getTransparencyData = query({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string()
  },
  handler: async (ctx, { mdaName, scoringPeriod }) => {
    const transparencyData = await ctx.db.query("mda_transparency_data")
      .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();

    return transparencyData;
  }
});

// Save Monthly Report Submission data for a specific MDA and period
export const saveMonthlyReportData = mutation({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string(),
    manualMonthlyReports: v.any(),
    useManual: v.boolean(),
    score: v.number()
  },
  handler: async (ctx, { mdaName, scoringPeriod, manualMonthlyReports, useManual, score }) => {
    const user = await getCurrentUserOrThrow(ctx);

    const existingData = await ctx.db.query("mda_monthly_report_data")
      .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();

    if (existingData) {
      await ctx.db.patch(existingData._id, {
        manualMonthlyReports,
        useManual,
        score,
        updatedAt: Date.now(),
        updatedBy: user._id
      });
    } else {
      await ctx.db.insert("mda_monthly_report_data", {
        mdaName,
        scoringPeriod,
        manualMonthlyReports,
        useManual,
        score,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: user._id,
        updatedBy: user._id
      });
    }

    return { success: true, message: "Monthly Report Submission data saved successfully" };
  }
});

// Get Monthly Report Submission data for a specific MDA and period
export const getMonthlyReportData = query({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string()
  },
  handler: async (ctx, { mdaName, scoringPeriod }) => {
    const monthlyReportData = await ctx.db.query("mda_monthly_report_data")
      .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();

    return monthlyReportData;
  }
});

// Save Timeliness data for a specific MDA and period
export const saveTimelinessData = mutation({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string(),
    manualTimeliness: v.any(),
    useManual: v.boolean(),
    score: v.number()
  },
  handler: async (ctx, { mdaName, scoringPeriod, manualTimeliness, useManual, score }) => {
    const user = await getCurrentUserOrThrow(ctx);

    const existingData = await ctx.db.query("mda_timeliness_data")
      .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();

    if (existingData) {
      await ctx.db.patch(existingData._id, {
        manualTimeliness,
        useManual,
        score,
        updatedAt: Date.now(),
        updatedBy: user._id
      });
    } else {
      await ctx.db.insert("mda_timeliness_data", {
        mdaName,
        scoringPeriod,
        manualTimeliness,
        useManual,
        score,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: user._id,
        updatedBy: user._id
      });
    }

    return { success: true, message: "Timeliness data saved successfully" };
  }
});

// Get Timeliness data for a specific MDA and period
export const getTimelinessData = query({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string()
  },
  handler: async (ctx, { mdaName, scoringPeriod }) => {
    const timelinessData = await ctx.db.query("mda_timeliness_data")
      .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();

    return timelinessData;
  }
});

// Save Controversial data for a specific MDA and period
export const saveControversialData = mutation({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string(),
    isControversial: v.boolean(),
    score: v.number()
  },
  handler: async (ctx, { mdaName, scoringPeriod, isControversial, score }) => {
    const user = await getCurrentUserOrThrow(ctx);

    const existingData = await ctx.db.query("mda_controversial_data")
      .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();

    if (existingData) {
      await ctx.db.patch(existingData._id, {
        isControversial,
        score,
        updatedAt: Date.now(),
        updatedBy: user._id
      });
    } else {
      await ctx.db.insert("mda_controversial_data", {
        mdaName,
        scoringPeriod,
        isControversial,
        score,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: user._id,
        updatedBy: user._id
      });
    }

    return { success: true, message: "Controversial data saved successfully" };
  }
});

// Save Touting & Rentseeking data for a specific MDA and period
export const saveToutingData = mutation({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string(),
    isTouting: v.boolean(),
    score: v.number()
  },
  handler: async (ctx, { mdaName, scoringPeriod, isTouting, score }) => {
    const user = await getCurrentUserOrThrow(ctx);

    const existingData = await ctx.db.query("mda_touting_rentseeking_data")
      .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();

    if (existingData) {
      await ctx.db.patch(existingData._id, {
        isToutingRentseeking: isTouting,
        score,
        updatedAt: Date.now(),
        updatedBy: user._id
      });
    } else {
      await ctx.db.insert("mda_touting_rentseeking_data", {
        mdaName,
        scoringPeriod,
        isToutingRentseeking: isTouting,
        score,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: user._id,
        updatedBy: user._id
      });
    }

    return { success: true, message: "Touting & Rentseeking data saved successfully" };
  }
});

// Save Innovation data for a specific MDA and period
export const saveInnovationData = mutation({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string(),
    isInnovative: v.boolean(),
    score: v.number()
  },
  handler: async (ctx, { mdaName, scoringPeriod, isInnovative, score }) => {
    const user = await getCurrentUserOrThrow(ctx);

    const existingData = await ctx.db.query("mda_innovation_data")
      .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();

    if (existingData) {
      await ctx.db.patch(existingData._id, {
        isInnovative,
        score,
        updatedAt: Date.now(),
        updatedBy: user._id
      });
    } else {
      await ctx.db.insert("mda_innovation_data", {
        mdaName,
        scoringPeriod,
        isInnovative,
        score,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: user._id,
        updatedBy: user._id
      });
    }

    return { success: true, message: "Innovation data saved successfully" };
  }
});

// Save Mystery Shopping Data
export const saveMysteryData = mutation({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string(),
    score: v.number(),
    ratings: v.any(), // Flexible object for ratings
    type: v.string(), // 'hasReportGov' | 'noReportGov'
    percentage: v.number(),
    maxPossibleScore: v.number()
  },
  handler: async (ctx, { mdaName, scoringPeriod, score, ratings, type, percentage, maxPossibleScore }) => {
    const user = await getCurrentUserOrThrow(ctx);

    const existingData = await ctx.db.query("mda_mystery_shopping_data")
      .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();

    if (existingData) {
      await ctx.db.patch(existingData._id, {
        totalScore: score,
        ratings,
        mysteryType: type,
        percentage,
        maxPossibleScore,
        updatedAt: Date.now(),
        updatedBy: user._id
      });
    } else {
      await ctx.db.insert("mda_mystery_shopping_data", {
        mdaName,
        scoringPeriod,
        totalScore: score,
        ratings,
        mysteryType: type,
        percentage,
        maxPossibleScore,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: user._id,
        updatedBy: user._id
      });
    }
    return { success: true, message: "Mystery Shopping data saved successfully" };
  }
});

// Save Stakeholder Engagement data for a specific MDA and period
export const saveStakeholderData = mutation({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string(),
    rate: v.number(),
    score: v.number()
  },
  handler: async (ctx, { mdaName, scoringPeriod, rate, score }) => {
    const user = await getCurrentUserOrThrow(ctx);

    const existingData = await ctx.db.query("mda_stakeholder_data")
      .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();

    if (existingData) {
      await ctx.db.patch(existingData._id, {
        rate,
        score,
        updatedAt: Date.now(),
        updatedBy: user._id
      });
    } else {
      await ctx.db.insert("mda_stakeholder_data", {
        mdaName,
        scoringPeriod,
        rate,
        score,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: user._id,
        updatedBy: user._id
      });
    }

    return { success: true, message: "Stakeholder Engagement data saved successfully" };
  }
});

// Save Transparency data (two questions) for a specific MDA and period
export const saveTransparencyData = mutation({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string(),
    responses: v.any(),
    score: v.number(),
    isSkipped: v.boolean()
  },
  handler: async (ctx, { mdaName, scoringPeriod, responses, score, isSkipped }) => {
    const user = await getCurrentUserOrThrow(ctx);

    const existingData = await ctx.db.query("mda_transparency_data")
      .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();

    if (existingData) {
      await ctx.db.patch(existingData._id, {
        responses,
        score,
        isSkipped,
        updatedAt: Date.now(),
        updatedBy: user._id
      });
    } else {
      await ctx.db.insert("mda_transparency_data", {
        mdaName,
        scoringPeriod,
        responses,
        score,
        isSkipped,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: user._id,
        updatedBy: user._id
      });
    }

    return { success: true, message: "Transparency data saved successfully" };
  }
});

// Get all MDAs ranked by Mystery Shopping score - averaged across both halves
export const getAllMysteryShoppingRankings = query({
  args: {
    scoringPeriod: v.string()
  },
  handler: async (ctx, { scoringPeriod }) => {
    // Extract year from scoring period
    const yearMatch = scoringPeriod.match(/\d{4}/);
    const targetYear = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();

    // Get data for both halves of the year
    const firstHalfPeriod = `1st Half ${targetYear}`;
    const secondHalfPeriod = `2nd Half ${targetYear}`;

    // Query both periods separately and combine
    const firstHalfData = await ctx.db.query("mda_mystery_shopping_data")
      .withIndex("byPeriod", q => q.eq("scoringPeriod", firstHalfPeriod))
      .collect();

    const secondHalfData = await ctx.db.query("mda_mystery_shopping_data")
      .withIndex("byPeriod", q => q.eq("scoringPeriod", secondHalfPeriod))
      .collect();

    const allMysteryData = [...firstHalfData, ...secondHalfData];

    // Group by MDA name and average scores
    const mdaScores: { [key: string]: { totalScore: number[], percentage: number[], mysteryType: string, maxPossibleScore: number } } = {};

    allMysteryData.forEach(data => {
      if (!mdaScores[data.mdaName]) {
        mdaScores[data.mdaName] = {
          totalScore: [],
          percentage: [],
          mysteryType: data.mysteryType,
          maxPossibleScore: data.maxPossibleScore
        };
      }
      mdaScores[data.mdaName].totalScore.push(data.totalScore);
      mdaScores[data.mdaName].percentage.push(data.percentage);
    });

    // Calculate averages
    const ranked = Object.entries(mdaScores)
      .map(([mdaName, scores]) => {
        const avgTotalScore = scores.totalScore.reduce((sum, score) => sum + score, 0) / scores.totalScore.length;
        const avgPercentage = scores.percentage.reduce((sum, pct) => sum + pct, 0) / scores.percentage.length;

        return {
          mdaName,
          totalScore: avgTotalScore,
          percentage: avgPercentage,
          maxPossibleScore: scores.maxPossibleScore,
          mysteryType: scores.mysteryType
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore);

    return ranked;
  }
});

// Get all MDAs ranked by SLA score - averaged across both halves
export const getAllSLARankings = query({
  args: {
    scoringPeriod: v.string()
  },
  handler: async (ctx, { scoringPeriod }) => {
    // Extract year from scoring period
    const yearMatch = scoringPeriod.match(/\d{4}/);
    const targetYear = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();

    // Get data for both halves of the year
    const firstHalfPeriod = `1st Half ${targetYear}`;
    const secondHalfPeriod = `2nd Half ${targetYear}`;

    // Query both periods separately and combine
    const firstHalfData = await ctx.db.query("mda_sla_data")
      .withIndex("byPeriod", q => q.eq("scoringPeriod", firstHalfPeriod))
      .collect();

    const secondHalfData = await ctx.db.query("mda_sla_data")
      .withIndex("byPeriod", q => q.eq("scoringPeriod", secondHalfPeriod))
      .collect();

    const allSlaData = [...firstHalfData, ...secondHalfData];

    // Group by MDA name and combine data from both halves
    const mdaScores: {
      [key: string]: {
        totalScore: number[],
        percentage: number[],
        monthlySlaData: any[]
      }
    } = {};

    allSlaData.forEach(data => {
      if (!mdaScores[data.mdaName]) {
        mdaScores[data.mdaName] = {
          totalScore: [],
          percentage: [],
          monthlySlaData: []
        };
      }
      mdaScores[data.mdaName].totalScore.push(data.totalScore);
      mdaScores[data.mdaName].percentage.push(data.percentage);
      // Store monthlySlaData to count unique months
      if (data.monthlySlaData && typeof data.monthlySlaData === 'object') {
        mdaScores[data.mdaName].monthlySlaData.push(data.monthlySlaData);
      }
    });

    // Calculate scores by summing and scaling based on total months with data
    const ranked = Object.entries(mdaScores)
      .map(([mdaName, scores]) => {
        // Count unique months across both halves by checking monthlySlaData keys
        const allMonthKeys = new Set<string>();
        scores.monthlySlaData.forEach(monthlyData => {
          if (monthlyData && typeof monthlyData === 'object') {
            Object.keys(monthlyData).forEach(key => {
              // Check if this month has data (has method and either file or rating)
              const monthData = monthlyData[key];
              if (monthData && (
                (monthData.method === 'file' && monthData.overallPercentage !== null) ||
                (monthData.method === 'rating' && monthData.rating > 0)
              )) {
                allMonthKeys.add(key);
              }
            });
          }
        });

        // If we can't count from monthlySlaData, sum the monthsWithData from both halves
        let totalMonthsWithData = allMonthKeys.size;
        if (totalMonthsWithData === 0) {
          // Fallback: sum monthsWithData from saved data
          totalMonthsWithData = scores.totalScore.length > 0 ?
            (allSlaData.filter(d => d.mdaName === mdaName)
              .reduce((sum, d) => sum + (d.monthsWithData || 0), 0)) : 0;
        }

        // Sum total scores from both halves (not average)
        const sumTotalScore = scores.totalScore.reduce((sum, score) => sum + score, 0);

        // Each month is worth 30/12 = 2.5 points (since total is 30 points for 12 months)
        const pointsPerMonth = 30 / 12; // 2.5 points per month

        // Calculate max possible score for the months with data
        // If 7 months have data, max = 7 × 2.5 = 17.5 points
        // If 8 months have data, max = 8 × 2.5 = 20 points
        const maxPossibleScoreForMonths = totalMonthsWithData * pointsPerMonth;

        // Calculate the max possible raw score (each month can get max 5 points)
        const maxPossibleRawScore = totalMonthsWithData * 5;

        // Scale the actual sum proportionally
        // Example: 7 months with actual sum of 28 out of 35 possible (7×5)
        // Scaled score: (28/35) × 17.5 = 14 points
        const finalScore = totalMonthsWithData > 0
          ? (sumTotalScore / maxPossibleRawScore) * maxPossibleScoreForMonths
          : 0;

        // Calculate percentage based on 30 points max
        const percentage = totalMonthsWithData > 0 ? (finalScore / 30) * 100 : 0;

        return {
          mdaName,
          totalScore: finalScore,
          percentage: percentage,
          monthsWithData: totalMonthsWithData,
          totalMonths: 12 // Full year - always 12 months
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore);

    return ranked;
  }
});

// Get all MDA saved data for live dashboard
export const getAllMdaSavedDataForDashboard = query({
  args: {
    year: v.number()
  },
  handler: async (ctx, { year }) => {
    const firstHalfPeriod = `1st Half ${year}`;
    const secondHalfPeriod = `2nd Half ${year}`;
    const fullYearPeriod = String(year);

    // Fetch dynamic configuration for 2026+
    const [efficiencyConfig, mysteryQuestions, transparencyItems, innovationStakeholderItems, metricExclusions] = await Promise.all([
      ctx.db.query("efficiency_periods")
        .withIndex("byYear", q => q.eq("year", year))
        .filter(q => q.eq(q.field("isActive"), true))
        .first(),
      ctx.db.query("mystery_shopping_questions")
        .withIndex("byYearAndActive", q => q.eq("year", year).eq("isActive", true))
        .collect(),
      ctx.db.query("transparency_items")
        .withIndex("byYearAndActive", q => q.eq("year", year).eq("isActive", true))
        .collect(),
      ctx.db.query("innovation_stakeholder_items")
        .withIndex("byYear", q => q.eq("year", year))
        .filter(q => q.eq(q.field("isActive"), true))
        .collect(),
      ctx.db.query("mda_metric_exclusions")
        .withIndex("byYear", q => q.eq("year", year))
        .collect()
    ]);

    // Calculate dynamic totals for "Others" and "Mystery Shopping"
    const uniqueMysteryQuestions = [...new Map(mysteryQuestions.map(item => [item._id, item])).values()];
    const uniqueTransparencyItems = [...new Map(transparencyItems.map(item => [item.itemId, item])).values()];
    // Deduplicate innovation/stakeholder items by itemId
    const uniqueInnovationStakeholderItems = [...new Map([
      ...innovationStakeholderItems
    ].map(item => [item.itemId, item])).values()];

    // Mystery Shopping: User confirmed it should be 40 points max, even if config has more (multiple types)
    const rawMysterySum = uniqueMysteryQuestions.reduce((sum, q) => sum + (q.weight || 0), 0);
    const mysteryTotal = rawMysterySum > 0 ? 40 : 40;

    // Others: Transparency (10) + Innovation (5) + Stakeholder (10) = 25
    const othersTotal = uniqueTransparencyItems.reduce((sum, i) => sum + (i.weight || 0), 0) +
      uniqueInnovationStakeholderItems.reduce((sum, i) => sum + (i.weight || 0), 0) || 25;

    console.log(`[Dashboard Debug ${year}] Efficiency: ${JSON.stringify(efficiencyConfig)}, Mystery (raw): ${mysteryTotal}, Others (raw): ${othersTotal}`);

    // Get all MDAs from database and from scoring history to get complete list
    const allMdas = await ctx.db.query("mdas").collect();
    const allScoringHistory = await ctx.db.query("mda_scoring_history").collect();
    const uniqueMdaNamesFromHistory = [...new Set(allScoringHistory.map(s => canonicalizeMdaName(s.mdaName)))];

    // Combine and deduplicate
    const allMdaNames = [...new Set([...allMdas.map(m => canonicalizeMdaName(m.name.trim())), ...uniqueMdaNamesFromHistory])];
    const uniqueMdaNames = [...new Set(allMdaNames)];
    const exclusionMap = buildExclusionLookup(metricExclusions as Array<{ mdaName: string; excludedMetrics: string[] }>);

    // Get all saved data for both periods - query separately and combine
    const [slaFirstHalf, slaSecondHalf, slaFullYear] = await Promise.all([
      ctx.db.query("mda_sla_data").withIndex("byPeriod", q => q.eq("scoringPeriod", firstHalfPeriod)).collect(),
      ctx.db.query("mda_sla_data").withIndex("byPeriod", q => q.eq("scoringPeriod", secondHalfPeriod)).collect(),
      ctx.db.query("mda_sla_data").withIndex("byPeriod", q => q.eq("scoringPeriod", fullYearPeriod)).collect()
    ]);
    const slaData = [...slaFirstHalf, ...slaSecondHalf, ...slaFullYear];

    const [mysteryFirstHalf, mysterySecondHalf, mysteryFullYear] = await Promise.all([
      ctx.db.query("mda_mystery_shopping_data").withIndex("byPeriod", q => q.eq("scoringPeriod", firstHalfPeriod)).collect(),
      ctx.db.query("mda_mystery_shopping_data").withIndex("byPeriod", q => q.eq("scoringPeriod", secondHalfPeriod)).collect(),
      ctx.db.query("mda_mystery_shopping_data").withIndex("byPeriod", q => q.eq("scoringPeriod", fullYearPeriod)).collect()
    ]);
    const mysteryData = [...mysteryFirstHalf, ...mysterySecondHalf, ...mysteryFullYear];

    const [controversialFirstHalf, controversialSecondHalf, controversialFullYear] = await Promise.all([
      ctx.db.query("mda_controversial_data").withIndex("byPeriod", q => q.eq("scoringPeriod", firstHalfPeriod)).collect(),
      ctx.db.query("mda_controversial_data").withIndex("byPeriod", q => q.eq("scoringPeriod", secondHalfPeriod)).collect(),
      ctx.db.query("mda_controversial_data").withIndex("byPeriod", q => q.eq("scoringPeriod", fullYearPeriod)).collect()
    ]);
    const controversialData = [...controversialFirstHalf, ...controversialSecondHalf, ...controversialFullYear];

    const [innovationFirstHalf, innovationSecondHalf, innovationFullYear] = await Promise.all([
      ctx.db.query("mda_innovation_data").withIndex("byPeriod", q => q.eq("scoringPeriod", firstHalfPeriod)).collect(),
      ctx.db.query("mda_innovation_data").withIndex("byPeriod", q => q.eq("scoringPeriod", secondHalfPeriod)).collect(),
      ctx.db.query("mda_innovation_data").withIndex("byPeriod", q => q.eq("scoringPeriod", fullYearPeriod)).collect()
    ]);
    const innovationData = [...innovationFirstHalf, ...innovationSecondHalf, ...innovationFullYear];

    const [stakeholderFirstHalf, stakeholderSecondHalf, stakeholderFullYear] = await Promise.all([
      ctx.db.query("mda_stakeholder_data").withIndex("byPeriod", q => q.eq("scoringPeriod", firstHalfPeriod)).collect(),
      ctx.db.query("mda_stakeholder_data").withIndex("byPeriod", q => q.eq("scoringPeriod", secondHalfPeriod)).collect(),
      ctx.db.query("mda_stakeholder_data").withIndex("byPeriod", q => q.eq("scoringPeriod", fullYearPeriod)).collect()
    ]);
    const stakeholderData = [...stakeholderFirstHalf, ...stakeholderSecondHalf, ...stakeholderFullYear];

    const [transparencyFirstHalf, transparencySecondHalf, transparencyFullYear] = await Promise.all([
      ctx.db.query("mda_transparency_data").withIndex("byPeriod", q => q.eq("scoringPeriod", firstHalfPeriod)).collect(),
      ctx.db.query("mda_transparency_data").withIndex("byPeriod", q => q.eq("scoringPeriod", secondHalfPeriod)).collect(),
      ctx.db.query("mda_transparency_data").withIndex("byPeriod", q => q.eq("scoringPeriod", fullYearPeriod)).collect()
    ]);
    const transparencyData = [...transparencyFirstHalf, ...transparencySecondHalf, ...transparencyFullYear];

    const [reportGovResFirstHalf, reportGovResSecondHalf, reportGovResFullYear] = await Promise.all([
      ctx.db.query("mda_reportgov_data").withIndex("byPeriod", q => q.eq("scoringPeriod", firstHalfPeriod)).collect(),
      ctx.db.query("mda_reportgov_data").withIndex("byPeriod", q => q.eq("scoringPeriod", secondHalfPeriod)).collect(),
      ctx.db.query("mda_reportgov_data").withIndex("byPeriod", q => q.eq("scoringPeriod", fullYearPeriod)).collect()
    ]);
    const reportGovResolutionData = [...reportGovResFirstHalf, ...reportGovResSecondHalf, ...reportGovResFullYear];

    const [monthlyReportFirstHalf, monthlyReportSecondHalf, monthlyReportFullYear] = await Promise.all([
      ctx.db.query("mda_monthly_report_data").withIndex("byPeriod", q => q.eq("scoringPeriod", firstHalfPeriod)).collect(),
      ctx.db.query("mda_monthly_report_data").withIndex("byPeriod", q => q.eq("scoringPeriod", secondHalfPeriod)).collect(),
      ctx.db.query("mda_monthly_report_data").withIndex("byPeriod", q => q.eq("scoringPeriod", fullYearPeriod)).collect()
    ]);
    const monthlyReportData = [...monthlyReportFirstHalf, ...monthlyReportSecondHalf, ...monthlyReportFullYear];

    const [timelinessFirstHalf, timelinessSecondHalf, timelinessFullYear] = await Promise.all([
      ctx.db.query("mda_timeliness_data").withIndex("byPeriod", q => q.eq("scoringPeriod", firstHalfPeriod)).collect(),
      ctx.db.query("mda_timeliness_data").withIndex("byPeriod", q => q.eq("scoringPeriod", secondHalfPeriod)).collect(),
      ctx.db.query("mda_timeliness_data").withIndex("byPeriod", q => q.eq("scoringPeriod", fullYearPeriod)).collect()
    ]);
    const timelinessData = [...timelinessFirstHalf, ...timelinessSecondHalf, ...timelinessFullYear];

    const [toutingRentseekingFirstHalf, toutingRentseekingSecondHalf, toutingRentseekingFullYear] = await Promise.all([
      ctx.db.query("mda_touting_rentseeking_data").withIndex("byPeriod", q => q.eq("scoringPeriod", firstHalfPeriod)).collect(),
      ctx.db.query("mda_touting_rentseeking_data").withIndex("byPeriod", q => q.eq("scoringPeriod", secondHalfPeriod)).collect(),
      ctx.db.query("mda_touting_rentseeking_data").withIndex("byPeriod", q => q.eq("scoringPeriod", fullYearPeriod)).collect()
    ]);
    const toutingRentseekingData = [...toutingRentseekingFirstHalf, ...toutingRentseekingSecondHalf, ...toutingRentseekingFullYear];

    // Dynamic Others Data (2026+)
    const [othersFirstHalf, othersSecondHalf, othersFullYear] = await Promise.all([
      ctx.db.query("saved_others_data").withIndex("byPeriod", q => q.eq("scoringPeriod", firstHalfPeriod)).collect(),
      ctx.db.query("saved_others_data").withIndex("byPeriod", q => q.eq("scoringPeriod", secondHalfPeriod)).collect(),
      ctx.db.query("saved_others_data").withIndex("byPeriod", q => q.eq("scoringPeriod", fullYearPeriod)).collect()
    ]);
    const othersData = [...othersFirstHalf, ...othersSecondHalf, ...othersFullYear];

    // Dynamic Penalties Data (2026+)
    const [penaltiesFirstHalf, penaltiesSecondHalf, penaltiesFullYear] = await Promise.all([
      ctx.db.query("saved_penalties_data").withIndex("byPeriod", q => q.eq("scoringPeriod", firstHalfPeriod)).collect(),
      ctx.db.query("saved_penalties_data").withIndex("byPeriod", q => q.eq("scoringPeriod", secondHalfPeriod)).collect(),
      ctx.db.query("saved_penalties_data").withIndex("byPeriod", q => q.eq("scoringPeriod", fullYearPeriod)).collect()
    ]);
    const penaltiesData = [...penaltiesFirstHalf, ...penaltiesSecondHalf, ...penaltiesFullYear];

    // Dynamic Bonuses Data (2026+)
    const [bonusesFirstHalf, bonusesSecondHalf, bonusesFullYear] = await Promise.all([
      ctx.db.query("saved_bonuses_data").withIndex("byPeriod", q => q.eq("scoringPeriod", firstHalfPeriod)).collect(),
      ctx.db.query("saved_bonuses_data").withIndex("byPeriod", q => q.eq("scoringPeriod", secondHalfPeriod)).collect(),
      ctx.db.query("saved_bonuses_data").withIndex("byPeriod", q => q.eq("scoringPeriod", fullYearPeriod)).collect()
    ]);
    const bonusesData = [...bonusesFirstHalf, ...bonusesSecondHalf, ...bonusesFullYear];

    // Group data by MDA name
    const mdaDataMap: { [key: string]: any } = {};

    // Initialize all MDAs
    uniqueMdaNames.forEach(name => {
      mdaDataMap[name] = {
        mdaName: name,
        sla: null,
        mysteryShopping: null,
        controversial: null,
        toutingRentseeking: null,
        innovation: null,
        stakeholder: null,
        transparency: null,
        reportGovResolution: null,
        monthlyReport: null,
        timeliness: null,
        others: null,
        penalties: null,
        bonuses: null
      };
    });

    // Process SLA data (month-based, sum and scale by 30/12)
    const slaByMda: { [key: string]: any[] } = {};
    slaData.forEach(data => {
      const key = canonicalizeMdaName(data.mdaName);
      if (!slaByMda[key]) slaByMda[key] = [];
      slaByMda[key].push(data);
    });

    Object.entries(slaByMda).forEach(([rawMdaName, dataList]) => {
      const mdaName = canonicalizeMdaName(rawMdaName.trim());
      if (!mdaDataMap[mdaName]) {
        mdaDataMap[mdaName] = { mdaName, sla: null, mysteryShopping: null, controversial: null, toutingRentseeking: null, innovation: null, stakeholder: null, transparency: null, reportGovResolution: null, monthlyReport: null, timeliness: null, others: null, penalties: null, bonuses: null };
      }

      // Count unique months across both halves
      const allMonthKeys = new Set<string>();
      dataList.forEach(d => {
        if (d.monthlySlaData && typeof d.monthlySlaData === 'object') {
          Object.keys(d.monthlySlaData).forEach(key => {
            const monthData = d.monthlySlaData[key];
            if (monthData && ((monthData.method === 'file' && monthData.overallPercentage !== null) || (monthData.method === 'rating' && monthData.rating > 0))) {
              allMonthKeys.add(key);
            }
          });
        }
      });

      const slaMaxPoints = efficiencyConfig?.slaPoints ?? 5;
      const slaTotalMonths = efficiencyConfig?.totalMonths ?? 12;
      const pointsPerMonth = slaMaxPoints / slaTotalMonths;

      // Expected months for the scoring year (from efficiency period when configured).
      const expectedMonths: Array<{ month: number; year: number; monthName: string; monthKey: string }> = [];
      if (efficiencyConfig) {
        const startMonth = getMonthNumber(efficiencyConfig.startMonth);
        let iterYear = efficiencyConfig.startYear;
        let iterMonth = startMonth;
        for (let i = 0; i < (efficiencyConfig.totalMonths || 12); i++) {
          expectedMonths.push({
            month: iterMonth,
            year: iterYear,
            monthName: MONTH_NAMES[iterMonth] ?? `Month ${iterMonth + 1}`,
            monthKey: `${iterYear}-${iterMonth}`,
          });
          iterMonth++;
          if (iterMonth > 11) {
            iterMonth = 0;
            iterYear++;
          }
        }
      } else {
        for (let month = 0; month < 12; month++) {
          expectedMonths.push({
            month,
            year,
            monthName: MONTH_NAMES[month] ?? `Month ${month + 1}`,
            monthKey: `${year}-${month}`,
          });
        }
      }

      const mergedMonthly = mergeMonthlySlaData(dataList);

      // Same SLA total as admin ScoringTab / lib/slaScoreMath (month.score is
      // already BFA points — never re-scale as if it were a 0–5 raw score).
      const monthsToSum =
        expectedMonths.length > 0
          ? expectedMonths
          : Object.keys(mergedMonthly)
              .filter((k) => !k.startsWith("__"))
              .map((monthKey) => {
                const [y, m] = monthKey.split("-").map(Number);
                return {
                  month: m,
                  year: y,
                  monthName: MONTH_NAMES[m] ?? monthKey,
                  monthKey,
                };
              });

      let { totalScore: finalScore, monthsWithData: totalMonthsWithData } =
        computeSlaTotalFromMonthly({
          monthlySlaData: mergedMonthly,
          monthKeys: monthsToSum.map((m) => m.monthKey),
          pointsPerMonth,
          slaMaxPoints,
        });

      if (totalMonthsWithData === 0) {
        // Fallback: saved row total (already on the same points scale as admin).
        const fullYear = dataList.find((d) => d.scoringPeriod === String(year));
        const primary = fullYear || dataList[0];
        finalScore = primary?.totalScore || 0;
        totalMonthsWithData =
          allMonthKeys.size ||
          primary?.monthsWithData ||
          dataList.reduce((sum, d) => sum + (d.monthsWithData || 0), 0);
        finalScore = Math.min(Math.round(finalScore * 100) / 100, slaMaxPoints);
      }

      const monthStatuses = buildSlaMonthStatuses(
        mergedMonthly,
        expectedMonths,
        slaMaxPoints,
      );
      const includeMissingIssues =
        monthStatuses.some((month) => {
          const entry = mergedMonthly[month.monthKey] as { check?: { status?: string } } | undefined;
          return Boolean(entry?.check?.status);
        }) ||
        monthStatuses.filter((month) => mergedMonthly[month.monthKey]).length >=
          Math.max(3, Math.ceil(expectedMonths.length * 0.35));
      const monthIssues = slaIssuesFromStatuses(monthStatuses, includeMissingIssues);

      mdaDataMap[mdaName].sla = {
        score: finalScore,
        monthsWithData: totalMonthsWithData,
        totalMonths: slaTotalMonths,
        maxPossibleScore: slaMaxPoints,
        pointsPerMonth,
        monthIssues,
        monthStatuses,
      };
    });

    // Process Mystery Shopping (average across both halves)
    const mysteryByMda: { [key: string]: any[] } = {};
    mysteryData.forEach(data => {
      const key = canonicalizeMdaName(data.mdaName);
      if (!mysteryByMda[key]) mysteryByMda[key] = [];
      mysteryByMda[key].push(data);
    });

    Object.entries(mysteryByMda).forEach(([rawMdaName, dataList]) => {
      const mdaName = canonicalizeMdaName(rawMdaName.trim());
      if (!mdaDataMap[mdaName]) {
        mdaDataMap[mdaName] = { mdaName, sla: null, mysteryShopping: null, controversial: null, innovation: null, stakeholder: null, transparency: null, reportGovResolution: null, monthlyReport: null, timeliness: null, others: null, penalties: null, bonuses: null };
      }

      const avgScore = dataList.reduce((sum, d) => sum + (d.totalScore || 0), 0) / dataList.length;
      const avgPercentage = dataList.reduce((sum, d) => sum + (d.percentage || 0), 0) / dataList.length;

      // Complete only when every configured question for the chosen type has a rating
      // on every saved period row (so MDAs don't treat a partial save as final).
      const complete = dataList.every((d) => {
        const typeId = String(d.mysteryType || "");
        let typeQuestions = uniqueMysteryQuestions.filter((q) => q.typeId === typeId);
        // Fallback: some older rows store typeName instead of typeId
        if (typeQuestions.length === 0) {
          typeQuestions = uniqueMysteryQuestions.filter(
            (q) => String(q.typeId).toLowerCase() === typeId.toLowerCase()
          );
        }
        if (typeQuestions.length === 0) {
          // Can't verify against config — treat as NOT fully scored.
          return false;
        }
        const ratings = (d.ratings || {}) as Record<string, unknown>;
        return typeQuestions.every((q) =>
          Object.prototype.hasOwnProperty.call(ratings, q.questionId)
        );
      });

      const typeMax = (() => {
        const typeId = dataList[0]?.mysteryType;
        if (!typeId) return mysteryTotal;
        const sum = uniqueMysteryQuestions
          .filter((q) => q.typeId === typeId)
          .reduce((s, q) => s + (q.weight || 0), 0);
        return sum > 0 ? sum : mysteryTotal;
      })();

      // Per-question contribution for the public tracker (from the latest/full-year row).
      const primaryMystery = dataList.find((d) => d.scoringPeriod === fullYearPeriod) || dataList[0];
      const mysteryTypeId = String(primaryMystery?.mysteryType || "");
      let typeQuestions = uniqueMysteryQuestions.filter((q) => q.typeId === mysteryTypeId);
      if (typeQuestions.length === 0 && mysteryTypeId) {
        typeQuestions = uniqueMysteryQuestions.filter(
          (q) => String(q.typeId).toLowerCase() === mysteryTypeId.toLowerCase()
        );
      }
      const ratings = (primaryMystery?.ratings || {}) as Record<string, number>;
      const weightSum = typeQuestions.reduce((s, q) => s + (q.weight || 0), 0);
      const questionLines =
        weightSum > 0
          ? typeQuestions
              .slice()
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((q) => {
                const rating = Number(ratings[q.questionId]) || 0;
                const weight = q.weight || 0;
                const contribution =
                  q.answerType === "yes_no" ? rating * weight : (rating / 10) * weight;
                const score = (contribution / weightSum) * typeMax;
                return {
                  label: q.questionText || q.questionId,
                  score,
                  maxPoints: (weight / weightSum) * typeMax,
                };
              })
          : [];

      mdaDataMap[mdaName].mysteryShopping = {
        score: avgScore,
        percentage: avgPercentage,
        maxPossibleScore: typeMax,
        complete,
        questionLines,
      };
    });

    // Process Controversial (average across both halves)
    const controversialByMda: { [key: string]: any[] } = {};
    controversialData.forEach(data => {
      const key = canonicalizeMdaName(data.mdaName);
      if (!controversialByMda[key]) controversialByMda[key] = [];
      controversialByMda[key].push(data);
    });

    Object.entries(controversialByMda).forEach(([rawMdaName, dataList]) => {
      const mdaName = canonicalizeMdaName(rawMdaName.trim());
      if (!mdaDataMap[mdaName]) {
        mdaDataMap[mdaName] = { mdaName, sla: null, mysteryShopping: null, controversial: null, innovation: null, stakeholder: null, transparency: null, reportGovResolution: null, monthlyReport: null, timeliness: null, others: null, penalties: null, bonuses: null };
      }

      const avgScore = dataList.reduce((sum, d) => sum + (d.score || 0), 0) / dataList.length;

      mdaDataMap[mdaName].controversial = {
        score: avgScore,
        maxPossibleScore: 5
      };
    });

    // Process Touting & Rentseeking (average across both halves)
    const toutingRentseekingByMda: { [key: string]: any[] } = {};
    toutingRentseekingData.forEach(data => {
      const key = canonicalizeMdaName(data.mdaName);
      if (!toutingRentseekingByMda[key]) toutingRentseekingByMda[key] = [];
      toutingRentseekingByMda[key].push(data);
    });

    Object.entries(toutingRentseekingByMda).forEach(([rawMdaName, dataList]) => {
      const mdaName = canonicalizeMdaName(rawMdaName.trim());
      if (!mdaDataMap[mdaName]) {
        mdaDataMap[mdaName] = { mdaName, sla: null, mysteryShopping: null, controversial: null, toutingRentseeking: null, innovation: null, stakeholder: null, transparency: null, reportGovResolution: null, monthlyReport: null, timeliness: null, others: null, penalties: null, bonuses: null };
      }

      const avgScore = dataList.reduce((sum, d) => sum + (d.score || 0), 0) / dataList.length;

      mdaDataMap[mdaName].toutingRentseeking = {
        score: avgScore,
        maxPossibleScore: 10
      };
    });

    // Process Innovation (average across both halves)
    const innovationByMda: { [key: string]: any[] } = {};
    innovationData.forEach(data => {
      const key = canonicalizeMdaName(data.mdaName);
      if (!innovationByMda[key]) innovationByMda[key] = [];
      innovationByMda[key].push(data);
    });

    Object.entries(innovationByMda).forEach(([rawMdaName, dataList]) => {
      const mdaName = canonicalizeMdaName(rawMdaName.trim());
      if (!mdaDataMap[mdaName]) {
        mdaDataMap[mdaName] = { mdaName, sla: null, mysteryShopping: null, controversial: null, innovation: null, stakeholder: null, transparency: null, reportGovResolution: null, monthlyReport: null, timeliness: null, others: null, penalties: null, bonuses: null };
      }

      const avgScore = dataList.reduce((sum, d) => sum + (d.score || 0), 0) / dataList.length;

      mdaDataMap[mdaName].innovation = {
        score: avgScore,
        maxPossibleScore: 5
      };
    });

    // Process Stakeholder (average across both halves)
    const stakeholderByMda: { [key: string]: any[] } = {};
    stakeholderData.forEach(data => {
      const key = canonicalizeMdaName(data.mdaName);
      if (!stakeholderByMda[key]) stakeholderByMda[key] = [];
      stakeholderByMda[key].push(data);
    });

    Object.entries(stakeholderByMda).forEach(([rawMdaName, dataList]) => {
      const mdaName = canonicalizeMdaName(rawMdaName.trim());
      if (!mdaDataMap[mdaName]) {
        mdaDataMap[mdaName] = { mdaName, sla: null, mysteryShopping: null, controversial: null, innovation: null, stakeholder: null, transparency: null, reportGovResolution: null, monthlyReport: null, timeliness: null, others: null, penalties: null, bonuses: null };
      }

      const avgScore = dataList.reduce((sum, d) => sum + (d.score || 0), 0) / dataList.length;

      mdaDataMap[mdaName].stakeholder = {
        score: avgScore,
        maxPossibleScore: 10
      };
    });

    // Process Transparency (average across both halves, optional metric)
    const transparencyByMda: { [key: string]: any[] } = {};
    transparencyData.forEach(data => {
      const key = canonicalizeMdaName(data.mdaName);
      if (!transparencyByMda[key]) transparencyByMda[key] = [];
      transparencyByMda[key].push(data);
    });

    Object.entries(transparencyByMda).forEach(([rawMdaName, dataList]) => {
      const mdaName = canonicalizeMdaName(rawMdaName.trim());
      if (!mdaDataMap[mdaName]) {
        mdaDataMap[mdaName] = {
          mdaName,
          sla: null,
          mysteryShopping: null,
          controversial: null,
          innovation: null,
          stakeholder: null,
          transparency: null,
          reportGovResolution: null,
          monthlyReport: null,
          timeliness: null
        };
      }

      const activeEntries = dataList.filter((entry) => entry && !entry.isSkipped);
      const totalScore = activeEntries.reduce(
        (sum, entry) => sum + (entry?.score || 0),
        0
      );
      const avgScore =
        activeEntries.length > 0 ? totalScore / activeEntries.length : 0;
      const isSkipped = activeEntries.length === 0;
      const hasMirrored = dataList.some(
        (entry) => entry?.responses && entry.responses.__copiedFrom
      );

      mdaDataMap[mdaName].transparency = {
        score: avgScore,
        maxPossibleScore: 10,
        isSkipped,
        hasMirrored,
        entries: dataList
      };
    });

    // Process Report Gov Resolution.
    // Admin always shows a *live* recalculation from tickets; the tracker used to
    // show the last *saved* score, which drifts (e.g. 15.91 vs 19.91). For
    // automatic (non-skip / non-manual) rows we recompute from live tickets here
    // with the same formula as getPeriodTicketData + computeReportGovScore.
    const reportGovResByMda: { [key: string]: any[] } = {};
    reportGovResolutionData.forEach(data => {
      const key = canonicalizeMdaName(data.mdaName);
      if (!reportGovResByMda[key]) reportGovResByMda[key] = [];
      reportGovResByMda[key].push(data);
    });

    const reportGovMaxPoints = efficiencyConfig?.reportGovPoints ?? 20;
    const ticketWindow = await resolveScoringWindow(ctx, fullYearPeriod, "currentMonth");
    const useAdjustedRate = ticketWindow.targetYear >= 2026;
    const reportGovSystem = useAdjustedRate
      ? await loadSystemResolutionContext(
          ctx,
          ticketWindow.targetYear,
          ticketWindow.startDate,
          ticketWindow.endDate,
        )
      : null;

    const needsLiveReportGov = Object.values(reportGovResByMda).some((dataList) => {
      const primary =
        dataList.find((d) => d.scoringPeriod === fullYearPeriod) || dataList[0];
      return primary && !primary.isSkipped && !primary.isManual;
    });

    const ticketsByMdaId = new Map<string, Array<{
      createdAt: number;
      updatedAt: number;
      status: string;
      firstResponseAt?: number;
      assignedMDA?: Id<"mdas">;
    }>>();
    const mdaDocByCanonical = new Map<string, Doc<"mdas">>();
    let allMdaDocsForReportGov: Doc<"mdas">[] = [];

    if (needsLiveReportGov) {
      const [allMdaDocs, periodTickets] = await Promise.all([
        ctx.db.query("mdas").collect(),
        ctx.db
          .query("tickets")
          .withIndex("byCreatedAt", (q) =>
            q.gte("createdAt", ticketWindow.startDate).lte("createdAt", ticketWindow.endDate),
          )
          .collect(),
      ]);
      allMdaDocsForReportGov = allMdaDocs;
      for (const mda of allMdaDocs) {
        mdaDocByCanonical.set(canonicalizeMdaName(mda.name), mda);
      }
      for (const ticket of periodTickets) {
        if (!ticket.assignedMDA) continue;
        const key = String(ticket.assignedMDA);
        const bucket = ticketsByMdaId.get(key);
        if (bucket) bucket.push(ticket);
        else ticketsByMdaId.set(key, [ticket]);
      }
    }

    const resolveMdaDocForReportGov = (name: string): Doc<"mdas"> | null => {
      const canonical = canonicalizeMdaName(name);
      const direct = mdaDocByCanonical.get(canonical);
      if (direct) return direct;
      return (
        allMdaDocsForReportGov.find(
          (m) => mdaNamesMatch(m.name, name) || mdaNamesMatch(m.name, canonical),
        ) ?? null
      );
    };

    Object.entries(reportGovResByMda).forEach(([rawMdaName, dataList]) => {
      const mdaName = canonicalizeMdaName(rawMdaName.trim());
      if (!mdaDataMap[mdaName]) {
        mdaDataMap[mdaName] = { mdaName, sla: null, mysteryShopping: null, controversial: null, innovation: null, stakeholder: null, transparency: null, reportGovResolution: null, monthlyReport: null, timeliness: null, others: null, penalties: null, bonuses: null };
      }

      const firstHalf = dataList.find(d => d.scoringPeriod?.includes("1st Half"));
      const secondHalf = dataList.find(d => d.scoringPeriod?.includes("2nd Half"));
      const fullYear = dataList.find(d => d.scoringPeriod === String(year));
      const primary = fullYear || secondHalf || firstHalf || dataList[0];

      const hasFirstHalfData = firstHalf && firstHalf.score !== undefined && firstHalf.score !== null;
      const hasSecondHalfData = secondHalf && secondHalf.score !== undefined && secondHalf.score !== null;
      const isSkipped = !!(primary?.isSkipped || fullYear?.isSkipped || firstHalf?.isSkipped || secondHalf?.isSkipped);
      const isManual = !!(primary?.isManual);

      let totalTickets = 0;
      let resolvedTickets = 0;
      let avgResponseTime = 0;
      let avgResolutionTime = 0;
      let resolutionRate = 0;
      let adjustedResolutionRate: number | null = null;
      let avgScore = 0;

      if (isSkipped) {
        avgScore = 0;
        totalTickets = primary?.totalTickets || 0;
        resolvedTickets = primary?.resolvedTickets || 0;
        avgResponseTime = primary?.averageResponseTime || 0;
        avgResolutionTime = primary?.averageResolutionTime || 0;
        resolutionRate = primary?.resolutionRate || 0;
        adjustedResolutionRate = primary?.adjustedResolutionRate ?? null;
      } else if (isManual) {
        // Respect explicit manual saves.
        avgScore = primary?.score || 0;
        totalTickets = primary?.totalTickets || 0;
        resolvedTickets = primary?.resolvedTickets || 0;
        avgResponseTime = primary?.averageResponseTime || 0;
        avgResolutionTime = primary?.averageResolutionTime || 0;
        resolutionRate = primary?.resolutionRate || 0;
        adjustedResolutionRate = primary?.adjustedResolutionRate ?? null;
      } else if (needsLiveReportGov) {
        // Same live path as admin ScoringTab / getPeriodTicketData.
        const mdaDoc = resolveMdaDocForReportGov(primary?.mdaName || rawMdaName || mdaName);
        const mdaTickets = mdaDoc ? (ticketsByMdaId.get(String(mdaDoc._id)) || []) : [];
        const stats = computeTicketStats(
          mdaTickets,
          ticketWindow.startDate,
          ticketWindow.endDate,
        );
        totalTickets = stats.totalTickets;
        resolvedTickets = stats.resolvedTickets;
        resolutionRate = stats.resolutionRate;
        avgResponseTime = stats.averageResponseTime;
        avgResolutionTime = stats.averageResolutionTime;
        adjustedResolutionRate = reportGovSystem
          ? calculateAdjustedResolutionRate({
              complaintsReceived: stats.totalTickets,
              resolutionRate: stats.resolutionRate,
              minimumThreshold: reportGovSystem.minimumThreshold,
              systemAverageResolutionRate: reportGovSystem.systemAverageResolutionRate,
            })
          : null;
        avgScore = computeReportGovScore(
          { ...stats, adjustedResolutionRate },
          reportGovMaxPoints,
        );
      } else if (fullYear && fullYear.score !== undefined && fullYear.score !== null) {
        avgScore = fullYear.score;
        totalTickets = fullYear.totalTickets || 0;
        resolvedTickets = fullYear.resolvedTickets || 0;
        resolutionRate = fullYear.resolutionRate || 0;
        avgResponseTime = fullYear.averageResponseTime || 0;
        avgResolutionTime = fullYear.averageResolutionTime || 0;
        adjustedResolutionRate = fullYear.adjustedResolutionRate ?? null;
      } else if (hasFirstHalfData && hasSecondHalfData) {
        avgScore = ((firstHalf.score || 0) + (secondHalf.score || 0)) / 2;
        totalTickets = (firstHalf.totalTickets || 0) + (secondHalf.totalTickets || 0);
        resolvedTickets = (firstHalf.resolvedTickets || 0) + (secondHalf.resolvedTickets || 0);
        resolutionRate = totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0;
        avgResponseTime =
          ((firstHalf.averageResponseTime || 0) + (secondHalf.averageResponseTime || 0)) / 2;
        avgResolutionTime =
          ((firstHalf.averageResolutionTime || 0) + (secondHalf.averageResolutionTime || 0)) / 2;
        adjustedResolutionRate =
          firstHalf.adjustedResolutionRate ?? secondHalf.adjustedResolutionRate ?? null;
      } else if (hasSecondHalfData) {
        avgScore = (secondHalf.score || 0) / 2;
        totalTickets = secondHalf.totalTickets || 0;
        resolvedTickets = secondHalf.resolvedTickets || 0;
        resolutionRate = secondHalf.resolutionRate || 0;
        avgResponseTime = secondHalf.averageResponseTime || 0;
        avgResolutionTime = secondHalf.averageResolutionTime || 0;
        adjustedResolutionRate = secondHalf.adjustedResolutionRate ?? null;
      } else if (hasFirstHalfData) {
        avgScore = (firstHalf.score || 0) / 2;
        totalTickets = firstHalf.totalTickets || 0;
        resolvedTickets = firstHalf.resolvedTickets || 0;
        resolutionRate = firstHalf.resolutionRate || 0;
        avgResponseTime = firstHalf.averageResponseTime || 0;
        avgResolutionTime = firstHalf.averageResolutionTime || 0;
        adjustedResolutionRate = firstHalf.adjustedResolutionRate ?? null;
      }

      mdaDataMap[mdaName].reportGovResolution = {
        score: Math.round(avgScore * 100) / 100,
        totalTickets,
        resolvedTickets,
        resolutionRate,
        adjustedResolutionRate,
        averageResponseTime: avgResponseTime,
        averageResolutionTime: avgResolutionTime,
        maxPossibleScore: reportGovMaxPoints,
        hasFirstHalf: !!hasFirstHalfData,
        hasSecondHalf: !!hasSecondHalfData,
        firstHalfScore: firstHalf?.score || null,
        secondHalfScore: secondHalf?.score || null,
        isSkipped,
      };
    });

    // Process Monthly Report + Timeliness.
    // Admin auto mode recalculates from reform-champion submissions (same as
    // bulk efficiency). Tracker used saved scores and could drift — recompute
    // live for non-manual rows. Manual overrides still use the saved checkboxes.
    const monthlyReportByMda: { [key: string]: any[] } = {};
    monthlyReportData.forEach(data => {
      const key = canonicalizeMdaName(data.mdaName);
      if (!monthlyReportByMda[key]) monthlyReportByMda[key] = [];
      monthlyReportByMda[key].push(data);
    });

    const timelinessByMda: { [key: string]: any[] } = {};
    timelinessData.forEach(data => {
      const key = canonicalizeMdaName(data.mdaName);
      if (!timelinessByMda[key]) timelinessByMda[key] = [];
      timelinessByMda[key].push(data);
    });

    const mrMaxPoints = efficiencyConfig?.reportSubmissionPoints ?? 2;
    const tMaxPoints = efficiencyConfig?.timelinessPoints ?? 3;
    const reportWindow = await resolveScoringWindow(ctx, fullYearPeriod, "yearToDate");
    const reportTotalMonths = reportWindow.monthsToCheck.length || efficiencyConfig?.totalMonths || 12;

    const needsLiveReports =
      Object.values(monthlyReportByMda).some((list) => !list.some((d) => d.useManual)) ||
      Object.values(timelinessByMda).some((list) => !list.some((d) => d.useManual));

    const reportsByMdaKey = new Map<string, Doc<"submitted_reports">[]>();
    if (needsLiveReports) {
      const allReports = await ctx.db
        .query("submitted_reports")
        .withIndex("byDate", (q) => q.gte("submittedAt", 0))
        .filter((q) => q.eq(q.field("role"), "reform_champion"))
        .collect();
      for (const report of filterReportsToWindow(allReports, reportWindow)) {
        const key = mdaMatchKey(report.mdaName ?? "");
        if (!key) continue;
        const bucket = reportsByMdaKey.get(key);
        if (bucket) bucket.push(report);
        else reportsByMdaKey.set(key, [report]);
      }
    }

    const formatMonthLabel = (month: number, year: number) => {
      const short = new Date(year, month, 1).toLocaleString("default", { month: "short" });
      return `${short} ${year}`;
    };

    const monthStatusesFromLive = (
      monthly: Array<{ month: string; year: number; submitted: boolean; onTime: boolean }>,
    ) =>
      monthly.map((m, i) => {
        const fromWindow = reportWindow.monthsToCheck[i];
        const monthIndex =
          fromWindow?.month ??
          MONTH_NAMES.findIndex((name) => name.toLowerCase() === m.month.toLowerCase());
        const year = fromWindow?.year ?? m.year;
        const month = monthIndex >= 0 ? monthIndex : 0;
        const status = m.onTime ? "on_time" : m.submitted ? "late" : "missing";
        return {
          monthKey: `${year}-${month}`,
          monthLabel: formatMonthLabel(month, year),
          status: status as "on_time" | "late" | "missing",
          submitted: m.submitted,
          onTime: m.onTime,
        };
      });

    const monthStatusesFromManual = (manualMap: Record<string, boolean> | undefined) => {
      const map = manualMap && typeof manualMap === "object" ? manualMap : {};
      return reportWindow.monthsToCheck.map(({ month, year }) => {
        const monthKey = `${year}-${month}`;
        const hit = map[monthKey] === true || map[`${year}-${String(month).padStart(2, "0")}`] === true;
        return {
          monthKey,
          monthLabel: formatMonthLabel(month, year),
          status: (hit ? "on_time" : "missing") as "on_time" | "late" | "missing",
          submitted: hit,
          onTime: hit,
        };
      });
    };

    const liveReportStatsFor = (mdaName: string, rawName?: string) => {
      const key =
        mdaMatchKey(mdaName) ||
        mdaMatchKey(rawName || "") ||
        mdaMatchKey(canonicalizeMdaName(mdaName));
      const reports = (key ? reportsByMdaKey.get(key) : undefined) ?? [];
      const monthly = buildMonthlyReportData(reports, reportWindow.monthsToCheck);
      const submitted = monthly.filter((m) => m.submitted).length;
      const onTime = monthly.filter((m) => m.onTime).length;
      return {
        submitted,
        onTime,
        totalMonths: reportTotalMonths,
        monthStatuses: monthStatusesFromLive(monthly),
      };
    };

    const allEfficiencyMdaKeys = new Set([
      ...Object.keys(monthlyReportByMda),
      ...Object.keys(timelinessByMda),
    ]);

    for (const rawMdaName of allEfficiencyMdaKeys) {
      const mdaName = canonicalizeMdaName(rawMdaName.trim());
      if (!mdaDataMap[mdaName]) {
        mdaDataMap[mdaName] = {
          mdaName,
          sla: null,
          mysteryShopping: null,
          controversial: null,
          innovation: null,
          stakeholder: null,
          transparency: null,
          reportGovResolution: null,
          monthlyReport: null,
          timeliness: null,
          others: null,
          penalties: null,
          bonuses: null,
        };
      }

      const monthlyList = monthlyReportByMda[rawMdaName] || monthlyReportByMda[mdaName] || [];
      const timelinessList = timelinessByMda[rawMdaName] || timelinessByMda[mdaName] || [];
      const monthlyManual = monthlyList.some((d) => d.useManual);
      const timelinessManual = timelinessList.some((d) => d.useManual);
      const needsLiveForMda = (!monthlyManual && monthlyList.length > 0) || (!timelinessManual && timelinessList.length > 0);
      const liveStats = needsLiveForMda ? liveReportStatsFor(mdaName, monthlyList[0]?.mdaName || timelinessList[0]?.mdaName) : null;

      if (monthlyList.length > 0) {
        let monthsWithData = 0;
        let score = 0;
        let monthStatuses:
          | Array<{
              monthKey: string;
              monthLabel: string;
              status: "on_time" | "late" | "missing";
              submitted: boolean;
              onTime: boolean;
            }>
          | undefined;
        if (monthlyManual) {
          const primary = monthlyList.find((d) => d.scoringPeriod === fullYearPeriod) || monthlyList[0];
          const mergedManual: Record<string, boolean> = {};
          monthlyList.forEach((d) => {
            if (d.manualMonthlyReports && typeof d.manualMonthlyReports === "object") {
              Object.assign(mergedManual, d.manualMonthlyReports);
            }
          });
          monthStatuses = monthStatusesFromManual(mergedManual).map((m) => ({
            ...m,
            // Submission metric: yes/no only (manual check = submitted).
            status: m.submitted ? "on_time" : "missing",
          }));
          monthsWithData = monthStatuses.filter((m) => m.submitted).length;
          score = proportionalScore(monthsWithData, reportTotalMonths, mrMaxPoints);
          void primary;
        } else if (liveStats) {
          monthsWithData = liveStats.submitted;
          score = proportionalScore(liveStats.submitted, liveStats.totalMonths, mrMaxPoints);
          // For submission: treat late as still submitted (green "Submitted").
          monthStatuses = liveStats.monthStatuses.map((m) => ({
            ...m,
            status: m.submitted ? ("on_time" as const) : ("missing" as const),
          }));
        } else {
          const primary = monthlyList.find((d) => d.scoringPeriod === fullYearPeriod) || monthlyList[0];
          score = primary?.score || 0;
          monthsWithData =
            typeof primary?.monthsWithData === "number"
              ? primary.monthsWithData
              : score > 0
                ? Math.round(score / (mrMaxPoints / reportTotalMonths))
                : 0;
        }
        mdaDataMap[mdaName].monthlyReport = {
          score: Math.round(score * 100) / 100,
          monthsWithData,
          totalMonths: reportTotalMonths,
          maxPossibleScore: mrMaxPoints,
          monthStatuses,
        };
      }

      if (timelinessList.length > 0) {
        let monthsWithData = 0;
        let score = 0;
        let monthStatuses:
          | Array<{
              monthKey: string;
              monthLabel: string;
              status: "on_time" | "late" | "missing";
              submitted: boolean;
              onTime: boolean;
            }>
          | undefined;
        if (timelinessManual) {
          const mergedManual: Record<string, boolean> = {};
          timelinessList.forEach((d) => {
            if (d.manualTimeliness && typeof d.manualTimeliness === "object") {
              Object.assign(mergedManual, d.manualTimeliness);
            }
          });
          monthStatuses = monthStatusesFromManual(mergedManual);
          monthsWithData = monthStatuses.filter((m) => m.onTime).length;
          score = proportionalScore(monthsWithData, reportTotalMonths, tMaxPoints);
        } else if (liveStats) {
          monthsWithData = liveStats.onTime;
          score = proportionalScore(liveStats.onTime, liveStats.totalMonths, tMaxPoints);
          monthStatuses = liveStats.monthStatuses;
        } else {
          const primary = timelinessList.find((d) => d.scoringPeriod === fullYearPeriod) || timelinessList[0];
          score = primary?.score || 0;
          monthsWithData =
            typeof primary?.monthsWithData === "number"
              ? primary.monthsWithData
              : score > 0
                ? Math.round(score / (tMaxPoints / reportTotalMonths))
                : 0;
        }
        mdaDataMap[mdaName].timeliness = {
          score: Math.round(score * 100) / 100,
          monthsWithData,
          totalMonths: reportTotalMonths,
          maxPossibleScore: tMaxPoints,
          monthStatuses,
        };
      }
    }

    // Process Others (Dynamic for 2026+)
    const othersByMda: { [key: string]: any[] } = {};
    othersData.forEach(data => {
      const key = canonicalizeMdaName(data.mdaName);
      if (!othersByMda[key]) othersByMda[key] = [];
      othersByMda[key].push(data);
    });

    Object.entries(othersByMda).forEach(([rawMdaName, dataList]) => {
      const mdaName = canonicalizeMdaName(rawMdaName.trim());
      if (!mdaDataMap[mdaName]) {
        mdaDataMap[mdaName] = { mdaName, sla: null, mysteryShopping: null, controversial: null, innovation: null, stakeholder: null, transparency: null, reportGovResolution: null, monthlyReport: null, timeliness: null, others: null, penalties: null, bonuses: null };
      }

      // Several rows can exist for one MDA (half-year, full year, or a renamed
      // spelling). Merge items that were actually entered. A later row's
      // placeholder zeros must not hide an earlier Stakeholder or Transparency score.
      const { scores, values } = mergeOthersSavedRows(dataList);
      const beepaMax = beepaMaxPointsForMda(mdaName);
      for (const item of uniqueTransparencyItems as Array<{ itemId: string; itemName?: string }>) {
        const nameKey = String(item.itemName || "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, " ")
          .trim();
        if (nameKey !== "beepa" && !nameKey.includes("beepa")) continue;
        const raw = Number(scores[item.itemId]) || 0;
        scores[item.itemId] = Math.min(raw, beepaMax);
      }
      const scoreFromItems = Object.values(scores).reduce(
        (sum, value) => sum + (Number(value) || 0),
        0,
      );

      mdaDataMap[mdaName].others = {
        score: Math.max(0, Math.round(scoreFromItems * 100) / 100),
        scores,
        values,
        beepaMax,
      };
    });

    // Process Penalties (Dynamic for 2026+)
    const penaltiesByMda: { [key: string]: any[] } = {};
    penaltiesData.forEach(data => {
      const key = canonicalizeMdaName(data.mdaName);
      if (!penaltiesByMda[key]) penaltiesByMda[key] = [];
      penaltiesByMda[key].push(data);
    });

    Object.entries(penaltiesByMda).forEach(([rawMdaName, dataList]) => {
      const mdaName = canonicalizeMdaName(rawMdaName.trim());
      if (!mdaDataMap[mdaName]) {
        mdaDataMap[mdaName] = { mdaName, sla: null, mysteryShopping: null, controversial: null, innovation: null, stakeholder: null, transparency: null, reportGovResolution: null, monthlyReport: null, timeliness: null, others: null, penalties: null, bonuses: null };
      }

      // saved_penalties_data has totalPenalty (negative).
      const avgScore = dataList.reduce((sum, d) => sum + (d.totalPenalty || 0), 0) / dataList.length;

      mdaDataMap[mdaName].penalties = {
        score: avgScore,
        values: dataList[0]?.values || {}
      };
    });

    // Process Bonuses (Dynamic for 2026+)
    const bonusesByMda: { [key: string]: any[] } = {};
    bonusesData.forEach(data => {
      const key = canonicalizeMdaName(data.mdaName);
      if (!bonusesByMda[key]) bonusesByMda[key] = [];
      bonusesByMda[key].push(data);
    });

    Object.entries(bonusesByMda).forEach(([rawMdaName, dataList]) => {
      const mdaName = canonicalizeMdaName(rawMdaName.trim());
      if (!mdaDataMap[mdaName]) {
        mdaDataMap[mdaName] = { mdaName, sla: null, mysteryShopping: null, controversial: null, innovation: null, stakeholder: null, transparency: null, reportGovResolution: null, monthlyReport: null, timeliness: null, others: null, penalties: null, bonuses: null };
      }

      const avgScore = dataList.reduce((sum, d) => sum + (d.totalBonus || 0), 0) / dataList.length;

      mdaDataMap[mdaName].bonuses = {
        score: avgScore,
        values: dataList[0]?.values || {}
      };
    });

    // Convert to array and calculate total scores
    const allMdasProcessed = Object.values(mdaDataMap).map((mda: any) => {
      const parts = splitMdaNameForMatch(mda.mdaName || "");
      const excludedMetrics =
        exclusionMap.get(normalizeMdaKey(mda.mdaName || "")) ||
        (parts.fullName ? exclusionMap.get(parts.fullName) : undefined) ||
        (parts.abbr ? exclusionMap.get(parts.abbr) : undefined) ||
        new Set<string>();
      const isExcluded = (metricKey: string) => excludedMetrics.has(metricKey);
      const isOthersItemExcluded = (itemId: string) =>
        excludedMetrics.has("others") || excludedMetrics.has(`others:${itemId}`);

      const slaScore = mda.sla?.score || 0;
      const mysteryScore = mda.mysteryShopping?.score || 0;
      // Legacy metrics
      const controversialScore = mda.controversial?.score || 0;
      const toutingRentseekingScore = mda.toutingRentseeking?.score || 0;
      const innovationScore = mda.innovation?.score || 0;
      const stakeholderScore = mda.stakeholder?.score || 0;
      const transparencyScore = mda.transparency?.score || 0;

      // Dynamic metrics (2026+)
      const othersScore = mda.others?.score || 0;
      const penaltiesScore = mda.penalties?.score || 0;
      const bonusesScore = mda.bonuses?.score || 0;

      const reportGovResScore = mda.reportGovResolution?.score || 0;
      const monthlyReportScore = mda.monthlyReport?.score || 0;
      const timelinessScore = mda.timeliness?.score || 0;

      const effectiveSlaScore = isExcluded("sla") ? 0 : slaScore;
      const effectiveMysteryScore = isExcluded("mystery") ? 0 : mysteryScore;
      const effectiveReportGovScore = isExcluded("reportGov") ? 0 : reportGovResScore;
      const effectiveMonthlyReportScore = isExcluded("reportSubmission") ? 0 : monthlyReportScore;
      const effectiveTimelinessScore = isExcluded("timeliness") ? 0 : timelinessScore;
      let effectiveOthersScore = isExcluded("others") ? 0 : othersScore;
      if (!isExcluded("others") && mda.others?.scores && Array.isArray(uniqueTransparencyItems)) {
        const excludedOthersScore = uniqueTransparencyItems.reduce((sum: number, item: any) => {
          if (!isOthersItemExcluded(item.itemId)) return sum;
          return sum + (mda.others?.scores?.[item.itemId] || 0);
        }, 0);
        effectiveOthersScore = Math.max(0, effectiveOthersScore - excludedOthersScore);
      }

      const effectiveInnovationScore = isExcluded("innovation") ? 0 : innovationScore;
      const effectiveStakeholderScore = isExcluded("stakeholder") ? 0 : stakeholderScore;
      const effectiveTransparencyScore = isExcluded("transparency") ? 0 : transparencyScore;

      const effectiveControversialScore = isExcluded("controversial") ? 0 : controversialScore;
      const effectiveToutingScore = isExcluded("toutingRentseeking") ? 0 : toutingRentseekingScore;
      const effectivePenaltiesScore = isExcluded("penalties") ? 0 : penaltiesScore;
      const effectiveBonusesScore = isExcluded("bonuses") ? 0 : bonusesScore;

      const totalGrossScore = effectiveSlaScore + effectiveMysteryScore +
        (year < 2026 ? (effectiveInnovationScore + effectiveStakeholderScore + effectiveTransparencyScore) : 0) +
        effectiveReportGovScore + effectiveMonthlyReportScore + effectiveTimelinessScore + effectiveOthersScore;

      const totalScore = totalGrossScore + effectivePenaltiesScore + effectiveBonusesScore + effectiveControversialScore + effectiveToutingScore;

      // Base max points should reflect active metric model even when no data exists.
      // Current model: Efficiency Bundle: SLA(5) + Mystery(40) + ReportGov(20) + ReportSubmission(2) + Timeliness(3) = 70.
      // Others: Transparency(5) + Stakeholder Engagement(5) + BEEPA(10) = 20. Total = 90 before penalties.
      let maxPossiblePoints = year >= 2026 ? 100 : 80;
      if (year >= 2026 && efficiencyConfig) {
        // Calculate dynamic total
        const efficiencyTotal = (efficiencyConfig.slaPoints || 5) +
          (efficiencyConfig.reportSubmissionPoints || 2) +
          (efficiencyConfig.reportGovPoints || 20) +
          (efficiencyConfig.timelinessPoints || 3);

        // Others is fixed at 20 (Transparency 5 + Stakeholder Engagement 5 + BEEPA 10). Mystery Shopping (40) is part of Efficiency Bundle.
        maxPossiblePoints = efficiencyTotal + mysteryTotal + othersTotal;

        if (mda.transparency?.isSkipped) {
          // Transparency items sum
          const transparencyWeight = transparencyItems.reduce((sum, i) => sum + (i.weight || 0), 0) || 10;
          maxPossiblePoints -= transparencyWeight;
        }
        if (mda.reportGovResolution?.isSkipped) {
          maxPossiblePoints -= (efficiencyConfig.reportGovPoints || 20);
        }
        if (isExcluded("sla")) maxPossiblePoints -= (efficiencyConfig.slaPoints || 5);
        if (isExcluded("reportSubmission")) maxPossiblePoints -= (efficiencyConfig.reportSubmissionPoints || 2);
        if (isExcluded("timeliness")) maxPossiblePoints -= (efficiencyConfig.timelinessPoints || 3);
        if (isExcluded("reportGov")) maxPossiblePoints -= (efficiencyConfig.reportGovPoints || 20);
        if (isExcluded("mystery")) maxPossiblePoints -= mysteryTotal;
        if (isExcluded("others")) {
          maxPossiblePoints -= othersTotal;
        } else if (Array.isArray(uniqueTransparencyItems)) {
          const excludedOthersWeight = uniqueTransparencyItems.reduce((sum: number, item: any) => {
            if (!isOthersItemExcluded(item.itemId)) return sum;
            return sum + (item.weight || 0);
          }, 0);
          maxPossiblePoints -= excludedOthersWeight;
          // Config weights BEEPA at 10; non–Super MDAs are graded /9 on the tracker.
          const hasBeepa = uniqueTransparencyItems.some((item: { itemName?: string; itemId: string }) => {
            if (isOthersItemExcluded(item.itemId)) return false;
            const nameKey = String(item.itemName || "")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, " ")
              .trim();
            return nameKey === "beepa" || nameKey.includes("beepa");
          });
          if (hasBeepa && beepaMaxPointsForMda(mda.mdaName) === BEEPA_STANDARD_MDA_MAX) {
            maxPossiblePoints -= BEEPA_SUPER_MDA_MAX - BEEPA_STANDARD_MDA_MAX;
          }
        }
      } else {
        // Legacy 2025 calculation
        if (mda.transparency?.isSkipped) {
          maxPossiblePoints -= 5;
        }
        if (mda.reportGovResolution?.isSkipped) {
          maxPossiblePoints -= 15;
        }
        if (isExcluded("sla")) maxPossiblePoints -= 5;
        if (isExcluded("mystery")) maxPossiblePoints -= 40;
        if (isExcluded("reportGov")) maxPossiblePoints -= 20;
        if (isExcluded("reportSubmission")) maxPossiblePoints -= 2;
        if (isExcluded("timeliness")) maxPossiblePoints -= 3;
        if (isExcluded("transparency")) maxPossiblePoints -= 5;
        if (isExcluded("innovation")) maxPossiblePoints -= 5;
      }
      maxPossiblePoints = Math.max(maxPossiblePoints, 0);

      const totalPercentage = maxPossiblePoints > 0 ? (totalScore / maxPossiblePoints) * 100 : 0;

      return {
        ...mda,
        totalGrossScore,
        totalScore,
        totalPercentage,
        maxPossiblePoints,
        excludedMetrics: Array.from(excludedMetrics),
        // Override nested maxPossibleScores if dynamic config exists
        sla: mda.sla ? { ...mda.sla, maxPossibleScore: efficiencyConfig?.slaPoints || 5 } : null,
        // Preserve live totalMonths from report window — do not overwrite with
        // efficiencyConfig.totalMonths (that was a source of admin/tracker drift).
        monthlyReport: mda.monthlyReport ? {
          ...mda.monthlyReport,
          maxPossibleScore:
            efficiencyConfig?.reportSubmissionPoints ||
            mda.monthlyReport.maxPossibleScore ||
            2,
          totalMonths:
            mda.monthlyReport.totalMonths ??
            efficiencyConfig?.totalMonths ??
            12,
        } : null,
        timeliness: mda.timeliness ? {
          ...mda.timeliness,
          maxPossibleScore:
            efficiencyConfig?.timelinessPoints ||
            mda.timeliness.maxPossibleScore ||
            3,
          totalMonths:
            mda.timeliness.totalMonths ??
            efficiencyConfig?.totalMonths ??
            12,
        } : null,
        reportGovResolution: mda.reportGovResolution ? {
          ...mda.reportGovResolution,
          maxPossibleScore: efficiencyConfig?.reportGovPoints || 20
        } : null,
        mysteryShopping: mda.mysteryShopping ? {
          ...mda.mysteryShopping,
          maxPossibleScore: mysteryTotal
        } : null,
      };
    });

    return {
      data: allMdasProcessed,
      efficiencyConfig
    };
  }
});

// Get all detailed scoring data for a specific MDA for a year (both halves)
export const getMdaDetailedScoringData = query({
  args: {
    mdaName: v.string(),
    year: v.number()
  },
  handler: async (ctx, { mdaName, year }) => {
    const firstHalfPeriod = `1st Half ${year}`;
    const secondHalfPeriod = `2nd Half ${year}`;
    const fullYearPeriod = String(year);

    // Fetch all data for both periods
    const [slaFirstHalf, slaSecondHalf, slaFullYear] = await Promise.all([
      ctx.db.query("mda_sla_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", firstHalfPeriod)).first(),
      ctx.db.query("mda_sla_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", secondHalfPeriod)).first(),
      ctx.db.query("mda_sla_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", fullYearPeriod)).first()
    ]);

    const [mysteryFirstHalf, mysterySecondHalf, mysteryFullYear] = await Promise.all([
      ctx.db.query("mda_mystery_shopping_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", firstHalfPeriod)).first(),
      ctx.db.query("mda_mystery_shopping_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", secondHalfPeriod)).first(),
      ctx.db.query("mda_mystery_shopping_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", fullYearPeriod)).first()
    ]);

    const [controversialFirstHalf, controversialSecondHalf, controversialFullYear] = await Promise.all([
      ctx.db.query("mda_controversial_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", firstHalfPeriod)).first(),
      ctx.db.query("mda_controversial_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", secondHalfPeriod)).first(),
      ctx.db.query("mda_controversial_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", fullYearPeriod)).first()
    ]);

    const [innovationFirstHalf, innovationSecondHalf, innovationFullYear] = await Promise.all([
      ctx.db.query("mda_innovation_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", firstHalfPeriod)).first(),
      ctx.db.query("mda_innovation_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", secondHalfPeriod)).first(),
      ctx.db.query("mda_innovation_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", fullYearPeriod)).first()
    ]);

    const [stakeholderFirstHalf, stakeholderSecondHalf, stakeholderFullYear] = await Promise.all([
      ctx.db.query("mda_stakeholder_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", firstHalfPeriod)).first(),
      ctx.db.query("mda_stakeholder_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", secondHalfPeriod)).first(),
      ctx.db.query("mda_stakeholder_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", fullYearPeriod)).first()
    ]);

    const [transparencyFirstHalf, transparencySecondHalf, transparencyFullYear] = await Promise.all([
      ctx.db.query("mda_transparency_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", firstHalfPeriod)).first(),
      ctx.db.query("mda_transparency_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", secondHalfPeriod)).first(),
      ctx.db.query("mda_transparency_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", fullYearPeriod)).first()
    ]);

    const [reportGovResFirstHalf, reportGovResSecondHalf, reportGovResFullYear] = await Promise.all([
      ctx.db.query("mda_reportgov_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", firstHalfPeriod)).first(),
      ctx.db.query("mda_reportgov_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", secondHalfPeriod)).first(),
      ctx.db.query("mda_reportgov_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", fullYearPeriod)).first()
    ]);

    const [monthlyReportFirstHalf, monthlyReportSecondHalf, monthlyReportFullYear] = await Promise.all([
      ctx.db.query("mda_monthly_report_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", firstHalfPeriod)).first(),
      ctx.db.query("mda_monthly_report_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", secondHalfPeriod)).first(),
      ctx.db.query("mda_monthly_report_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", fullYearPeriod)).first()
    ]);

    const [timelinessFirstHalf, timelinessSecondHalf, timelinessFullYear] = await Promise.all([
      ctx.db.query("mda_timeliness_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", firstHalfPeriod)).first(),
      ctx.db.query("mda_timeliness_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", secondHalfPeriod)).first(),
      ctx.db.query("mda_timeliness_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", fullYearPeriod)).first()
    ]);

    const [toutingRentseekingFirstHalf, toutingRentseekingSecondHalf, toutingRentseekingFullYear] = await Promise.all([
      ctx.db.query("mda_touting_rentseeking_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", firstHalfPeriod)).first(),
      ctx.db.query("mda_touting_rentseeking_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", secondHalfPeriod)).first(),
      ctx.db.query("mda_touting_rentseeking_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", fullYearPeriod)).first()
    ]);

    const [othersFirstHalf, othersSecondHalf, othersFullYear] = await Promise.all([
      ctx.db.query("saved_others_data").withIndex("byMdaPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", firstHalfPeriod)).first(),
      ctx.db.query("saved_others_data").withIndex("byMdaPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", secondHalfPeriod)).first(),
      ctx.db.query("saved_others_data").withIndex("byMdaPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", fullYearPeriod)).first()
    ]);

    const [penaltiesFirstHalf, penaltiesSecondHalf, penaltiesFullYear] = await Promise.all([
      ctx.db.query("saved_penalties_data").withIndex("byMdaPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", firstHalfPeriod)).first(),
      ctx.db.query("saved_penalties_data").withIndex("byMdaPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", secondHalfPeriod)).first(),
      ctx.db.query("saved_penalties_data").withIndex("byMdaPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", fullYearPeriod)).first()
    ]);

    const [bonusesFirstHalf, bonusesSecondHalf, bonusesFullYear] = await Promise.all([
      ctx.db.query("saved_bonuses_data").withIndex("byMdaPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", firstHalfPeriod)).first(),
      ctx.db.query("saved_bonuses_data").withIndex("byMdaPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", secondHalfPeriod)).first(),
      ctx.db.query("saved_bonuses_data").withIndex("byMdaPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", fullYearPeriod)).first()
    ]);

    return {
      mdaName,
      year,
      sla: {
        firstHalf: slaFirstHalf,
        secondHalf: slaSecondHalf,
        fullYear: slaFullYear
      },
      mysteryShopping: {
        firstHalf: mysteryFirstHalf,
        secondHalf: mysterySecondHalf,
        fullYear: mysteryFullYear
      },
      controversial: {
        firstHalf: controversialFirstHalf,
        secondHalf: controversialSecondHalf,
        fullYear: controversialFullYear
      },
      toutingRentseeking: {
        firstHalf: toutingRentseekingFirstHalf,
        secondHalf: toutingRentseekingSecondHalf,
        fullYear: toutingRentseekingFullYear
      },
      innovation: {
        firstHalf: innovationFirstHalf,
        secondHalf: innovationSecondHalf,
        fullYear: innovationFullYear
      },
      stakeholder: {
        firstHalf: stakeholderFirstHalf,
        secondHalf: stakeholderSecondHalf,
        fullYear: stakeholderFullYear
      },
      transparency: {
        firstHalf: transparencyFirstHalf,
        secondHalf: transparencySecondHalf,
        fullYear: transparencyFullYear
      },
      reportGovResolution: {
        firstHalf: reportGovResFirstHalf,
        secondHalf: reportGovResSecondHalf,
        fullYear: reportGovResFullYear
      },
      monthlyReport: {
        firstHalf: monthlyReportFirstHalf,
        secondHalf: monthlyReportSecondHalf,
        fullYear: monthlyReportFullYear
      },
      timeliness: {
        firstHalf: timelinessFirstHalf,
        secondHalf: timelinessSecondHalf,
        fullYear: timelinessFullYear
      },
      others: {
        firstHalf: othersFirstHalf,
        secondHalf: othersSecondHalf,
        fullYear: othersFullYear
      },
      penalties: {
        firstHalf: penaltiesFirstHalf,
        secondHalf: penaltiesSecondHalf,
        fullYear: penaltiesFullYear
      },
      bonuses: {
        firstHalf: bonusesFirstHalf,
        secondHalf: bonusesSecondHalf,
        fullYear: bonusesFullYear
      }
    };
  }
});

// Get all MDAs ranked by Report Gov Resolution score - averaged across both halves
export const getAllReportGovRankings = query({
  args: {
    scoringPeriod: v.string()
  },
  handler: async (ctx, { scoringPeriod }) => {
    // Extract year from scoring period
    const yearMatch = scoringPeriod.match(/\d{4}/);
    const targetYear = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();

    // Get data for both halves of the year
    const firstHalfPeriod = `1st Half ${targetYear}`;
    const secondHalfPeriod = `2nd Half ${targetYear}`;
    const fullYearPeriod = String(targetYear);

    // Query both periods separately and combine
    const firstHalfData = await ctx.db.query("mda_reportgov_data")
      .withIndex("byPeriod", q => q.eq("scoringPeriod", firstHalfPeriod))
      .collect();

    const secondHalfData = await ctx.db.query("mda_reportgov_data")
      .withIndex("byPeriod", q => q.eq("scoringPeriod", secondHalfPeriod))
      .collect();

    const fullYearData = await ctx.db.query("mda_reportgov_data")
      .withIndex("byPeriod", q => q.eq("scoringPeriod", fullYearPeriod))
      .collect();

    const allReportGovData = [...firstHalfData, ...secondHalfData, ...fullYearData];

    // Group by MDA name
    const mdaScores: { [key: string]: any[] } = {};

    allReportGovData.forEach(data => {
      if (!mdaScores[data.mdaName]) {
        mdaScores[data.mdaName] = [];
      }
      mdaScores[data.mdaName].push(data);
    });

    // Calculate: sum tickets, average times and score (only if both halves have data)
    const ranked = Object.entries(mdaScores)
      .map(([mdaName, dataList]) => {
        // Find first and second half data
        const firstHalf = dataList.find(d => d.scoringPeriod?.includes("1st Half"));
        const secondHalf = dataList.find(d => d.scoringPeriod?.includes("2nd Half"));
        const fullYear = dataList.find(d => d.scoringPeriod === String(targetYear));

        // Sum total tickets and resolved tickets (add both halves)
        const totalTickets = dataList.reduce((sum, d) => sum + (d.totalTickets || 0), 0);
        const resolvedTickets = dataList.reduce((sum, d) => sum + (d.resolvedTickets || 0), 0);

        // Calculate resolution rate from summed values
        const resolutionRate = totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0;

        // Average response time and resolution time (only if both halves have data)
        let avgResponseTime = firstHalf?.averageResponseTime || 0;
        let avgResolutionTime = firstHalf?.averageResolutionTime || 0;

        if (fullYear) {
          avgResponseTime = fullYear.averageResponseTime || 0;
          avgResolutionTime = fullYear.averageResolutionTime || 0;
        } else {
          if (firstHalf?.averageResponseTime && secondHalf?.averageResponseTime) {
            avgResponseTime = ((firstHalf.averageResponseTime || 0) + (secondHalf.averageResponseTime || 0)) / 2;
          } else if (secondHalf?.averageResponseTime) {
            avgResponseTime = secondHalf.averageResponseTime;
          }

          if (firstHalf?.averageResolutionTime && secondHalf?.averageResolutionTime) {
            avgResolutionTime = ((firstHalf.averageResolutionTime || 0) + (secondHalf.averageResolutionTime || 0)) / 2;
          } else if (secondHalf?.averageResolutionTime) {
            avgResolutionTime = secondHalf.averageResolutionTime;
          }
        }

        // Average score (only if both halves have data)
        let avgScore = firstHalf?.score || 0;
        // Check for full year
        if (fullYear && fullYear.score !== undefined) {
          avgScore = fullYear.score;
        } else if (firstHalf?.score && secondHalf?.score) {
          avgScore = ((firstHalf.score || 0) + (secondHalf.score || 0)) / 2;
        } else if (secondHalf?.score) {
          avgScore = secondHalf.score;
        } else if (firstHalf?.score) {
          avgScore = firstHalf.score;
        }

        return {
          mdaName,
          score: avgScore,
          totalTickets: totalTickets,
          resolvedTickets: resolvedTickets,
          resolutionRate: resolutionRate,
          averageResponseTime: avgResponseTime,
          averageResolutionTime: avgResolutionTime,
          isManual: firstHalf?.isManual || secondHalf?.isManual || false
        };
      })
      .sort((a, b) => b.score - a.score);

    return ranked;
  }
});

// Get Touting & Rentseeking data for a specific MDA and period
export const getToutingRentseekingData = query({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string()
  },
  handler: async (ctx, { mdaName, scoringPeriod }) => {
    const toutingRentseekingData = await ctx.db.query("mda_touting_rentseeking_data")
      .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();

    return toutingRentseekingData;
  }
});

// Save Touting & Rentseeking data for a specific MDA and period
export const saveToutingRentseekingData = mutation({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string(),
    isToutingRentseeking: v.boolean(),
    score: v.number()
  },
  handler: async (ctx, { mdaName, scoringPeriod, isToutingRentseeking, score }) => {
    const user = await getCurrentUserOrThrow(ctx);

    const existingData = await ctx.db.query("mda_touting_rentseeking_data")
      .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();

    if (existingData) {
      await ctx.db.patch(existingData._id, {
        isToutingRentseeking,
        score,
        updatedAt: Date.now(),
        updatedBy: user._id
      });
    } else {
      await ctx.db.insert("mda_touting_rentseeking_data", {
        mdaName,
        scoringPeriod,
        isToutingRentseeking,
        score,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: user._id,
        updatedBy: user._id
      });
    }

    return { success: true, message: "Touting & Rentseeking data saved successfully" };
  }
});

// Get period-specific ticket data for scorecard (resolved only, no closed)
export const getScorecardTicketData = query({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string()
  },
  handler: async (ctx, { mdaName, scoringPeriod }) => {
    const mda = await findMdaByName(ctx, mdaName);

    if (!mda) {
      return null;
    }

    const currentYear = new Date().getFullYear();
    let startDate: number, endDate: number;

    const yearMatch = scoringPeriod.match(/\d{4}/);
    const targetYear = yearMatch ? parseInt(yearMatch[0]) : currentYear;

    if (scoringPeriod.includes("1st Half")) {
      startDate = new Date(targetYear, 0, 1).getTime();
      endDate = new Date(targetYear, 5, 30, 23, 59, 59).getTime();
    } else if (scoringPeriod.includes("2nd Half")) {
      startDate = new Date(targetYear, 6, 1).getTime();
      endDate = new Date(targetYear, 11, 31, 23, 59, 59).getTime();
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();
    }

    const allTickets = await ctx.db.query("tickets")
      .withIndex("byMDA", q => q.eq("assignedMDA", mda._id))
      .collect();

    const filteredTickets = allTickets.filter(ticket =>
      ticket.createdAt >= startDate && ticket.createdAt <= endDate
    );

    const totalTickets = filteredTickets.length;
    // ONLY count "resolved" status, NOT "closed"
    const resolvedTickets = filteredTickets.filter(t => t.status === "resolved").length;
    const resolutionRate = totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0;

    return {
      totalTickets,
      resolvedTickets,
      resolutionRate,
      period: scoringPeriod,
      startDate,
      endDate,
      dateRange: {
        start: new Date(startDate).toLocaleDateString(),
        end: new Date(endDate).toLocaleDateString()
      }
    };
  }
});
// Helper function to normalize MDA names for matching (handles abbreviation prefixes)
function normalizeMdaNameForMatching(mdaName: string): string {
  if (!mdaName) return '';
  // Remove abbreviation prefix (e.g., "BPP - Bureau for Public Procurement" -> "Bureau for Public Procurement")
  const withoutPrefix = mdaName.replace(/^[A-Z]+ - /, '').trim();
  // Normalize: lowercase, remove extra spaces, normalize dashes
  return withoutPrefix
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[–—]/g, '-')
    .trim();
}

// Get all MDAs with their mystery shopping data status for Excel export
export const getAllMdasMysteryShoppingStatus = query({
  args: {
    year: v.number()
  },
  handler: async (ctx, { year }) => {
    const firstHalfPeriod = `1st Half ${year}`;
    const secondHalfPeriod = `2nd Half ${year}`;

    // Get all MDAs from database and from scoring history to get complete list
    const allMdas = await ctx.db.query("mdas").collect();
    const allScoringHistory = await ctx.db.query("mda_scoring_history").collect();
    const uniqueMdaNamesFromHistory = [...new Set(allScoringHistory.map(s => s.mdaName))];

    // Combine and deduplicate - use the actual names as stored
    const allMdaNames = [...new Set([...allMdas.map(m => m.name), ...uniqueMdaNamesFromHistory])];

    // Get all mystery shopping data for both periods
    const [mysteryFirstHalf, mysterySecondHalf] = await Promise.all([
      ctx.db.query("mda_mystery_shopping_data").withIndex("byPeriod", q => q.eq("scoringPeriod", firstHalfPeriod)).collect(),
      ctx.db.query("mda_mystery_shopping_data").withIndex("byPeriod", q => q.eq("scoringPeriod", secondHalfPeriod)).collect()
    ]);
    const allMysteryData = [...mysteryFirstHalf, ...mysterySecondHalf];

    // Create a map using normalized names as keys, but store the original name and data
    // This allows us to match MDAs even if one has an abbreviation prefix and the other doesn't
    const mysteryDataMap = new Map<string, { originalName: string; mysteryType: string; hasData: boolean }>();

    allMysteryData.forEach(data => {
      const normalizedKey = normalizeMdaNameForMatching(data.mdaName);
      if (!mysteryDataMap.has(normalizedKey)) {
        mysteryDataMap.set(normalizedKey, {
          originalName: data.mdaName,
          mysteryType: data.mysteryType,
          hasData: true
        });
      } else {
        // If already exists, keep the existing entry (both halves should have same type)
        const existing = mysteryDataMap.get(normalizedKey)!;
        mysteryDataMap.set(normalizedKey, {
          originalName: existing.originalName || data.mdaName,
          mysteryType: existing.mysteryType || data.mysteryType,
          hasData: true
        });
      }
    });

    // Build result array with all MDAs
    const result = allMdaNames.map(mdaName => {
      const normalizedKey = normalizeMdaNameForMatching(mdaName);
      const mysteryData = mysteryDataMap.get(normalizedKey);

      let status = "No Mystery Shopping Scores";
      if (mysteryData?.hasData) {
        if (mysteryData.mysteryType === "hasReportGov") {
          status = "Has ReportGov";
        } else if (mysteryData.mysteryType === "noReportGov") {
          status = "No ReportGov";
        }
      }

      return {
        mdaName,
        status,
        mysteryType: mysteryData?.mysteryType || null,
        hasMysteryShoppingData: mysteryData?.hasData || false
      };
    });

    return result;
  }
});

// Get SLA Rankings for a specific period
export const getSLARankings = query({
  args: {
    scoringPeriod: v.string()
  },
  handler: async (ctx, { scoringPeriod }) => {
    const rankings = await ctx.db.query("mda_sla_data")
      .withIndex("byPeriod", q => q.eq("scoringPeriod", scoringPeriod))
      .collect();

    // Sort by percentage descending
    return rankings.sort((a, b) => b.percentage - a.percentage);
  }
});

// Get Mystery Shopping Rankings for a specific period
export const getMysteryShoppingRankings = query({
  args: {
    scoringPeriod: v.string()
  },
  handler: async (ctx, { scoringPeriod }) => {
    const rankings = await ctx.db.query("mda_mystery_shopping_data")
      .withIndex("byPeriod", q => q.eq("scoringPeriod", scoringPeriod))
      .collect();

    // Sort by percentage descending
    return rankings.sort((a, b) => b.percentage - a.percentage);
  }
});

// Get Report Gov Rankings for a specific period
export const getReportGovRankings = query({
  args: {
    scoringPeriod: v.string()
  },
  handler: async (ctx, { scoringPeriod }) => {
    const rankings = await ctx.db.query("mda_reportgov_data")
      .withIndex("byPeriod", q => q.eq("scoringPeriod", scoringPeriod))
      .collect();

    // Sort by score descending
    return rankings.sort((a, b) => b.score - a.score);
  }
});

// ============================================
// DYNAMIC SCORING METRICS (2026+)
// ============================================

// Save Others Data (Innovation, Stakeholder, Transparency, etc.)
export const saveOthersData = mutation({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string(),
    values: v.any(), // Record<itemId, boolean | number>
    scores: v.any(), // Record<itemId, number>
    totalScore: v.number()
  },
  handler: async (ctx, { mdaName, scoringPeriod, values, scores }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const canonical = canonicalizeMdaName(mdaName);
    const now = Date.now();

    const periodRows = await ctx.db
      .query("saved_others_data")
      .withIndex("byPeriod", (q) => q.eq("scoringPeriod", scoringPeriod))
      .collect();
    const matched = periodRows.filter(
      (row) => canonicalizeMdaName(row.mdaName) === canonical,
    );
    const merged = applyOthersEdit(
      mergeOthersSavedRows(matched),
      values as Record<string, boolean | number>,
      scores as Record<string, number>,
    );

    const keeper =
      matched.find((row) => row.mdaName === canonical) ?? matched[0] ?? null;
    if (keeper) {
      await ctx.db.patch(keeper._id, {
        mdaName: canonical,
        values: merged.values,
        scores: merged.scores,
        totalScore: merged.totalScore,
        updatedAt: now,
      });
      for (const row of matched) {
        if (row._id !== keeper._id) {
          await ctx.db.delete(row._id);
        }
      }
    } else {
      await ctx.db.insert("saved_others_data", {
        mdaName: canonical,
        scoringPeriod,
        values: merged.values,
        scores: merged.scores,
        totalScore: merged.totalScore,
        updatedAt: now,
      });
    }

    return { success: true, message: "Others metrics saved successfully" };
  }
});

// Get Others Data
export const getOthersData = query({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string()
  },
  handler: async (ctx, { mdaName, scoringPeriod }) => {
    const canonical = canonicalizeMdaName(mdaName);
    const periodRows = await ctx.db
      .query("saved_others_data")
      .withIndex("byPeriod", (q) => q.eq("scoringPeriod", scoringPeriod))
      .collect();
    const matched = periodRows.filter(
      (row) => canonicalizeMdaName(row.mdaName) === canonical,
    );
    if (matched.length === 0) return null;
    const merged = mergeOthersSavedRows(matched);
    const totalScore = Object.values(merged.scores).reduce(
      (sum, value) => sum + (Number(value) || 0),
      0,
    );
    const newest = [...matched].sort(
      (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
    )[0];
    return {
      ...newest,
      mdaName: canonical,
      values: merged.values,
      scores: merged.scores,
      totalScore: Math.round(totalScore * 100) / 100,
    };
  }
});

/** All MDA others rows for one scoring period (matrix hydrate). */
export const getAllOthersDataForPeriod = query({
  args: {
    scoringPeriod: v.string(),
  },
  returns: v.array(
    v.object({
      mdaName: v.string(),
      values: v.any(),
      scores: v.any(),
      totalScore: v.number(),
    })
  ),
  handler: async (ctx, { scoringPeriod }) => {
    const rows = await ctx.db
      .query("saved_others_data")
      .withIndex("byPeriod", (q) => q.eq("scoringPeriod", scoringPeriod))
      .collect();
    return rows.map((row) => ({
      mdaName: row.mdaName,
      values: row.values ?? {},
      scores: row.scores ?? {},
      totalScore: row.totalScore ?? 0,
    }));
  },
});

/**
 * Batch upsert others metric cells for the MDA matrix UI.
 * Each cell is one item value for one MDA; scores/totals are recomputed per MDA.
 */
export const bulkSaveOthersMatrixCells = mutation({
  args: {
    scoringPeriod: v.string(),
    year: v.number(),
    cells: v.array(
      v.object({
        mdaName: v.string(),
        itemId: v.string(),
        /** "yes" | "no" for yes_no, or numeric string for scale_1_10 */
        value: v.string(),
      })
    ),
  },
  returns: v.object({
    saved: v.number(),
    mdasTouched: v.number(),
  }),
  handler: async (ctx, { scoringPeriod, year, cells }) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin" && user.role !== "staff") {
      throw new Error("Unauthorized");
    }

    const items = await ctx.db
      .query("transparency_items")
      .withIndex("byYearAndActive", (q) => q.eq("year", year).eq("isActive", true))
      .collect();
    const itemById = new Map(items.map((item) => [item.itemId, item]));

    const periodRows = await ctx.db
      .query("saved_others_data")
      .withIndex("byPeriod", (q) => q.eq("scoringPeriod", scoringPeriod))
      .collect();

    const byMda = new Map<string, Array<{ itemId: string; value: string }>>();
    for (const cell of cells) {
      if (!cell.value) continue;
      const canonical = canonicalizeMdaName(cell.mdaName);
      const list = byMda.get(canonical) ?? [];
      list.push({ itemId: cell.itemId, value: cell.value });
      byMda.set(canonical, list);
    }

    let saved = 0;
    for (const [canonical, mdaCells] of byMda) {
      const matched = periodRows.filter(
        (row) => canonicalizeMdaName(row.mdaName) === canonical,
      );
      const merged = mergeOthersSavedRows(matched);
      const values: Record<string, boolean | number> = { ...merged.values };

      for (const cell of mdaCells) {
        const item = itemById.get(cell.itemId);
        if (!item) continue;
        const answerType = item.answerType ?? "yes_no";
        if (answerType === "yes_no") {
          values[cell.itemId] = cell.value === "yes" || cell.value === "true" || cell.value === "1";
        } else {
          const num = Number(cell.value);
          values[cell.itemId] = Number.isFinite(num) ? Math.min(10, Math.max(0, num)) : 0;
        }
        saved += 1;
      }

      const scores: Record<string, number> = { ...merged.scores };
      for (const item of items) {
        if (!Object.prototype.hasOwnProperty.call(values, item.itemId)) continue;
        const value = values[item.itemId];
        if ((item.answerType ?? "yes_no") === "yes_no") {
          scores[item.itemId] = value === true ? item.weight : 0;
        } else {
          const numValue = typeof value === "number" ? value : 0;
          scores[item.itemId] = (numValue / 10) * item.weight;
        }
      }
      const totalScore = Object.values(scores).reduce(
        (sum, value) => sum + (Number(value) || 0),
        0,
      );

      const keeper =
        matched.find((row) => row.mdaName === canonical) ?? matched[0] ?? null;
      const now = Date.now();
      if (keeper) {
        await ctx.db.patch(keeper._id, {
          mdaName: canonical,
          values,
          scores,
          totalScore: Math.round(totalScore * 100) / 100,
          updatedAt: now,
        });
        for (const row of matched) {
          if (row._id !== keeper._id) {
            await ctx.db.delete(row._id);
          }
        }
      } else {
        await ctx.db.insert("saved_others_data", {
          mdaName: canonical,
          scoringPeriod,
          values,
          scores,
          totalScore: Math.round(totalScore * 100) / 100,
          updatedAt: now,
        });
      }
    }

    return { saved, mdasTouched: byMda.size };
  },
});

/** All mystery shopping rows for one scoring period (matrix hydrate). */
export const getAllMysteryDataForPeriod = query({
  args: {
    scoringPeriod: v.string(),
  },
  returns: v.array(
    v.object({
      mdaName: v.string(),
      mysteryType: v.string(),
      ratings: v.any(),
      totalScore: v.number(),
      maxPossibleScore: v.number(),
      percentage: v.number(),
    })
  ),
  handler: async (ctx, { scoringPeriod }) => {
    const rows = await ctx.db
      .query("mda_mystery_shopping_data")
      .withIndex("byPeriod", (q) => q.eq("scoringPeriod", scoringPeriod))
      .collect();
    return rows.map((row) => ({
      mdaName: row.mdaName,
      mysteryType: row.mysteryType,
      ratings: row.ratings ?? {},
      totalScore: row.totalScore ?? 0,
      maxPossibleScore: row.maxPossibleScore ?? 0,
      percentage: row.percentage ?? 0,
    }));
  },
});

/**
 * Batch upsert mystery shopping question ratings for the MDA matrix UI.
 * Saves one mystery type at a time; merges dirty ratings into each MDA row.
 */
export const bulkSaveMysteryMatrixCells = mutation({
  args: {
    scoringPeriod: v.string(),
    year: v.number(),
    mysteryType: v.string(),
    cells: v.array(
      v.object({
        mdaName: v.string(),
        questionId: v.string(),
        /** Numeric rating as string */
        value: v.string(),
      })
    ),
  },
  returns: v.object({
    saved: v.number(),
    mdasTouched: v.number(),
  }),
  handler: async (ctx, { scoringPeriod, year, mysteryType, cells }) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin" && user.role !== "staff") {
      throw new Error("Unauthorized");
    }

    const questions = await ctx.db
      .query("mystery_shopping_questions")
      .withIndex("byYearTypeAndActive", (q) =>
        q.eq("year", year).eq("typeId", mysteryType).eq("isActive", true)
      )
      .collect();
    if (questions.length === 0) {
      throw new Error("No active mystery shopping questions for this type");
    }

    const byMda = new Map<string, Array<{ questionId: string; value: string }>>();
    for (const cell of cells) {
      if (!cell.value) continue;
      const list = byMda.get(cell.mdaName) ?? [];
      list.push({ questionId: cell.questionId, value: cell.value });
      byMda.set(cell.mdaName, list);
    }

    const maxPossibleScore = questions.reduce((sum, q) => sum + (q.weight || 0), 0);

    let saved = 0;
    for (const [mdaName, mdaCells] of byMda) {
      const existing = await ctx.db
        .query("mda_mystery_shopping_data")
        .withIndex("byMdaAndPeriod", (q) =>
          q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod)
        )
        .first();

      const ratings: Record<string, number> = {
        ...((existing?.ratings as Record<string, number> | undefined) ?? {}),
      };

      for (const cell of mdaCells) {
        const num = Number(cell.value);
        if (!Number.isFinite(num)) continue;
        ratings[cell.questionId] = num;
        saved += 1;
      }

      let weighted = 0;
      let weightSum = 0;
      for (const question of questions) {
        const rating = ratings[question.questionId] ?? 0;
        const weight = question.weight || 1;
        weightSum += weight;
        if (question.answerType === "scale_1_10") {
          weighted += (rating / 10) * weight;
        } else if (question.answerType === "yes_no") {
          weighted += rating * weight;
        } else {
          weighted += (rating / 10) * weight;
        }
      }
      const totalScore =
        weightSum > 0 ? (weighted / weightSum) * maxPossibleScore : 0;
      const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

      if (existing) {
        await ctx.db.patch(existing._id, {
          mysteryType,
          ratings,
          totalScore,
          maxPossibleScore,
          percentage,
          updatedAt: Date.now(),
          updatedBy: user._id,
        });
      } else {
        await ctx.db.insert("mda_mystery_shopping_data", {
          mdaName,
          scoringPeriod,
          mysteryType,
          ratings,
          totalScore,
          maxPossibleScore,
          percentage,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: user._id,
          updatedBy: user._id,
        });
      }
    }

    return { saved, mdasTouched: byMda.size };
  },
});

// Save Penalties Data
export const savePenaltiesData = mutation({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string(),
    values: v.any(), // Record<penaltyId, boolean>
    totalPenalty: v.number()
  },
  handler: async (ctx, { mdaName, scoringPeriod, values, totalPenalty }) => {
    const user = await getCurrentUserOrThrow(ctx);

    const existingData = await ctx.db.query("saved_penalties_data")
      .withIndex("byMdaPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();

    if (existingData) {
      await ctx.db.patch(existingData._id, {
        values,
        totalPenalty,
        updatedAt: Date.now()
      });
    } else {
      await ctx.db.insert("saved_penalties_data", {
        mdaName,
        scoringPeriod,
        values,
        totalPenalty,
        updatedAt: Date.now()
      });
    }

    return { success: true, message: "Penalties saved successfully" };
  }
});

// Get Penalties Data
export const getPenaltiesData = query({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string()
  },
  handler: async (ctx, { mdaName, scoringPeriod }) => {
    return await ctx.db.query("saved_penalties_data")
      .withIndex("byMdaPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();
  }
});

// Save Bonuses Data
export const saveBonusesData = mutation({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string(),
    values: v.any(),
    totalBonus: v.number()
  },
  handler: async (ctx, { mdaName, scoringPeriod, values, totalBonus }) => {
    const user = await getCurrentUserOrThrow(ctx);

    const existingData = await ctx.db.query("saved_bonuses_data")
      .withIndex("byMdaPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();

    if (existingData) {
      await ctx.db.patch(existingData._id, {
        values,
        totalBonus,
        updatedAt: Date.now()
      });
    } else {
      await ctx.db.insert("saved_bonuses_data", {
        mdaName,
        scoringPeriod,
        values,
        totalBonus,
        updatedAt: Date.now()
      });
    }

    return { success: true, message: "Bonuses saved successfully" };
  }
});

// Get Bonuses Data
export const getBonusesData = query({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string()
  },
  handler: async (ctx, { mdaName, scoringPeriod }) => {
    return await ctx.db.query("saved_bonuses_data")
      .withIndex("byMdaPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
      .first();
  }
});

const bfaScoreMetricValidator = v.union(
  v.literal("sla"),
  v.literal("reportGov"),
  v.literal("mystery"),
  v.literal("monthlyReport"),
  v.literal("timeliness"),
  v.literal("transparency"),
  v.literal("others"),
  v.literal("penalties"),
  v.literal("bonuses"),
  v.literal("controversial"),
  v.literal("touting"),
  v.literal("innovation"),
  v.literal("stakeholder"),
  v.literal("finalScore")
);

const ALL_BFA_SCORE_METRICS = [
  "sla",
  "reportGov",
  "mystery",
  "monthlyReport",
  "timeliness",
  "transparency",
  "others",
  "penalties",
  "bonuses",
  "controversial",
  "touting",
  "innovation",
  "stakeholder",
  "finalScore",
] as const;

type BfaScoreMetric = (typeof ALL_BFA_SCORE_METRICS)[number];

const METRIC_LABELS: Record<BfaScoreMetric, string> = {
  sla: "SLA",
  reportGov: "ReportGov",
  mystery: "Mystery Shopping",
  monthlyReport: "Monthly Reports",
  timeliness: "Timeliness",
  transparency: "Transparency",
  others: "Others",
  penalties: "Penalties",
  bonuses: "Bonuses",
  controversial: "Controversial",
  touting: "Touting & Rentseeking",
  innovation: "Innovation",
  stakeholder: "Stakeholder Engagement",
  finalScore: "Final Score",
};

/**
 * Deletes a saved BFA score row. Source data (tickets, submitted monthly
 * reports, SLA files) is never touched — only the scoring snapshot.
 */
async function deleteSavedScoreRow(
  ctx: MutationCtx,
  row: { _id: Id<TableNames> } | null
): Promise<boolean> {
  if (!row) return false;
  await ctx.db.delete(row._id);
  return true;
}

async function clearSavedMetricScore(
  ctx: MutationCtx,
  mdaName: string,
  scoringPeriod: string,
  metric: BfaScoreMetric
): Promise<boolean> {
  switch (metric) {
    case "sla":
      return await deleteSavedScoreRow(
        ctx,
        await ctx.db.query("mda_sla_data").withIndex("byMdaAndPeriod", (q) => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod)).first()
      );
    case "reportGov":
      return await deleteSavedScoreRow(
        ctx,
        await ctx.db.query("mda_reportgov_data").withIndex("byMdaAndPeriod", (q) => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod)).first()
      );
    case "mystery":
      return await deleteSavedScoreRow(
        ctx,
        await ctx.db.query("mda_mystery_shopping_data").withIndex("byMdaAndPeriod", (q) => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod)).first()
      );
    case "monthlyReport":
      return await deleteSavedScoreRow(
        ctx,
        await ctx.db.query("mda_monthly_report_data").withIndex("byMdaAndPeriod", (q) => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod)).first()
      );
    case "timeliness":
      return await deleteSavedScoreRow(
        ctx,
        await ctx.db.query("mda_timeliness_data").withIndex("byMdaAndPeriod", (q) => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod)).first()
      );
    case "transparency":
      return await deleteSavedScoreRow(
        ctx,
        await ctx.db.query("mda_transparency_data").withIndex("byMdaAndPeriod", (q) => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod)).first()
      );
    case "controversial":
      return await deleteSavedScoreRow(
        ctx,
        await ctx.db.query("mda_controversial_data").withIndex("byMdaAndPeriod", (q) => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod)).first()
      );
    case "touting":
      return await deleteSavedScoreRow(
        ctx,
        await ctx.db.query("mda_touting_rentseeking_data").withIndex("byMdaAndPeriod", (q) => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod)).first()
      );
    case "innovation":
      return await deleteSavedScoreRow(
        ctx,
        await ctx.db.query("mda_innovation_data").withIndex("byMdaAndPeriod", (q) => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod)).first()
      );
    case "stakeholder":
      return await deleteSavedScoreRow(
        ctx,
        await ctx.db.query("mda_stakeholder_data").withIndex("byMdaAndPeriod", (q) => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod)).first()
      );
    case "others":
      return await deleteSavedScoreRow(
        ctx,
        await ctx.db.query("saved_others_data").withIndex("byMdaPeriod", (q) => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod)).first()
      );
    case "penalties":
      return await deleteSavedScoreRow(
        ctx,
        await ctx.db.query("saved_penalties_data").withIndex("byMdaPeriod", (q) => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod)).first()
      );
    case "bonuses":
      return await deleteSavedScoreRow(
        ctx,
        await ctx.db.query("saved_bonuses_data").withIndex("byMdaPeriod", (q) => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod)).first()
      );
    case "finalScore": {
      const history = await ctx.db
        .query("mda_scoring_history")
        .withIndex("byMdaName", (q) => q.eq("mdaName", mdaName))
        .collect();
      const matching = history.filter((row) => row.scoringPeriod === scoringPeriod);
      for (const row of matching) {
        await ctx.db.delete(row._id);
      }
      return matching.length > 0;
    }
    default:
      return false;
  }
}

export const clearMetricScore = mutation({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string(),
    metric: bfaScoreMetricValidator,
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    cleared: v.boolean(),
  }),
  handler: async (ctx, { mdaName, scoringPeriod, metric }) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin" && user.role !== "staff") {
      throw new Error("Unauthorized: Only admins and staff can clear BFA scores");
    }

    const cleared = await clearSavedMetricScore(ctx, mdaName, scoringPeriod, metric);
    // Individual metric changes should unstick the calculated final score
    // so rankings are not left with a stale total.
    if (metric !== "finalScore") {
      await clearSavedMetricScore(ctx, mdaName, scoringPeriod, "finalScore");
    }

    await logAuditEvent(ctx, {
      category: "bfa",
      summary: `Cleared ${METRIC_LABELS[metric]} score for ${mdaName}`,
      action: "bfa.mda_score_saved",
      actor: user,
      target: { type: "mda", id: mdaName, label: mdaName },
      metadata: { scoringPeriod, metric, action: "cleared" },
    });

    return {
      success: true,
      cleared,
      message: cleared
        ? `${METRIC_LABELS[metric]} score cleared`
        : `No saved ${METRIC_LABELS[metric]} score to clear`,
    };
  },
});

export const clearAllMDAScores = mutation({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    clearedMetrics: v.array(v.string()),
    clearedCount: v.number(),
  }),
  handler: async (ctx, { mdaName, scoringPeriod }) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin" && user.role !== "staff") {
      throw new Error("Unauthorized: Only admins and staff can clear BFA scores");
    }

    const clearedMetrics: string[] = [];
    for (const metric of ALL_BFA_SCORE_METRICS) {
      const cleared = await clearSavedMetricScore(ctx, mdaName, scoringPeriod, metric);
      if (cleared) {
        clearedMetrics.push(METRIC_LABELS[metric]);
      }
    }

    await logAuditEvent(ctx, {
      category: "bfa",
      summary: `Cleared all BFA scores for ${mdaName} (${clearedMetrics.length} metrics)`,
      action: "bfa.mda_score_saved",
      actor: user,
      target: { type: "mda", id: mdaName, label: mdaName },
      metadata: {
        scoringPeriod,
        action: "cleared_all",
        clearedCount: clearedMetrics.length,
        clearedMetrics: clearedMetrics.join(", "),
      },
    });

    return {
      success: true,
      message: clearedMetrics.length > 0
        ? `Cleared ${clearedMetrics.length} saved score(s). Source data was not deleted.`
        : "No saved scores to clear",
      clearedMetrics,
      clearedCount: clearedMetrics.length,
    };
  },
});

export const bulkUpdateTransparencyForSLAPublication = mutation({
  args: {
    year: v.number(),
    scoringPeriod: v.string(),
    mdaNames: v.array(v.string()),
    transparencyScore: v.number(), // Points to award (typically 5)
    dryRun: v.optional(v.boolean())
  },
  returns: v.object({
    updated: v.number(),
    created: v.number(),
    skipped: v.number(),
    errors: v.array(v.string())
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    
    if (user.role !== "admin" && user.role !== "staff") {
      throw new Error("Unauthorized: Only admins and staff can bulk update transparency scores");
    }

    let updated = 0;
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Get transparency item configuration for this year
    const transparencyItems = await ctx.db.query("transparency_items")
      .withIndex("byYearAndActive", q => q.eq("year", args.year).eq("isActive", true))
      .collect();

    const transparencyItem = transparencyItems.find(item => 
      item.itemName.toLowerCase().includes("transparency") || 
      item.itemId.includes("transparency")
    );

    if (!transparencyItem) {
      throw new Error(`No transparency item found in configuration for year ${args.year}`);
    }

    for (const mdaName of args.mdaNames) {
      try {
        // Check if MDA already has transparency data
        const existingData = await ctx.db.query("saved_others_data")
          .withIndex("byMdaPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", args.scoringPeriod))
          .first();

        const values = existingData?.values || {};
        const scores = existingData?.scores || {};

        // Set transparency to true (assuming yes/no type)
        values[transparencyItem.itemId] = true;
        scores[transparencyItem.itemId] = args.transparencyScore;

        // Calculate new total score
        const totalScore = Object.values(scores).reduce((sum: number, score) => sum + (score as number), 0);

        if (!args.dryRun) {
          if (existingData) {
            // Update existing record
            await ctx.db.patch(existingData._id, {
              values,
              scores,
              totalScore,
              updatedAt: Date.now()
            });
            updated++;
          } else {
            // Create new record
            await ctx.db.insert("saved_others_data", {
              mdaName,
              scoringPeriod: args.scoringPeriod,
              values,
              scores,
              totalScore,
              updatedAt: Date.now()
            });
            created++;
          }

          // Log audit event
          await logAuditEvent(ctx, {
            action: "bfa.mda_score_saved",
            category: "bfa",
            summary: `Bulk transparency update: ${mdaName} awarded ${args.transparencyScore} points for SLA publication`,
            actor: user,
            target: {
              type: "mda",
              id: mdaName,
              label: mdaName
            },
            metadata: {
              scoringPeriod: args.scoringPeriod,
              transparencyScore: args.transparencyScore,
              itemId: transparencyItem.itemId,
              type: "bulk_transparency_update"
            }
          });
        }
      } catch (error) {
        errors.push(`${mdaName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      updated,
      created, 
      skipped,
      errors
    };
  }
});