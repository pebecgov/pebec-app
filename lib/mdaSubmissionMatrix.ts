import { mdasList } from "../components/mdaList";

export type SubmittedReportForMatrix = {
  mdaName?: string | null;
  reportName?: string | null;
  submittedAt?: number | null;
};

export type MdaSubmissionMatrix = {
  mdaNames: string[];
  monthLabels: string[];
  monthKeys: string[];
  statusGrid: boolean[][];
  countGrid: number[][];
  firstReportNameGrid: Array<Array<string | null>>;
};

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function normalizeMdaKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitMdaNameParts(value: string): { abbr?: string; name?: string } {
  const cleaned = normalizeMdaKey(value);
  const parts = cleaned.split(" - ").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { abbr: parts[0], name: parts.slice(1).join(" - ") };
  }
  return { name: cleaned };
}

const MATRIX_EXCLUDED_MDA_NAMES = new Set(
  [
    "Federal Ministry of Aviation and Aerospace Development",
    "Federal Ministry of Environment",
    "Federal Ministry of Finance",
    "Ministry of Foreign Affairs",
    "Federal Ministry of Information and National Orientation",
    "Federal Ministry of Justice",
    "Federal Ministry of Power",
    "Federal Ministry of Transportation",
    "Federal Ministry of Works",
    "Joint Tax Board",
    "Ministry of Budget and Economic Planning",
    "Nigeria Gas Company",
    "Nigeria Police Force",
    "Office of the Head of Service of the Federation",
    "Secretary to the Government of the Federation",
  ].map(normalizeMdaKey)
);

export function isMatrixExcludedReportMda(mdaName: string): boolean {
  const parts = splitMdaNameParts(mdaName);
  if (parts.name && MATRIX_EXCLUDED_MDA_NAMES.has(normalizeMdaKey(parts.name))) return true;
  if (MATRIX_EXCLUDED_MDA_NAMES.has(normalizeMdaKey(mdaName))) return true;
  return false;
}

export function monthValueToParts(monthValue: string): { year: number; monthIndex: number } | null {
  const match = monthValue.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  const monthIndex = month - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return { year, monthIndex };
}

export function monthPartsToValue(year: number, monthIndex: number): string {
  const m = String(monthIndex + 1).padStart(2, "0");
  return `${year}-${m}`;
}

export function formatMonthLabel(year: number, monthIndex: number): string {
  return `${MONTHS_SHORT[monthIndex]} ${year}`;
}

export function parseMonthIndexFromReportName(reportName: string | null | undefined): number | null {
  if (!reportName) return null;
  const name = String(reportName);

  const parenMatch = name.match(/\(([^)]+)\)/);
  const inside = (parenMatch?.[1] ?? "").trim().toLowerCase();
  if (inside) {
    for (let i = 0; i < 12; i++) {
      if (inside === MONTHS_LONG[i].toLowerCase() || inside === MONTHS_SHORT[i].toLowerCase()) return i;
    }
  }

  const lowered = name.toLowerCase();
  for (let i = 0; i < 12; i++) {
    if (lowered.includes(MONTHS_LONG[i].toLowerCase()) || lowered.includes(MONTHS_SHORT[i].toLowerCase())) return i;
  }

  return null;
}

export function mdaNamesMatch(left: string, right: string): boolean {
  const leftNorm = normalizeMdaKey(left);
  const rightNorm = normalizeMdaKey(right);
  if (leftNorm === rightNorm) return true;

  const leftParts = splitMdaNameParts(left);
  const rightParts = splitMdaNameParts(right);

  if (leftParts.name && rightParts.name && normalizeMdaKey(leftParts.name) === normalizeMdaKey(rightParts.name)) return true;
  if (leftParts.name && normalizeMdaKey(leftParts.name) === rightNorm) return true;
  if (rightParts.name && normalizeMdaKey(rightParts.name) === leftNorm) return true;
  if (leftParts.abbr && rightParts.abbr && leftParts.abbr === rightParts.abbr) return true;

  return false;
}

