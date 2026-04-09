// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import * as XLSX from "xlsx";

// Expected headers for SLA scoring
const EXPECTED_HEADERS = {
  submissionDate: ['DATE OF SUBMISSION', 'SUBMISSION DATE', 'DATE SUBMITTED', 'SUBMITTED DATE', 'START DATE', 'DATE STARTED'],
  completionDate: ['DATE OF COMPLETION', 'COMPLETION DATE', 'DATE COMPLETED', 'COMPLETED DATE', 'END DATE', 'DATE ENDED'],
  timeline: ['EXPECTED TIMELINE', 'TIMELINE', 'EXPECTED DAYS', 'TARGET DAYS', 'DEADLINE DAYS', 'SLA DAYS']
};

// --- Helper Functions (Pure Logic) ---

// Fallback header matching using simple string matching
function performFallbackHeaderMatching(headers: string[]) {
  const mapping: { [key: string]: string | null } = {
    DATE_OF_SUBMISSION: null,
    DATE_OF_COMPLETION: null,
    EXPECTED_TIMELINE: null
  };

  headers.forEach(header => {
    const upperHeader = header.toUpperCase();

    // Match submission date - stricter matching
    if (!mapping.DATE_OF_SUBMISSION &&
      (upperHeader.includes('SUBMISSION') || upperHeader.includes('START') ||
        upperHeader.includes('SUBMITTED'))) {
      mapping.DATE_OF_SUBMISSION = header;
    }

    // Match completion date
    if (!mapping.DATE_OF_COMPLETION &&
      (upperHeader.includes('COMPLETION') || upperHeader.includes('END') ||
        upperHeader.includes('COMPLETED') || upperHeader.includes('FINISH'))) {
      mapping.DATE_OF_COMPLETION = header;
    }

    // Match timeline
    if (!mapping.EXPECTED_TIMELINE &&
      (upperHeader.includes('TIMELINE') || upperHeader.includes('EXPECTED') ||
        upperHeader.includes('DAYS') || upperHeader.includes('DEADLINE') ||
        upperHeader.includes('TARGET') || upperHeader.includes('SLA'))) {
      mapping.EXPECTED_TIMELINE = header;
    }
  });

  // Second pass: if still missing, try less specific but distinct terms
  headers.forEach(header => {
    const upperHeader = header.toUpperCase();

    if (!mapping.DATE_OF_SUBMISSION && !mapping.DATE_OF_COMPLETION && upperHeader === 'DATE') {
      // If we have a generic "DATE" column and haven't found specific ones, it's ambiguous.
      // Safer to NOT map it than to map it wrong.
      // But if we found completion date, maybe this is submission?
      if (mapping.DATE_OF_COMPLETION) {
        mapping.DATE_OF_SUBMISSION = header;
      }
    }
  });

  return mapping;
}

// Helper to format date value to DD/MM/YYYY
const MONTH_NAME_TO_INDEX: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function isValidDateParts(year: number, monthIndex: number, day: number): boolean {
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || !Number.isFinite(day)) return false;
  if (year < 1900 || year > 2100) return false;
  if (monthIndex < 0 || monthIndex > 11) return false;
  if (day < 1 || day > 31) return false;
  const date = new Date(year, monthIndex, day);
  return date.getFullYear() === year && date.getMonth() === monthIndex && date.getDate() === day;
}

