import { MONTHS_LONG, resolveReportPeriod } from "../../lib/reportPeriod";
import { canonicalizeMdaName } from "../../lib/mdaNameAliases";

export type ComplianceStatus = "submitted" | "outstanding" | "upcoming";

export type ComplianceMonth = {
  month: number;
  year: number;
  monthName: string;
  status: ComplianceStatus;
  submitted: boolean;
  onTime?: boolean;
};

export type MdaReportCompliance = {
  mdaName: string;
  submitted: number;
  due: number;
  outstanding: number;
  months: ComplianceMonth[];
};

export type EfficiencyPeriodConfig = {
  startMonth: string;
  endMonth: string;
  startYear: number;
  endYear: number;
  totalMonths?: number;
} | null;

type SubmittedReport = {
  mdaName?: string;
  role?: string;
  isDraft?: boolean;
  submittedAt: number;
  reportName?: string | null;
  fileName?: string | null;
  reportPeriodMonth?: number | null;
  reportPeriodYear?: number | null;
};

function monthNameToIndex(monthName: string): number {
  const index = MONTHS_LONG.findIndex(
    (name) => name.toLowerCase() === monthName.toLowerCase()
  );
  return index >= 0 ? index : 0;
}

/** A reporting month closes on the 30th, or the last day if the month is shorter. */
export function monthCloseTimestamp(year: number, monthIndex: number): number {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const dueDay = Math.min(30, lastDay);
  return Date.UTC(year, monthIndex, dueDay, 0, 0, 0);
}

export function isWatDueDate(nowMs: number): boolean {
  const wat = new Date(nowMs + 60 * 60 * 1000);
  const year = wat.getUTCFullYear();
  const month = wat.getUTCMonth();
  const day = wat.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return day === Math.min(30, lastDay);
}

export function buildAssessmentMonths(
  year: number,
  efficiency: EfficiencyPeriodConfig
): Array<{ month: number; year: number; monthName: string }> {
  if (efficiency) {
    const months: Array<{ month: number; year: number; monthName: string }> = [];
    let iterYear = efficiency.startYear;
    let iterMonth = monthNameToIndex(efficiency.startMonth);
    const total = efficiency.totalMonths || 12;
    for (let i = 0; i < total; i++) {
      months.push({
        month: iterMonth,
        year: iterYear,
        monthName: MONTHS_LONG[iterMonth] ?? "January",
      });
      iterMonth += 1;
      if (iterMonth > 11) {
        iterMonth = 0;
        iterYear += 1;
      }
    }
    return months;
  }

  return MONTHS_LONG.map((monthName, month) => ({
    month,
    year,
    monthName,
  }));
}

function reportMatchesMonth(
  report: SubmittedReport,
  month: number,
  year: number
): boolean {
  const period = resolveReportPeriod(report);
  if (period) {
    return period.month === month && period.year === year;
  }
  const submitted = new Date(report.submittedAt);
  return submitted.getMonth() === month && submitted.getFullYear() === year;
}

export function buildMdaReportCompliance(args: {
  year: number;
  asOf: number;
  efficiency: EfficiencyPeriodConfig;
  mdaNames: string[];
  reports: SubmittedReport[];
}): MdaReportCompliance[] {
  const monthsTemplate = buildAssessmentMonths(args.year, args.efficiency);
  const reportsByMda = new Map<string, SubmittedReport[]>();

  for (const report of args.reports) {
    if (report.role !== "reform_champion" || report.isDraft) continue;
    const key = canonicalizeMdaName(report.mdaName || "");
    if (!key) continue;
    const list = reportsByMda.get(key) || [];
    list.push(report);
    reportsByMda.set(key, list);
  }

  const names = [...new Set(args.mdaNames.map((name) => canonicalizeMdaName(name)).filter(Boolean))];

  return names.map((mdaName) => {
    const mdaReports = reportsByMda.get(mdaName) || [];
    const months: ComplianceMonth[] = monthsTemplate.map((slot) => {
      const matching = mdaReports.filter((report) =>
        reportMatchesMonth(report, slot.month, slot.year)
      );
      const submitted = matching.length > 0;
      const closed = args.asOf >= monthCloseTimestamp(slot.year, slot.month);
      const submittedAt = matching[0]?.submittedAt;
      const onTime =
        submitted && submittedAt !== undefined
          ? submittedAt <= monthCloseTimestamp(slot.year, slot.month)
          : undefined;

      let status: ComplianceStatus = "upcoming";
      if (submitted) status = "submitted";
      else if (closed) status = "outstanding";

      return {
        month: slot.month,
        year: slot.year,
        monthName: slot.monthName,
        status,
        submitted,
        onTime,
      };
    });

    const dueMonths = months.filter((month) => month.status !== "upcoming");
    const submittedCount = dueMonths.filter((month) => month.submitted).length;
    const outstanding = dueMonths.filter((month) => month.status === "outstanding").length;

    return {
      mdaName,
      submitted: submittedCount,
      due: dueMonths.length,
      outstanding,
      months,
    };
  });
}
