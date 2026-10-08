/**
 * Plain-language SLA month diagnostics for the public MDA tracker.
 * Kept free of jargon so agency staff know what to fix and resubmit.
 */

import {
  isSlaMonthScored,
  slaMonthPoints,
} from "./slaScoreMath";

export type SlaIssueKind = "failed" | "missing" | "partial";

export type SlaMonthIssue = {
  monthKey: string;
  monthLabel: string;
  kind: SlaIssueKind;
  message: string;
};

export type SlaMonthInput = {
  month: number;
  year: number;
  monthName: string;
  monthKey: string;
};

type SlaMonthCheck = {
  status?: string;
  failureType?: string;
  message?: string;
  validRows?: number;
  totalRows?: number;
};

type SlaMonthEntry = {
  method?: string;
  overallPercentage?: number | null;
  rating?: number;
  score?: number;
  check?: SlaMonthCheck | null;
};

const FAILURE_TYPE_MESSAGES: Record<string, string> = {
  header_row_not_found:
    "We could not find the required column headers in your Excel file. Please download the official SLA template, fill it in, and upload again.",
  submission_date_column_missing:
    "Your spreadsheet is missing the submission date column. Please use the official SLA template and try again.",
  completion_date_column_missing:
    "Your spreadsheet is missing the completion date column. Please use the official SLA template and try again.",
  timeline_column_missing:
    "Your spreadsheet is missing the expected timeline column. Please use the official SLA template and try again.",
  unparseable_dates:
    "The dates in your spreadsheet could not be read. Please enter dates in a clear format (for example DD/MM/YYYY) and upload again.",
  insufficient_valid_rows:
    "Too few rows in your spreadsheet had usable dates to score. Please complete more rows in the official template and upload again.",
  empty_file:
    "The Excel file you uploaded was empty. Please upload a completed SLA spreadsheet.",
  unsupported_format:
    "The file is not in the expected Excel layout. Please upload the official SLA Excel template (not PDF or Word).",
  processing_timeout:
    "We could not finish reading this file in time. Please try uploading a smaller Excel file, or contact the PEBEC secretariat.",
  cancelled:
    "Processing of this file was cancelled. Please upload the spreadsheet again.",
  unknown:
    "We could not score this month’s spreadsheet. Please check the file and upload the official SLA Excel template again.",
  no_file:
    "A report was recorded for this month, but no Excel file was attached. Please resubmit with the spreadsheet attached.",
  no_report:
    "No monthly SLA report was submitted for this month. Please upload the Excel report for this period.",
};

function plainMessageFromFailureType(failureType: string | undefined): string {
  if (!failureType) return FAILURE_TYPE_MESSAGES.unknown;
  return FAILURE_TYPE_MESSAGES[failureType] ?? FAILURE_TYPE_MESSAGES.unknown;
}

/**
 * Prefer a short admin-written message when it is already clear; otherwise
 * map failureType to a non-technical explanation. Strip raw stack traces.
 */
export function plainSlaFailureMessage(
  check: SlaMonthCheck | null | undefined,
  fallbackKind: SlaIssueKind = "failed",
): string {
  if (fallbackKind === "missing") {
    return FAILURE_TYPE_MESSAGES.no_report;
  }

  const failureType = check?.failureType;
  const raw = (check?.message || "").trim();

  // Prefer typed, vetted copy for known failure types.
  if (failureType && FAILURE_TYPE_MESSAGES[failureType]) {
    return FAILURE_TYPE_MESSAGES[failureType];
  }

  if (raw) {
    // Soften common technical phrases if they leaked into the stored message.
    if (/pdf|word|\.docx|\.pdf/i.test(raw) && /excel|spreadsheet|xlsx/i.test(raw)) {
      return FAILURE_TYPE_MESSAGES.unsupported_format;
    }
    if (/header/i.test(raw)) return FAILURE_TYPE_MESSAGES.header_row_not_found;
    if (/empty/i.test(raw)) return FAILURE_TYPE_MESSAGES.empty_file;
    if (raw.length <= 220 && !/Error:|at Object\.|stack/i.test(raw)) {
      return raw;
    }
  }

  if (fallbackKind === "partial") {
    const valid = check?.validRows;
    const total = check?.totalRows;
    if (typeof valid === "number" && typeof total === "number" && total > 0) {
      return `Only ${valid} of ${total} rows in this spreadsheet could be scored. Please correct the remaining rows (especially dates) and upload again.`;
    }
    return "Some rows in this spreadsheet could not be scored. Please review dates and required columns, then upload a corrected Excel file.";
  }

  return plainMessageFromFailureType(failureType);
}

function isScoredMonth(entry: SlaMonthEntry | undefined): boolean {
  return isSlaMonthScored(entry);
}

/**
 * Build public-facing month issues for an MDA that already has SLA scoring data.
 * Successful months are omitted — only months that need attention are returned.
 *
 * Missing months are only listed when the saved data looks like a period-wide
 * bulk/manual run (has failure checks, or covers a meaningful share of months).
 * That avoids flooding older one-off saves with “please submit” for every blank month.
 */
/**
 * Attention list is a subset of the month cards. A month marked scored on the
 * card can never also be "Could not score" here.
 */
