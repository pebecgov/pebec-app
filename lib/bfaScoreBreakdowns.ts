/**
 * Plain-language "how this score was calculated" lines for the public MDA tracker.
 * Keep this file free of Convex server imports so the Next.js client can use it.
 */

export type ScoreBreakdownLine = {
  label: string;
  /** Short fact, e.g. "11 of 13 months" or "64.8%" */
  value?: string;
  /** Points earned for this part */
  points?: number;
  /** Max points for this part */
  maxPoints?: number;
  /** One-sentence explanation */
  explanation: string;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return round2((part / whole) * 100);
}

function formatHours(hours: number): string {
  if (!hours || hours <= 0) return "—";
  if (hours < 48) return `${round2(hours)} hours`;
  const days = round2(hours / 24);
  return `${round2(hours)} hours (about ${days} day${days === 1 ? "" : "s"})`;
}

/** Mirrors convex/utils/efficiencyScoring.computeReportGovBreakdown (client-safe copy). */
function computeReportGovBreakdown(
  stats: {
    totalTickets: number;
    resolvedTickets: number;
    resolutionRate: number;
    averageResponseTime: number;
    averageResolutionTime: number;
    adjustedResolutionRate?: number | null;
  },
  reportGovPoints: number,
): { resolutionRate: number; responseTime: number; resolutionTime: number; total: number } {
  const { totalTickets, resolvedTickets, resolutionRate, averageResponseTime, averageResolutionTime } =
    stats;
  const adjusted = stats.adjustedResolutionRate ?? null;

  const maxResRatePoints = reportGovPoints * 0.4667;
  const maxResponsePoints = reportGovPoints * 0.2;
  const maxResolutionTimePoints = reportGovPoints * 0.3333;

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

    if (averageResponseTime > 0) {
      if (averageResponseTime <= 24) responseScore = maxResponsePoints;
      else if (averageResponseTime <= 48) responseScore = maxResponsePoints * (2 / 3);
      else if (averageResponseTime <= 72) responseScore = maxResponsePoints * (1 / 3);
    }

    if (averageResolutionTime > 0) {
      if (averageResolutionTime <= 48) resolutionTimeScore = maxResolutionTimePoints;
      else if (averageResolutionTime <= 72) resolutionTimeScore = maxResolutionTimePoints * (4 / 5);
      else if (averageResolutionTime <= 96) resolutionTimeScore = maxResolutionTimePoints * (3 / 5);
      else if (averageResolutionTime <= 120) resolutionTimeScore = maxResolutionTimePoints * (2 / 5);
      else if (averageResolutionTime <= 144) resolutionTimeScore = maxResolutionTimePoints * (1 / 5);
    }
  }

  return {
    resolutionRate: resRateScore,
    responseTime: responseScore,
    resolutionTime: resolutionTimeScore,
    total: Math.min(resRateScore + responseScore + resolutionTimeScore, reportGovPoints),
  };
}

/** Monthly Report Submission / Deadline Compliance: hits ÷ months × max points */
export function proportionalMonthsBreakdown(args: {
  hits: number;
  totalMonths: number;
  score: number;
  maxPoints: number;
  hitLabel: string;
}): ScoreBreakdownLine[] {
  const { hits, totalMonths, score, maxPoints, hitLabel } = args;
  const percentage = pct(hits, totalMonths);
  const pointsPerMonth = totalMonths > 0 ? round2(maxPoints / totalMonths) : 0;
  return [
    {
      label: "How the score is calculated",
      value: `${hits} of ${totalMonths} ${hitLabel}`,
      points: round2(score),
      maxPoints: round2(maxPoints),
      explanation: `${hits} of ${totalMonths} months were ${hitLabel} (${percentage}%). Each month is worth about ${pointsPerMonth} point${pointsPerMonth === 1 ? "" : "s"}. Score = ${percentage}% × ${round2(maxPoints)} points = ${round2(score)}.`,
    },
  ];
}

