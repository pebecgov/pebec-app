"use client";

import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildAllErrorsReportRows,
  buildDateFailureReportRows,
  countErrorsByCategory,
  type IngestionErrorReportRow,
} from "@/lib/ingestionErrorReportRows";
import { exportIngestionErrorsInWorker } from "@/lib/ingestionReportExport";
import type { IngestionMatrix } from "@/lib/ingestionMatrix";

const PAGE_SIZE = 50;

type Props = {
  matrix: IngestionMatrix;
  fromMonthValue: string;
  toMonthValue: string;
};

type ViewMode = "all" | "dates";

export function IngestionErrorsReport({ matrix, fromMonthValue, toMonthValue }: Props) {
  const [filter, setFilter] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState<"xlsx" | "pdf" | null>(null);

  const allErrorRows = useMemo(() => buildAllErrorsReportRows(matrix), [matrix]);
  const dateOnlyRows = useMemo(() => buildDateFailureReportRows(matrix), [matrix]);
  const sourceRows = viewMode === "dates" ? dateOnlyRows : allErrorRows;

  const filteredRows = useMemo(() => {
    if (!filter.trim()) return sourceRows;
    const q = filter.toLowerCase();
    return sourceRows.filter(
      (row) =>
        row.mdaName.toLowerCase().includes(q) ||
        row.monthLabel.toLowerCase().includes(q) ||
        row.errorDetail.toLowerCase().includes(q) ||
        row.dateIssueSummary.toLowerCase().includes(q) ||
        row.submissionValue.toLowerCase().includes(q) ||
        row.completionValue.toLowerCase().includes(q) ||
        row.timelineValue.toLowerCase().includes(q)
    );
  }, [sourceRows, filter]);

  const categoryCounts = useMemo(() => countErrorsByCategory(allErrorRows), [allErrorRows]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const rangeLabel = `${fromMonthValue} to ${toMonthValue}`;

  const handleExport = async (format: "xlsx" | "pdf") => {
    const exportRows = viewMode === "dates" ? dateOnlyRows : allErrorRows;
    if (exportRows.length === 0) {
      toast.warning("No errors to export. Run processing check first.");
      return;
    }
    setExporting(format);
    try {
      await exportIngestionErrorsInWorker({
        format,
        rows: exportRows,
        fileName:
          viewMode === "dates"
            ? `mda-date-failures-${fromMonthValue}-${toMonthValue}`
            : `mda-all-processing-errors-${fromMonthValue}-${toMonthValue}`,
        title:
          viewMode === "dates"
            ? "MDA BFA Date Failures"
            : "MDA BFA — All Processing Errors",
        rangeLabel,
      });
      toast.success(format === "xlsx" ? "Excel downloaded" : "PDF downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="border rounded-lg bg-white space-y-4 p-4 border-red-100">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Date failures & all errors</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Every bad date value and processing error in one place — row number, raw submission /
            completion / timeline values, and why it failed. Up to 100 date issues stored per file.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!!exporting || allErrorRows.length === 0}
            onClick={() => handleExport("xlsx")}
          >
            {exporting === "xlsx" ? (
              <Download className="mr-2 h-4 w-4 animate-pulse" />
            ) : (
              <FileSpreadsheet className="mr-2 h-4 w-4" />
            )}
            Download Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!!exporting || allErrorRows.length === 0}
            onClick={() => handleExport("pdf")}
          >
            {exporting === "pdf" ? (
              <Download className="mr-2 h-4 w-4 animate-pulse" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Download PDF
          </Button>
        </div>
      </div>

      {Object.keys(categoryCounts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(categoryCounts).map(([category, count]) => (
            <span
              key={category}
              className="inline-flex items-center gap-1.5 rounded-full bg-red-50 text-red-800 border border-red-200 px-2.5 py-0.5 text-xs"
            >
              <span className="font-semibold">{count}</span>
              {category}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex rounded-md border overflow-hidden text-sm">
          <button
            type="button"
            className={`px-3 py-1.5 ${viewMode === "all" ? "bg-red-600 text-white" : "bg-white hover:bg-gray-50"}`}
            onClick={() => {
              setViewMode("all");
              setPage(0);
            }}
          >
            All errors ({allErrorRows.length})
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 border-l ${viewMode === "dates" ? "bg-red-600 text-white" : "bg-white hover:bg-gray-50"}`}
            onClick={() => {
              setViewMode("dates");
              setPage(0);
            }}
          >
            Date failures only ({dateOnlyRows.length})
          </button>
        </div>
        <Input
          placeholder="Filter MDA, dates, issue…"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
          }}
          className="max-w-xs h-9"
        />
      </div>

      <div className="overflow-auto max-h-[50vh] border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">MDA</TableHead>
              <TableHead>Month</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Row #</TableHead>
              <TableHead>Submission (raw)</TableHead>
              <TableHead>Completion (raw)</TableHead>
              <TableHead>Timeline (raw)</TableHead>
              <TableHead className="min-w-[220px]">What failed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                  No errors captured yet. Re-run processing check to record date-level failures.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row) => <ErrorRow key={rowKey(row)} row={row} />)
            )}
          </TableBody>
        </Table>
      </div>

      {filteredRows.length > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page + 1} of {totalPages} ({filteredRows.length} rows)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const CATEGORY_DISPLAY: Record<IngestionErrorReportRow["errorCategory"], string> = {
  layout: "Excel layout",
  date: "Date / timeline",
  file: "File",
  processing: "Processing",
  other: "Other",
};

function rowKey(row: IngestionErrorReportRow): string {
  return `${row.mdaName}-${row.monthLabel}-${row.dataRowIndex}-${row.errorType}-${row.submissionValue}`;
}

function ErrorRow({ row }: { row: IngestionErrorReportRow }) {
  const issue = row.dateIssueSummary || row.errorDetail;
  return (
    <TableRow>
      <TableCell className="font-medium align-top text-sm">{row.mdaName}</TableCell>
      <TableCell className="align-top whitespace-nowrap text-sm">{row.monthLabel}</TableCell>
      <TableCell className="align-top text-xs">{CATEGORY_DISPLAY[row.errorCategory]}</TableCell>
      <TableCell className="align-top text-sm">{row.dataRowIndex || "—"}</TableCell>
      <TableCell className="align-top text-xs font-mono max-w-[120px] break-all">
        {row.submissionValue || "—"}
      </TableCell>
      <TableCell className="align-top text-xs font-mono max-w-[120px] break-all">
        {row.completionValue || "—"}
      </TableCell>
      <TableCell className="align-top text-xs font-mono max-w-[100px] break-all">
        {row.timelineValue || "—"}
      </TableCell>
      <TableCell className="align-top text-xs text-red-800">{issue || "—"}</TableCell>
    </TableRow>
  );
}
