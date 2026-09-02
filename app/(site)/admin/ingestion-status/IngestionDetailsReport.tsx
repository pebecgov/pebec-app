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
  buildIngestionReportRows,
  type IngestionReportRow,
} from "@/lib/ingestionReportRows";
import { exportIngestionReportInWorker } from "@/lib/ingestionReportExport";
import type { IngestionMatrix } from "@/lib/ingestionMatrix";

const PAGE_SIZE = 50;

type Props = {
  matrix: IngestionMatrix;
  fromMonthValue: string;
  toMonthValue: string;
};

export function IngestionDetailsReport({ matrix, fromMonthValue, toMonthValue }: Props) {
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "processed" | "failed">("all");
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState<"xlsx" | "pdf" | null>(null);

  const allRows = useMemo(
    () =>
      buildIngestionReportRows(matrix, {
        includeNoSubmission: false,
        onlyProcessed: statusFilter === "processed" || statusFilter === "failed",
      }).filter((row) => {
        if (statusFilter === "failed" && row.status !== "failed") return false;
        if (!filter.trim()) return true;
        const q = filter.toLowerCase();
        return (
          row.mdaName.toLowerCase().includes(q) ||
          row.monthLabel.toLowerCase().includes(q) ||
          row.detectedHeaders.toLowerCase().includes(q) ||
          row.failureType.toLowerCase().includes(q)
        );
      }),
    [matrix, filter, statusFilter]
  );

  const totalPages = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
  const pageRows = allRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const rangeLabel = `${fromMonthValue} to ${toMonthValue}`;

  const handleExport = async (format: "xlsx" | "pdf") => {
    if (allRows.length === 0) {
      toast.warning("No rows to export for the current filter.");
      return;
    }
    setExporting(format);
    try {
      await exportIngestionReportInWorker({
        format,
        rows: allRows,
        fileName: `mda-processing-details-${fromMonthValue}-${toMonthValue}`,
        title: "MDA BFA Processing Details",
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
    <div className="border rounded-lg bg-white space-y-4 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Header & processing details</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Full detected columns per file. Export runs in a background worker so the UI stays
            responsive ({allRows.length} row(s) in view).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!!exporting || allRows.length === 0}
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
            disabled={!!exporting || allRows.length === 0}
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

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Filter MDA, month, headers…"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
          }}
          className="max-w-xs h-9"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as typeof statusFilter);
            setPage(0);
          }}
          className="h-9 rounded-md border px-2 text-sm"
        >
          <option value="all">All with submission</option>
          <option value="processed">Processed only</option>
          <option value="failed">Failed only</option>
        </select>
      </div>

      <div className="overflow-auto max-h-[50vh] border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">MDA</TableHead>
              <TableHead>Month</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sheet</TableHead>
              <TableHead>Header row</TableHead>
              <TableHead className="min-w-[280px]">Detected headers</TableHead>
              <TableHead className="min-w-[200px]">Mapped columns</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                  No rows match. Run processing check to capture header details for submitted files.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row) => <DetailsRow key={`${row.mdaName}-${row.monthLabel}`} row={row} />)
            )}
          </TableBody>
        </Table>
      </div>

      {allRows.length > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page + 1} of {totalPages} ({allRows.length} rows)
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

function DetailsRow({ row }: { row: IngestionReportRow }) {
  const mapped =
    [row.mappedSubmission, row.mappedCompletion, row.mappedTimeline].filter(Boolean).join(" · ") ||
    "—";

  return (
    <TableRow>
      <TableCell className="font-medium align-top">{row.mdaName}</TableCell>
      <TableCell className="align-top whitespace-nowrap">{row.monthLabel}</TableCell>
      <TableCell className="align-top whitespace-nowrap">{row.statusLabel}</TableCell>
      <TableCell className="align-top">{row.sheetName || "—"}</TableCell>
      <TableCell className="align-top">{row.headerRow}</TableCell>
      <TableCell className="align-top text-xs break-words max-w-[360px]">
        {row.detectedHeaders || row.failureDetail || "—"}
      </TableCell>
      <TableCell className="align-top text-xs break-words max-w-[240px]">{mapped}</TableCell>
    </TableRow>
  );
}
