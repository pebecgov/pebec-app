import type { DateIssueSample } from "./ingestionProcessingMetadata";
import {
  formatFailureType,
  type IngestionCellDetail,
  type IngestionCellStatus,
  type IngestionMatrix,
} from "./ingestionMatrix";

export type IngestionErrorCategory = "layout" | "date" | "file" | "processing" | "other";

export type IngestionErrorReportRow = {
  mdaName: string;
  monthLabel: string;
  fileStatus: string;
  errorCategory: IngestionErrorCategory;
  errorType: string;
  errorDetail: string;
  sheetName: string;
  dataRowIndex: string;
  submissionValue: string;
  completionValue: string;
  timelineValue: string;
  dateIssueSummary: string;
  processedAt: string;
};

const CATEGORY_LABELS: Record<IngestionErrorCategory, string> = {
  layout: "Excel layout",
  date: "Date / timeline",
  file: "File",
  processing: "Processing",
  other: "Other",
};

const STATUS_LABELS: Record<IngestionCellStatus, string> = {
  no_submission: "No submission",
  not_checked: "Not checked",
  pending: "Pending",
  success: "Processed OK",
  failed: "Failed",
};

function categorizeFailure(failureType: string | undefined): IngestionErrorCategory {
  if (!failureType) return "other";
  if (failureType === "unsupported_format" || failureType.includes("column") || failureType === "header_row_not_found") {
    return "layout";
  }
  if (failureType === "unparseable_dates") return "date";
  if (failureType === "empty_file" || failureType === "unknown") return "file";
  if (failureType === "processing_timeout" || failureType === "cancelled") return "processing";
  return "other";
}

function formatProcessedAt(value: number | undefined): string {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

function dateSampleToRow(
  mdaName: string,
  monthLabel: string,
  fileStatus: IngestionCellStatus,
  detail: IngestionCellDetail,
  sample: DateIssueSample
): IngestionErrorReportRow {
  const meta = detail.processingMetadata;
  return {
    mdaName,
    monthLabel,
    fileStatus: STATUS_LABELS[fileStatus],
    errorCategory: "date",
    errorType: "Date / timeline issue",
    errorDetail: sample.issueSummary,
    sheetName: meta?.sheetName ?? "",
    dataRowIndex: String(sample.dataRowIndex),
    submissionValue: sample.submissionRaw,
    completionValue: sample.completionRaw,
    timelineValue: sample.timelineRaw,
    dateIssueSummary: sample.issueSummary,
    processedAt: formatProcessedAt(detail.processedAt),
  };
}

function fileErrorToRow(
  mdaName: string,
  monthLabel: string,
  fileStatus: IngestionCellStatus,
  detail: IngestionCellDetail
): IngestionErrorReportRow | null {
  if (fileStatus !== "failed") return null;
  if (!detail.failureType && !detail.failureDetail) return null;

  const category = categorizeFailure(detail.failureType);
  if (category === "date" && detail.processingMetadata?.dateIssueSamples?.length) {
    return null;
  }

  return {
    mdaName,
    monthLabel,
    fileStatus: STATUS_LABELS[fileStatus],
    errorCategory: category,
    errorType: detail.failureType ? formatFailureType(detail.failureType) : "Error",
    errorDetail: detail.failureDetail ?? "",
    sheetName: detail.processingMetadata?.sheetName ?? "",
    dataRowIndex: "",
    submissionValue: "",
    completionValue: "",
    timelineValue: "",
    dateIssueSummary: "",
    processedAt: formatProcessedAt(detail.processedAt),
  };
}

/** One row per date issue sample across all processed files. */
export function buildDateFailureReportRows(matrix: IngestionMatrix): IngestionErrorReportRow[] {
  const rows: IngestionErrorReportRow[] = [];

  matrix.mdaNames.forEach((mdaName, rowIdx) => {
    matrix.monthLabels.forEach((monthLabel, colIdx) => {
      const state = matrix.cellStates[rowIdx]?.[colIdx] ?? "no_submission";
      if (state === "no_submission" || state === "not_checked" || state === "pending") return;

      const detail = matrix.cellDetails[rowIdx]?.[colIdx] ?? { status: state };
      const samples = detail.processingMetadata?.dateIssueSamples ?? [];
      for (const sample of samples) {
        rows.push(dateSampleToRow(mdaName, monthLabel, state, detail, sample));
      }
    });
  });

  return rows;
}

/** All errors in one flat list: layout/file failures + every bad date row. */
export function buildAllErrorsReportRows(matrix: IngestionMatrix): IngestionErrorReportRow[] {
  const rows: IngestionErrorReportRow[] = [];

  matrix.mdaNames.forEach((mdaName, rowIdx) => {
    matrix.monthLabels.forEach((monthLabel, colIdx) => {
      const state = matrix.cellStates[rowIdx]?.[colIdx] ?? "no_submission";
      if (state === "no_submission" || state === "not_checked" || state === "pending") return;

      const detail = matrix.cellDetails[rowIdx]?.[colIdx] ?? { status: state };

      const fileError = fileErrorToRow(mdaName, monthLabel, state, detail);
      if (fileError) rows.push(fileError);

      const samples = detail.processingMetadata?.dateIssueSamples ?? [];
      for (const sample of samples) {
        rows.push(dateSampleToRow(mdaName, monthLabel, state, detail, sample));
      }

      if (
        state === "success" &&
        (detail.invalidDateRowCount ?? 0) > 0 &&
        samples.length === 0
      ) {
        rows.push({
          mdaName,
          monthLabel,
          fileStatus: STATUS_LABELS.success,
          errorCategory: "date",
          errorType: "Partial date issues",
          errorDetail: `${detail.invalidDateRowCount} row(s) with invalid dates (re-run processing check for row-level detail)`,
          sheetName: detail.processingMetadata?.sheetName ?? "",
          dataRowIndex: "",
          submissionValue: "",
          completionValue: "",
          timelineValue: "",
          dateIssueSummary: "",
          processedAt: formatProcessedAt(detail.processedAt),
        });
      }
    });
  });

  return rows;
}

export const INGESTION_ERROR_REPORT_COLUMNS: Array<{
  key: keyof IngestionErrorReportRow;
  header: string;
}> = [
  { key: "mdaName", header: "MDA" },
  { key: "monthLabel", header: "Month" },
  { key: "fileStatus", header: "File status" },
  { key: "errorCategory", header: "Category" },
  { key: "errorType", header: "Error type" },
  { key: "errorDetail", header: "Error detail" },
  { key: "sheetName", header: "Sheet" },
  { key: "dataRowIndex", header: "Data row #" },
  { key: "submissionValue", header: "Submission date (raw)" },
  { key: "completionValue", header: "Completion date (raw)" },
  { key: "timelineValue", header: "Timeline (raw)" },
  { key: "dateIssueSummary", header: "Date issue(s)" },
  { key: "processedAt", header: "Processed at" },
];

export function errorRowsToAoA(rows: IngestionErrorReportRow[]): string[][] {
  const headers = INGESTION_ERROR_REPORT_COLUMNS.map((c) => c.header);
  const body = rows.map((row) =>
    INGESTION_ERROR_REPORT_COLUMNS.map((c) => {
      const value = row[c.key];
      if (c.key === "errorCategory") {
        return CATEGORY_LABELS[value as IngestionErrorCategory] ?? value;
      }
      return value ?? "";
    })
  );
  return [headers, ...body];
}

export function countErrorsByCategory(rows: IngestionErrorReportRow[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const label = CATEGORY_LABELS[row.errorCategory];
    counts[label] = (counts[label] ?? 0) + 1;
  }
  return counts;
}
