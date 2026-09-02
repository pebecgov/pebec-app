import {
  computeMdaSubmissionMatrix,
  mdaNamesMatch,
  normalizeMdaKey,
  monthValueToParts,
  type MdaSubmissionMatrix,
} from "./mdaSubmissionMatrix";
import { canonicalizeMdaName } from "./mdaNameAliases";
import { resolveReportPeriod } from "./reportPeriod";
import type { IngestionProcessingMetadata } from "./ingestionProcessingMetadata";

export type IngestionCellStatus =
  | "no_submission"
  | "not_checked"
  | "pending"
  | "success"
  | "partial_success"
  | "failed";

export type IngestionStatusRow = {
  mdaName: string;
  reportPeriodMonth: number;
  reportPeriodYear: number;
  status: "pending" | "success" | "partial_success" | "failed";
  failureType?: string;
  failureDetail?: string;
  invalidDateRowCount?: number;
  validRowCount?: number;
  totalRowCount?: number;
  validRowPercent?: number;
  skippedBlankRowCount?: number;
  processedAt?: number;
  submittedReportId?: string;
  processingMetadata?: IngestionProcessingMetadata;
};

export type IngestionCellDetail = {
  status: IngestionCellStatus;
  failureType?: string;
  failureDetail?: string;
  invalidDateRowCount?: number;
  validRowCount?: number;
  totalRowCount?: number;
  validRowPercent?: number;
  skippedBlankRowCount?: number;
  processedAt?: number;
  processingMetadata?: IngestionProcessingMetadata;
};

export type IngestionMatrix = MdaSubmissionMatrix & {
  cellStates: IngestionCellStatus[][];
  cellDetails: IngestionCellDetail[][];
};

const FAILURE_LABELS: Record<string, string> = {
  header_row_not_found: "Header row not found",
  submission_date_column_missing: "Submission date column missing",
  completion_date_column_missing: "Completion date column missing",
  timeline_column_missing: "Timeline column missing",
  unparseable_dates: "Unparseable dates (all rows)",
  insufficient_valid_rows: "Too few valid rows (<20%)",
  empty_file: "Empty file",
  unsupported_format: "Excel layout mismatch (wrong sheet or headers)",
  processing_timeout: "Processing timed out",
  cancelled: "Cancelled",
  unknown: "Unknown error",
};

export function formatFailureType(failureType: string): string {
  return FAILURE_LABELS[failureType] ?? failureType.replace(/_/g, " ");
}

function findMdaRowIndex(mdaNames: string[], statusMdaName: string): number {
  let rowIdx = mdaNames.findIndex((name) => mdaNamesMatch(name, statusMdaName));
  if (rowIdx !== -1) return rowIdx;

  const canonical = canonicalizeMdaName(statusMdaName);
  rowIdx = mdaNames.findIndex((name) => mdaNamesMatch(name, canonical));
  if (rowIdx !== -1) return rowIdx;

  const normalized = normalizeMdaKey(statusMdaName);
  rowIdx = mdaNames.findIndex((name) => normalizeMdaKey(name) === normalized);
  return rowIdx;
}

type SubmittedReportLike = {
  _id?: string;
  mdaName?: string | null;
  fileId?: string | null;
  submittedAt?: number | null;
  reportPeriodMonth?: number | null;
  reportPeriodYear?: number | null;
  reportName?: string | null;
  fileName?: string | null;
  isDraft?: boolean | null;
  role?: string | null;
};

function normalizeMonthIndex(value: number): number {
  return Math.max(0, Math.min(11, Math.floor(value)));
}

function monthKeyFromParts(year: number, monthIndex: number): string {
  return `${year}-${String(normalizeMonthIndex(monthIndex) + 1).padStart(2, "0")}`;
}

function resolveCellPosition(
  mdaNames: string[],
  monthKeys: string[],
  rowIdx: number,
  colIdx: number
): { rowIdx: number; colIdx: number } | null {
  if (rowIdx < 0 || colIdx < 0 || colIdx >= monthKeys.length) return null;
  return { rowIdx, colIdx };
}

