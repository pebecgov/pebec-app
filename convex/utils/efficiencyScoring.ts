/**
 * Shared, side-effect-free helpers for the automatic Efficiency & Compliance
 * metrics (Monthly Report Submission, Deadline Compliance, Report Gov
 * Resolution). Used by both the per-MDA queries in `mda_scoring.ts` and the
 * bulk "run for all MDAs" mutation so the two paths cannot drift apart.
 */
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { resolveReportPeriod, type ReportPeriodSource } from "../../lib/reportPeriod";

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Convert a month name ("November") to its 0-based index. Defaults to January. */
export function getMonthNumber(monthName: string): number {
  const index = MONTH_NAMES.findIndex((m) => m.toLowerCase() === monthName.toLowerCase());
  return index !== -1 ? index : 0;
}

export type MonthRef = { month: number; year: number };

export type ScoringWindow = {
  targetYear: number;
  startDate: number;
  endDate: number;
  monthsToCheck: MonthRef[];
  usedDynamicPeriod: boolean;
};

/**
 * Resolve the date window and list of months for a scoring period.
 *
 * `fallback` controls what happens when the period string is not one of the
 * known shapes ("1st Half YYYY", "2nd Half YYYY", "YYYY") and no dynamic
 * efficiency period exists:
 *  - "yearToDate": January → current month (used for monthly reports)
 *  - "currentMonth": the current calendar month only (used for tickets)
 */
export async function resolveScoringWindow(
  ctx: QueryCtx | MutationCtx,
  scoringPeriod: string,
  fallback: "yearToDate" | "currentMonth",
): Promise<ScoringWindow> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const yearMatch = scoringPeriod.match(/\d{4}/);
  const targetYear = yearMatch ? parseInt(yearMatch[0], 10) : currentYear;

  let startDate = 0;
  let endDate = 0;
  const monthsToCheck: MonthRef[] = [];
  let usedDynamicPeriod = false;

  if (targetYear >= 2026) {
    const efficiencyConfig = await ctx.db
      .query("efficiency_periods")
      .withIndex("byYear", (q) => q.eq("year", targetYear))
      .first();

    if (efficiencyConfig) {
      const startMonth = getMonthNumber(efficiencyConfig.startMonth);
      const endMonth = getMonthNumber(efficiencyConfig.endMonth);
      startDate = new Date(efficiencyConfig.startYear, startMonth, 1).getTime();
      endDate = new Date(efficiencyConfig.endYear, endMonth + 1, 0, 23, 59, 59).getTime();

      let iterYear = efficiencyConfig.startYear;
      let iterMonth = startMonth;
      for (let i = 0; i < (efficiencyConfig.totalMonths || 12); i++) {
        monthsToCheck.push({ month: iterMonth, year: iterYear });
        iterMonth++;
        if (iterMonth > 11) {
          iterMonth = 0;
          iterYear++;
        }
      }
      usedDynamicPeriod = true;
    }
  }

  if (!usedDynamicPeriod) {
    if (scoringPeriod.includes("1st Half")) {
      startDate = new Date(targetYear, 0, 1).getTime();
      endDate = new Date(targetYear, 5, 30, 23, 59, 59).getTime();
      for (let month = 0; month <= 5; month++) monthsToCheck.push({ month, year: targetYear });
    } else if (scoringPeriod.includes("2nd Half")) {
      startDate = new Date(targetYear, 6, 1).getTime();
      endDate = new Date(targetYear, 11, 31, 23, 59, 59).getTime();
      for (let month = 6; month <= 11; month++) monthsToCheck.push({ month, year: targetYear });
    } else if (scoringPeriod === String(targetYear)) {
      startDate = new Date(targetYear, 0, 1).getTime();
      endDate = new Date(targetYear, 11, 31, 23, 59, 59).getTime();
      for (let month = 0; month <= 11; month++) monthsToCheck.push({ month, year: targetYear });
    } else if (fallback === "currentMonth") {
      startDate = new Date(currentYear, currentMonth, 1).getTime();
      endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).getTime();
      monthsToCheck.push({ month: currentMonth, year: currentYear });
    } else {
      startDate = new Date(targetYear, 0, 1).getTime();
      endDate = new Date(targetYear, currentMonth + 1, 0, 23, 59, 59).getTime();
      for (let month = 0; month <= currentMonth; month++) monthsToCheck.push({ month, year: targetYear });
    }
  }

  return { targetYear, startDate, endDate, monthsToCheck, usedDynamicPeriod };
}

type ReportLike = ReportPeriodSource & {
  _id: string;
  submittedAt: number;
};

/** Keep only reports that fall inside the scoring window (by reporting period, else by submission date). */
export function filterReportsToWindow<T extends ReportLike>(reports: T[], window: ScoringWindow): T[] {
  return reports.filter((report) => {
    const period = resolveReportPeriod(report);
    if (period) {
      return window.monthsToCheck.some((m) => m.month === period.month && m.year === period.year);
    }
    return report.submittedAt >= window.startDate && report.submittedAt <= window.endDate;
  });
}

