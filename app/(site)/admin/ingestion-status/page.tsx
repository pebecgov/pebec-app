// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Play, RefreshCw, XCircle, AlertTriangle } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IngestionDetailsReport } from "./IngestionDetailsReport";
import { IngestionErrorsReport } from "./IngestionErrorsReport";
import {
  formatHeaderRowLabel,
  formatHeadersList,
  HEADER_SCAN_ROW_LIMIT,
} from "@/lib/ingestionProcessingMetadata";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  cellStatusColor,
  cellStatusTitle,
  computeIngestionMatrix,
  countIngestionCells,
  formatFailureType,
  summarizeFailuresFromMatrix,
  type IngestionCellDetail,
  type IngestionCellStatus,
} from "@/lib/ingestionMatrix";
import {
  monthPartsToValue,
} from "@/lib/mdaSubmissionMatrix";

export default function IngestionStatusPage() {
  const defaultRange = useMemo(() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    return {
      fromMonthValue: monthPartsToValue(start.getFullYear(), start.getMonth()),
      toMonthValue: monthPartsToValue(end.getFullYear(), end.getMonth()),
    };
  }, []);

  const [fromMonthValue, setFromMonthValue] = useState(defaultRange.fromMonthValue);
  const [toMonthValue, setToMonthValue] = useState(defaultRange.toMonthValue);
  const [runningCheck, setRunningCheck] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [clearingStuck, setClearingStuck] = useState(false);
  const [activeCheckRunId, setActiveCheckRunId] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{
    mdaName: string;
    monthLabel: string;
    detail: IngestionCellDetail;
  } | null>(null);

  const submittedReports = useQuery(api.internal_reports.getAllSubmittedReports);
  const ingestionStatuses = useQuery(api.mdaReportIngestion.getIngestionStatusForRange, {
    fromMonthValue,
    toMonthValue,
  });
  const activeRun = useQuery(api.mdaReportIngestion.getActiveIngestionRun, {
    fromMonthValue,
    toMonthValue,
  });

  const startIngestionCheck = useMutation(api.mdaReportIngestion.startIngestionCheck);
  const cancelIngestionCheck = useMutation(api.mdaReportIngestion.cancelIngestionCheck);
  const clearStuckPendingInRange = useMutation(api.mdaReportIngestion.clearStuckPendingInRange);

  const matrix = useMemo(
    () =>
      computeIngestionMatrix(
        submittedReports,
        ingestionStatuses?.map((s) => ({
          mdaName: s.mdaName,
          reportPeriodMonth: s.reportPeriodMonth,
          reportPeriodYear: s.reportPeriodYear,
          status: s.status,
          failureType: s.failureType,
          failureDetail: s.failureDetail,
          invalidDateRowCount: s.invalidDateRowCount,
          validRowCount: s.validRowCount,
          totalRowCount: s.totalRowCount,
          processedAt: s.processedAt,
          submittedReportId: s.submittedReportId,
          processingMetadata: s.processingMetadata ?? undefined,
        })),
        fromMonthValue,
        toMonthValue
      ),
    [submittedReports, ingestionStatuses, fromMonthValue, toMonthValue]
  );

  const cellCounts = useMemo(() => countIngestionCells(matrix), [matrix]);
  const failureSummary = useMemo(() => summarizeFailuresFromMatrix(matrix), [matrix]);

  const showCancel = activeRun?.status === "running" && (activeRun.pendingCount ?? 0) > 0;
  const showClearStuck = cellCounts.pending > 0 && !showCancel;

  const handleRunCheck = async () => {
    setRunningCheck(true);
    try {
      const result = await startIngestionCheck({ fromMonthValue, toMonthValue });
      if (result.success) {
        setActiveCheckRunId(result.checkRunId);
        toast.success(result.message);
      } else {
        toast.warning(result.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start ingestion check");
    } finally {
      setRunningCheck(false);
    }
  };

  const handleCancel = async () => {
    const runId = activeRun?.checkRunId ?? activeCheckRunId;
    if (!runId) {
      toast.error("No active processing run to cancel.");
      return;
    }
    setCancelling(true);
    try {
      const result = await cancelIngestionCheck({ checkRunId: runId });
      if (result.success) {
        toast.success(result.message);
        setActiveCheckRunId(null);
      } else {
        toast.warning(result.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel");
    } finally {
      setCancelling(false);
    }
  };

  const handleClearStuck = async () => {
    setClearingStuck(true);
    try {
      const result = await clearStuckPendingInRange({ fromMonthValue, toMonthValue });
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to clear stuck items");
    } finally {
      setClearingStuck(false);
    }
  };

  const handleCellClick = (
    mdaName: string,
    monthLabel: string,
    state: IngestionCellStatus,
    detail: IngestionCellDetail
  ) => {
    if (
      state === "failed" ||
      state === "pending" ||
      state === "not_checked" ||
      state === "success"
    ) {
      setSelectedCell({ mdaName, monthLabel, detail });
    }
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">MDA Report Processing Status</h1>
        <p className="text-sm text-muted-foreground">
          Tracks whether uploaded BFA Excel files were successfully parsed for SLA scoring — separate
          from submission tracking.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 p-4 border rounded-lg bg-white">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">From month</label>
          <Input
            type="month"
            value={fromMonthValue}
            onChange={(e) => setFromMonthValue(e.target.value)}
            className="w-[160px]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">To month</label>
          <Input
            type="month"
            value={toMonthValue}
            onChange={(e) => setToMonthValue(e.target.value)}
            className="w-[160px]"
          />
        </div>
        <Button onClick={handleRunCheck} disabled={runningCheck || cancelling}>
          {runningCheck ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Run processing check
        </Button>
        {showCancel && activeRun && (
          <Button variant="destructive" onClick={handleCancel} disabled={cancelling || runningCheck}>
            {cancelling ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            Cancel processing
          </Button>
        )}
        {showClearStuck && (
          <Button variant="outline" onClick={handleClearStuck} disabled={clearingStuck}>
            {clearingStuck ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <AlertTriangle className="mr-2 h-4 w-4" />
            )}
            Clear stuck pending
          </Button>
        )}
      </div>

      {activeRun && activeRun.pendingCount > 0 && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Processing {activeRun.pendingCount} of {activeRun.queuedCount} file(s)… Items that take
          longer than 2 minutes will be marked as timed out. Wrong Excel layout (headers or sheet
          tab) is reported separately from PDF or other file types.
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Processed OK" value={cellCounts.success} className="border-green-200 bg-green-50" />
        <StatCard label="Failed" value={cellCounts.failed} className="border-red-200 bg-red-50" />
        <StatCard label="Pending" value={cellCounts.pending} className="border-amber-200 bg-amber-50" />
        <StatCard label="Not checked" value={cellCounts.notChecked} className="border-sky-200 bg-sky-50" />
        <StatCard label="No submission" value={cellCounts.noSubmission} className="border-gray-200 bg-gray-50" />
      </div>

      {failureSummary && failureSummary.length > 0 && (
        <div className="border rounded-lg p-4 bg-white">
          <h2 className="text-sm font-semibold mb-3">Failures by reason</h2>
          <div className="flex flex-wrap gap-2">
            {failureSummary.map(({ failureType, count }) => (
              <span
                key={failureType}
                className="inline-flex items-center gap-2 rounded-full bg-red-100 text-red-800 px-3 py-1 text-sm"
              >
                <span className="font-medium">{count}</span>
                <span>{formatFailureType(failureType)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
        <LegendDot className="bg-green-600" label="Success" />
        <LegendDot className="bg-red-500" label="Failed" />
        <LegendDot className="bg-amber-400" label="Pending (processing)" />
        <LegendDot className="bg-sky-300" label="Not checked yet" />
        <LegendDot className="bg-gray-300" label="No submission" />
      </div>

      <div className="border rounded-lg overflow-auto max-h-[70vh] bg-white">
        {matrix.mdaNames.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No MDAs in range.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-white z-10 min-w-[280px]">MDA</TableHead>
                {matrix.monthLabels.map((label) => (
                  <TableHead key={label} className="text-center whitespace-nowrap">
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrix.mdaNames.map((mdaName, rowIdx) => (
                <TableRow key={mdaName}>
                  <TableCell className="sticky left-0 bg-white z-10 font-medium max-w-[280px] break-words">
                    {mdaName}
                  </TableCell>
                  {matrix.monthLabels.map((monthLabel, colIdx) => {
                    const state = matrix.cellStates[rowIdx]?.[colIdx] ?? "no_submission";
                    const detail = matrix.cellDetails[rowIdx]?.[colIdx] ?? { status: state };
                    const clickable =
                      state === "failed" ||
                      state === "pending" ||
                      state === "not_checked" ||
                      state === "success";

                    return (
                      <TableCell key={`${mdaName}-${colIdx}`} className="text-center align-middle">
                        <button
                          type="button"
                          disabled={!clickable}
                          onClick={() => handleCellClick(mdaName, monthLabel, state, detail)}
                          className={`inline-block w-4 h-4 rounded-full ${cellStatusColor(state)} ${
                            clickable ? "cursor-pointer ring-2 ring-offset-1 ring-transparent hover:ring-gray-400" : ""
                          }`}
                          title={cellStatusTitle(state, detail)}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <IngestionDetailsReport
        matrix={matrix}
        fromMonthValue={fromMonthValue}
        toMonthValue={toMonthValue}
      />

      <IngestionErrorsReport
        matrix={matrix}
        fromMonthValue={fromMonthValue}
        toMonthValue={toMonthValue}
      />

      <Dialog open={!!selectedCell} onOpenChange={(open) => !open && setSelectedCell(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Processing details</DialogTitle>
          </DialogHeader>
          {selectedCell && (
            <div className="space-y-3 text-sm">
              <p>
                <span className="font-medium">MDA:</span> {selectedCell.mdaName}
              </p>
              <p>
                <span className="font-medium">Month:</span> {selectedCell.monthLabel}
              </p>
              {selectedCell.detail.failureType && (
                <p>
                  <span className="font-medium">Reason:</span>{" "}
                  {formatFailureType(selectedCell.detail.failureType)}
                </p>
              )}
              {selectedCell.detail.failureDetail && (
                <p>
                  <span className="font-medium">Detail:</span> {selectedCell.detail.failureDetail}
                </p>
              )}
              {(selectedCell.detail.invalidDateRowCount ?? 0) > 0 && (
                <p>
                  <span className="font-medium">Invalid date rows:</span>{" "}
                  {selectedCell.detail.invalidDateRowCount}
                  {selectedCell.detail.totalRowCount != null &&
                    ` of ${selectedCell.detail.totalRowCount}`}
                </p>
              )}
              {selectedCell.detail.validRowCount != null && (
                <p>
                  <span className="font-medium">Valid rows:</span> {selectedCell.detail.validRowCount}
                  {selectedCell.detail.totalRowCount != null &&
                    ` of ${selectedCell.detail.totalRowCount}`}
                </p>
              )}
              {selectedCell.detail.processingMetadata && (
                <ProcessingMetadataBlock metadata={selectedCell.detail.processingMetadata} />
              )}
              {!selectedCell.detail.processingMetadata &&
                selectedCell.detail.status !== "not_checked" &&
                selectedCell.detail.status !== "no_submission" && (
                  <p className="text-muted-foreground italic">
                    Re-run processing check to capture full header scan details for this file.
                  </p>
                )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCell(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border p-4 ${className ?? ""}`}>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-gray-600">{label}</p>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-3 h-3 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function ProcessingMetadataBlock({
  metadata,
}: {
  metadata: NonNullable<IngestionCellDetail["processingMetadata"]>;
}) {
  const headers = formatHeadersList(metadata.detectedHeaders);
  return (
    <div className="space-y-2 border-t pt-3 mt-2">
      <p className="font-medium">Header scan (first {metadata.rowsScannedForHeader ?? HEADER_SCAN_ROW_LIMIT} rows)</p>
      {metadata.sheetName && (
        <p>
          <span className="font-medium">Sheet:</span> {metadata.sheetName}
          {metadata.headerRowIndex != null && (
            <>
              {" "}
              · <span className="font-medium">Header row:</span>{" "}
              {formatHeaderRowLabel(metadata.headerRowIndex)}
            </>
          )}
          {metadata.headerKeywordMatches != null && (
            <> · {metadata.headerKeywordMatches} keyword match(es)</>
          )}
        </p>
      )}
      {headers && (
        <div>
          <p className="font-medium mb-1">Detected columns</p>
          <pre className="text-xs bg-gray-50 border rounded p-2 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
            {headers}
          </pre>
        </div>
      )}
      {(metadata.mappedSubmissionColumn ||
        metadata.mappedCompletionColumn ||
        metadata.mappedTimelineColumn) && (
        <div className="text-xs space-y-1">
          <p className="font-medium">SLA column mapping</p>
          {metadata.mappedSubmissionColumn && (
            <p>Submission: {metadata.mappedSubmissionColumn}</p>
          )}
          {metadata.mappedCompletionColumn && (
            <p>Completion: {metadata.mappedCompletionColumn}</p>
          )}
          {metadata.mappedTimelineColumn && <p>Timeline: {metadata.mappedTimelineColumn}</p>}
        </div>
      )}
      {metadata.sheetSummaries && metadata.sheetSummaries.length > 1 && (
        <details className="text-xs">
          <summary className="cursor-pointer font-medium">All sheets scanned ({metadata.sheetSummaries.length})</summary>
          <ul className="mt-2 space-y-2 list-disc pl-4">
            {metadata.sheetSummaries.map((sheet) => (
              <li key={sheet.sheetName}>
                <span className="font-medium">{sheet.sheetName}</span> — row{" "}
                {sheet.headerRowIndex + 1}, {sheet.keywordMatches} kw, {sheet.mappedColumnCount}/3
                SLA cols
                <pre className="mt-1 bg-gray-50 border rounded p-1 whitespace-pre-wrap break-words">
                  {formatHeadersList(sheet.headers)}
                </pre>
              </li>
            ))}
          </ul>
        </details>
      )}
      {metadata.dateIssueSamples && metadata.dateIssueSamples.length > 0 && (
        <div className="space-y-2 border-t pt-3">
          <p className="font-medium">
            Date failures
            {metadata.dateIssueTotalCount != null && (
              <span className="font-normal text-muted-foreground">
                {" "}
                ({metadata.dateIssueSamples.length} shown
                {metadata.dateIssueTotalCount > metadata.dateIssueSamples.length
                  ? ` of ${metadata.dateIssueTotalCount} total`
                  : ""}
                )
              </span>
            )}
          </p>
          <div className="max-h-48 overflow-y-auto border rounded text-xs">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left p-1.5">Row</th>
                  <th className="text-left p-1.5">Submission</th>
                  <th className="text-left p-1.5">Completion</th>
                  <th className="text-left p-1.5">Timeline</th>
                  <th className="text-left p-1.5">Issue</th>
                </tr>
              </thead>
              <tbody>
                {metadata.dateIssueSamples.map((sample) => (
                  <tr key={sample.dataRowIndex} className="border-t">
                    <td className="p-1.5 align-top">{sample.dataRowIndex}</td>
                    <td className="p-1.5 align-top font-mono break-all">{sample.submissionRaw || "—"}</td>
                    <td className="p-1.5 align-top font-mono break-all">{sample.completionRaw || "—"}</td>
                    <td className="p-1.5 align-top font-mono break-all">{sample.timelineRaw || "—"}</td>
                    <td className="p-1.5 align-top text-red-700">{sample.issueSummary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