/** Map submitted report id → grid position using the same rules as the submission matrix. */
function buildReportIdToCellMap(
  submittedReports: SubmittedReportLike[] | undefined,
  mdaNames: string[],
  monthKeys: string[]
): Map<string, { rowIdx: number; colIdx: number }> {
  const map = new Map<string, { rowIdx: number; colIdx: number }>();
  if (!submittedReports) return map;

  for (const report of submittedReports) {
    if (!report._id || report.role !== "reform_champion" || report.isDraft) continue;
    if (!report.mdaName) continue;

    const period = resolveReportPeriod(report);
    if (!period) continue;

    const colIdx = monthKeys.indexOf(monthKeyFromParts(period.year, period.month));
    if (colIdx === -1) continue;

    const rowIdx = findMdaRowIndex(mdaNames, report.mdaName);
    const pos = resolveCellPosition(mdaNames, monthKeys, rowIdx, colIdx);
    if (!pos) continue;

    map.set(String(report._id), pos);
  }
  return map;
}

function applyIngestionToCell(
  cellStates: IngestionCellStatus[][],
  cellDetails: IngestionCellDetail[][],
  rowIdx: number,
  colIdx: number,
  status: IngestionStatusRow
) {
  const cellStatus: IngestionCellStatus =
    status.status === "pending"
      ? "pending"
      : status.status === "success"
        ? "success"
        : status.status === "partial_success"
          ? "partial_success"
          : "failed";

  cellStates[rowIdx]![colIdx] = cellStatus;
  cellDetails[rowIdx]![colIdx] = {
    status: cellStatus,
    failureType: status.failureType,
    failureDetail: status.failureDetail,
    invalidDateRowCount: status.invalidDateRowCount,
    validRowCount: status.validRowCount,
    totalRowCount: status.totalRowCount,
    validRowPercent: status.validRowPercent,
    skippedBlankRowCount: status.skippedBlankRowCount,
    processedAt: status.processedAt,
    processingMetadata: status.processingMetadata,
  };
}

function submissionHasFile(
  submittedReports: SubmittedReportLike[] | undefined,
  mdaName: string,
  year: number,
  monthIndex: number
): boolean {
  if (!submittedReports) return false;

  return submittedReports.some((report) => {
    if (report.role !== "reform_champion" || report.isDraft) return false;
    if (!report.mdaName || !mdaNamesMatch(report.mdaName, mdaName)) return false;
    const period = resolveReportPeriod(report);
    if (!period || period.year !== year || period.month !== monthIndex) return false;
    return Boolean(report.fileId);
  });
}

export function computeIngestionMatrix(
  submittedReports: SubmittedReportLike[] | undefined,
  ingestionStatuses: IngestionStatusRow[] | undefined,
  fromMonthValue: string,
  toMonthValue: string
): IngestionMatrix {
  const submissionMatrix = computeMdaSubmissionMatrix(submittedReports, fromMonthValue, toMonthValue);
  const { mdaNames, monthLabels, monthKeys, statusGrid, countGrid, firstReportNameGrid } =
    submissionMatrix;

  const rowCount = mdaNames.length;
  const colCount = monthKeys.length;

  const cellStates: IngestionCellStatus[][] = Array.from({ length: rowCount }, () =>
    Array.from({ length: colCount }, () => "no_submission" as IngestionCellStatus)
  );
  const cellDetails: IngestionCellDetail[][] = Array.from({ length: rowCount }, () =>
    Array.from({ length: colCount }, () => ({ status: "no_submission" as IngestionCellStatus }))
  );

  const reportIdToCell = buildReportIdToCellMap(submittedReports, mdaNames, monthKeys);

  for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
    for (let colIdx = 0; colIdx < colCount; colIdx++) {
      if (!statusGrid[rowIdx]?.[colIdx]) {
        cellStates[rowIdx]![colIdx] = "no_submission";
        cellDetails[rowIdx]![colIdx] = { status: "no_submission" };
        continue;
      }

      const monthKey = monthKeys[colIdx];
      if (!monthKey) continue;
      const monthParts = monthValueToParts(monthKey);
      if (!monthParts) continue;

      const hasFile = submissionHasFile(
        submittedReports,
        mdaNames[rowIdx]!,
        monthParts.year,
        monthParts.monthIndex
      );

      if (!hasFile) {
        cellStates[rowIdx]![colIdx] = "failed";
        cellDetails[rowIdx]![colIdx] = {
          status: "failed",
          failureType: "unknown",
          failureDetail: "Report marked submitted but no Excel file is attached.",
        };
        continue;
      }

      cellStates[rowIdx]![colIdx] = "not_checked";
      cellDetails[rowIdx]![colIdx] = {
        status: "not_checked",
        failureDetail: "Submitted — run processing check to validate this file.",
      };
    }
  }

  for (const status of ingestionStatuses ?? []) {
    let rowIdx = -1;
    let colIdx = -1;

    // Prefer linking by submitted report id (most reliable).
    if (status.submittedReportId) {
      const byReport = reportIdToCell.get(String(status.submittedReportId));
      if (byReport) {
        rowIdx = byReport.rowIdx;
        colIdx = byReport.colIdx;
      }
    }

    if (rowIdx === -1 || colIdx === -1) {
      const monthIndex = normalizeMonthIndex(status.reportPeriodMonth);
      const monthKey = monthKeyFromParts(status.reportPeriodYear, monthIndex);
      colIdx = monthKeys.indexOf(monthKey);
      rowIdx = findMdaRowIndex(mdaNames, status.mdaName);
    }

    if (rowIdx === -1 || colIdx === -1) continue;

    applyIngestionToCell(cellStates, cellDetails, rowIdx, colIdx, status);
  }

  return {
    mdaNames,
    monthLabels,
    monthKeys,
    statusGrid,
    countGrid,
    firstReportNameGrid,
    cellStates,
    cellDetails,
  };
}

