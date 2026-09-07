import { v } from "convex/values";
import { query } from "./_generated/server";
import { api } from "./_generated/api";
import { canonicalizeMdaName } from "../lib/mdaNameAliases";
import {
  BEEPA_TRACKER_ROSTER,
  matchBeepaTrackerRosterEntry,
  type BeepaTrackerRosterEntry,
} from "../lib/beepaTrackerRoster";
import {
  indicators,
  indicatorMaxScores,
  overallIndicatorMaxScore,
  type IndicatorKey,
} from "./config/indicators";
import { STATE_LIST, normalizeStateName, VALID_NIGERIAN_STATES } from "./stateUtils";

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

    // Always seed the full roster so Total States = 37 even before any scores exist.
    const stateDetails = new Map<
      string,
      {
        totalScore: number;
        indicators: Record<
          string,
          {
            name: string;
            score: number;
            maxScore: number;
            subIndicators: Record<string, number>;
          }
        >;
        lastUpdated: number;
      }
    >();

    for (const stateName of STATE_LIST) {
      stateDetails.set(stateName, {
        totalScore: 0,
        indicators: {},
        lastUpdated: 0,
      });
    }

    const allScores = await ctx.db
      .query("state_scores")
      .withIndex("byYear", (q) => q.eq("year", currentYear))
      .collect();

    for (const score of allScores) {
      const stateName = normalizeStateName(score.state);
      if (!VALID_NIGERIAN_STATES.has(stateName)) {
        continue;
      }

      const indicatorKey = score.indicator as IndicatorKey;
      if (!(indicatorKey in indicatorMaxScores)) {
        continue;
      }

      const stateData = stateDetails.get(stateName);
      if (!stateData) {
        continue;
      }

      stateData.totalScore += score.score;

      if (score.createdAt > stateData.lastUpdated) {
        stateData.lastUpdated = score.createdAt;
      }

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

    const denominator: number = overallIndicatorMaxScore;
    const sortedStates = Array.from(stateDetails.entries())
      .map(([stateName, data]) => {
        const percentage = denominator > 0 ? (data.totalScore / denominator) * 100 : 0;
        return {
          state: stateName,
          totalScore: data.totalScore,
          maxScore: denominator,
          percentage: Math.round(percentage * 100) / 100,
          lastUpdated: data.lastUpdated,
          indicators: data.indicators,
        };
      })
      // Scored states first (by %), then unscored alphabetically so order stays stable.
      .sort((a, b) => {
        if (b.percentage !== a.percentage) return b.percentage - a.percentage;
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        return a.state.localeCompare(b.state);
      });

    // Dense tied ranks: equal scores share the same number (1, 1, 1, 2…).
    const states = withDenseTiedRanks(sortedStates, (s) => s.totalScore);

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

/** Same score → same rank; next distinct score bumps by 1 (dense / “1223” ranking). */
function withDenseTiedRanks<T>(
  items: T[],
  getScore: (item: T) => number
): Array<T & { rank: number }> {
  if (items.length === 0) return [];

  let rank = 1;
  return items.map((item, index) => {
    if (index > 0) {
      const prev = roundScore(getScore(items[index - 1]!));
      const curr = roundScore(getScore(item));
      if (curr !== prev) {
        rank += 1;
      }
    }
    return { ...item, rank };
  });
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
    othersItems?: Array<{ weight?: number; itemId?: string; itemName?: string }>;
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

  const othersItems = [...(config?.othersItems || [])].sort(
    (a, b) => ((a as { order?: number }).order ?? 0) - ((b as { order?: number }).order ?? 0)
  );
  for (const item of othersItems) {
    const weight = item.weight;
    if (!item.itemId || !item.itemName || weight == null || weight <= 0) continue;
    metrics.push({
      key: `others:${item.itemId}`,
      label: item.itemName,
      max: weight,
    });
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
    default: {
      if (key.startsWith("others:")) {
        const itemId = key.slice("others:".length);
        const others = mda.others as { scores?: Record<string, number> } | null | undefined;
        return {
          score: roundScore(Number(others?.scores?.[itemId]) || 0),
          max: frameworkMax,
        };
      }
      return { score: 0, max: frameworkMax };
    }
  }
}

function isMetricExcluded(excluded: string[] | undefined, key: string): boolean {
  if (!excluded || excluded.length === 0) return false;
  if (excluded.includes(key)) return true;
  if (key === "mystery" && excluded.includes("mysteryShopping")) return true;
  if (key === "others" && excluded.some((item) => item === "others" || item.startsWith("others:"))) {
    return true;
  }
  if (key.startsWith("others:")) {
    return excluded.includes("others") || excluded.includes(key);
  }
  return false;
}

type AdjustmentItem = {
  id: string;
  name: string;
  value: number;
};

type ScoringYearConfig = {
  efficiencyPeriod?: {
    slaPoints?: number;
    reportGovPoints?: number;
    reportSubmissionPoints?: number;
    timelinessPoints?: number;
  } | null;
  mysteryShoppingTypes?: Array<{ questions?: Array<{ weight?: number }> }>;
  othersItems?: Array<{ itemId: string; itemName: string; weight: number; order?: number }>;
  innovationItems?: Array<{ weight?: number }>;
  stakeholderItems?: Array<{ weight?: number }>;
  penaltyItems?: Array<{ penaltyId: string; penaltyName: string; penaltyValue: number }>;
  bonusItems?: Array<{ bonusId: string; bonusName: string; bonusValue: number }>;
};

type OthersBreakdownItem = {
  itemId: string;
  itemName: string;
  score: number;
  max: number;
};

type PublicMdaRow = {
  mdaName: string;
  finalScore: number;
  maxPossibleScore: number;
  percentage: number;
  metricScores: Record<string, { score: number; max: number }>;
  othersBreakdown: OthersBreakdownItem[];
  excludedMetrics: string[];
  applicableMetricCount: number;
  penaltyScore: number;
  bonusScore: number;
  penaltyValues: Record<string, boolean>;
  bonusValues: Record<string, boolean>;
  lastUpdated: number;
  rank: number;
};

type PublicMdaScoresResult = {
  mdas: PublicMdaRow[];
  totalMdas: number;
  year: number;
  requestedYear?: number;
  availableYears: number[];
  hasDataForRequestedYear: boolean;
  frameworkMetrics: FrameworkMetric[];
  adjustments: {
    penalties: AdjustmentItem[];
    bonuses: AdjustmentItem[];
  };
  message?: string;
};

const othersBreakdownValidator = v.array(
  v.object({
    itemId: v.string(),
    itemName: v.string(),
    score: v.number(),
    max: v.number(),
  })
);

const publicMdaScoresReturns = v.object({
  mdas: v.array(
    v.object({
      mdaName: v.string(),
      finalScore: v.number(),
      maxPossibleScore: v.number(),
      percentage: v.number(),
      metricScores: v.record(v.string(), v.object({ score: v.number(), max: v.number() })),
      othersBreakdown: othersBreakdownValidator,
      excludedMetrics: v.array(v.string()),
      applicableMetricCount: v.number(),
      penaltyScore: v.number(),
      bonusScore: v.number(),
      penaltyValues: v.record(v.string(), v.boolean()),
      bonusValues: v.record(v.string(), v.boolean()),
      lastUpdated: v.number(),
      rank: v.number(),
    })
  ),
  totalMdas: v.number(),
  year: v.number(),
  requestedYear: v.optional(v.number()),
  availableYears: v.array(v.number()),
  hasDataForRequestedYear: v.boolean(),
  frameworkMetrics: v.array(
    v.object({
      key: v.string(),
      label: v.string(),
      max: v.number(),
    })
  ),
  adjustments: v.object({
    penalties: v.array(v.object({ id: v.string(), name: v.string(), value: v.number() })),
    bonuses: v.array(v.object({ id: v.string(), name: v.string(), value: v.number() })),
  }),
  message: v.optional(v.string()),
});

function buildOthersBreakdown(
  mda: Record<string, unknown>,
  othersItems: Array<{ itemId: string; itemName: string; weight: number; order?: number }>,
  excludedMetrics: string[]
): OthersBreakdownItem[] {
  const others = mda.others as
    | { scores?: Record<string, number>; values?: Record<string, boolean | number> }
    | null
    | undefined;
  const scores = others?.scores || {};
  const fullyExcluded = excludedMetrics.includes("others");

  return [...othersItems]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .filter((item) => !fullyExcluded && !excludedMetrics.includes(`others:${item.itemId}`))
    .map((item) => ({
      itemId: item.itemId,
      itemName: item.itemName,
      score: roundScore(Number(scores[item.itemId]) || 0),
      max: item.weight,
    }));
}

function findBeepaExclusionKey(
  othersItems: Array<{ itemId: string; itemName: string }> | undefined
): string | null {
  if (!othersItems?.length) return null;
  const beepa = othersItems.find((item) => {
    const key = String(item.itemName || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    return key === "beepa" || key.includes("beepa");
  });
  return beepa ? `others:${beepa.itemId}` : null;
}

function buildPublicMdaRowFromDashboard(
  mda: Record<string, unknown>,
  displayName: string,
  frameworkMetrics: FrameworkMetric[],
  othersItems: Array<{ itemId: string; itemName: string; weight: number; order?: number }>,
  extraExcluded: string[] = []
): PublicMdaRow {
  const excludedMetrics = Array.from(
    new Set([
      ...(Array.isArray(mda.excludedMetrics) ? (mda.excludedMetrics as string[]) : []),
      ...extraExcluded,
    ])
  );
  const metricScores: Record<string, { score: number; max: number }> = {};
  for (const metric of frameworkMetrics) {
    metricScores[metric.key] = metricScoreFromDashboard(mda, metric.key, metric.max);
  }

  const penalties = mda.penalties as { score?: number; values?: Record<string, boolean> } | null | undefined;
  const bonuses = mda.bonuses as { score?: number; values?: Record<string, boolean> } | null | undefined;
  const othersBreakdown = buildOthersBreakdown(mda, othersItems, excludedMetrics);

  const maxFromFramework = frameworkMetrics
    .filter((metric) => !isMetricExcluded(excludedMetrics, metric.key))
    .reduce((sum, metric) => sum + metric.max, 0);

  return {
    mdaName: displayName,
    finalScore: roundScore(Number(mda.totalScore) || 0),
    maxPossibleScore: Number(mda.maxPossiblePoints) || maxFromFramework || 100,
    percentage: roundScore(Number(mda.totalPercentage) || 0),
    metricScores,
    othersBreakdown,
    excludedMetrics,
    applicableMetricCount: frameworkMetrics.filter(
      (metric) => !isMetricExcluded(excludedMetrics, metric.key)
    ).length,
    penaltyScore: roundScore(Math.abs(penalties?.score || 0)),
    bonusScore: roundScore(Math.abs(bonuses?.score || 0)),
    penaltyValues: penalties?.values || {},
    bonusValues: bonuses?.values || {},
    lastUpdated: Number(mda.lastUpdated) || Date.now(),
    rank: 0,
  };
}

function buildEmptyPublicMdaRow(
  entry: BeepaTrackerRosterEntry,
  frameworkMetrics: FrameworkMetric[],
  beepaExclusionKey: string | null
): PublicMdaRow {
  const excludedMetrics =
    entry.beepaExempted && beepaExclusionKey ? [beepaExclusionKey] : [];
  const maxPossibleScore = frameworkMetrics
    .filter((metric) => !isMetricExcluded(excludedMetrics, metric.key))
    .reduce((sum, metric) => sum + metric.max, 0);
  const metricScores: Record<string, { score: number; max: number }> = {};
  for (const metric of frameworkMetrics) {
    metricScores[metric.key] = { score: 0, max: metric.max };
  }

  return {
    mdaName: entry.name,
    finalScore: 0,
    maxPossibleScore: maxPossibleScore || 100,
    percentage: 0,
    metricScores,
    othersBreakdown: [],
    excludedMetrics,
    applicableMetricCount: frameworkMetrics.filter(
      (metric) => !isMetricExcluded(excludedMetrics, metric.key)
    ).length,
    penaltyScore: 0,
    bonusScore: 0,
    penaltyValues: {},
    bonusValues: {},
    lastUpdated: Date.now(),
    rank: 0,
  };
}

function emptyPublicMdaScores(
  year: number,
  message: string,
  frameworkMetrics: FrameworkMetric[] = []
): PublicMdaScoresResult {
  return {
    mdas: [],
    totalMdas: 0,
    year,
    availableYears: [],
    hasDataForRequestedYear: false,
    frameworkMetrics,
    adjustments: { penalties: [], bonuses: [] },
    message,
  };
}

// Public MDA scoring query that uses the exact same data source as the Live Dashboard
export const getPublicMdaScores = query({
  args: {
    year: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  returns: publicMdaScoresReturns,
  handler: async (ctx, args): Promise<PublicMdaScoresResult> => {
    const requestedYear = args.year || new Date().getFullYear();

    try {
      const [dashboardResult, rawYearConfig] = await Promise.all([
        ctx.runQuery(api.mda_scoring.getAllMdaSavedDataForDashboard, {
          year: requestedYear,
        }),
        ctx.runQuery(api.scoring_config.getAllConfigurationsForYear, {
          year: requestedYear,
        }),
      ]);

      const yearConfig = (rawYearConfig ?? null) as ScoringYearConfig | null;
      const frameworkMetrics = buildBfaFrameworkMetrics(requestedYear, yearConfig);
      const adjustments = {
        penalties: (yearConfig?.penaltyItems || []).map((item) => ({
          id: item.penaltyId,
          name: item.penaltyName,
          value: item.penaltyValue,
        })),
        bonuses: (yearConfig?.bonusItems || []).map((item) => ({
          id: item.bonusId,
          name: item.bonusName,
          value: item.bonusValue,
        })),
      };
      const dashboardData = ((dashboardResult as { data?: Array<Record<string, unknown>> } | null)?.data ||
        []) as Array<Record<string, unknown>>;
      const othersItems = yearConfig?.othersItems || [];
      const beepaExclusionKey = findBeepaExclusionKey(othersItems);

      // 2026+ public tracker is scoped to the official BEEPA MDA roster (minus BOA).
      if (requestedYear >= 2026) {
        const dashboardByRosterName = new Map<string, Record<string, unknown>>();
        for (const mda of dashboardData) {
          if (!mda || typeof mda.mdaName !== "string") continue;
          const matched = matchBeepaTrackerRosterEntry(String(mda.mdaName));
          if (!matched) continue;
          const key = matched.name;
          const existing = dashboardByRosterName.get(key);
          if (!existing || Number(mda.totalScore) > Number(existing.totalScore || 0)) {
            dashboardByRosterName.set(key, mda);
          }
        }

        const sortedRosterMdas: PublicMdaRow[] = BEEPA_TRACKER_ROSTER.map((entry) => {
          const dashboardRow = dashboardByRosterName.get(entry.name);
          const extraExcluded =
            entry.beepaExempted && beepaExclusionKey ? [beepaExclusionKey] : [];
          if (dashboardRow) {
            return buildPublicMdaRowFromDashboard(
              dashboardRow,
              entry.name,
              frameworkMetrics,
              othersItems,
              extraExcluded
            );
          }
          return buildEmptyPublicMdaRow(entry, frameworkMetrics, beepaExclusionKey);
        }).sort((a, b) => b.finalScore - a.finalScore || a.mdaName.localeCompare(b.mdaName));

        const scoredMdas = withDenseTiedRanks(sortedRosterMdas, (mda) => mda.finalScore);

        const limitedMdas = args.limit ? scoredMdas.slice(0, args.limit) : scoredMdas;
        const hasAnyScore = scoredMdas.some((mda) => mda.finalScore > 0);

        return {
          mdas: limitedMdas,
          totalMdas: BEEPA_TRACKER_ROSTER.length,
          year: requestedYear,
          requestedYear: args.year,
          availableYears: hasAnyScore ? [requestedYear] : [],
          hasDataForRequestedYear: hasAnyScore,
          frameworkMetrics,
          adjustments,
          message: hasAnyScore
            ? undefined
            : `No MDA scoring data available for ${requestedYear} yet. Showing the ${BEEPA_TRACKER_ROSTER.length} agencies on the BEEPA assessment roster.`,
        };
      }

      if (!dashboardData.length) {
        return {
          ...emptyPublicMdaScores(
            requestedYear,
            `No MDA scoring data available for ${requestedYear}. Federal MDAs have not been scored for this assessment period.`,
            frameworkMetrics
          ),
          adjustments,
        };
      }

      const sortedLegacyMdas: PublicMdaRow[] = dashboardData
        .filter((mda) => mda && typeof mda.mdaName === "string" && Number(mda.totalScore) > 0)
        .map((mda) =>
          buildPublicMdaRowFromDashboard(
            mda,
            canonicalizeMdaName(String(mda.mdaName)),
            frameworkMetrics,
            othersItems
          )
        )
        .sort((a, b) => b.finalScore - a.finalScore || a.mdaName.localeCompare(b.mdaName));

      const scoredMdas = withDenseTiedRanks(sortedLegacyMdas, (mda) => mda.finalScore);

      const limitedMdas = args.limit ? scoredMdas.slice(0, args.limit) : scoredMdas;

      return {
        mdas: limitedMdas,
        totalMdas: scoredMdas.length,
        year: requestedYear,
        requestedYear: args.year,
        availableYears: scoredMdas.length > 0 ? [requestedYear] : [],
        hasDataForRequestedYear: scoredMdas.length > 0,
        frameworkMetrics,
        adjustments,
      };
    } catch (error) {
      console.error("Error fetching public MDA scores:", error);
      return emptyPublicMdaScores(
        requestedYear,
        "Error loading MDA scoring data. Please try again later."
      );
    }
  },
});