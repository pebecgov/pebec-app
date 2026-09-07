import * as XLSX from "xlsx";
import {
  classifyProcessingQuality,
  computeValidRowPercent,
  MIN_VALID_ROW_PERCENT,
  SUCCESS_VALID_ROW_PERCENT,
} from "./bfaProcessingConfig";
import {
  DATE_ISSUE_SAMPLE_LIMIT,
  enrichFailureDetailWithMetadata,
  formatDateIssueSummary,
  formatRawCellValue,
  HEADER_SCAN_ROW_LIMIT,
  type DateIssueReason,
  type DateIssueSample,
  type IngestionProcessingMetadata,
  type IngestionSheetSummary,
} from "./ingestionProcessingMetadata";

export type { IngestionProcessingMetadata, IngestionSheetSummary, DateIssueSample, DateIssueReason };
export { HEADER_SCAN_ROW_LIMIT, DATE_ISSUE_SAMPLE_LIMIT };

export const HEADER_DETECTION_KEYWORDS = [
  "CUSTOMER",
  "NAME",
  "SERVICE",
  "DATE",
  "SUBMISSION",
  "COMPLETION",
  "TIMELINE",
  "PHONE",
  "COST",
  "AMOUNT",
  "EMAIL",
  "ADDRESS",
] as const;

/** Minimum keyword hits before a row is treated as the BFA header row. */
export const MIN_HEADER_KEYWORD_MATCHES = 3;

export type SlaHeaderMapping = {
  DATE_OF_SUBMISSION: string | null;
  DATE_OF_COMPLETION: string | null;
  EXPECTED_TIMELINE: string | null;
};

export type IngestionFailureType =
  | "header_row_not_found"
  | "submission_date_column_missing"
  | "completion_date_column_missing"
  | "timeline_column_missing"
  | "unparseable_dates"
  | "insufficient_valid_rows"
  | "empty_file"
  | "unsupported_format"
  | "processing_timeout"
  | "cancelled"
  | "unknown";

const SPREADSHEET_EXTENSIONS = [".xlsx", ".xls", ".xlsm", ".csv"];

/** Non-Excel uploads (PDF, Word, etc.) — not an Excel layout problem */
export function isLikelyNonSpreadsheetFile(fileName: string | undefined | null): boolean {
  if (!fileName) return false;
  const lower = fileName.toLowerCase().trim();
  return !SPREADSHEET_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function nonSpreadsheetFileMessage(fileName: string | undefined | null): string {
  if (!fileName) {
    return "Uploaded file does not appear to be an Excel spreadsheet (.xlsx, .xls, .csv).";
  }
  return `"${fileName}" is not an Excel spreadsheet (.xlsx, .xls, .csv) — it may be a PDF or another document type.`;
}

type SheetScanResult = {
  sheetIndex: number;
  sheetName: string;
  headerRowIndex: number;
  keywordMatches: number;
  headers: string[];
  mapping: SlaHeaderMapping;
  mappedColumnCount: number;
  jsonData: Record<string, unknown>[];
};

function countMappedColumns(mapping: SlaHeaderMapping): number {
  return [mapping.DATE_OF_SUBMISSION, mapping.DATE_OF_COMPLETION, mapping.EXPECTED_TIMELINE].filter(
    Boolean
  ).length;
}

function countHeaderKeywordsInRow(row: unknown): number {
  if (!Array.isArray(row)) return 0;
  let matchCount = 0;
  row.forEach((cell) => {
    if (
      HEADER_DETECTION_KEYWORDS.some((keyword) => cellMatchesHeaderKeyword(cell, keyword))
    ) {
      matchCount++;
    }
  });
  return matchCount;
}

function buildSheetScanFromHeaderRow(
  rawData: unknown[][],
  headerRowIndex: number,
  keywordMatches: number,
  sheetName: string,
  sheetIndex: number
): SheetScanResult | null {
  const headerRow = rawData[headerRowIndex];
  if (!Array.isArray(headerRow)) return null;

  const headers = headerRow.map((h) => String(h ?? "").replace(/[\r\n]+/g, " ").trim());
  const nonEmptyHeaders = headers.filter((h) => h.length > 0);
  if (nonEmptyHeaders.length < 3) return null;

  const jsonData = rawData.slice(headerRowIndex + 1).map((row) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      if (!header) return;
      if (Array.isArray(row)) obj[header] = row[index];
    });
    return obj;
  });

  const mapping = refineHeaderMappingWithContent(
    performFallbackHeaderMatching(headers),
    headers,
    jsonData
  );

  return {
    sheetIndex,
    sheetName,
    headerRowIndex,
    keywordMatches,
    headers,
    mapping,
    mappedColumnCount: countMappedColumns(mapping),
    jsonData,
  };
}

function extractSheetData(
  sheet: XLSX.WorkSheet,
  sheetName: string,
  sheetIndex: number
): SheetScanResult | null {
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
  if (rawData.length === 0) return null;

  let bestScan: SheetScanResult | null = null;
  const scanLimit = Math.min(rawData.length, HEADER_SCAN_ROW_LIMIT);

  for (let rowIndex = 0; rowIndex < scanLimit; rowIndex++) {
    const keywordMatches = countHeaderKeywordsInRow(rawData[rowIndex]);
    if (keywordMatches < MIN_HEADER_KEYWORD_MATCHES) continue;

    const candidate = buildSheetScanFromHeaderRow(
      rawData,
      rowIndex,
      keywordMatches,
      sheetName,
      sheetIndex
    );
    if (!candidate) continue;

    if (!bestScan) {
      bestScan = candidate;
      continue;
    }

    if (candidate.mappedColumnCount > bestScan.mappedColumnCount) {
      bestScan = candidate;
    } else if (candidate.mappedColumnCount === bestScan.mappedColumnCount) {
      if (candidate.keywordMatches > bestScan.keywordMatches) {
        bestScan = candidate;
      } else if (
        candidate.keywordMatches === bestScan.keywordMatches &&
        candidate.jsonData.length > bestScan.jsonData.length
      ) {
        bestScan = candidate;
      }
    }
  }

  return bestScan;
}

function scanWorkbookSheets(workbook: XLSX.WorkBook): SheetScanResult[] {
  const results: SheetScanResult[] = [];
  workbook.SheetNames.forEach((sheetName, sheetIndex) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;
    const scanned = extractSheetData(sheet, sheetName, sheetIndex);
    if (scanned) results.push(scanned);
  });
  return results;
}