export function countIngestionCells(matrix: IngestionMatrix): {
  success: number;
  partialSuccess: number;
  failed: number;
  pending: number;
  notChecked: number;
  noSubmission: number;
} {
  let success = 0;
  let partialSuccess = 0;
  let failed = 0;
  let pending = 0;
  let notChecked = 0;
  let noSubmission = 0;

  matrix.cellStates.forEach((row) => {
    row.forEach((state) => {
      if (state === "success") success++;
      else if (state === "partial_success") partialSuccess++;
      else if (state === "failed") failed++;
      else if (state === "pending") pending++;
      else if (state === "not_checked") notChecked++;
      else noSubmission++;
    });
  });

  return { success, partialSuccess, failed, pending, notChecked, noSubmission };
}

export function cellStatusColor(state: IngestionCellStatus): string {
  switch (state) {
    case "success":
      return "bg-green-600";
    case "partial_success":
      return "bg-lime-500";
    case "failed":
      return "bg-red-500";
    case "pending":
      return "bg-amber-400";
    case "not_checked":
      return "bg-sky-300";
    default:
      return "bg-gray-300";
  }
}

export function cellStatusTitle(state: IngestionCellStatus, detail?: IngestionCellDetail): string {
  if (state === "no_submission") return "No submission";
  if (state === "not_checked") return detail?.failureDetail ?? "Submitted — not processed yet";
  if (state === "pending") return detail?.failureDetail ?? "Processing in progress…";
  if (state === "success") {
    const invalid = detail?.invalidDateRowCount ?? 0;
    const pct = detail?.validRowPercent;
    if (invalid > 0) {
      return `Processed successfully (${invalid} row(s) with invalid dates${pct != null ? `, ${pct.toFixed(0)}% valid overall` : ""})`;
    }
    return "Processed successfully";
  }
  if (state === "partial_success") {
    const pct = detail?.validRowPercent;
    const invalid = detail?.invalidDateRowCount ?? 0;
    return `Partial success${pct != null ? `: ${pct.toFixed(1)}% valid rows` : ""}${invalid > 0 ? ` (${invalid} bad rows)` : ""}`;
  }
  return detail?.failureDetail ?? "Processing failed";
}

export function summarizeFailuresFromMatrix(matrix: IngestionMatrix): Array<{ failureType: string; count: number }> {
  const counts = new Map<string, number>();

  matrix.cellDetails.forEach((row) => {
    row.forEach((detail) => {
      if (detail.status !== "failed" || !detail.failureType) return;
      counts.set(detail.failureType, (counts.get(detail.failureType) ?? 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([failureType, count]) => ({ failureType, count }))
    .sort((a, b) => b.count - a.count);
}

export { monthValueToParts };
