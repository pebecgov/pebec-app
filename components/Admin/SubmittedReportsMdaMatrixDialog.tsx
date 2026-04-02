// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useMemo, useState } from "react";
import autoTable from "jspdf-autotable";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mdasList } from "@/components/mdaList";

type SubmittedReportForMatrix = {
  _id?: string;
  mdaName?: string | null;
  reportName?: string | null;
  submittedAt?: number | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submittedReports?: SubmittedReportForMatrix[];
};

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function splitMdaNameParts(value: string): { abbr?: string; name?: string } {
  const cleaned = normalizeKey(value);
  const parts = cleaned.split(" - ").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { abbr: parts[0], name: parts.slice(1).join(" - ") };
  }
  return { name: cleaned };
}

/** Full `name` values from `mdasList` excluded from the matrix (UI table + PDF). */
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
  ].map(normalizeKey)
);

function isMatrixExcludedReportMda(mdaName: string): boolean {
  const parts = splitMdaNameParts(mdaName);
  if (parts.name && MATRIX_EXCLUDED_MDA_NAMES.has(normalizeKey(parts.name))) return true;
  if (MATRIX_EXCLUDED_MDA_NAMES.has(normalizeKey(mdaName))) return true;
  return false;
}

function monthValueToParts(monthValue: string): { year: number; monthIndex: number } | null {
  // monthValue: "YYYY-MM"
  const match = monthValue.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  const monthIndex = month - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return { year, monthIndex };
}

function monthPartsToValue(year: number, monthIndex: number): string {
  const m = String(monthIndex + 1).padStart(2, "0");
  return `${year}-${m}`;
}

function formatMonthLabel(year: number, monthIndex: number): string {
  return `${MONTHS_SHORT[monthIndex]} ${year}`;
}

function parseMonthIndexFromReportName(reportName: string | null | undefined): number | null {
  if (!reportName) return null;
  const name = String(reportName);

  // Typical format from your uploader: "BFA Report (November)"
  const parenMatch = name.match(/\(([^)]+)\)/);
  const inside = (parenMatch?.[1] ?? "").trim().toLowerCase();
  if (inside) {
    for (let i = 0; i < 12; i++) {
      if (inside === MONTHS_LONG[i].toLowerCase() || inside === MONTHS_SHORT[i].toLowerCase()) return i;
    }
  }

  // Fallback (less strict): search for any known month token.
  const lowered = name.toLowerCase();
  for (let i = 0; i < 12; i++) {
    if (lowered.includes(MONTHS_LONG[i].toLowerCase()) || lowered.includes(MONTHS_SHORT[i].toLowerCase())) return i;
  }

  return null;
}

