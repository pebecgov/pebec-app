import * as XLSX from "xlsx";
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
  "SERVICE",
  "DATE",
  "PHONE",
  "COST",
  "AMOUNT",
  "EMAIL",
  "ADDRESS",
] as const;

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

function extractSheetData(
  sheet: XLSX.WorkSheet,
  sheetName: string,
  sheetIndex: number
): SheetScanResult | null {
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
  if (rawData.length === 0) return null;

  const { headerRowIndex, maxMatches } = detectHeaderRowIndex(rawData);
  const rawDataWithHeaders = XLSX.utils.sheet_to_json(sheet, {
    range: headerRowIndex,
    header: 1,
    defval: "",
  }) as unknown[][];

  if (rawDataWithHeaders.length === 0) return null;

  const originalHeaders = rawDataWithHeaders[0];
  if (!Array.isArray(originalHeaders)) return null;

  const headers = originalHeaders.map((h) => String(h).replace(/[\r\n]+/g, " ").trim());
  const mapping = performFallbackHeaderMatching(headers);
  const jsonData = rawDataWithHeaders.slice(1).map((row) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      if (Array.isArray(row)) obj[header] = row[index];
    });
    return obj;
  });

  return {
    sheetIndex,
    sheetName,
    headerRowIndex,
    keywordMatches: maxMatches,
    headers,
    mapping,
    mappedColumnCount: countMappedColumns(mapping),
    jsonData,
  };
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

export type ProcessExcelBufferResult =
  | {
      ok: true;
      validRowCount: number;
      totalRowCount: number;
      invalidDateRowCount: number;
      overallPercentage: number | null;
      metadata: IngestionProcessingMetadata;
    }
  | {
      ok: false;
      failureType: IngestionFailureType;
      failureDetail: string;
      invalidDateRowCount?: number;
      totalRowCount?: number;
      metadata?: IngestionProcessingMetadata;
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

export function performFallbackHeaderMatching(headers: string[]): SlaHeaderMapping {
  const mapping: SlaHeaderMapping = {
    DATE_OF_SUBMISSION: null,
    DATE_OF_COMPLETION: null,
    EXPECTED_TIMELINE: null,
  };

  headers.forEach((header) => {
    const upperHeader = header.toUpperCase();

    if (
      !mapping.DATE_OF_SUBMISSION &&
      (upperHeader.includes("SUBMISSION") ||
        upperHeader.includes("START") ||
        upperHeader.includes("SUBMITTED"))
    ) {
      mapping.DATE_OF_SUBMISSION = header;
    }

    if (
      !mapping.DATE_OF_COMPLETION &&
      (upperHeader.includes("COMPLETION") ||
        upperHeader.includes("END") ||
        upperHeader.includes("COMPLETED") ||
        upperHeader.includes("FINISH"))
    ) {
      mapping.DATE_OF_COMPLETION = header;
    }

    if (
      !mapping.EXPECTED_TIMELINE &&
      (upperHeader.includes("TIMELINE") ||
        upperHeader.includes("EXPECTED") ||
        upperHeader.includes("DAYS") ||
        upperHeader.includes("DEADLINE") ||
        upperHeader.includes("TARGET") ||
        upperHeader.includes("SLA"))
    ) {
      mapping.EXPECTED_TIMELINE = header;
    }
  });

  headers.forEach((header) => {
    const upperHeader = header.toUpperCase();
    if (
      !mapping.DATE_OF_SUBMISSION &&
      !mapping.DATE_OF_COMPLETION &&
      upperHeader === "DATE" &&
      mapping.DATE_OF_COMPLETION
    ) {
      mapping.DATE_OF_SUBMISSION = header;
    }
  });

  return mapping;
}

function isValidDateParts(year: number, monthIndex: number, day: number): boolean {
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || !Number.isFinite(day)) return false;
  if (year < 1900 || year > 2100) return false;
  if (monthIndex < 0 || monthIndex > 11) return false;
  if (day < 1 || day > 31) return false;
  const date = new Date(year, monthIndex, day);
  return date.getFullYear() === year && date.getMonth() === monthIndex && date.getDate() === day;
}