function parseSmartDate(input: any): Date | null {
  if (input === null || input === undefined) return null;

  // Excel serial number
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

  // Normalize e.g. "1st December, 2025" -> "1 December 2025"
  const normalized = raw
    .replace(/(\d+)(st|nd|rd|th)/gi, "$1")
    .replace(/[,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 1) dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy (or mm/dd/yyyy fallback)
  const numeric = normalized.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (numeric) {
    let a = Number(numeric[1]);
    let b = Number(numeric[2]);
    let y = Number(numeric[3]);
    if (y < 100) y += 2000;

    // Prefer day-first; if impossible, fallback to month-first.
    if (isValidDateParts(y, b - 1, a)) return new Date(y, b - 1, a);
    if (isValidDateParts(y, a - 1, b)) return new Date(y, a - 1, b);
  }

  // 2) "18 Dec 2025" / "Dec 18 2025"
  const tokens = normalized.toLowerCase().split(" ");
  if (tokens.length >= 3) {
    const t0 = tokens[0];
    const t1 = tokens[1];
    const t2 = tokens[2];
    const m0 = MONTH_NAME_TO_INDEX[t0];
    const m1 = MONTH_NAME_TO_INDEX[t1];

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

  // 3) Last fallback: native parser
  const fallback = new Date(normalized);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function formatDateValue(value: any): string | null {
  if (!value) return null;

  try {
    const date = parseSmartDate(value);
    if (!date) return String(value);

    // Format as DD/MM/YYYY
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  } catch (e) {
    return String(value);
  }
}

// Helper function to calculate working days between two dates
function calculateWorkingDays(startDate: any, endDate: any): number | null {
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

    // Safety break to prevent infinite loops for very far apart dates
    let iterations = 0;
    const maxIterations = 365 * 10; // 10 years max

    while (current <= end) {
      if (iterations++ > maxIterations) break;

      const day = current.getDay();
      if (day !== 0 && day !== 6) { // Exclude weekends
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  } catch (error) {
    console.error("Date calculation error:", error);
    return null;
  }
}

// Helper function to parse timeline string
function parseTimeline(timelineStr: any): number | null {
  if (!timelineStr) return null;

  try {
    const str = String(timelineStr).toLowerCase().trim();
    let value: number | null = null;

    // Check for number words
    const numberWords: Record<string, number> = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'twenty': 20, 'thirty': 30
    };

    // Check if the string starts with or contains a number word
    for (const [word, val] of Object.entries(numberWords)) {
      if (str.startsWith(word) || str.includes(` ${word} `) || str.includes(` ${word}`)) {
        value = val;
        break;
      }
    }

    // If no word found, look for digits
    if (value === null) {
      const match = str.match(/(\d+(\.\d+)?)/);
      if (match) {
        value = parseFloat(match[0]);
      }
    }

    if (value === null) return null;

    // Apply Unit Conversion
    if (str.includes('week')) {
      // 1 Week = 5 Working Days
      return value * 5;
    } else if (str.includes('hour')) {
      // If < 24 hours -> treat as part of a day. If >= 24, divide by 24.
      return Math.ceil(value / 24);
    }

    // Default is days
    return value;

  } catch (error) {
    console.error("Timeline parsing error:", error);
    return null;
  }
}

// Helper function to calculate performance percentage
function calculatePerformance(actualDays: number | null, expectedDays: number | null): number | null {
  if (actualDays === null || expectedDays === null) return null;

  if (actualDays <= expectedDays) {
    return 100; // On time = 100%
  } else {
    const daysOver = actualDays - expectedDays;
    const percentage = 100 - (daysOver * 0.5); // 0.5% penalty per day over
    return Math.max(0, percentage);
  }
}

function internalProcessSlaData(data: any[], headerMapping: any) {
  const processedData = data.map((row: any, index: number) => {
    const submissionDate = headerMapping.DATE_OF_SUBMISSION ? row[headerMapping.DATE_OF_SUBMISSION] : null;
    const completionDate = headerMapping.DATE_OF_COMPLETION ? row[headerMapping.DATE_OF_COMPLETION] : null;
    const timelineStr = headerMapping.EXPECTED_TIMELINE ? row[headerMapping.EXPECTED_TIMELINE] : null;

    // Calculate working days
    const actualDays = calculateWorkingDays(submissionDate, completionDate);

    // Parse expected timeline
    const expectedDays = parseTimeline(timelineStr);

    // Calculate performance percentage
    const performancePercentage = calculatePerformance(actualDays, expectedDays);

    // Determine status
    let status = 'Invalid Dates';
    if (actualDays !== null && expectedDays !== null) {
      status = actualDays <= expectedDays ? 'On Time' : 'Delayed';
    }

    return {
      ...row,
      'DATE OF SUBMISSION': formatDateValue(submissionDate),
      'DATE OF COMPLETION': formatDateValue(completionDate),
      'EXPECTED TIMELINE': timelineStr,
      'ACTUAL WORKING DAYS': actualDays,
      'STATUS': status,
      'DAYS OVER': actualDays !== null && expectedDays !== null
        ? Math.max(0, actualDays - expectedDays)
        : null,
      'PERFORMANCE %': performancePercentage !== null
        ? `${performancePercentage.toFixed(2)}%`
        : 'N/A'
    };
  });

  // Calculate overall percentage
  const validRows = processedData.filter(row => row['PERFORMANCE %'] !== 'N/A');
  const totalPercentage = validRows.reduce((sum, row) => {
    const percentage = parseFloat(row['PERFORMANCE %'].replace('%', ''));
    return sum + percentage;
  }, 0);

  const overallPercentage = validRows.length > 0 ? (totalPercentage / validRows.length) : null;

  return {
    processedData,
    overallPercentage,
    totalRows: data.length,
    validRows: validRows.length,
    success: true
  };
}


// --- Actions ---

// AI Helper function to match and standardize headers
export const matchHeaders = action({
  args: {
    headers: v.array(v.string()),
    data: v.array(v.any())
  },
  handler: async (ctx, { headers, data }) => {
    try {
      // For now, use fallback matching until AI is properly configured
      const fallbackMapping = performFallbackHeaderMatching(headers);

      return {
        headerMapping: fallbackMapping,
        confidence: Object.fromEntries(
          Object.entries(fallbackMapping).map(([key, value]) => [key, value ? 0.8 : 0])
        ),
        suggestions: ["Using intelligent header matching. AI features coming soon!"],
        dataValidation: {
          hasValidDates: true,
          dateFormat: "DD/MM/YYYY",
          timelineFormat: "number"
        },
        success: true
      };

    } catch (error) {
      console.error("Header matching error:", error);

      // Fallback to simple string matching
      const fallbackMapping = performFallbackHeaderMatching(headers);

      return {
        headerMapping: fallbackMapping,
        confidence: Object.fromEntries(
          Object.entries(fallbackMapping).map(([key, value]) => [key, value ? 0.6 : 0])
        ),
        suggestions: ["Used fallback matching due to error"],
        dataValidation: {
          hasValidDates: true,
          dateFormat: "unknown",
          timelineFormat: "unknown"
        },
        success: false,
        error: (error as Error).message
      };
    }
  }
});

// Process data with standardized headers
export const processSlaData = action({
  args: {
    data: v.array(v.any()),
    headerMapping: v.object({
      DATE_OF_SUBMISSION: v.union(v.string(), v.null()),
      DATE_OF_COMPLETION: v.union(v.string(), v.null()),
      EXPECTED_TIMELINE: v.union(v.string(), v.null())
    })
  },
  handler: async (ctx, { data, headerMapping }) => {
    try {
      return internalProcessSlaData(data, headerMapping);
    } catch (error) {
      console.error("Data processing error:", error);
      return {
        processedData: [],
        overallPercentage: null,
        totalRows: 0,
        validRows: 0,
        success: false,
        error: (error as Error).message
      };
    }
  }
});

// Action to process monthly report directly from DB
export const processMonthlyReportFromDB = action({
  args: {
    mdaName: v.string(),
    month: v.number(), // 0-11
    year: v.number()
  },
  handler: async (ctx, { mdaName, month, year }): Promise<{
    success: boolean;
    results?: any[];
    overallPercentage?: number | null;
    reason?: string;
    message?: string;
  }> => {
    try {
      // 1. Get real monthly reports to find the one for this period
      // We pass the year as string to get all reports for that year
      const monthlyReports: any[] = await ctx.runQuery(api.mda_scoring.getRealMonthlyReports, {
        mdaName,
        scoringPeriod: String(year)
      });

      // 2. Find the report for the specific month
      // getRealMonthlyReports returns data with 'month' as string name (e.g. "January")
      // We need to match it with our input 'month' number
      const targetDate = new Date(year, month, 1);
      const targetMonthName = targetDate.toLocaleString('default', { month: 'long' });

      // Find the monthly data object
      const targetReportData = monthlyReports.find((r: any) =>
        r.month === targetMonthName && r.year === year
      );

      if (!targetReportData || !targetReportData.submitted || !targetReportData.reports || targetReportData.reports.length === 0) {
        return {
          success: false,
          reason: "not_found",
          message: `No submitted report found for ${targetMonthName} ${year}`
        };
      }

      // Use the first report in the list for this month
      const report: any = targetReportData.reports[0];

      if (!report.fileId) {
        return {
          success: false,
          reason: "no_file",
          message: "Report record found but no file attached"
        };
      }

      // 3. Fetch file content
      const fileUrl: string | null = await ctx.storage.getUrl(report.fileId);
      if (!fileUrl) {
        return { success: false, reason: "url_error", message: "Could not generate file URL" };
      }

      const response: Response = await fetch(fileUrl);
      if (!response.ok) {
        return { success: false, reason: "fetch_error", message: `Failed to fetch file: ${response.statusText}` };
      }
      const arrayBuffer = await response.arrayBuffer();

      // 4. Parse Excel
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const firstSheet = workbook.Sheets[firstSheetName];

      // 5. Dynamic Header Detection
      const rawData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
      let headerRowIndex = 0;
      const searchKeywords = ['CUSTOMER', 'SERVICE', 'DATE', 'PHONE', 'COST', 'AMOUNT', 'EMAIL', 'ADDRESS'];
      let maxMatches = 0;

      for (let i = 0; i < Math.min(rawData.length, 20); i++) {
        const row = rawData[i];
        let matchCount = 0;
        if (Array.isArray(row)) {
          row.forEach((cell: any) => {
            if (!cell) return;
            const cellStr = String(cell).toUpperCase();
            if (searchKeywords.some(keyword => cellStr.includes(keyword))) {
              matchCount++;
            }
          });
        }
        if (matchCount > maxMatches) {
          maxMatches = matchCount;
          headerRowIndex = i;
        }
      }

      // Re-parse with correct range to get headers and data
      // We use header: 1 to get raw array of arrays, so we can sanitize headers manually
      const rawDataWithHeaders = XLSX.utils.sheet_to_json(firstSheet, {
        range: headerRowIndex,
        header: 1,
        defval: ""
      }) as any[][];

      if (rawDataWithHeaders.length === 0) {
        return { success: false, reason: "empty_data", message: "Excel file appears empty" };
      }

      // Extract and sanitize headers
      const originalHeaders = rawDataWithHeaders[0];
      const headers = originalHeaders.map((h: any) =>
        String(h).replace(/[\r\n]+/g, " ").trim()
      );

      // Extract data rows mapping to sanitized headers
      const jsonData = rawDataWithHeaders.slice(1).map(row => {
        const obj: Record<string, any> = {};
        headers.forEach((header, index) => {
          obj[header] = row[index];
        });
        return obj;
      });

      // 6. Match Headers and Process
      // Call internal helper directly

      const fallbackMapping = performFallbackHeaderMatching(headers);
      const headerResult = { success: true, headerMapping: fallbackMapping };

      if (!headerResult.success) {
        return { success: false, reason: "header_match_fail", message: "Could not match headers" };
      }

      const processResult = internalProcessSlaData(jsonData, headerResult.headerMapping);

      return {
        success: true,
        results: processResult.processedData,
        overallPercentage: processResult.overallPercentage,
        message: `Successfully processed ${targetMonthName}`
      };

    } catch (error) {
      console.error("Auto-process error:", error);
      return {
        success: false,
        reason: "exception",
        message: (error as Error).message
      };
    }
  }
});