export function computeMdaSubmissionMatrix(
  submittedReports: SubmittedReportForMatrix[] | undefined,
  fromMonthValue: string,
  toMonthValue: string
): MdaSubmissionMatrix {
  const empty: MdaSubmissionMatrix = {
    mdaNames: [],
    monthLabels: [],
    monthKeys: [],
    statusGrid: [],
    countGrid: [],
    firstReportNameGrid: [],
  };

  const fromParts = monthValueToParts(fromMonthValue);
  const toParts = monthValueToParts(toMonthValue);
  if (!fromParts || !toParts) return empty;

  const parsedReports = (submittedReports ?? [])
    .map((r) => ({
      ...r,
      mdaName: r.mdaName ?? undefined,
      reportName: r.reportName ?? undefined,
      submittedAt: r.submittedAt ?? undefined,
      parsedMonthIndex: parseMonthIndexFromReportName(r.reportName),
    }))
    .filter((r) => r.mdaName && r.submittedAt && r.parsedMonthIndex !== null) as Array<
    SubmittedReportForMatrix & { parsedMonthIndex: number }
  >;

  const months: Array<{ year: number; monthIndex: number }> = [];
  const cursor = new Date(fromParts.year, fromParts.monthIndex, 1);
  while (cursor.getTime() <= new Date(toParts.year, toParts.monthIndex, 1).getTime()) {
    months.push({ year: cursor.getFullYear(), monthIndex: cursor.getMonth() });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const monthKeys = months.map(({ year, monthIndex }) => `${year}-${String(monthIndex + 1).padStart(2, "0")}`);
  const monthLabels = months.map(({ year, monthIndex }) => formatMonthLabel(year, monthIndex));
  const monthIndexMap = new Map(monthKeys.map((k, idx) => [k, idx] as const));

  const derivedMdaNames = Array.from(
    new Set(
      (submittedReports ?? [])
        .map((r) => r.mdaName)
        .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        .filter((v) => !isMatrixExcludedReportMda(v))
    )
  ).sort((a, b) => a.localeCompare(b));

  const listMdaNames = mdasList
    .filter((m) => !MATRIX_EXCLUDED_MDA_NAMES.has(normalizeMdaKey(m.name)))
    .map((m) => {
      const name = (m?.name ?? "").trim();
      const abbr = (m?.abbreviation ?? "").trim();
      if (!name) return null;
      return abbr ? `${abbr} - ${name}` : name;
    })
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0);

  const finalMdaNames = listMdaNames.length > 0 ? listMdaNames : derivedMdaNames;

  const mdaVariantToIndex = new Map<string, number>();
  finalMdaNames.forEach((display, idx) => {
    mdaVariantToIndex.set(normalizeMdaKey(display), idx);
    const parts = splitMdaNameParts(display);
    if (parts.name) mdaVariantToIndex.set(normalizeMdaKey(parts.name), idx);
    if (parts.abbr) mdaVariantToIndex.set(normalizeMdaKey(parts.abbr), idx);
  });

  const rowCount = finalMdaNames.length;
  const colCount = monthKeys.length;

  const statusGrid: boolean[][] = Array.from({ length: rowCount }, () => Array.from({ length: colCount }, () => false));
  const countGrid: number[][] = Array.from({ length: rowCount }, () => Array.from({ length: colCount }, () => 0));
  const firstReportNameGrid: Array<Array<string | null>> = Array.from({ length: rowCount }, () =>
    Array.from({ length: colCount }, () => null)
  );

  for (const report of parsedReports) {
    if (!report.mdaName || report.submittedAt == null) continue;
    if (isMatrixExcludedReportMda(String(report.mdaName))) continue;

    const year = new Date(report.submittedAt).getFullYear();
    const reportMonthKey = `${year}-${String(report.parsedMonthIndex + 1).padStart(2, "0")}`;
    const col = monthIndexMap.get(reportMonthKey);
    if (col === undefined) continue;

    const reportMdaRaw = String(report.mdaName);
    const reportNorm = normalizeMdaKey(reportMdaRaw);
    const reportParts = splitMdaNameParts(reportMdaRaw);

    const row =
      mdaVariantToIndex.get(reportNorm) ??
      (reportParts.name ? mdaVariantToIndex.get(normalizeMdaKey(reportParts.name)) : undefined) ??
      (reportParts.abbr ? mdaVariantToIndex.get(normalizeMdaKey(reportParts.abbr)) : undefined);
    if (row === undefined) continue;

    statusGrid[row][col] = true;
    countGrid[row][col] += 1;
    if (!firstReportNameGrid[row][col]) firstReportNameGrid[row][col] = report.reportName ?? null;
  }

  return { mdaNames: finalMdaNames, monthLabels, monthKeys, statusGrid, countGrid, firstReportNameGrid };
}

export function getMissingSubmissionsByMda(matrix: MdaSubmissionMatrix): Array<{ mdaName: string; missingMonthLabels: string[] }> {
  const result: Array<{ mdaName: string; missingMonthLabels: string[] }> = [];

  matrix.mdaNames.forEach((mdaName, rowIdx) => {
    const missingMonthLabels: string[] = [];
    matrix.monthLabels.forEach((label, colIdx) => {
      if (!matrix.statusGrid[rowIdx]?.[colIdx]) {
        missingMonthLabels.push(label);
      }
    });
    if (missingMonthLabels.length > 0) {
      result.push({ mdaName, missingMonthLabels });
    }
  });

  return result;
}
