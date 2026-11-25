/** Snapshot of ranking-table scores for PDF exports (matches Live Dashboard). */

export type MdaPdfMonthRow = {
  monthKey: string;
  monthLabel: string;
  /** Display text for the Status/Score column */
  display: string;
  counted: boolean;
};

export type MdaRankingSummary = {
  year: number;
  slaScore: number;
  slaMax: number;
  mysteryScore: number;
  mysteryMax: number;
  othersScore: number;
  reportGovScore: number;
  reportGovMax: number;
  reportGovSkipped: boolean;
  monthlyScore: number;
  monthlyMax: number;
  timelinessScore: number;
  timelinessMax: number;
  baseTotalScore: number;
  penaltyScore: number;
  bonusScore: number;
  totalScore: number;
  maxPossiblePoints: number;
  totalPercentage: number;
  othersLines: Array<{ name: string; score: number; max: number; excluded?: boolean }>;
  penaltyLines: Array<{ name: string; applied: boolean; value: number }>;
  bonusLines: Array<{ name: string; applied: boolean; value: number }>;
  /** Month rows from Live Dashboard — PDF must use these, not rebuild from raw halves. */
  slaMonths: MdaPdfMonthRow[];
  slaMonthsCounted: number;
  slaMonthsTotal: number;
  monthlyMonths: MdaPdfMonthRow[];
  monthlyMonthsCounted: number;
  monthlyMonthsTotal: number;
  timelinessMonths: MdaPdfMonthRow[];
  timelinessMonthsCounted: number;
  timelinessMonthsTotal: number;
  innovationScore?: number;
  stakeholderScore?: number;
  transparencyScore?: number;
  transparencySkipped?: boolean;
  controversialScore?: number;
  toutingRentseekingScore?: number;
};

function normalizeMonthStatuses(raw: unknown): any[] {
  return Array.isArray(raw) ? raw : [];
}

function buildSlaMonthRows(mda: any): MdaPdfMonthRow[] {
  return normalizeMonthStatuses(mda.sla?.monthStatuses).map((month) => {
    const status = String(month.status || "");
    const points = typeof month.points === "number" ? month.points : null;
    const percentage = typeof month.percentage === "number" ? month.percentage : null;
    let display = "No data";
    let counted = false;
    if (
      status === "scored" ||
      status === "partial" ||
      status === "partial_success" ||
      (points != null && points > 0)
    ) {
      counted = true;
      if (percentage != null) display = `${percentage.toFixed(1)}%`;
      else if (points != null) display = `${points.toFixed(2)} pts`;
      else display = "Scored";
    } else if (status === "failed") {
      display = "Failed";
    } else if (status === "missing") {
      display = "No data";
    } else if (month.message) {
      display = String(month.message);
    }
    return {
      monthKey: String(month.monthKey || ""),
      monthLabel: String(month.monthLabel || month.monthKey || ""),
      display,
      counted,
    };
  });
}

function buildMonthlyReportRows(mda: any): MdaPdfMonthRow[] {
  return normalizeMonthStatuses(mda.monthlyReport?.monthStatuses).map((month) => {
    const submitted = month.submitted === true || month.status === "on_time" || month.status === "late";
    return {
      monthKey: String(month.monthKey || ""),
      monthLabel: String(month.monthLabel || month.monthKey || ""),
      display: submitted ? "Submitted" : "Not submitted",
      counted: submitted,
    };
  });
}

function buildTimelinessRows(mda: any): MdaPdfMonthRow[] {
  return normalizeMonthStatuses(mda.timeliness?.monthStatuses).map((month) => {
    const onTime = month.onTime === true || month.status === "on_time";
    const submitted = month.submitted === true || month.status === "late" || onTime;
    let display = "Not Submitted";
    if (onTime) display = "On Time";
    else if (submitted || month.status === "late") display = "Late";
    return {
      monthKey: String(month.monthKey || ""),
      monthLabel: String(month.monthLabel || month.monthKey || ""),
      display,
      counted: onTime,
    };
  });
}