export function slaIssuesFromStatuses(
  statuses: SlaMonthStatus[],
  includeMissing: boolean,
): SlaMonthIssue[] {
  const issues: SlaMonthIssue[] = [];
  for (const month of statuses) {
    if (month.status === "scored" || month.status === "partial") continue;
    if (month.status === "missing" && !includeMissing) continue;
    if (month.status !== "failed" && month.status !== "missing") continue;
    issues.push({
      monthKey: month.monthKey,
      monthLabel: month.monthLabel,
      kind: month.status === "missing" ? "missing" : "failed",
      message: month.message,
    });
  }
  return issues;
}

export function buildSlaMonthIssues(
  monthlySlaData: Record<string, SlaMonthEntry> | null | undefined,
  expectedMonths: SlaMonthInput[],
): SlaMonthIssue[] {
  if (!monthlySlaData || typeof monthlySlaData !== "object") return [];
  const keys = Object.keys(monthlySlaData).filter((k) => !k.startsWith("__"));
  if (keys.length === 0 || expectedMonths.length === 0) return [];

  let hasCheckMetadata = false;
  let presentExpected = 0;
  for (const month of expectedMonths) {
    const entry = monthlySlaData[month.monthKey] as SlaMonthEntry | undefined;
    if (entry) presentExpected++;
    if (entry?.check?.status) hasCheckMetadata = true;
  }
  const looksLikeFullPeriodRun =
    hasCheckMetadata || presentExpected >= Math.max(3, Math.ceil(expectedMonths.length * 0.35));

  const statuses = buildSlaMonthStatuses(monthlySlaData, expectedMonths, 0);
  return slaIssuesFromStatuses(statuses, looksLikeFullPeriodRun);
}

export function mergeMonthlySlaData(
  dataList: Array<{ monthlySlaData?: Record<string, SlaMonthEntry> | null }>,
): Record<string, SlaMonthEntry> {
  const merged: Record<string, SlaMonthEntry> = {};
  for (const row of dataList) {
    const data = row.monthlySlaData;
    if (!data || typeof data !== "object") continue;
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith("__") || !value || typeof value !== "object") continue;
      // Prefer a scored entry over a failed one if both exist; otherwise last wins.
      const existing = merged[key];
      if (existing && isScoredMonth(existing) && !isScoredMonth(value)) continue;
      merged[key] = value;
    }
  }
  return merged;
}

export type SlaMonthStatus = {
  monthKey: string;
  monthLabel: string;
  /** scored = earned points; failed/partial/missing need attention */
  status: "scored" | "failed" | "partial" | "missing";
  /** Points this month contributed toward the SLA total */
  points: number;
  /** Max points this month can contribute */
  maxPoints: number;
  /** File compliance % when scored from Excel */
  percentage: number | null;
  /** Plain-language note (especially for failed / partial / missing) */
  message: string;
};

/**
 * Full month-by-month SLA picture for the public tracker (every expected month).
 * More detailed than admin's simple green/grey grid: includes points, %, and why.
 */
export function buildSlaMonthStatuses(
  monthlySlaData: Record<string, SlaMonthEntry> | null | undefined,
  expectedMonths: SlaMonthInput[],
  slaMaxPoints: number,
): SlaMonthStatus[] {
  const totalMonths = expectedMonths.length > 0 ? expectedMonths.length : 12;
  const maxPointsPerMonth = totalMonths > 0 ? slaMaxPoints / totalMonths : 0;
  const data = monthlySlaData && typeof monthlySlaData === "object" ? monthlySlaData : {};

  return expectedMonths.map((month) => {
    const entry = data[month.monthKey] as SlaMonthEntry | undefined;
    const monthLabel = `${month.monthName} ${month.year}`;
    const check = entry?.check ?? null;
    const status = check?.status;

    if (!entry) {
      return {
        monthKey: month.monthKey,
        monthLabel,
        status: "missing" as const,
        points: 0,
        maxPoints: round2(maxPointsPerMonth),
        percentage: null,
        message: plainSlaFailureMessage(null, "missing"),
      };
    }

    // Points win over a stale "failed" flag. Partial files are still scored:
    // only some rows were usable, and the month card says so.
    if (isScoredMonth(entry) || status === "partial_success") {
      const points = slaMonthPoints(entry, maxPointsPerMonth);
      const percentage =
        typeof entry.overallPercentage === "number" ? round2(entry.overallPercentage) : null;
      const acceptedNote =
        status === "partial_success" ? plainSlaFailureMessage(check, "partial") : "";
      const complianceNote =
        percentage != null
          ? `Excel scored at ${percentage}% compliance → ${points} of ${round2(maxPointsPerMonth)} points for this month.`
          : `This month earned ${points} of ${round2(maxPointsPerMonth)} points.`;
      return {
        monthKey: month.monthKey,
        monthLabel,
        status: "scored" as const,
        points,
        maxPoints: round2(maxPointsPerMonth),
        percentage,
        message: acceptedNote || complianceNote,
      };
    }

    if (status === "failed" || (entry.method === "file" && entry.overallPercentage == null)) {
      return {
        monthKey: month.monthKey,
        monthLabel,
        status: "failed" as const,
        points: 0,
        maxPoints: round2(maxPointsPerMonth),
        percentage: null,
        message: plainSlaFailureMessage(check, "failed"),
      };
    }

    return {
      monthKey: month.monthKey,
      monthLabel,
      status: "missing" as const,
      points: 0,
      maxPoints: round2(maxPointsPerMonth),
      percentage: null,
      message: plainSlaFailureMessage(null, "missing"),
    };
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