function pickBestSheet(scans: SheetScanResult[]): SheetScanResult | null {
  if (scans.length === 0) return null;
  return scans.reduce((best, current) => {
    if (current.mappedColumnCount > best.mappedColumnCount) return current;
    if (current.mappedColumnCount < best.mappedColumnCount) return best;
    if (current.keywordMatches > best.keywordMatches) return current;
    if (current.keywordMatches < best.keywordMatches) return best;
    if (current.jsonData.length > best.jsonData.length) return current;
    return best;
  });
}

function buildProcessingMetadata(
  scans: SheetScanResult[],
  best: SheetScanResult | null,
  fileName?: string
): IngestionProcessingMetadata {
  const sheetSummaries: IngestionSheetSummary[] = scans.map((s) => ({
    sheetName: s.sheetName,
    headerRowIndex: s.headerRowIndex,
    keywordMatches: s.keywordMatches,
    mappedColumnCount: s.mappedColumnCount,
    headers: s.headers.filter((h) => h.trim().length > 0),
  }));

  if (!best) {
    return {
      rowsScannedForHeader: HEADER_SCAN_ROW_LIMIT,
      fileName,
      sheetSummaries,
    };
  }

  return {
    sheetName: best.sheetName,
    sheetIndex: best.sheetIndex,
    headerRowIndex: best.headerRowIndex,
    headerKeywordMatches: best.keywordMatches,
    detectedHeaders: best.headers.filter((h) => h.trim().length > 0),
    mappedSubmissionColumn: best.mapping.DATE_OF_SUBMISSION,
    mappedCompletionColumn: best.mapping.DATE_OF_COMPLETION,
    mappedTimelineColumn: best.mapping.EXPECTED_TIMELINE,
    rowsScannedForHeader: HEADER_SCAN_ROW_LIMIT,
    fileName,
    sheetSummaries,
  };
}

function formatHeaderPreview(headers: string[]): string {
  const preview = headers.filter((h) => h.trim().length > 0).slice(0, 8);
  if (preview.length === 0) return "(no column headers found)";
  const suffix = headers.filter((h) => h.trim().length > 0).length > preview.length ? ", …" : "";
  return preview.join(", ") + suffix;
}

function missingColumnsDetail(mapping: SlaHeaderMapping): string {
  const missing: string[] = [];
  if (!mapping.DATE_OF_SUBMISSION) missing.push("Date of Submission");
  if (!mapping.DATE_OF_COMPLETION) missing.push("Date of Completion");
  if (!mapping.EXPECTED_TIMELINE) missing.push("Expected Timeline");
  return missing.join(", ");
}

function excelLayoutFailure(detail: string): ProcessExcelFailure {
  return { ok: false, failureType: "unsupported_format", failureDetail: detail };
}

export type ProcessingQuality = "success" | "partial_success" | "failed";

export type ProcessExcelBufferResult =
  | {
      ok: true;
      validRowCount: number;
      totalRowCount: number;
      invalidDateRowCount: number;
      overallPercentage: number | null;
      metadata: IngestionProcessingMetadata;
      processingQuality: ProcessingQuality;
      validRowPercent: number;
      skippedBlankRowCount: number;
    }
  | {
      ok: false;
      failureType: IngestionFailureType;
      failureDetail: string;
      invalidDateRowCount?: number;
      totalRowCount?: number;
      metadata?: IngestionProcessingMetadata;
      validRowCount?: number;
      validRowPercent?: number;
      skippedBlankRowCount?: number;
    };

const MONTH_NAME_TO_INDEX: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