export type MonthlyReportEntry<T> = {
  month: string;
  year: number;
  deadline: number;
  submittedDate: number | null;
  submitted: boolean;
  onTime: boolean;
  reportCount: number;
  reports: T[];
};

const WAT_OFFSET_MS = 60 * 60 * 1000;

/**
 * Deadline for a month's report: midnight West Africa Time (UTC+1) at the end
 * of the reporting month. Anything submitted after that is late.
 */
export function monthEndDeadlineWAT(year: number, month: number): number {
  return Date.UTC(year, month + 1, 1) - WAT_OFFSET_MS - 1;
}

/**
 * Group an MDA's reports by month and derive submitted / on-time flags.
 * `reports` should already be filtered to the MDA and to the window.
 */
export function buildMonthlyReportData<T extends ReportLike>(
  reports: T[],
  monthsToCheck: MonthRef[],
): MonthlyReportEntry<T>[] {
  const monthlyData: MonthlyReportEntry<T>[] = [];
  const reportsAssignedByName = new Set<string>();

  for (const { month, year } of monthsToCheck) {
    const monthName = new Date(year, month, 1).toLocaleString("default", { month: "long" });

    const monthReports = reports.filter((report) => {
      const reportId = report._id;
      const reportDate = new Date(report.submittedAt);

      const parsedTarget = resolveReportPeriod(report);
      const matchesByName =
        parsedTarget !== null && parsedTarget.month === month && parsedTarget.year === year;
      if (matchesByName && !reportsAssignedByName.has(reportId)) {
        reportsAssignedByName.add(reportId);
        return true;
      }

      return (
        !reportsAssignedByName.has(reportId) &&
        reportDate.getMonth() === month &&
        reportDate.getFullYear() === year
      );
    });

    const deadline = monthEndDeadlineWAT(year, month);
    const submitted = monthReports.length > 0;
    const submittedDate = submitted ? monthReports[0].submittedAt : null;
    const onTime = submittedDate !== null && submittedDate <= deadline;

    monthlyData.push({
      month: monthName,
      year,
      deadline,
      submittedDate,
      submitted,
      onTime,
      reportCount: monthReports.length,
      reports: monthReports,
    });
  }

  return monthlyData;
}

type TicketLike = {
  createdAt: number;
  updatedAt: number;
  status: string;
  firstResponseAt?: number;
};

export type TicketStats = {
  totalTickets: number;
  resolvedTickets: number;
  resolutionRate: number;
  averageResponseTime: number;
  averageResolutionTime: number;
};