export function buildMdaRankingSummary(
  mda: any,
  year: number,
  configs?: {
    othersConfig?: Array<{ itemId: string; itemName: string; weight: number }>;
    penaltyConfig?: Array<{ penaltyId: string; penaltyName: string; penaltyValue: number }>;
    bonusConfig?: Array<{ bonusId: string; bonusName: string; bonusValue: number }>;
    efficiencyConfig?: {
      slaPoints?: number;
      reportGovPoints?: number;
      reportSubmissionPoints?: number;
      timelinessPoints?: number;
    };
  }
): MdaRankingSummary {
  const efficiency = configs?.efficiencyConfig;
  const othersConfig = configs?.othersConfig || [];
  const penaltyConfig = configs?.penaltyConfig || [];
  const bonusConfig = configs?.bonusConfig || [];
  const excluded: string[] = Array.isArray(mda.excludedMetrics) ? mda.excludedMetrics : [];
  const isExcluded = (key: string) => excluded.includes(key);
  const isOthersExcluded = (itemId: string) =>
    isExcluded("others") || excluded.includes(`others:${itemId}`);

  const othersLines = othersConfig.map((item) => ({
    name: item.itemName,
    score: Number(mda.others?.scores?.[item.itemId]) || 0,
    max: item.weight || 0,
    excluded: isOthersExcluded(item.itemId),
  }));

  const penaltyLines = penaltyConfig.map((item) => ({
    name: item.penaltyName,
    applied: mda.penalties?.values?.[item.penaltyId] === true,
    value: item.penaltyValue || 0,
  }));

  const bonusLines = bonusConfig.map((item) => ({
    name: item.bonusName,
    applied: mda.bonuses?.values?.[item.bonusId] === true,
    value: item.bonusValue || 0,
  }));

  const totalScore = Number(mda.totalScore) || 0;
  // 2026 framework is scored out of 100 (matches Live Dashboard / public tracker).
  const maxPossiblePoints =
    year >= 2026
      ? Number(mda.maxPossiblePoints) || 100
      : Number(mda.maxPossiblePoints) || 90;
  const totalPercentage =
    Number(mda.totalPercentage) ||
    (maxPossiblePoints > 0 ? (totalScore / maxPossiblePoints) * 100 : 0);

  const slaMonths = buildSlaMonthRows(mda);
  const monthlyMonths = buildMonthlyReportRows(mda);
  const timelinessMonths = buildTimelinessRows(mda);

  const slaMonthsTotal =
    Number(mda.sla?.totalMonths) ||
    slaMonths.length ||
    (year >= 2026 ? 12 : 10);
  const monthlyMonthsTotal =
    Number(mda.monthlyReport?.totalMonths) ||
    monthlyMonths.length ||
    slaMonthsTotal;
  const timelinessMonthsTotal =
    Number(mda.timeliness?.totalMonths) ||
    timelinessMonths.length ||
    monthlyMonthsTotal;

  const slaMonthsCounted =
    Number(mda.sla?.monthsWithData) ||
    slaMonths.filter((m) => m.counted).length;
  const monthlyMonthsCounted =
    Number(mda.monthlyReport?.monthsWithData) ||
    monthlyMonths.filter((m) => m.counted).length;
  const timelinessMonthsCounted =
    Number(mda.timeliness?.monthsWithData) ||
    timelinessMonths.filter((m) => m.counted).length;

  return {
    year,
    slaScore: Number(mda.sla?.score) || 0,
    slaMax: Number(mda.sla?.maxPossibleScore) || efficiency?.slaPoints || (year >= 2026 ? 5 : 30),
    mysteryScore: Number(mda.mysteryShopping?.score) || 0,
    mysteryMax:
      Number(mda.mysteryShopping?.maxPossibleScore) || (year >= 2026 ? 40 : 20),
    othersScore: Number(mda.others?.score) || 0,
    reportGovScore: Number(mda.reportGovResolution?.score) || 0,
    reportGovMax:
      Number(mda.reportGovResolution?.maxPossibleScore) ||
      efficiency?.reportGovPoints ||
      (year >= 2026 ? 20 : 15),
    reportGovSkipped: !!mda.reportGovResolution?.isSkipped,
    monthlyScore: Number(mda.monthlyReport?.score) || 0,
    monthlyMax:
      Number(mda.monthlyReport?.maxPossibleScore) ||
      efficiency?.reportSubmissionPoints ||
      (year >= 2026 ? 2 : 3),
    timelinessScore: Number(mda.timeliness?.score) || 0,
    timelinessMax:
      Number(mda.timeliness?.maxPossibleScore) ||
      efficiency?.timelinessPoints ||
      (year >= 2026 ? 3 : 2),
    baseTotalScore: Number(mda.totalGrossScore ?? mda.baseTotalScore) || 0,
    penaltyScore: Math.abs(Number(mda.penalties?.score) || 0),
    bonusScore: Math.abs(Number(mda.bonuses?.score) || 0),
    totalScore,
    maxPossiblePoints,
    totalPercentage,
    othersLines,
    penaltyLines,
    bonusLines,
    slaMonths,
    slaMonthsCounted,
    slaMonthsTotal,
    monthlyMonths,
    monthlyMonthsCounted,
    monthlyMonthsTotal,
    timelinessMonths,
    timelinessMonthsCounted,
    timelinessMonthsTotal,
    innovationScore: Number(mda.innovation?.score) || 0,
    stakeholderScore: Number(mda.stakeholder?.score) || 0,
    transparencyScore: Number(mda.transparency?.score) || 0,
    transparencySkipped: !!mda.transparency?.isSkipped,
    controversialScore: Number(mda.controversial?.score) || 0,
    toutingRentseekingScore: Number(mda.toutingRentseeking?.score) || 0,
  };
}
