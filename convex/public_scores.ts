import { v } from "convex/values";
import { query } from "./_generated/server";
import { api } from "./_generated/api";
import { canonicalizeMdaName } from "../lib/mdaNameAliases";
import {
  indicators,
  indicatorMaxScores,
  overallIndicatorMaxScore,
  type IndicatorKey,
} from "./config/indicators";

// Helper function for grade calculation
function gradeFromPercentage(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 85) return "A";
  if (percentage >= 80) return "B+";
  if (percentage >= 75) return "B";
  if (percentage >= 70) return "C+";
  if (percentage >= 65) return "C";
  if (percentage >= 60) return "D+";
  if (percentage >= 55) return "D";
  return "F";
}

export const getPublicStateIndicators = query({
  args: {},
  handler: async (_ctx) => {
    return Object.keys(indicators);
  },
});

export const getPublicStateRankings = query({
  args: {
    limit: v.optional(v.number()),
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentYear = args.year || new Date().getFullYear();
    
    // Get all state scores for the year
    let allScores;
    try {
      allScores = await ctx.db
        .query("state_scores")
        .withIndex("byYear", (q) => q.eq("year", currentYear))
        .collect();
    } catch (error) {
      // If year index doesn't exist, use in-memory filtering
      const allRecords = await ctx.db.query("state_scores").collect();
      allScores = allRecords.filter((record) => 
        record.year === currentYear || (!record.year && currentYear === 2025)
      );
    }

    if (allScores.length === 0) {
      return {
        states: [],
        totalStates: 0,
        indicators: Object.keys(indicators),
      };
    }

    // Group by state and collect detailed breakdown
    const stateDetails = new Map<string, {
      totalScore: number;
      indicators: Record<string, {
        name: string;
        score: number;
        maxScore: number;
        subIndicators: Record<string, number>;
      }>;
      lastUpdated: number;
    }>();

    const validStateKeywords = ['Lagos', 'Kano', 'Rivers', 'Kaduna', 'Oyo', 'Edo', 'Delta', 'Imo', 'Enugu', 'Plateau', 'Cross River', 'Akwa Ibom', 'Ondo', 'Osun', 'Ogun', 'Kwara', 'Benue', 'Anambra', 'Borno', 'Niger', 'Abia', 'Taraba', 'Adamawa', 'Sokoto', 'Kebbi', 'Katsina', 'Jigawa', 'Yobe', 'Bauchi', 'Gombe', 'Zamfara', 'Nasarawa', 'Kogi', 'Ekiti', 'Ebonyi', 'Bayelsa', 'Federal Capital Territory', 'FCT'];

    for (const score of allScores) {
      const stateName = score.state;
      
      // Filter out invalid state names like "Data Sources"
      const isValidState = validStateKeywords.some(keyword => 
        stateName.toLowerCase().includes(keyword.toLowerCase()) ||
        keyword.toLowerCase().includes(stateName.toLowerCase())
      );
      
      if (!isValidState) {
        continue; // Skip invalid state entries
      }

      const indicatorKey = score.indicator as IndicatorKey;
      if (!(indicatorKey in indicatorMaxScores)) {
        continue;
      }

      if (!stateDetails.has(stateName)) {
        stateDetails.set(stateName, {
          totalScore: 0,
          indicators: {},
          lastUpdated: score.createdAt || Date.now(),
        });
      }
      
      const stateData = stateDetails.get(stateName)!;
      stateData.totalScore += score.score;
      
      if (score.createdAt > stateData.lastUpdated) {
        stateData.lastUpdated = score.createdAt;
      }

      // Initialize indicator if not exists
      if (!stateData.indicators[score.indicator]) {
        stateData.indicators[score.indicator] = {
          name: indicators[indicatorKey].name,
          score: 0,
          maxScore: indicatorMaxScores[indicatorKey],
          subIndicators: {},
        };
      }
      
      stateData.indicators[score.indicator].score += score.score;
      stateData.indicators[score.indicator].subIndicators[score.subIndicator] = score.score;
    }

    // Convert to final format
    const denominator: number = overallIndicatorMaxScore;
    const states = Array.from(stateDetails.entries())
      .map(([stateName, data]) => {
        const percentage = denominator > 0 ? (data.totalScore / denominator) * 100 : 0;
        return {
          state: stateName,
          totalScore: data.totalScore,
          maxScore: denominator,
          percentage: Math.round(percentage * 100) / 100,
          lastUpdated: data.lastUpdated,
          indicators: data.indicators, // Include detailed breakdown
        };
      })
      .sort((a, b) => b.percentage - a.percentage)
      .map((state, index) => ({
        ...state,
        rank: index + 1,
      }));

    const limitedStates = args.limit ? states.slice(0, args.limit) : states;

    return {
      states: limitedStates,
      totalStates: states.length,
      indicators: Object.keys(indicators),
    };
  },
});

