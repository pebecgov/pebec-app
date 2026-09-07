import { v } from "convex/values";

/** Rows scanned when searching for the BFA header row (title blocks often push headers to row 5–10). */
export const HEADER_SCAN_ROW_LIMIT = 25;

export type IngestionSheetSummary = {
  sheetName: string;
  headerRowIndex: number;
  keywordMatches: number;
  mappedColumnCount: number;
  headers: string[];
};

export type DateIssueReason =
  | "missing_submission_date"
  | "unparseable_submission_date"
  | "missing_completion_date"
  | "unparseable_completion_date"
  | "completion_before_submission"
  | "missing_timeline"
  | "unparseable_timeline";

export type DateIssueSample = {
  /** 1-based row index in the data table (below header row) */
  dataRowIndex: number;
  submissionRaw: string;
  completionRaw: string;
  timelineRaw: string;
  issues: DateIssueReason[];
  issueSummary: string;
};

/** Max invalid date rows stored per file (full count still tracked separately). */
export const DATE_ISSUE_SAMPLE_LIMIT = 100;

export type IngestionProcessingMetadata = {
  sheetName?: string;
  sheetIndex?: number;
  /** 0-based index in the sheet */
  headerRowIndex?: number;
  headerKeywordMatches?: number;
  detectedHeaders?: string[];
  mappedSubmissionColumn?: string | null;
  mappedCompletionColumn?: string | null;
  mappedTimelineColumn?: string | null;
  rowsScannedForHeader?: number;
  fileName?: string;
  sheetSummaries?: IngestionSheetSummary[];
  dateIssueSamples?: DateIssueSample[];
  dateIssueTotalCount?: number;
  dateIssueSampleLimit?: number;
  skippedBlankRowCount?: number;
  validRowPercent?: number;
  processingQuality?: "success" | "partial_success" | "failed";
  partialSuccessNote?: string;
};

export const dateIssueReasonValidator = v.union(
  v.literal("missing_submission_date"),
  v.literal("unparseable_submission_date"),
  v.literal("missing_completion_date"),
  v.literal("unparseable_completion_date"),
  v.literal("completion_before_submission"),
  v.literal("missing_timeline"),
  v.literal("unparseable_timeline")
);

export const dateIssueSampleValidator = v.object({
  dataRowIndex: v.number(),
  submissionRaw: v.string(),
  completionRaw: v.string(),
  timelineRaw: v.string(),
  issues: v.array(dateIssueReasonValidator),
  issueSummary: v.string(),
});

export const ingestionProcessingMetadataValidator = v.object({
  sheetName: v.optional(v.string()),
  sheetIndex: v.optional(v.number()),
  headerRowIndex: v.optional(v.number()),
  headerKeywordMatches: v.optional(v.number()),
  detectedHeaders: v.optional(v.array(v.string())),
  mappedSubmissionColumn: v.optional(v.union(v.string(), v.null())),
  mappedCompletionColumn: v.optional(v.union(v.string(), v.null())),
  mappedTimelineColumn: v.optional(v.union(v.string(), v.null())),
  rowsScannedForHeader: v.optional(v.number()),
  fileName: v.optional(v.string()),
  sheetSummaries: v.optional(
    v.array(
      v.object({
        sheetName: v.string(),
        headerRowIndex: v.number(),
        keywordMatches: v.number(),
        mappedColumnCount: v.number(),
        headers: v.array(v.string()),
      })
    )
  ),
  dateIssueSamples: v.optional(v.array(dateIssueSampleValidator)),
  dateIssueTotalCount: v.optional(v.number()),
  dateIssueSampleLimit: v.optional(v.number()),
  skippedBlankRowCount: v.optional(v.number()),
  validRowPercent: v.optional(v.number()),
  processingQuality: v.optional(
    v.union(v.literal("success"), v.literal("partial_success"), v.literal("failed"))
  ),
  partialSuccessNote: v.optional(v.string()),
});

export const DATE_ISSUE_LABELS: Record<DateIssueReason, string> = {
  missing_submission_date: "Submission date missing",
  unparseable_submission_date: "Submission date unparseable",
  missing_completion_date: "Completion date missing",
  unparseable_completion_date: "Completion date unparseable",
  completion_before_submission: "Completion before submission",
  missing_timeline: "Expected timeline missing",
  unparseable_timeline: "Expected timeline unparseable",
};

export function formatDateIssueSummary(issues: DateIssueReason[]): string {
  return issues.map((i) => DATE_ISSUE_LABELS[i]).join("; ");
}

export function formatRawCellValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

export function formatHeadersList(headers: string[] | undefined): string {
  if (!headers?.length) return "";
  return headers.filter((h) => h.trim().length > 0).join(" | ");
}

export function formatHeaderRowLabel(headerRowIndex: number | undefined): string {
  if (headerRowIndex === undefined) return "—";
  return `Row ${headerRowIndex + 1}`;
}

export function enrichFailureDetailWithMetadata(
  baseDetail: string,
  metadata: IngestionProcessingMetadata | undefined
): string {
  if (!metadata) return baseDetail;

  const parts: string[] = [baseDetail];

  if (metadata.sheetName != null && metadata.headerRowIndex != null) {
    parts.push(
      `Scanned first ${metadata.rowsScannedForHeader ?? HEADER_SCAN_ROW_LIMIT} row(s). ` +
        `Best match: sheet "${metadata.sheetName}", header at row ${metadata.headerRowIndex + 1}` +
        (metadata.headerKeywordMatches != null
          ? ` (${metadata.headerKeywordMatches} keyword match(es))`
          : "") +
        "."
    );
  }

  const headers = formatHeadersList(metadata.detectedHeaders);
  if (headers) {
    parts.push(`Columns detected: ${headers}`);
  }

  const mappingParts: string[] = [];
  if (metadata.mappedSubmissionColumn) {
    mappingParts.push(`Submission → "${metadata.mappedSubmissionColumn}"`);
  }
  if (metadata.mappedCompletionColumn) {
    mappingParts.push(`Completion → "${metadata.mappedCompletionColumn}"`);
  }
  if (metadata.mappedTimelineColumn) {
    mappingParts.push(`Timeline → "${metadata.mappedTimelineColumn}"`);
  }
  if (mappingParts.length > 0) {
    parts.push(`Mapped: ${mappingParts.join("; ")}`);
  }

  return parts.join(" ");
}
