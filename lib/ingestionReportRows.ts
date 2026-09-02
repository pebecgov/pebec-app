import type { IngestionProcessingMetadata } from "./ingestionProcessingMetadata";
import {
  formatFailureType,
  type IngestionCellDetail,
  type IngestionCellStatus,
  type IngestionMatrix,
} from "./ingestionMatrix";
import { formatHeaderRowLabel, formatHeadersList } from "./ingestionProcessingMetadata";

export type IngestionReportRow = {
  mdaName: string;
  monthLabel: string;
  status: IngestionCellStatus;
  statusLabel: string;
  failureType: string;
  failureDetail: string;
  sheetName: string;
  headerRow: string;
  keywordMatches: string;
  detectedHeaders: string;
  mappedSubmission: string;
  mappedCompletion: string;
  mappedTimeline: string;
  validRows: string;
  totalRows: string;
  invalidDateRows: string;
  processedAt: string;
  allSheetsSummary: string;
};

const STATUS_LABELS: Record<IngestionCellStatus, string> = {
  no_submission: "No submission",
  not_checked: "Not checked",
  pending: "Pending",
  success: "Processed OK",
  partial_success: "Partial success",
  failed: "Failed",
};

function formatProcessedAt(value: number | undefined): string {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

function formatSheetSummaries(metadata: IngestionProcessingMetadata | undefined): string {
  if (!metadata?.sheetSummaries?.length) return "";
  return metadata.sheetSummaries
    .map(
      (s) =>
        `${s.sheetName}: row ${s.headerRowIndex + 1}, ${s.keywordMatches} kw, ${s.mappedColumnCount}/3 cols — ${formatHeadersList(s.headers)}`
    )
    .join("\n");
}

function rowFromCell(
  mdaName: string,
  monthLabel: string,
  state: IngestionCellStatus,
  detail: IngestionCellDetail
): IngestionReportRow {
  const meta = detail.processingMetadata;
  return {
    mdaName,
    monthLabel,
    status: state,
    statusLabel: STATUS_LABELS[state],
    failureType: detail.failureType ? formatFailureType(detail.failureType) : "",
    failureDetail: detail.failureDetail ?? "",
    sheetName: meta?.sheetName ?? "",
    headerRow: formatHeaderRowLabel(meta?.headerRowIndex),
    keywordMatches: meta?.headerKeywordMatches != null ? String(meta.headerKeywordMatches) : "",
    detectedHeaders: formatHeadersList(meta?.detectedHeaders),
    mappedSubmission: meta?.mappedSubmissionColumn ?? "",
    mappedCompletion: meta?.mappedCompletionColumn ?? "",
    mappedTimeline: meta?.mappedTimelineColumn ?? "",
    validRows: detail.validRowCount != null ? String(detail.validRowCount) : "",
    totalRows: detail.totalRowCount != null ? String(detail.totalRowCount) : "",
    invalidDateRows: detail.invalidDateRowCount != null ? String(detail.invalidDateRowCount) : "",
    processedAt: formatProcessedAt(detail.processedAt),
    allSheetsSummary: formatSheetSummaries(meta),
  };
}

export function buildIngestionReportRows(
  matrix: IngestionMatrix,
  options?: { includeNoSubmission?: boolean; onlyProcessed?: boolean }
): IngestionReportRow[] {
  const includeNoSubmission = options?.includeNoSubmission ?? false;
  const onlyProcessed = options?.onlyProcessed ?? false;
  const rows: IngestionReportRow[] = [];

  matrix.mdaNames.forEach((mdaName, rowIdx) => {
    matrix.monthLabels.forEach((monthLabel, colIdx) => {
      const state = matrix.cellStates[rowIdx]?.[colIdx] ?? "no_submission";
      if (!includeNoSubmission && state === "no_submission") return;
      if (onlyProcessed && (state === "no_submission" || state === "not_checked")) return;

      const detail = matrix.cellDetails[rowIdx]?.[colIdx] ?? { status: state };
      rows.push(rowFromCell(mdaName, monthLabel, state, detail));
    });
  });

  return rows;
}

export const INGESTION_REPORT_COLUMNS: Array<{ key: keyof IngestionReportRow; header: string }> = [
  { key: "mdaName", header: "MDA" },
  { key: "monthLabel", header: "Month" },
  { key: "statusLabel", header: "Status" },
  { key: "failureType", header: "Failure reason" },
  { key: "failureDetail", header: "Detail" },
  { key: "sheetName", header: "Sheet" },
  { key: "headerRow", header: "Header row" },
  { key: "keywordMatches", header: "Keyword matches" },
  { key: "detectedHeaders", header: "Detected headers" },
  { key: "mappedSubmission", header: "Mapped submission col" },
  { key: "mappedCompletion", header: "Mapped completion col" },
  { key: "mappedTimeline", header: "Mapped timeline col" },
  { key: "validRows", header: "Valid rows" },
  { key: "totalRows", header: "Total rows" },
  { key: "invalidDateRows", header: "Invalid date rows" },
  { key: "processedAt", header: "Processed at" },
  { key: "allSheetsSummary", header: "All sheets scan" },
];

export function rowsToAoA(rows: IngestionReportRow[]): string[][] {
  const headers = INGESTION_REPORT_COLUMNS.map((c) => c.header);
  const body = rows.map((row) => INGESTION_REPORT_COLUMNS.map((c) => row[c.key] ?? ""));
  return [headers, ...body];
}
