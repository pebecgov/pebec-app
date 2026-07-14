export const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export type ReportPeriod = { month: number; year: number };

export type ReportPeriodSource = {
  reportName?: string | null;
  fileName?: string | null;
  submittedAt?: number | null;
  reportPeriodMonth?: number | null;
  reportPeriodYear?: number | null;
};

export function monthNameToIndex(name: string): number | null {
  const lowered = name.trim().toLowerCase();
  for (let i = 0; i < 12; i++) {
    if (lowered === MONTHS_LONG[i].toLowerCase() || lowered === MONTHS_SHORT[i].toLowerCase()) {
      return i;
    }
  }
  return null;
}

export function formatReportPeriodLabel(monthIndex: number, year: number): string {
  return `${MONTHS_LONG[monthIndex]} ${year}`;
}

export function formatBfaReportName(monthIndex: number, year: number): string {
  return `BFA Report (${formatReportPeriodLabel(monthIndex, year)})`;
}

export function isBfaReportName(reportName: string | null | undefined): boolean {
  if (!reportName) return false;
  const name = String(reportName).trim();
  return name === "BFA Report" || /^BFA Report\s*\(/i.test(name);
}

export function parseReportPeriodFromName(
  reportName: string | null | undefined,
  fileName?: string | null
): ReportPeriod | null {
  const combined = `${reportName ?? ""} ${fileName ?? ""}`.trim();
  if (!combined) return null;

  const parenMatch = combined.match(/\(([^)]+)\)/);
  const inside = (parenMatch?.[1] ?? "").trim();
  if (inside) {
    const yearMatch = inside.match(/\b(20\d{2})\b/);
    const monthPart = yearMatch ? inside.replace(yearMatch[0], "").trim() : inside;
    const monthIndex = monthNameToIndex(monthPart.replace(/[,/]/g, " ").trim().split(/\s+/)[0] ?? "");
    if (monthIndex !== null) {
      if (yearMatch) {
        return { month: monthIndex, year: Number(yearMatch[1]) };
      }
      return { month: monthIndex, year: -1 };
    }
  }

  const lowered = combined.toLowerCase();
  let detectedMonth = -1;
  for (let i = 0; i < 12; i++) {
    if (lowered.includes(MONTHS_LONG[i].toLowerCase()) || lowered.includes(MONTHS_SHORT[i].toLowerCase())) {
      detectedMonth = i;
      break;
    }
  }
  if (detectedMonth < 0) return null;

  const explicitYearMatch = lowered.match(/\b(20\d{2})\b/);
  if (explicitYearMatch) {
    return { month: detectedMonth, year: Number(explicitYearMatch[1]) };
  }

  return { month: detectedMonth, year: -1 };
}

export function inferYearFromSubmission(
  monthIndex: number,
  submittedAt: number
): number {
  const submitted = new Date(submittedAt);
  const submittedYear = submitted.getFullYear();
  const submittedMonth = submitted.getMonth();
  return monthIndex > submittedMonth ? submittedYear - 1 : submittedYear;
}

export function resolveReportPeriod(report: ReportPeriodSource): ReportPeriod | null {
  if (
    typeof report.reportPeriodMonth === "number" &&
    typeof report.reportPeriodYear === "number" &&
    report.reportPeriodMonth >= 0 &&
    report.reportPeriodMonth <= 11
  ) {
    return { month: report.reportPeriodMonth, year: report.reportPeriodYear };
  }

  const parsed = parseReportPeriodFromName(report.reportName, report.fileName);
  if (!parsed) return null;

  if (parsed.year >= 0) {
    return parsed;
  }

  if (report.submittedAt == null) return null;
  return {
    month: parsed.month,
    year: inferYearFromSubmission(parsed.month, report.submittedAt),
  };
}

export function reportPeriodMatches(
  report: ReportPeriodSource,
  month: number,
  year: number
): boolean {
  const period = resolveReportPeriod(report);
  return period !== null && period.month === month && period.year === year;
}

export function getSelectableReportYears(): number[] {
  const currentYear = new Date().getFullYear();
  return [currentYear - 1, currentYear];
}