export function slaScoreBreakdown(args: {
  monthsWithData: number;
  totalMonths: number;
  score: number;
  maxPoints: number;
}): ScoreBreakdownLine[] {
  const { monthsWithData, totalMonths, score, maxPoints } = args;
  const pointsPerMonth = totalMonths > 0 ? round2(maxPoints / totalMonths) : 0;
  return [
    {
      label: "How the score is calculated",
      value: `${monthsWithData} of ${totalMonths} months scored`,
      points: round2(score),
      maxPoints: round2(maxPoints),
      explanation:
        monthsWithData > 0
          ? `${monthsWithData} of ${totalMonths} months earned SLA points from a scored Excel file. Each month can contribute up to about ${pointsPerMonth} points, based on that month’s file compliance score. See the month grid below for every month’s points, percentage, and any problems. Total: ${round2(score)} of ${round2(maxPoints)}.`
          : `No months have earned SLA points yet out of ${totalMonths} in this period (maximum ${round2(maxPoints)} points). See the month grid below for what is still missing.`,
    },
  ];
}

export function reportGovScoreBreakdown(args: {
  totalTickets: number;
  resolvedTickets: number;
  resolutionRate: number;
  adjustedResolutionRate?: number | null;
  averageResponseTime: number;
  averageResolutionTime: number;
  score: number;
  maxPoints: number;
  isSkipped?: boolean;
}): ScoreBreakdownLine[] {
  if (args.isSkipped) {
    return [
      {
        label: "Report Gov",
        value: "Skipped",
        points: 0,
        maxPoints: round2(args.maxPoints),
        explanation:
          "This metric was set to Skip (0 points) for this agency, so Report Gov does not add to the total.",
      },
    ];
  }

  const breakdown = computeReportGovBreakdown(
    {
      totalTickets: args.totalTickets,
      resolvedTickets: args.resolvedTickets,
      resolutionRate: args.resolutionRate,
      averageResponseTime: args.averageResponseTime,
      averageResolutionTime: args.averageResolutionTime,
      adjustedResolutionRate: args.adjustedResolutionRate ?? null,
    },
    args.maxPoints,
  );

  const rateMax = round2(args.maxPoints * 0.4667);
  const responseMax = round2(args.maxPoints * 0.2);
  const resolutionMax = round2(args.maxPoints * 0.3333);
  const rateShown =
    args.adjustedResolutionRate != null ? args.adjustedResolutionRate : args.resolutionRate;

  return [
    {
      label: "Complaints handled",
      value: `${args.totalTickets} tickets · ${args.resolvedTickets} resolved`,
      explanation:
        args.totalTickets > 0
          ? `${args.resolvedTickets} of ${args.totalTickets} ReportGov tickets were resolved (${round2(args.resolutionRate)}% raw resolution rate).`
          : "No ReportGov tickets were assigned to this agency in the scoring period.",
    },
    {
      label: "Resolution rate points",
      value:
        args.adjustedResolutionRate != null
          ? `${round2(rateShown)}% (adjusted)`
          : `${round2(rateShown)}%`,
      points: round2(breakdown.resolutionRate),
      maxPoints: rateMax,
      explanation:
        args.adjustedResolutionRate != null
          ? `Resolution-rate points use an adjusted rate (${round2(args.adjustedResolutionRate)}%) that balances your results with the system average when you have few complaints. This part is worth up to ${rateMax} of ${round2(args.maxPoints)} points → ${round2(breakdown.resolutionRate)} earned.`
          : `Resolution-rate points are based on ${round2(args.resolutionRate)}% of tickets resolved. This part is worth up to ${rateMax} of ${round2(args.maxPoints)} points → ${round2(breakdown.resolutionRate)} earned.`,
    },
    {
      label: "Response time points",
      value: formatHours(args.averageResponseTime),
      points: round2(breakdown.responseTime),
      maxPoints: responseMax,
      explanation: `Average time to first response was ${formatHours(args.averageResponseTime)}. Faster responses earn more of the ${responseMax} points available for this part → ${round2(breakdown.responseTime)} earned.`,
    },
    {
      label: "Resolution time points",
      value: formatHours(args.averageResolutionTime),
      points: round2(breakdown.resolutionTime),
      maxPoints: resolutionMax,
      explanation: `Average time to fully resolve a ticket was ${formatHours(args.averageResolutionTime)}. Faster resolutions earn more of the ${resolutionMax} points available for this part → ${round2(breakdown.resolutionTime)} earned.`,
    },
    {
      label: "Total for Report Gov",
      value: `${round2(args.score)} / ${round2(args.maxPoints)}`,
      points: round2(args.score),
      maxPoints: round2(args.maxPoints),
      explanation: `Adding the three parts: ${round2(breakdown.resolutionRate)} + ${round2(breakdown.responseTime)} + ${round2(breakdown.resolutionTime)} = ${round2(breakdown.total)} (shown as ${round2(args.score)} on the tracker).`,
    },
  ];
}