function roundScore(value: number): number {
  return Math.round((value || 0) * 100) / 100;
}

type FrameworkMetric = {
  key: string;
  label: string;
  max: number;
};

function buildBfaFrameworkMetrics(
  year: number,
  config: {
    efficiencyPeriod?: {
      slaPoints?: number;
      reportGovPoints?: number;
      reportSubmissionPoints?: number;
      timelinessPoints?: number;
    } | null;
    mysteryShoppingTypes?: Array<{ questions?: Array<{ weight?: number }> }>;
    othersItems?: Array<{ weight?: number }>;
    innovationItems?: Array<{ weight?: number }>;
    stakeholderItems?: Array<{ weight?: number }>;
  } | null
): FrameworkMetric[] {
  if (year < 2026) {
    return [
      { key: "sla", label: "SLA Compliance", max: 5 },
      { key: "mystery", label: "Mystery Shopping", max: 40 },
      { key: "reportGov", label: "Report Gov Resolution", max: 20 },
      { key: "reportSubmission", label: "Monthly Report Submission", max: 2 },
      { key: "timeliness", label: "Timeliness in Submission", max: 3 },
      { key: "transparency", label: "Transparency", max: 5 },
      { key: "stakeholder", label: "Stakeholder Engagement", max: 5 },
      { key: "innovation", label: "Innovation", max: 5 },
    ];
  }

  const efficiency = config?.efficiencyPeriod;
  const metrics: FrameworkMetric[] = [];

  const slaMax = efficiency?.slaPoints ?? 0;
  if (slaMax > 0) {
    metrics.push({ key: "sla", label: "SLA Compliance", max: slaMax });
  }

  const mysteryTypes = config?.mysteryShoppingTypes || [];
  const mysteryWeight = mysteryTypes.reduce((sum, type) => {
    return sum + (type.questions || []).reduce((inner, question) => inner + (question.weight || 0), 0);
  }, 0);
  if (mysteryTypes.length > 0) {
    metrics.push({
      key: "mystery",
      label: "Mystery Shopping",
      max: mysteryWeight > 0 ? mysteryWeight : 40,
    });
  }

  const reportGovMax = efficiency?.reportGovPoints ?? 0;
  if (reportGovMax > 0) {
    metrics.push({ key: "reportGov", label: "Report Gov Resolution", max: reportGovMax });
  }

  const reportSubmissionMax = efficiency?.reportSubmissionPoints ?? 0;
  if (reportSubmissionMax > 0) {
    metrics.push({ key: "reportSubmission", label: "Monthly Report Submission", max: reportSubmissionMax });
  }

  const timelinessMax = efficiency?.timelinessPoints ?? 0;
  if (timelinessMax > 0) {
    metrics.push({ key: "timeliness", label: "Timeliness in Submission", max: timelinessMax });
  }

  const othersMax =
    (config?.othersItems || []).reduce((sum, item) => sum + (item.weight || 0), 0) +
    (config?.innovationItems || []).reduce((sum, item) => sum + (item.weight || 0), 0) +
    (config?.stakeholderItems || []).reduce((sum, item) => sum + (item.weight || 0), 0);
  if (othersMax > 0) {
    metrics.push({ key: "others", label: "Others", max: othersMax });
  }

  return metrics;
}