/** Resolution-rate and timing stats for tickets created within [startDate, endDate]. Times are in hours. */
export function computeTicketStats(tickets: TicketLike[], startDate: number, endDate: number): TicketStats {
  const filtered = tickets.filter((t) => t.createdAt >= startDate && t.createdAt <= endDate);
  const isResolved = (t: TicketLike) => t.status === "resolved" || t.status === "closed";

  const totalTickets = filtered.length;
  const resolvedTickets = filtered.filter(isResolved).length;
  const resolutionRate = totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0;

  const responseTimes = filtered
    .filter((t) => t.firstResponseAt)
    .map((t) => (t.firstResponseAt! - t.createdAt) / (1000 * 60 * 60));
  const resolutionTimes = filtered
    .filter(isResolved)
    .map((t) => (t.updatedAt - t.createdAt) / (1000 * 60 * 60));

  const avg = (xs: number[]) => (xs.length > 0 ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

  return {
    totalTickets,
    resolvedTickets,
    resolutionRate,
    averageResponseTime: avg(responseTimes),
    averageResolutionTime: avg(resolutionTimes),
  };
}

export const DEFAULT_REPORTGOV_MINIMUM_THRESHOLD = 5;

/**
 * Adjusted resolution rate (2026+):
 *   ((CR × RR) + (MT × ARR)) / (CR + MT)
 * pulls MDAs with few complaints towards the system average. MDAs with no
 * complaints, or nothing resolved, get 0.
 */
export function calculateAdjustedResolutionRate({
  complaintsReceived,
  resolutionRate,
  minimumThreshold,
  systemAverageResolutionRate,
}: {
  complaintsReceived: number;
  resolutionRate: number;
  minimumThreshold: number;
  systemAverageResolutionRate: number;
}): number {
  if (complaintsReceived <= 0 || resolutionRate <= 0) return 0;
  return (
    (complaintsReceived * resolutionRate + minimumThreshold * systemAverageResolutionRate) /
    (complaintsReceived + minimumThreshold)
  );
}

export type SystemResolutionContext = {
  systemTotalTickets: number;
  systemResolvedTickets: number;
  systemAverageResolutionRate: number;
  minimumThreshold: number;
};

/**
 * System-wide resolution figures for the adjusted-rate formula (2026+): all
 * tickets assigned to any MDA and created inside the window, plus the configured
 * minimum threshold. Compute once and reuse across MDAs when scoring in bulk.
 */
export async function loadSystemResolutionContext(
  ctx: QueryCtx | MutationCtx,
  targetYear: number,
  startDate: number,
  endDate: number,
): Promise<SystemResolutionContext> {
  const [systemTickets, efficiencyConfig] = await Promise.all([
    ctx.db
      .query("tickets")
      .withIndex("byCreatedAt", (q) => q.gte("createdAt", startDate).lte("createdAt", endDate))
      .collect(),
    ctx.db
      .query("efficiency_periods")
      .withIndex("byYear", (q) => q.eq("year", targetYear))
      .first(),
  ]);
  const assigned = systemTickets.filter((t) => t.assignedMDA !== undefined);
  const systemTotalTickets = assigned.length;
  const systemResolvedTickets = assigned.filter((t) => t.status === "resolved" || t.status === "closed").length;
  return {
    systemTotalTickets,
    systemResolvedTickets,
    systemAverageResolutionRate: systemTotalTickets > 0 ? (systemResolvedTickets / systemTotalTickets) * 100 : 0,
    minimumThreshold: efficiencyConfig?.reportGovMinimumThreshold ?? DEFAULT_REPORTGOV_MINIMUM_THRESHOLD,
  };
}

export type ReportGovInput = Pick<
  TicketStats,
  "totalTickets" | "resolvedTickets" | "resolutionRate" | "averageResponseTime" | "averageResolutionTime"
> & {
  /** Set (non-null) for 2026+; when present the resolution-rate points are proportional to it. */
  adjustedResolutionRate?: number | null;
};

export type ReportGovBreakdown = {
  resolutionRate: number;
  responseTime: number;
  resolutionTime: number;
  total: number;
};

/**
 * Report Gov Resolution score with its component breakdown.
 * Weights (of `reportGovPoints`):
 *   - resolution rate 75%
 *   - response time 10%
 *   - resolution time 15%
 *
 * Resolution-rate points: when `adjustedResolutionRate` is provided (2026+),
 * points are proportional to it and an MDA with nothing resolved earns none.
 * Otherwise (2025) the legacy 7-tier ladder applies.
 *
 * Response and resolution time are binary: ≤72 hours → full component points,
 * otherwise 0 (no intermediate tiers).
 */
export function computeReportGovBreakdown(stats: ReportGovInput, reportGovPoints: number): ReportGovBreakdown {
  const { totalTickets, resolvedTickets, resolutionRate, averageResponseTime, averageResolutionTime } = stats;
  const adjusted = stats.adjustedResolutionRate ?? null;

  const maxResRatePoints = reportGovPoints * 0.75;
  const maxResponsePoints = reportGovPoints * 0.1;
  const maxResolutionTimePoints = reportGovPoints * 0.15;

  let resRateScore = 0;
  let responseScore = 0;
  let resolutionTimeScore = 0;

  if (totalTickets > 0) {
    if (adjusted !== null) {
      resRateScore =
        resolvedTickets > 0 ? maxResRatePoints * (Math.min(Math.max(adjusted, 0), 100) / 100) : 0;
    } else if (resolutionRate >= 100) resRateScore = maxResRatePoints;
    else if (resolutionRate >= 90) resRateScore = maxResRatePoints * (6 / 7);
    else if (resolutionRate >= 80) resRateScore = maxResRatePoints * (5 / 7);
    else if (resolutionRate >= 70) resRateScore = maxResRatePoints * (4 / 7);
    else if (resolutionRate >= 60) resRateScore = maxResRatePoints * (3 / 7);
    else if (resolutionRate >= 50) resRateScore = maxResRatePoints * (2 / 7);
    else if (resolutionRate >= 40) resRateScore = maxResRatePoints * (1 / 7);

    // Response time: pass/fail at 72h
    if (averageResponseTime > 0 && averageResponseTime <= 72) {
      responseScore = maxResponsePoints;
    }

    // Resolution time: pass/fail at 72h
    if (averageResolutionTime > 0 && averageResolutionTime <= 72) {
      resolutionTimeScore = maxResolutionTimePoints;
    }
  }

  return {
    resolutionRate: resRateScore,
    responseTime: responseScore,
    resolutionTime: resolutionTimeScore,
    total: Math.min(resRateScore + responseScore + resolutionTimeScore, reportGovPoints),
  };
}

/** Convenience wrapper returning only the capped total. */
export function computeReportGovScore(stats: ReportGovInput, reportGovPoints: number): number {
  return computeReportGovBreakdown(stats, reportGovPoints).total;
}

/** Proportional score: (hits / total) × points, 0 when there are no months. */
export function proportionalScore(hits: number, total: number, points: number): number {
  if (total <= 0) return 0;
  return (Math.min(hits, total) / total) * points;
}