export function mysteryScoreBreakdown(args: {
  score: number;
  maxPoints: number;
  percentage: number;
  questionLines?: Array<{ label: string; score: number; maxPoints: number }>;
}): ScoreBreakdownLine[] {
  const lines: ScoreBreakdownLine[] = [
    {
      label: "Overall mystery shopping",
      value: `${round2(args.percentage)}%`,
      points: round2(args.score),
      maxPoints: round2(args.maxPoints),
      explanation: `Mystery shopping scored ${round2(args.percentage)}% of the available marks → ${round2(args.score)} of ${round2(args.maxPoints)} points.`,
    },
  ];

  for (const q of args.questionLines || []) {
    lines.push({
      label: q.label,
      value: `${round2(q.score)} / ${round2(q.maxPoints)}`,
      points: round2(q.score),
      maxPoints: round2(q.maxPoints),
      explanation: `This question contributed ${round2(q.score)} of its ${round2(q.maxPoints)} possible points.`,
    });
  }

  return lines;
}

export function othersItemBreakdown(args: {
  score: number;
  maxPoints: number;
  rawValue?: boolean | number | null;
  answerType?: string;
}): ScoreBreakdownLine[] {
  const { score, maxPoints, rawValue, answerType } = args;
  if (typeof rawValue === "boolean" || answerType === "yes_no") {
    return [
      {
        label: "Answer",
        value: rawValue === true ? "Yes" : rawValue === false ? "No" : "—",
        points: round2(score),
        maxPoints: round2(maxPoints),
        explanation:
          rawValue === true
            ? `Marked Yes → full ${round2(maxPoints)} points.`
            : rawValue === false
              ? `Marked No → 0 of ${round2(maxPoints)} points.`
              : `Score for this item: ${round2(score)} of ${round2(maxPoints)}.`,
      },
    ];
  }
  if (typeof rawValue === "number") {
    return [
      {
        label: "Scale rating",
        value: `${rawValue} / 10`,
        points: round2(score),
        maxPoints: round2(maxPoints),
        explanation: `Rated ${rawValue} out of 10 on the scale → ${round2(score)} of ${round2(maxPoints)} points for this item.`,
      },
    ];
  }
  return [
    {
      label: "Score",
      value: `${round2(score)} / ${round2(maxPoints)}`,
      points: round2(score),
      maxPoints: round2(maxPoints),
      explanation: `This item scored ${round2(score)} of ${round2(maxPoints)} points.`,
    },
  ];
}