function metricScoreFromDashboard(
  mda: Record<string, unknown>,
  key: string,
  frameworkMax: number
): { score: number; max: number } {
  const nested = (field: string, fallbackMax: number) => {
    const bucket = mda[field] as { score?: number; maxPossibleScore?: number } | null | undefined;
    return {
      score: roundScore(bucket?.score || 0),
      max: bucket?.maxPossibleScore || fallbackMax,
    };
  };

  switch (key) {
    case "sla":
      return nested("sla", frameworkMax);
    case "mystery":
      return nested("mysteryShopping", frameworkMax);
    case "reportGov":
      return nested("reportGovResolution", frameworkMax);
    case "reportSubmission":
      return nested("monthlyReport", frameworkMax);
    case "timeliness":
      return nested("timeliness", frameworkMax);
    case "others": {
      const others = mda.others as { score?: number } | null | undefined;
      if (others && typeof others.score === "number") {
        return { score: roundScore(others.score), max: frameworkMax };
      }
      const transparency = nested("transparency", 0).score;
      const stakeholder = nested("stakeholder", 0).score;
      const innovation = nested("innovation", 0).score;
      return { score: roundScore(transparency + stakeholder + innovation), max: frameworkMax };
    }
    case "transparency":
      return nested("transparency", frameworkMax);
    case "stakeholder":
      return nested("stakeholder", frameworkMax);
    case "innovation":
      return nested("innovation", frameworkMax);
    default:
      return { score: 0, max: frameworkMax };
  }
}

function isMetricExcluded(excluded: string[] | undefined, key: string): boolean {
  if (!excluded || excluded.length === 0) return false;
  if (excluded.includes(key)) return true;
  if (key === "mystery" && excluded.includes("mysteryShopping")) return true;
  if (key === "others" && excluded.some((item) => item.startsWith("others"))) return true;
  return false;
}

// Public MDA scoring query that uses the exact same data source as the Live Dashboard
export const getPublicMdaScores = query({
  args: {
    year: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const requestedYear = args.year || new Date().getFullYear();

    try {
      const [dashboardResult, yearConfig] = await Promise.all([
        ctx.runQuery(api.mda_scoring.getAllMdaSavedDataForDashboard, {
          year: requestedYear,
        }) as Promise<{ data?: Array<Record<string, unknown>>; efficiencyConfig?: unknown }>,
        ctx.runQuery(api.scoring_config.getAllConfigurationsForYear, {
          year: requestedYear,
        }),
      ]);

      const frameworkMetrics = buildBfaFrameworkMetrics(requestedYear, yearConfig);
      const dashboardData = dashboardResult?.data || [];

      if (!dashboardData.length) {
        return {
          mdas: [],
          totalMdas: 0,
          year: requestedYear,
          availableYears: [],
          hasDataForRequestedYear: false,
          frameworkMetrics,
          message: `No MDA scoring data available for ${requestedYear}. Federal MDAs have not been scored for this assessment period.`,
        };
      }

      const scoredMdas = dashboardData
        .filter((mda) => mda && typeof mda.mdaName === "string" && Number(mda.totalScore) > 0)
        .map((mda) => {
          const excludedMetrics = Array.isArray(mda.excludedMetrics)
            ? (mda.excludedMetrics as string[])
            : [];
          const metricScores: Record<string, { score: number; max: number }> = {};
          for (const metric of frameworkMetrics) {
            metricScores[metric.key] = metricScoreFromDashboard(mda, metric.key, metric.max);
          }

          return {
            mdaName: canonicalizeMdaName(String(mda.mdaName)),
            finalScore: roundScore(Number(mda.totalScore) || 0),
            maxPossibleScore: Number(mda.maxPossiblePoints) || 100,
            percentage: roundScore(Number(mda.totalPercentage) || 0),
            metricScores,
            excludedMetrics,
            applicableMetricCount: frameworkMetrics.filter(
              (metric) => !isMetricExcluded(excludedMetrics, metric.key)
            ).length,
            lastUpdated: Number(mda.lastUpdated) || Date.now(),
          };
        })
        .sort((a, b) => b.finalScore - a.finalScore)
        .map((mda, index) => ({ ...mda, rank: index + 1 }));

      const limitedMdas = args.limit ? scoredMdas.slice(0, args.limit) : scoredMdas;

      return {
        mdas: limitedMdas,
        totalMdas: scoredMdas.length,
        year: requestedYear,
        requestedYear: args.year,
        availableYears: scoredMdas.length > 0 ? [requestedYear] : [],
        hasDataForRequestedYear: scoredMdas.length > 0,
        frameworkMetrics,
      };
    } catch (error) {
      console.error("Error fetching public MDA scores:", error);
      return {
        mdas: [],
        totalMdas: 0,
        year: requestedYear,
        availableYears: [],
        hasDataForRequestedYear: false,
        frameworkMetrics: [],
        message: "Error loading MDA scoring data. Please try again later.",
      };
    }
  },
});