export default function SubmittedReportsMdaMatrixDialog({ open, onOpenChange, submittedReports }: Props) {
  const defaultRange = useMemo(() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1); // last 12 months including current month

    return {
      fromMonthValue: monthPartsToValue(start.getFullYear(), start.getMonth()),
      toMonthValue: monthPartsToValue(end.getFullYear(), end.getMonth()),
    };
  }, []);

  const [fromMonthValue, setFromMonthValue] = useState(defaultRange.fromMonthValue);
  const [toMonthValue, setToMonthValue] = useState(defaultRange.toMonthValue);

  useEffect(() => {
    // Reset each time the dialog is opened for predictable defaults.
    if (open) {
      setFromMonthValue(defaultRange.fromMonthValue);
      setToMonthValue(defaultRange.toMonthValue);
    }
  }, [open, defaultRange.fromMonthValue, defaultRange.toMonthValue]);

  const parsedReports = useMemo(() => {
    const reports = submittedReports ?? [];
    return reports
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
  }, [submittedReports]);

  const matrix = useMemo(() => {
    const fromParts = monthValueToParts(fromMonthValue);
    const toParts = monthValueToParts(toMonthValue);
    if (!fromParts || !toParts) {
      return {
        mdaNames: [] as string[],
        monthLabels: [] as string[],
        monthKeys: [] as string[],
        statusGrid: [] as boolean[][],
        countGrid: [] as number[][],
        firstReportNameGrid: [] as Array<Array<string | null>>,
      };
    }

    // Build the month headers list for the selected range.
    const months: Array<{ year: number; monthIndex: number }> = [];
    const cursor = new Date(fromParts.year, fromParts.monthIndex, 1);
    while (cursor.getTime() <= new Date(toParts.year, toParts.monthIndex, 1).getTime()) {
      months.push({ year: cursor.getFullYear(), monthIndex: cursor.getMonth() });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const monthKeys = months.map(({ year, monthIndex }) => `${year}-${String(monthIndex + 1).padStart(2, "0")}`);
    const monthLabels = months.map(({ year, monthIndex }) => formatMonthLabel(year, monthIndex));
    const monthIndexMap = new Map(monthKeys.map((k, idx) => [k, idx] as const));

    // Build the row list from all MDAs (even if they didn't submit for the selected months).
    const derivedMdaNames = Array.from(
      new Set(
        (submittedReports ?? [])
          .map((r) => r.mdaName)
          .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
          .filter((v) => !isMatrixExcludedReportMda(v))
      )
    ).sort((a, b) => a.localeCompare(b));

    // Prefer showing MDAs in the same display format used by submitted reports: "ABBR - Full Name"
    const listMdaNames = mdasList
      .filter((m) => !MATRIX_EXCLUDED_MDA_NAMES.has(normalizeKey(m.name)))
      .map((m) => {
        const name = (m?.name ?? "").trim();
        const abbr = (m?.abbreviation ?? "").trim();
        if (!name) return null;
        return abbr ? `${abbr} - ${name}` : name;
      })
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0);

    // Prefer canonical list; fallback to derived list if needed.
    const finalMdaNames = listMdaNames.length > 0 ? listMdaNames : derivedMdaNames;

    // Build a variant -> rowIndex lookup so reports like "BOI - Bank of Industry" match even if row is "Bank of Industry"
    const mdaVariantToIndex = new Map<string, number>();
    finalMdaNames.forEach((display, idx) => {
      const normDisplay = normalizeKey(display);
      mdaVariantToIndex.set(normDisplay, idx);

      const parts = splitMdaNameParts(display);
      if (parts.name) mdaVariantToIndex.set(normalizeKey(parts.name), idx);
      if (parts.abbr) mdaVariantToIndex.set(normalizeKey(parts.abbr), idx);
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

      const submittedAt = new Date(report.submittedAt);

      const year = submittedAt.getFullYear();
      const reportMonthKey = `${year}-${String(report.parsedMonthIndex + 1).padStart(2, "0")}`;
      const col = monthIndexMap.get(reportMonthKey);
      if (col === undefined) continue;

      const reportMdaRaw = String(report.mdaName);
      const reportNorm = normalizeKey(reportMdaRaw);
      const reportParts = splitMdaNameParts(reportMdaRaw);

      const row =
        mdaVariantToIndex.get(reportNorm) ??
        (reportParts.name ? mdaVariantToIndex.get(normalizeKey(reportParts.name)) : undefined) ??
        (reportParts.abbr ? mdaVariantToIndex.get(normalizeKey(reportParts.abbr)) : undefined);
      if (row === undefined) continue;

      statusGrid[row][col] = true;
      countGrid[row][col] += 1;
      if (!firstReportNameGrid[row][col]) firstReportNameGrid[row][col] = report.reportName ?? null;
    }

    return { mdaNames: finalMdaNames, monthLabels, monthKeys, statusGrid, countGrid, firstReportNameGrid };
  }, [fromMonthValue, toMonthValue, parsedReports, submittedReports]);

  const handleDownloadPdf = async () => {
    if (!matrix.monthLabels.length || !matrix.mdaNames.length) {
      toast.error("Nothing to export.");
      return;
    }

    try {
      const orientation = matrix.monthLabels.length > 6 ? "landscape" : "portrait";
      const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });

      const pageWidth = doc.internal.pageSize.getWidth();
      const rangeTitle = `${matrix.monthLabels[0]} - ${matrix.monthLabels[matrix.monthLabels.length - 1]}`;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`MDA Submission Matrix (${rangeTitle})`, pageWidth / 2, 12, { align: "center" });

      const head = [["MDA", ...matrix.monthLabels]];

      const body = matrix.mdaNames.map((mdaName, rowIdx) => {
        const row: string[] = [mdaName];
        for (let colIdx = 0; colIdx < matrix.monthLabels.length; colIdx++) {
          // Keep body text empty; we'll draw circles with jsPDF.
          row.push("");
        }
        return row;
      });

      autoTable(doc, {
        head,
        body,
        startY: 20,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 1,
          overflow: "linebreak",
          minCellHeight: 7,
        },
        headStyles: {
          fillColor: [20, 184, 166], // teal-ish
          textColor: [255, 255, 255],
          fontSize: 9,
          cellPadding: 1,
        },
        columnStyles: {
          0: { cellWidth: 75, halign: "left" },
        },
        didDrawCell: (data) => {
          if (data.section !== "body") return;
          if (data.column.index === 0) return; // MDA column

          const rowIdx = data.row.index;
          const colIdx = data.column.index - 1;
          const submitted = matrix.statusGrid[rowIdx]?.[colIdx] ?? false;

          const cell = data.cell;
          const cx = cell.x + cell.width / 2;
          const cy = cell.y + cell.height / 2;
          // Fixed radius so dots stay same size even if row height grows.
          const r = 1.6; // mm

          const fill = submitted ? [34, 197, 94] : [239, 68, 68]; // green/red
          doc.setFillColor(fill[0], fill[1], fill[2]);
          doc.circle(cx, cy, r, "F");
        },
        margin: { left: 8, right: 8 },
      });

      doc.save(
        `mda_submission_matrix_${matrix.monthKeys[0].replace("-", "_")}_to_${matrix.monthKeys[matrix.monthKeys.length - 1].replace("-", "_")}.pdf`
      );
      toast.success("PDF downloaded.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to download PDF.");
    }
  };

  const canRenderTable = !!submittedReports && matrix.monthLabels.length > 0 && matrix.mdaNames.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>MDA Submission Matrix</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-4 flex items-end gap-4 flex-wrap">
          <div className="min-w-[210px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <Input
              type="month"
              value={fromMonthValue}
              onChange={(e) => {
                const nextFrom = e.target.value;
                const fromParts = monthValueToParts(nextFrom);
                const toParts = monthValueToParts(toMonthValue);
                if (!fromParts || !toParts) {
                  setFromMonthValue(nextFrom);
                  return;
                }
                const fromMs = new Date(fromParts.year, fromParts.monthIndex, 1).getTime();
                const toMs = new Date(toParts.year, toParts.monthIndex, 1).getTime();
                setFromMonthValue(nextFrom);
                if (fromMs > toMs) {
                  setToMonthValue(nextFrom);
                }
              }}
            />
          </div>

          <div className="min-w-[210px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <Input
              type="month"
              value={toMonthValue}
              onChange={(e) => {
                const nextTo = e.target.value;
                const fromParts = monthValueToParts(fromMonthValue);
                const toParts = monthValueToParts(nextTo);
                if (!fromParts || !toParts) {
                  setToMonthValue(nextTo);
                  return;
                }
                const fromMs = new Date(fromParts.year, fromParts.monthIndex, 1).getTime();
                const toMs = new Date(toParts.year, toParts.monthIndex, 1).getTime();
                setToMonthValue(nextTo);
                if (toMs < fromMs) {
                  setFromMonthValue(nextTo);
                }
              }}
            />
          </div>
        </div>

        <div className="px-6 pb-4 flex items-center justify-between gap-3">
          <div className="text-sm text-gray-600">
            Showing {matrix.monthLabels.length} months, {matrix.mdaNames.length} MDAs
          </div>
          <Button onClick={handleDownloadPdf} className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2" disabled={!canRenderTable}>
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
        </div>

        <div className="px-6 pb-6">
          {!submittedReports ? (
            <div className="py-10 text-center text-gray-500">Loading...</div>
          ) : (
            <div className="overflow-auto max-h-[70vh] border rounded-lg">
              <Table className="min-w-full table-fixed">
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="sticky left-0 bg-gray-100 z-10 w-[280px] max-w-[280px]">
                      MDA
                    </TableHead>
                    {matrix.monthLabels.map((label) => (
                      <TableHead key={label} className="text-center whitespace-nowrap">
                        {label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matrix.mdaNames.map((mdaName, rowIdx) => (
                    <TableRow key={mdaName} className="hover:bg-gray-50">
                      <TableCell className="sticky left-0 bg-white z-10 font-medium w-[280px] max-w-[280px] break-words">
                        {mdaName}
                      </TableCell>
                      {matrix.monthLabels.map((_, colIdx) => {
                        const submitted = matrix.statusGrid[rowIdx]?.[colIdx] ?? false;
                        const count = matrix.countGrid[rowIdx]?.[colIdx] ?? 0;
                        const reportName = matrix.firstReportNameGrid[rowIdx]?.[colIdx];
                        return (
                          <TableCell key={`${mdaName}-${colIdx}`} className="text-center align-middle">
                            <span
                              className={`inline-block w-4 min-w-4 h-4 min-h-4 aspect-square rounded-full align-middle shrink-0 ${submitted ? "bg-green-600" : "bg-red-500"}`}
                              title={
                                submitted
                                  ? `Submitted (${count}): ${reportName ?? "—"}`
                                  : "Not submitted"
                              }
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