/** Build all BFA metric breakdown maps from a dashboard MDA row. */
export function buildMdaMetricScoreBreakdowns(
  mda: Record<string, unknown>,
  othersItems: Array<{
    itemId: string;
    itemName: string;
    weight: number;
    answerType?: string;
  }> = [],
): Record<string, ScoreBreakdownLine[]> {
  const out: Record<string, ScoreBreakdownLine[]> = {};

  const sla = mda.sla as
    | { score?: number; monthsWithData?: number; totalMonths?: number; maxPossibleScore?: number }
    | null
    | undefined;
  if (sla) {
    out.sla = slaScoreBreakdown({
      monthsWithData: sla.monthsWithData ?? 0,
      totalMonths: sla.totalMonths ?? 12,
      score: sla.score ?? 0,
      maxPoints: sla.maxPossibleScore ?? 5,
    });
  }

  const mystery = mda.mysteryShopping as
    | {
        score?: number;
        percentage?: number;
        maxPossibleScore?: number;
        questionLines?: Array<{ label: string; score: number; maxPoints: number }>;
      }
    | null
    | undefined;
  if (mystery) {
    out.mystery = mysteryScoreBreakdown({
      score: mystery.score ?? 0,
      maxPoints: mystery.maxPossibleScore ?? 0,
      percentage: mystery.percentage ?? 0,
      questionLines: mystery.questionLines,
    });
  }

  const reportGov = mda.reportGovResolution as
    | {
        score?: number;
        totalTickets?: number;
        resolvedTickets?: number;
        resolutionRate?: number;
        adjustedResolutionRate?: number | null;
        averageResponseTime?: number;
        averageResolutionTime?: number;
        maxPossibleScore?: number;
        isSkipped?: boolean;
      }
    | null
    | undefined;
  if (reportGov) {
    out.reportGov = reportGovScoreBreakdown({
      totalTickets: reportGov.totalTickets ?? 0,
      resolvedTickets: reportGov.resolvedTickets ?? 0,
      resolutionRate: reportGov.resolutionRate ?? 0,
      adjustedResolutionRate: reportGov.adjustedResolutionRate,
      averageResponseTime: reportGov.averageResponseTime ?? 0,
      averageResolutionTime: reportGov.averageResolutionTime ?? 0,
      score: reportGov.score ?? 0,
      maxPoints: reportGov.maxPossibleScore ?? 15,
      isSkipped: reportGov.isSkipped,
    });
  }

  const monthly = mda.monthlyReport as
    | { score?: number; monthsWithData?: number; totalMonths?: number; maxPossibleScore?: number }
    | null
    | undefined;
  if (monthly) {
    out.reportSubmission = proportionalMonthsBreakdown({
      hits: monthly.monthsWithData ?? 0,
      totalMonths: monthly.totalMonths ?? 12,
      score: monthly.score ?? 0,
      maxPoints: monthly.maxPossibleScore ?? 2,
      hitLabel: "submitted",
    });
  }

  const timeliness = mda.timeliness as
    | { score?: number; monthsWithData?: number; totalMonths?: number; maxPossibleScore?: number }
    | null
    | undefined;
  if (timeliness) {
    out.timeliness = proportionalMonthsBreakdown({
      hits: timeliness.monthsWithData ?? 0,
      totalMonths: timeliness.totalMonths ?? 12,
      score: timeliness.score ?? 0,
      maxPoints: timeliness.maxPossibleScore ?? 3,
      hitLabel: "on time",
    });
  }

  const others = mda.others as
    | {
        scores?: Record<string, number>;
        values?: Record<string, boolean | number>;
      }
    | null
    | undefined;
  if (others) {
    for (const item of othersItems) {
      const hasScore =
        others.scores != null && Object.prototype.hasOwnProperty.call(others.scores, item.itemId);
      const hasValue =
        others.values != null && Object.prototype.hasOwnProperty.call(others.values, item.itemId);
      if (!hasScore && !hasValue) continue;
      out[`others:${item.itemId}`] = othersItemBreakdown({
        score: Number(others.scores?.[item.itemId]) || 0,
        maxPoints: item.weight,
        rawValue: others.values?.[item.itemId] ?? null,
        answerType: item.answerType,
      });
    }
  }

  return out;
}