export function normalizeHeaderForMatch(header: string): string {
  return header
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .toUpperCase()
    .replace(/[_\-/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Matches TIMELINE, TIME LINE, TIME-LINE (normalized), etc. */
function headerIndicatesTimeline(normalized: string): boolean {
  return normalized.includes("TIMELINE") || normalized.includes("TIME LINE");
}

/** Header-detection cells that look like transaction data, not column titles. */
function looksLikeHeaderDetectionDataCell(cell: unknown): boolean {
  const raw = String(cell ?? "").trim();
  if (!raw) return true;
  if (raw.length > 45) return true;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return true;
  if (/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(raw)) return true;
  if (/^-?\d+(\.\d+)?$/.test(raw) && Number(raw) > 1000) return true;
  return false;
}

function cellMatchesHeaderKeyword(cell: unknown, keyword: string): boolean {
  if (looksLikeHeaderDetectionDataCell(cell)) return false;
  const cellStr = String(cell).toUpperCase().trim();
  if (keyword === "SERVICE") {
    return /\bSERVICE(S)?\b/.test(cellStr) && cellStr.length <= 45;
  }
  if (keyword === "NAME") {
    return (
      (/\bNAME\b/.test(cellStr) || cellStr === "NAME") &&
      cellStr.length <= 35 &&
      !cellStr.includes("COMPANY NAME")
    );
  }
  if (keyword === "SUBMISSION") {
    return cellStr.includes("SUBMISSION") && cellStr.length <= 45;
  }
  if (keyword === "COMPLETION") {
    return cellStr.includes("COMPLETION") && cellStr.length <= 45;
  }
  if (keyword === "TIMELINE") {
    return (
      (cellStr.includes("TIMELINE") || cellStr.includes("TIME LINE")) &&
      cellStr.length <= 45
    );
  }
  return cellStr.includes(keyword);
}

/** Headers that are labels (names, codes) — not date fields. */
function isLikelyNonDateLabelColumn(normalized: string): boolean {
  if (normalized.includes("DATE") || normalized.includes("TIME")) return false;
  if (normalized.includes("NAME")) return true;
  if (normalized.includes("EMAIL") || normalized.includes("ADDRESS")) return true;
  if (normalized.includes("DESCRIPTION") || normalized.includes("AMOUNT")) return true;
  if (normalized.includes("NUMBER") && !normalized.includes("DATE")) return true;
  if (normalized.includes("CODE") && !normalized.includes("DATE")) return true;
  if (normalized.includes("RRR") || normalized === "RC NUMBER") return true;
  return false;
}

function scoreSubmissionHeader(normalized: string): number {
  if (isLikelyNonDateLabelColumn(normalized)) return -1000;
  if (normalized.includes("SUBMITTED AT") || normalized === "SUBMITTED AT") return 96;
  if (normalized.includes("SUBMISSION DATE") || normalized === "SUBMISSIONDATE") return 97;
  if (normalized.includes("REGISTRATION SUBMISSION")) return 100;
  if (normalized.includes("SUBMISSION DATE") || normalized === "DATE OF SUBMISSION") return 98;
  if (normalized.includes("SUBMISSION") && normalized.includes("DATE")) return 95;
  if (normalized.includes("SUBMITTED") && normalized.includes("DATE")) return 93;
  if (normalized.includes("PAYMENT DATE")) return 70;
  if (normalized.includes("REGISTRATION DATE") && !normalized.includes("APPROVED")) return 75;
  if (normalized.includes("SUBMISSION") || normalized.includes("SUBMITTED")) return 60;
  if (normalized.includes("START") && normalized.includes("DATE")) return 65;
  if (normalized.includes("RECEIVED") && normalized.includes("DATE")) return 65;
  if (normalized.includes("DATE") && normalized.includes("FILED")) return 65;
  return -1;
}

function scoreCompletionHeader(normalized: string): number {
  if (isLikelyNonDateLabelColumn(normalized)) return -1000;
  if (normalized.includes("DECISION AT") || normalized === "DECISION AT") return 96;
  // registration_approved is often a yes/no flag, not a date — only treat as date when header says DATE
  if (normalized.includes("REGISTRATION APPROVED")) {
    return normalized.includes("DATE") ? 100 : 20;
  }
  if (normalized.includes("DATE APPROVED") || normalized.includes("APPROVAL DATE")) return 98;
  if (normalized.includes("DATE OF COMPLETION") || normalized.includes("COMPLETION DATE")) return 98;
  if (normalized === "DATE COMPLETION" || normalized.endsWith(" DATE COMPLETION")) return 97;
  if (normalized.includes("DATE CREATED") || normalized === "CREATED DATE") return 92;
  if (normalized.includes("LOAN APPROVAL")) return 90;
  if (normalized.includes("COMPLETION") && normalized.includes("DATE")) return 88;
  if (normalized.includes("COMPLETED") && normalized.includes("DATE")) return 86;
  if (normalized.includes("PAYMENT DATE")) return 80;
  if (normalized.includes("DATE ISSUED") || normalized.includes("ISSUED DATE")) return 78;
  if (normalized.includes("DATE CLOSED") || normalized.includes("CLOSED DATE")) return 76;
  if (normalized.includes("DISBURSED") && normalized.includes("DATE")) return 74;
  if (normalized.includes("FINALIZED") && normalized.includes("DATE")) return 72;
  if (normalized.includes("END DATE") || normalized.includes("DATE END")) return 70;
  if (normalized.includes("COMPLETION") || normalized.includes("COMPLETED")) return 40;
  if (normalized.includes("APPROVED") && normalized.includes("DATE")) return 85;
  // Bare "APPROVED" without DATE must not beat registration_approved
  if (normalized.includes("APPROVED") || normalized.includes("APPROVAL")) return -1;
  return -1;
}

function scoreTimelineHeader(normalized: string): number {
  if (normalized.includes("TIME TAKEN")) return 100;
  if (headerIndicatesTimeline(normalized)) return 98;
  if (normalized.includes("SLA TIMELINE")) return 95;
  if (normalized === "EXPECTED" || normalized.startsWith("EXPECTED ")) return 88;
  if (normalized.includes("AVAILABILITY CODE") || normalized === "AVAILABILITY") return 85;
  if (normalized.includes("TURNAROUND") || normalized === "TAT") return 90;
  if (normalized.includes("PROCESSING TIME")) return 88;
  if (normalized.includes("EXPECTED DAYS") || normalized.includes("TARGET DAYS")) return 85;
  if (normalized.includes("DURATION")) return 80;
  if (normalized.includes("DEADLINE")) return 75;
  if (normalized.includes("SLA")) return 70;
  if (normalized.includes("DAYS") && !normalized.includes("DATE")) return 50;
  return -1;
}

function pickBestHeaderByScore(
  headers: string[],
  scoreFn: (normalized: string) => number,
  exclude: Set<string>,
  minScore = 1
): string | null {
  let bestHeader: string | null = null;
  let bestScore = minScore - 1;

  for (const header of headers) {
    if (exclude.has(header)) continue;
    const score = scoreFn(normalizeHeaderForMatch(header));
    if (score > bestScore) {
      bestScore = score;
      bestHeader = header;
    }
  }

  return bestHeader;
}

export function performFallbackHeaderMatching(headers: string[]): SlaHeaderMapping {
  const nonEmptyHeaders = headers.filter((h) => h.trim().length > 0);
  const used = new Set<string>();

  const mapping: SlaHeaderMapping = {
    DATE_OF_SUBMISSION: null,
    DATE_OF_COMPLETION: null,
    EXPECTED_TIMELINE: null,
  };

  mapping.EXPECTED_TIMELINE = pickBestHeaderByScore(
    nonEmptyHeaders,
    scoreTimelineHeader,
    used
  );
  if (mapping.EXPECTED_TIMELINE) used.add(mapping.EXPECTED_TIMELINE);

  mapping.DATE_OF_SUBMISSION = pickBestHeaderByScore(
    nonEmptyHeaders,
    scoreSubmissionHeader,
    used
  );
  if (mapping.DATE_OF_SUBMISSION) used.add(mapping.DATE_OF_SUBMISSION);

  mapping.DATE_OF_COMPLETION = pickBestHeaderByScore(
    nonEmptyHeaders,
    scoreCompletionHeader,
    used
  );
  if (mapping.DATE_OF_COMPLETION) used.add(mapping.DATE_OF_COMPLETION);

  // Legacy fallback: lone "DATE" column when completion already mapped elsewhere
  if (!mapping.DATE_OF_SUBMISSION) {
    const dateCol = nonEmptyHeaders.find(
      (h) => !used.has(h) && normalizeHeaderForMatch(h) === "DATE"
    );
    if (dateCol && mapping.DATE_OF_COMPLETION) {
      mapping.DATE_OF_SUBMISSION = dateCol;
      used.add(dateCol);
    }
  }

  // Generic "DAYS" column only if nothing timeline-like matched yet
  if (!mapping.EXPECTED_TIMELINE) {
    const daysCol = nonEmptyHeaders.find((h) => {
      if (used.has(h)) return false;
      const n = normalizeHeaderForMatch(h);
      return n === "DAYS" || n.endsWith(" DAYS");
    });
    if (daysCol) mapping.EXPECTED_TIMELINE = daysCol;
  }

  return mapping;
}

function isBooleanCellValue(value: unknown): boolean {
  if (typeof value === "boolean") return true;
  const raw = String(value).trim().toLowerCase();
  return raw === "true" || raw === "false";
}

/** Share of non-empty sample cells that parse as dates (excludes booleans). */
function columnDateParseRate(
  rows: Record<string, unknown>[],
  column: string,
  maxSample = 250
): number {
  const sample = rows.slice(0, maxSample);
  let nonEmpty = 0;
  let parsed = 0;

  for (const row of sample) {
    const value = row[column];
    const raw = formatRawCellValue(value);
    if (!raw) continue;
    nonEmpty++;
    if (isBooleanCellValue(value)) continue;
    if (parseSmartDate(value)) parsed++;
  }

  return nonEmpty === 0 ? 0 : parsed / nonEmpty;
}

/** Share of non-empty sample cells that parse as timeline day counts. */
function columnTimelineParseRate(
  rows: Record<string, unknown>[],
  column: string,
  maxSample = 250
): number {
  const sample = rows.slice(0, maxSample);
  let nonEmpty = 0;
  let parsed = 0;

  for (const row of sample) {
    const value = row[column];
    const raw = formatRawCellValue(value);
    if (!raw) continue;
    nonEmpty++;
    if (parseTimeline(value) !== null) parsed++;
  }

  return nonEmpty === 0 ? 0 : parsed / nonEmpty;
}

/**
 * Some MDAs export a broken "Time Taken" formula (≈ constant − submission serial).
 * Values look like -4620.76 when submission is 45995.76 (sum ≈ 41375).
 */
function isBrokenSubmissionDerivedTimeline(
  timelineValue: unknown,
  submissionValue: unknown
): boolean {
  const timelineNum = Number(formatRawCellValue(timelineValue));
  const submissionNum = Number(formatRawCellValue(submissionValue));
  if (!Number.isFinite(timelineNum) || !Number.isFinite(submissionNum)) return false;
  if (timelineNum >= 0 || submissionNum < 30000) return false;
  const magnitude = Math.abs(timelineNum);
  if (magnitude <= 730) return false;
  const combined = magnitude + submissionNum;
  return combined > 40000 && combined < 50000;
}

function columnBrokenTimelineRate(
  rows: Record<string, unknown>[],
  timelineColumn: string,
  submissionColumn: string | null,
  maxSample = 250
): number {
  if (!submissionColumn) return 0;
  const sample = rows.slice(0, maxSample);
  let checked = 0;
  let broken = 0;

  for (const row of sample) {
    const timelineRaw = formatRawCellValue(row[timelineColumn]);
    if (!timelineRaw) continue;
    checked++;
    if (isBrokenSubmissionDerivedTimeline(row[timelineColumn], row[submissionColumn])) {
      broken++;
    }
  }

  return checked === 0 ? 0 : broken / checked;
}

function rankHeadersByScore(
  headers: string[],
  scoreFn: (normalized: string) => number,
  minScore = 1
): Array<{ header: string; score: number }> {
  return headers
    .map((header) => ({
      header,
      score: scoreFn(normalizeHeaderForMatch(header)),
    }))
    .filter((entry) => entry.score >= minScore)
    .sort((a, b) => b.score - a.score);
}

const MIN_COLUMN_CONTENT_PARSE_RATE = 0.35;

/**
 * Prefer columns whose cells actually parse — fixes boolean flags (registration_approved)
 * beating real date columns (date_created) on header name alone.
 */
export function refineHeaderMappingWithContent(
  mapping: SlaHeaderMapping,
  headers: string[],
  rows: Record<string, unknown>[]
): SlaHeaderMapping {
  if (rows.length === 0) return mapping;

  const refined: SlaHeaderMapping = { ...mapping };
  const used = new Set<string>();

  const pickBestContentColumn = (
    role: "submission" | "completion" | "timeline",
    current: string | null,
    scoreFn: (normalized: string) => number,
    rateFn: (column: string) => number
  ): string | null => {
    const candidates = rankHeadersByScore(headers, scoreFn);
    let bestHeader = current;
    let bestRate = current ? rateFn(current) : 0;

    for (const { header, score } of candidates) {
      if (used.has(header)) continue;
      const rate = rateFn(header);
      const beatsCurrent =
        rate > bestRate + 0.05 ||
        (rate >= MIN_COLUMN_CONTENT_PARSE_RATE &&
          bestRate < MIN_COLUMN_CONTENT_PARSE_RATE &&
          rate > bestRate);
      if (!beatsCurrent) continue;
      // Slightly prefer higher header score when parse rates are similar
      if (
        bestHeader &&
        Math.abs(rate - bestRate) < 0.05 &&
        score <= scoreFn(normalizeHeaderForMatch(bestHeader))
      ) {
        continue;
      }
      bestHeader = header;
      bestRate = rate;
    }

    if (bestHeader && bestRate < MIN_COLUMN_CONTENT_PARSE_RATE && role !== "timeline") {
      // No column in this role has enough parseable values — keep scored pick for error reporting
      return current ?? bestHeader;
    }

    return bestHeader;
  };

  const submissionRate = (column: string) => columnDateParseRate(rows, column);
  const completionRate = (column: string) => columnDateParseRate(rows, column);
  const timelineRate = (column: string) => columnTimelineParseRate(rows, column);

  refined.DATE_OF_SUBMISSION =
    pickBestContentColumn(
      "submission",
      mapping.DATE_OF_SUBMISSION,
      scoreSubmissionHeader,
      submissionRate
    ) ?? mapping.DATE_OF_SUBMISSION;
  if (refined.DATE_OF_SUBMISSION) used.add(refined.DATE_OF_SUBMISSION);

  refined.DATE_OF_COMPLETION =
    pickBestContentColumn(
      "completion",
      mapping.DATE_OF_COMPLETION,
      scoreCompletionHeader,
      completionRate
    ) ?? mapping.DATE_OF_COMPLETION;
  if (refined.DATE_OF_COMPLETION) used.add(refined.DATE_OF_COMPLETION);

  refined.EXPECTED_TIMELINE =
    pickBestContentColumn(
      "timeline",
      mapping.EXPECTED_TIMELINE,
      scoreTimelineHeader,
      timelineRate
    ) ?? mapping.EXPECTED_TIMELINE;

  if (
    refined.EXPECTED_TIMELINE &&
    refined.DATE_OF_SUBMISSION &&
    columnBrokenTimelineRate(rows, refined.EXPECTED_TIMELINE, refined.DATE_OF_SUBMISSION) > 0.5
  ) {
    const alternatives = rankHeadersByScore(headers, scoreTimelineHeader).filter(
      ({ header }) =>
        header !== refined.EXPECTED_TIMELINE && !used.has(header)
    );

    let replacement: string | null = null;
    let bestAltRate = 0;

    for (const { header } of alternatives) {
      const brokenRate = columnBrokenTimelineRate(
        rows,
        header,
        refined.DATE_OF_SUBMISSION
      );
      if (brokenRate > 0.5) continue;
      const rate = timelineRate(header);
      if (rate > bestAltRate) {
        bestAltRate = rate;
        replacement = header;
      }
    }

    if (replacement && bestAltRate >= MIN_COLUMN_CONTENT_PARSE_RATE) {
      refined.EXPECTED_TIMELINE = replacement;
    }
  }

  return refined;
}

function findCustomerOrServiceHeader(headers: string[], kind: "customer" | "service"): string | null {
  const patterns =
    kind === "customer"
      ? ["CUSTOMER", "CLIENT", "APPLICANT", "BENEFICIARY", "COMPANY NAME", "NAME OF CUSTOMER"]
      : ["SERVICE", "PRODUCT", "APPLICATION TYPE", "SERVICE TYPE", "TYPE OF SERVICE"];

  return (
    headers.find((header) => {
      const normalized = normalizeHeaderForMatch(header);
      return patterns.some((p) => normalized.includes(p));
    }) ?? null
  );
}

/** Skip template padding rows — all SLA fields and customer/service identifiers blank. */
export function filterBlankPaddingRows(
  inputRows: Record<string, unknown>[],
  headerMapping: SlaHeaderMapping,
  headers: string[]
): { rows: Record<string, unknown>[]; skippedCount: number } {
  const customerHeader = findCustomerOrServiceHeader(headers, "customer");
  const serviceHeader = findCustomerOrServiceHeader(headers, "service");

  let skippedCount = 0;
  const rows = inputRows.filter((row) => {
    const submissionRaw = headerMapping.DATE_OF_SUBMISSION
      ? formatRawCellValue(row[headerMapping.DATE_OF_SUBMISSION])
      : "";
    const completionRaw = headerMapping.DATE_OF_COMPLETION
      ? formatRawCellValue(row[headerMapping.DATE_OF_COMPLETION])
      : "";
    const timelineRaw = headerMapping.EXPECTED_TIMELINE
      ? formatRawCellValue(row[headerMapping.EXPECTED_TIMELINE])
      : "";
    const customerRaw = customerHeader ? formatRawCellValue(row[customerHeader]) : "";
    const serviceRaw = serviceHeader ? formatRawCellValue(row[serviceHeader]) : "";

    const slaBlank = !submissionRaw && !completionRaw && !timelineRaw;
    const identityBlank = !customerRaw && !serviceRaw;

    if (slaBlank && identityBlank) {
      skippedCount++;
      return false;
    }

    const entirelyBlank = Object.values(row).every((value) => formatRawCellValue(value) === "");
    if (entirelyBlank) {
      skippedCount++;
      return false;
    }

    return true;
  });

  return { rows, skippedCount };
}

function isValidDateParts(year: number, monthIndex: number, day: number): boolean {
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || !Number.isFinite(day)) return false;
  if (year < 1900 || year > 2100) return false;
  if (monthIndex < 0 || monthIndex > 11) return false;
  if (day < 1 || day > 31) return false;
  const date = new Date(year, monthIndex, day);
  return date.getFullYear() === year && date.getMonth() === monthIndex && date.getDate() === day;
}

function parseExcelSerialNumber(value: number): Date | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  const wholeDays = Math.floor(value);
  // Excel serial dates for modern reports are typically 40k+ (≈ 2009+)
  if (wholeDays < 30000) return null;
  const excelEpochDiff = 25569;
  const msPerDay = 86400 * 1000;
  const date = new Date((wholeDays - excelEpochDiff) * msPerDay);
  if (isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  if (year < 1990 || year > 2100) return null;
  return date;
}

export function parseSmartDate(input: unknown): Date | null {
  if (input === null || input === undefined) return null;

  if (typeof input === "boolean") return null;

  if (typeof input === "number" && Number.isFinite(input)) {
    const fromSerial = parseExcelSerialNumber(input);
    if (fromSerial) return fromSerial;
    if (input <= 0) return null;
    const excelEpochDiff = 25569;
    const msPerDay = 86400 * 1000;
    const date = new Date((input - excelEpochDiff) * msPerDay);
    return isNaN(date.getTime()) ? null : date;
  }

  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }

  const raw = String(input).trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  if (lower === "true" || lower === "false") return null;

  // Numeric strings from Excel exports (e.g. "46006.402576747685")
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    const asNumber = Number(raw);
    if (Number.isFinite(asNumber)) {
      const fromSerial = parseExcelSerialNumber(asNumber);
      if (fromSerial) return fromSerial;
    }
  }

  const normalized = raw
    .replace(/(\d+)(st|nd|rd|th)/gi, "$1")
    .replace(/[,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const numeric = normalized.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (numeric) {
    const a = Number(numeric[1]);
    const b = Number(numeric[2]);
    let y = Number(numeric[3]);
    if (y < 100) y += 2000;
    if (isValidDateParts(y, b - 1, a)) return new Date(y, b - 1, a);
    if (isValidDateParts(y, a - 1, b)) return new Date(y, a - 1, b);
  }

  const tokens = normalized.toLowerCase().split(" ");
  if (tokens.length >= 3) {
    const t0 = tokens[0];
    const t1 = tokens[1];
    const t2 = tokens[2];
    const m0 = MONTH_NAME_TO_INDEX[t0 ?? ""];
    const m1 = MONTH_NAME_TO_INDEX[t1 ?? ""];

    if (m1 !== undefined) {
      const day = Number(t0);
      const year = Number(t2);
      if (isValidDateParts(year, m1, day)) return new Date(year, m1, day);
    }
    if (m0 !== undefined) {
      const day = Number(t1);
      const year = Number(t2);
      if (isValidDateParts(year, m0, day)) return new Date(year, m0, day);
    }
  }

  const fallback = new Date(normalized);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function formatDateValue(value: unknown): string | null {
  if (!value) return null;
  try {
    const date = parseSmartDate(value);
    if (!date) return String(value);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(value);
  }
}

function calculateWorkingDays(startDate: unknown, endDate: unknown): number | null {
  if (startDate === null || startDate === undefined || endDate === null || endDate === undefined) {
    return null;
  }

  try {
    const start = parseSmartDate(startDate);
    const end = parseSmartDate(endDate);
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return null;
    }

    let count = 0;
    const current = new Date(start);
    current.setDate(current.getDate() + 1);

    let iterations = 0;
    const maxIterations = 365 * 10;

    while (current <= end) {
      if (iterations++ > maxIterations) break;
      const day = current.getDay();
      if (day !== 0 && day !== 6) count++;
      current.setDate(current.getDate() + 1);
    }

    return count;
  } catch {
    return null;
  }
}

function parseTimeline(timelineStr: unknown): number | null {
  if (timelineStr === null || timelineStr === undefined) return null;

  try {
    if (typeof timelineStr === "number" && Number.isFinite(timelineStr)) {
      // Reject Excel serial-sized garbage; accept day counts (some exports use negative values)
      const days = timelineStr < 0 ? Math.abs(timelineStr) : timelineStr;
      if (days > 730) return null;
      return Math.round(days * 10) / 10;
    }

    const str = String(timelineStr).toLowerCase().trim();
    if (!str) return null;

    // Pure numeric timeline (days)
    if (/^-?\d+(\.\d+)?$/.test(str)) {
      const num = Number(str);
      if (!Number.isFinite(num)) return null;
      const days = num < 0 ? Math.abs(num) : num;
      if (days > 730) return null;
      return Math.round(days * 10) / 10;
    }

    let value: number | null = null;

    const numberWords: Record<string, number> = {
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8,
      nine: 9,
      ten: 10,
      twenty: 20,
      thirty: 30,
    };

    for (const [word, val] of Object.entries(numberWords)) {
      if (str.startsWith(word) || str.includes(` ${word} `) || str.includes(` ${word}`)) {
        value = val;
        break;
      }
    }

    if (value === null) {
      const match = str.match(/(\d+(\.\d+)?)/);
      if (match) value = parseFloat(match[0]);
    }

    if (value === null) return null;
    if (value < 0 || value > 730) return null;
    if (str.includes("week")) return value * 5;
    if (str.includes("hour")) return Math.ceil(value / 24);
    return value;
  } catch {
    return null;
  }
}

function findAvailabilityCodeHeader(headers: string[]): string | null {
  return (
    headers.find((header) => {
      const normalized = normalizeHeaderForMatch(header);
      return normalized.includes("AVAILABILITY");
    }) ?? null
  );
}

function resolveExpectedTimelineDays(
  row: Record<string, unknown>,
  headerMapping: SlaHeaderMapping,
  submissionDate: unknown,
  availabilityHeader: string | null
): number | null {
  const timelineStr = headerMapping.EXPECTED_TIMELINE
    ? row[headerMapping.EXPECTED_TIMELINE]
    : null;

  if (
    timelineStr !== null &&
    timelineStr !== undefined &&
    !isBrokenSubmissionDerivedTimeline(timelineStr, submissionDate)
  ) {
    const parsed = parseTimeline(timelineStr);
    if (parsed !== null) return parsed;
  }

  if (availabilityHeader) {
    const fromAvailability = parseTimeline(row[availabilityHeader]);
    if (fromAvailability !== null) return fromAvailability;
  }

  return null;
}

function calculatePerformance(actualDays: number | null, expectedDays: number | null): number | null {
  if (actualDays === null || expectedDays === null) return null;
  if (actualDays <= expectedDays) return 100;
  const daysOver = actualDays - expectedDays;
  return Math.max(0, 100 - daysOver * 0.5);
}

function classifyRowDateIssues(
  submissionDate: unknown,
  completionDate: unknown,
  timelineStr: unknown,
  availabilityValue?: unknown
): DateIssueReason[] {
  const issues: DateIssueReason[] = [];

  const submissionRaw = formatRawCellValue(submissionDate);
  const completionRaw = formatRawCellValue(completionDate);
  const timelineRaw = formatRawCellValue(timelineStr);

  if (!submissionRaw) {
    issues.push("missing_submission_date");
  } else if (!parseSmartDate(submissionDate)) {
    issues.push("unparseable_submission_date");
  }

  if (!completionRaw) {
    issues.push("missing_completion_date");
  } else if (!parseSmartDate(completionDate)) {
    issues.push("unparseable_completion_date");
  }

  const timelineBroken =
    timelineRaw !== "" &&
    isBrokenSubmissionDerivedTimeline(timelineStr, submissionDate);
  const availabilityParsed =
    availabilityValue !== undefined ? parseTimeline(availabilityValue) : null;
  const timelineParsed =
    timelineRaw && !timelineBroken ? parseTimeline(timelineStr) : null;

  if (!timelineRaw && availabilityParsed === null) {
    issues.push("missing_timeline");
  } else if (timelineParsed === null && availabilityParsed === null) {
    issues.push("unparseable_timeline");
  }

  const parsedSubmission = parseSmartDate(submissionDate);
  const parsedCompletion = parseSmartDate(completionDate);
  if (
    parsedSubmission &&
    parsedCompletion &&
    !isNaN(parsedSubmission.getTime()) &&
    !isNaN(parsedCompletion.getTime()) &&
    parsedCompletion < parsedSubmission
  ) {
    issues.push("completion_before_submission");
  }

  return issues;
}

function collectDateIssueSamples(
  data: Record<string, unknown>[],
  headerMapping: SlaHeaderMapping,
  availabilityHeader: string | null
): { samples: DateIssueSample[]; totalCount: number } {
  const allSamples: DateIssueSample[] = [];

  data.forEach((row, index) => {
    const submissionDate = headerMapping.DATE_OF_SUBMISSION
      ? row[headerMapping.DATE_OF_SUBMISSION]
      : null;
    const completionDate = headerMapping.DATE_OF_COMPLETION
      ? row[headerMapping.DATE_OF_COMPLETION]
      : null;
    const timelineStr = headerMapping.EXPECTED_TIMELINE ? row[headerMapping.EXPECTED_TIMELINE] : null;
    const availabilityValue = availabilityHeader ? row[availabilityHeader] : undefined;

    const issues = classifyRowDateIssues(
      submissionDate,
      completionDate,
      timelineStr,
      availabilityValue
    );
    if (issues.length === 0) return;

    allSamples.push({
      dataRowIndex: index + 1,
      submissionRaw: formatRawCellValue(submissionDate),
      completionRaw: formatRawCellValue(completionDate),
      timelineRaw: formatRawCellValue(timelineStr),
      issues,
      issueSummary: formatDateIssueSummary(issues),
    });
  });

  return {
    samples: allSamples.slice(0, DATE_ISSUE_SAMPLE_LIMIT),
    totalCount: allSamples.length,
  };
}

export function internalProcessSlaData(
  data: Record<string, unknown>[],
  headerMapping: SlaHeaderMapping,
  headers?: string[]
) {
  const availabilityHeader =
    headers?.length ? findAvailabilityCodeHeader(headers) : null;

  const processedData = data.map((row) => {
    const submissionDate = headerMapping.DATE_OF_SUBMISSION
      ? row[headerMapping.DATE_OF_SUBMISSION]
      : null;
    const completionDate = headerMapping.DATE_OF_COMPLETION
      ? row[headerMapping.DATE_OF_COMPLETION]
      : null;
    const timelineStr = headerMapping.EXPECTED_TIMELINE ? row[headerMapping.EXPECTED_TIMELINE] : null;

    const actualDays = calculateWorkingDays(submissionDate, completionDate);
    const expectedDays = resolveExpectedTimelineDays(
      row,
      headerMapping,
      submissionDate,
      availabilityHeader
    );
    const performancePercentage = calculatePerformance(actualDays, expectedDays);

    let status = "Invalid Dates";
    if (actualDays !== null && expectedDays !== null) {
      status = actualDays <= expectedDays ? "On Time" : "Delayed";
    }

    return {
      ...row,
      "DATE OF SUBMISSION": formatDateValue(submissionDate),
      "DATE OF COMPLETION": formatDateValue(completionDate),
      "EXPECTED TIMELINE": timelineStr,
      "ACTUAL WORKING DAYS": actualDays,
      STATUS: status,
      "DAYS OVER":
        actualDays !== null && expectedDays !== null ? Math.max(0, actualDays - expectedDays) : null,
      "PERFORMANCE %":
        performancePercentage !== null ? `${performancePercentage.toFixed(2)}%` : "N/A",
    };
  });

  const validRows = processedData.filter((row) => row["PERFORMANCE %"] !== "N/A");
  const totalPercentage = validRows.reduce((sum, row) => {
    const percentage = parseFloat(String(row["PERFORMANCE %"]).replace("%", ""));
    return sum + percentage;
  }, 0);

  const overallPercentage = validRows.length > 0 ? totalPercentage / validRows.length : null;
  const invalidDateRowCount = processedData.filter((row) => row.STATUS === "Invalid Dates").length;
  const dateIssues = collectDateIssueSamples(data, headerMapping, availabilityHeader);

  return {
    processedData,
    overallPercentage,
    totalRows: data.length,
    validRows: validRows.length,
    invalidDateRowCount,
    dateIssueSamples: dateIssues.samples,
    dateIssueTotalCount: dateIssues.totalCount,
    success: true as const,
  };
}

export function detectHeaderRowIndex(rawData: unknown[][]): { headerRowIndex: number; maxMatches: number } {
  let headerRowIndex = 0;
  let maxMatches = 0;

  for (let i = 0; i < Math.min(rawData.length, HEADER_SCAN_ROW_LIMIT); i++) {
    const matchCount = countHeaderKeywordsInRow(rawData[i]);
    if (matchCount >= MIN_HEADER_KEYWORD_MATCHES && matchCount > maxMatches) {
      maxMatches = matchCount;
      headerRowIndex = i;
    }
  }

  return { headerRowIndex, maxMatches };
}

type ProcessExcelFailure = Extract<ProcessExcelBufferResult, { ok: false }>;

type ResolveLayoutResult =
  | ProcessExcelFailure
  | SheetScanResult;

function resolveSheetLayout(
  scans: SheetScanResult[],
  fileName?: string
): ResolveLayoutResult & { metadata: IngestionProcessingMetadata } {
  const best = pickBestSheet(scans);
  const metadata = buildProcessingMetadata(scans, best, fileName);

  if (!best) {
    const base = excelLayoutFailure(
      "Could not read any sheet in this Excel file — the workbook may be empty or not use the expected BFA table layout."
    );
    return { ...base, metadata };
  }

  if (best.keywordMatches === 0) {
    const base = excelLayoutFailure(
      `Could not detect a BFA header row in the first ${HEADER_SCAN_ROW_LIMIT} row(s) on sheet "${best.sheetName}". ` +
        `Need at least ${MIN_HEADER_KEYWORD_MATCHES} column-title keyword matches (Customer, Service, Date, Amount, etc.). ` +
        `Found: ${formatHeaderPreview(best.headers)}`
    );
    return {
      ...base,
      failureDetail: enrichFailureDetailWithMetadata(base.failureDetail, metadata),
      metadata,
    };
  }

  if (best.mappedColumnCount === 0) {
    const base = excelLayoutFailure(
      `Column headers on sheet "${best.sheetName}" do not match the expected BFA format. ` +
        `Need Date of Submission, Date of Completion, and Expected Timeline. Found: ${formatHeaderPreview(best.headers)}`
    );
    return {
      ...base,
      failureDetail: enrichFailureDetailWithMetadata(base.failureDetail, metadata),
      metadata,
    };
  }

  if (best.mappedColumnCount < 3) {
    const base = excelLayoutFailure(
      `Missing expected BFA columns on sheet "${best.sheetName}": ${missingColumnsDetail(best.mapping)}. ` +
        `Found headers: ${formatHeaderPreview(best.headers)}`
    );
    return {
      ...base,
      failureDetail: enrichFailureDetailWithMetadata(base.failureDetail, metadata),
      metadata,
    };
  }

  if (best.jsonData.length === 0) {
    return {
      ok: false,
      failureType: "empty_file",
      failureDetail: enrichFailureDetailWithMetadata(
        "Excel file has headers but no data rows",
        metadata
      ),
      metadata,
    };
  }

  return Object.assign(best, { metadata });
}

function attachDateIssuesToMetadata(
  metadata: IngestionProcessingMetadata,
  samples: DateIssueSample[],
  totalCount: number
): IngestionProcessingMetadata {
  return {
    ...metadata,
    dateIssueSamples: samples,
    dateIssueTotalCount: totalCount,
    dateIssueSampleLimit: DATE_ISSUE_SAMPLE_LIMIT,
  };
}

export function processExcelBuffer(
  arrayBuffer: ArrayBuffer,
  fileName?: string
): ProcessExcelBufferResult {
  const full = processExcelBufferFull(arrayBuffer, fileName);
  if (!full.ok) return full;
  return {
    ok: true,
    validRowCount: full.validRowCount,
    totalRowCount: full.totalRowCount,
    invalidDateRowCount: full.invalidDateRowCount,
    overallPercentage: full.overallPercentage,
    metadata: full.metadata,
    processingQuality: full.processingQuality,
    validRowPercent: full.validRowPercent,
    skippedBlankRowCount: full.skippedBlankRowCount,
  };
}

export function processExcelBufferFull(
  arrayBuffer: ArrayBuffer,
  fileName?: string
):
  | ({
      ok: true;
      validRowCount: number;
      totalRowCount: number;
      invalidDateRowCount: number;
      overallPercentage: number | null;
      processedData: ReturnType<typeof internalProcessSlaData>["processedData"];
      metadata: IngestionProcessingMetadata;
      processingQuality: ProcessingQuality;
      validRowPercent: number;
      skippedBlankRowCount: number;
    })
  | ({
      ok: false;
      failureType: IngestionFailureType;
      failureDetail: string;
      invalidDateRowCount?: number;
      totalRowCount?: number;
      metadata?: IngestionProcessingMetadata;
      validRowCount?: number;
      validRowPercent?: number;
      skippedBlankRowCount?: number;
    }) {
  try {
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
    if (workbook.SheetNames.length === 0) {
      return { ok: false, failureType: "empty_file", failureDetail: "Excel file has no sheets" };
    }

    const scans = scanWorkbookSheets(workbook);
    const resolved = resolveSheetLayout(scans, fileName);
    if ("ok" in resolved && resolved.ok === false) {
      return resolved;
    }

    const sheet = resolved as SheetScanResult & { metadata: IngestionProcessingMetadata };
    const { rows: dataRows, skippedCount: skippedBlankRowCount } = filterBlankPaddingRows(
      sheet.jsonData,
      sheet.mapping,
      sheet.headers
    );

    if (dataRows.length === 0) {
      return {
        ok: false,
        failureType: "empty_file",
        failureDetail: enrichFailureDetailWithMetadata(
          skippedBlankRowCount > 0
            ? `File has ${skippedBlankRowCount} blank padding row(s) but no data rows with customer/service or date values.`
            : "Excel file has headers but no data rows",
          sheet.metadata
        ),
        totalRowCount: 0,
        skippedBlankRowCount,
        metadata: sheet.metadata,
      };
    }

    const processResult = internalProcessSlaData(dataRows, sheet.mapping, sheet.headers);
    const metadataWithDates = attachDateIssuesToMetadata(
      sheet.metadata,
      processResult.dateIssueSamples,
      processResult.dateIssueTotalCount
    );
    const validRowPercent = computeValidRowPercent(processResult.validRows, processResult.totalRows);
    const processingQuality = classifyProcessingQuality(
      processResult.validRows,
      processResult.totalRows
    );

    if (processingQuality === "failed") {
      const sampleHint =
        processResult.dateIssueSamples.length > 0
          ? ` See date failure report for ${processResult.dateIssueTotalCount} row(s) with details.`
          : "";
      const failureType =
        processResult.validRows === 0 ? "unparseable_dates" : "insufficient_valid_rows";
      const baseDetail =
        processResult.validRows === 0
          ? `All ${processResult.totalRows} data row(s) have invalid or missing dates.${sampleHint}`
          : `Only ${validRowPercent.toFixed(1)}% of rows (${processResult.validRows}/${processResult.totalRows}) have valid dates — below the ${MIN_VALID_ROW_PERCENT}% minimum for a passing file.${sampleHint}`;

      return {
        ok: false,
        failureType,
        failureDetail: enrichFailureDetailWithMetadata(baseDetail, metadataWithDates),
        invalidDateRowCount: processResult.invalidDateRowCount,
        totalRowCount: processResult.totalRows,
        validRowCount: processResult.validRows,
        validRowPercent,
        skippedBlankRowCount,
        metadata: metadataWithDates,
      };
    }

    const partialNote =
      processingQuality === "partial_success"
        ? `${validRowPercent.toFixed(1)}% of rows valid (${processResult.validRows}/${processResult.totalRows}) — below ${SUCCESS_VALID_ROW_PERCENT}% full-success threshold.`
        : undefined;

    return {
      ok: true,
      validRowCount: processResult.validRows,
      totalRowCount: processResult.totalRows,
      invalidDateRowCount: processResult.invalidDateRowCount,
      overallPercentage: processResult.overallPercentage,
      processedData: processResult.processedData,
      metadata: {
        ...metadataWithDates,
        skippedBlankRowCount,
        validRowPercent,
        processingQuality,
        partialSuccessNote: partialNote,
      },
      processingQuality,
      validRowPercent,
      skippedBlankRowCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not open file";
    return {
      ok: false,
      failureType: "unknown",
      failureDetail: `Could not open or read this file: ${message}. If this is a PDF or Word document, upload the Excel export instead.`,
    };
  }
}