export function parseSmartDate(input: unknown): Date | null {
  if (input === null || input === undefined) return null;

  if (typeof input === "number" && Number.isFinite(input)) {
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
  if (!timelineStr) return null;

  try {
    const str = String(timelineStr).toLowerCase().trim();
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
    if (str.includes("week")) return value * 5;
    if (str.includes("hour")) return Math.ceil(value / 24);
    return value;
  } catch {
    return null;
  }
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
  timelineStr: unknown
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

  if (!timelineRaw) {
    issues.push("missing_timeline");
  } else if (parseTimeline(timelineStr) === null) {
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
  headerMapping: SlaHeaderMapping
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

    const issues = classifyRowDateIssues(submissionDate, completionDate, timelineStr);
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

export function internalProcessSlaData(data: Record<string, unknown>[], headerMapping: SlaHeaderMapping) {
  const processedData = data.map((row) => {
    const submissionDate = headerMapping.DATE_OF_SUBMISSION
      ? row[headerMapping.DATE_OF_SUBMISSION]
      : null;
    const completionDate = headerMapping.DATE_OF_COMPLETION
      ? row[headerMapping.DATE_OF_COMPLETION]
      : null;
    const timelineStr = headerMapping.EXPECTED_TIMELINE ? row[headerMapping.EXPECTED_TIMELINE] : null;

    const actualDays = calculateWorkingDays(submissionDate, completionDate);
    const expectedDays = parseTimeline(timelineStr);
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
  const dateIssues = collectDateIssueSamples(data, headerMapping);

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
    const row = rawData[i];
    let matchCount = 0;
    if (Array.isArray(row)) {
      row.forEach((cell) => {
        if (!cell) return;
        const cellStr = String(cell).toUpperCase();
        if (HEADER_DETECTION_KEYWORDS.some((keyword) => cellStr.includes(keyword))) {
          matchCount++;
        }
      });
    }
    if (matchCount > maxMatches) {
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

  const firstSheet = scans.find((s) => s.sheetIndex === 0);

  if (
    best.sheetIndex > 0 &&
    best.mappedColumnCount >= 1 &&
    (firstSheet?.mappedColumnCount ?? 0) < best.mappedColumnCount
  ) {
    const base = excelLayoutFailure(
      `Report data looks like it is on sheet "${best.sheetName}" (sheet ${best.sheetIndex + 1}), not the first sheet. ` +
        `Expected columns (Date of Submission, Date of Completion, Expected Timeline) were not found on "${firstSheet?.sheetName ?? "Sheet1"}".`
    );
    return {
      ...base,
      failureDetail: enrichFailureDetailWithMetadata(base.failureDetail, metadata),
      metadata,
    };
  }

  if (best.keywordMatches === 0) {
    const base = excelLayoutFailure(
      `Could not detect a BFA header row in the first ${HEADER_SCAN_ROW_LIMIT} row(s) on sheet "${best.sheetName}". ` +
        `Expected columns like Customer, Service, Date, Amount, etc. Found: ${formatHeaderPreview(best.headers)}`
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
    })
  | ({
      ok: false;
      failureType: IngestionFailureType;
      failureDetail: string;
      invalidDateRowCount?: number;
      totalRowCount?: number;
      metadata?: IngestionProcessingMetadata;
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
    const processResult = internalProcessSlaData(sheet.jsonData, sheet.mapping);
    const metadataWithDates = attachDateIssuesToMetadata(
      sheet.metadata,
      processResult.dateIssueSamples,
      processResult.dateIssueTotalCount
    );

    if (processResult.validRows === 0) {
      const sampleHint =
        processResult.dateIssueSamples.length > 0
          ? ` See date failure report for ${processResult.dateIssueTotalCount} row(s) with details.`
          : "";
      return {
        ok: false,
        failureType: "unparseable_dates",
        failureDetail: enrichFailureDetailWithMetadata(
          `All ${processResult.totalRows} row(s) have invalid or missing dates.${sampleHint}`,
          metadataWithDates
        ),
        invalidDateRowCount: processResult.invalidDateRowCount,
        totalRowCount: processResult.totalRows,
        metadata: metadataWithDates,
      };
    }

    return {
      ok: true,
      validRowCount: processResult.validRows,
      totalRowCount: processResult.totalRows,
      invalidDateRowCount: processResult.invalidDateRowCount,
      overallPercentage: processResult.overallPercentage,
      processedData: processResult.processedData,
      metadata: metadataWithDates,
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
