// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import autoTable from "jspdf-autotable";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { Download, Mail } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  computeMdaSubmissionMatrix,
  monthPartsToValue,
  monthValueToParts,
} from "@/lib/mdaSubmissionMatrix";

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

export default function SubmittedReportsMdaMatrixDialog({ open, onOpenChange, submittedReports }: Props) {
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
  const [sendingReminders, setSendingReminders] = useState(false);
  const [showConfirmReminders, setShowConfirmReminders] = useState(false);

  const reminderPreview = useQuery(
    api.missingReportReminders.previewMissingReportReminders,
    open && fromMonthValue && toMonthValue
      ? { fromMonthValue, toMonthValue }
      : "skip"
  );

  const startMissingReportReminders = useMutation(api.missingReportReminders.startMissingReportReminders);

  useEffect(() => {
    if (open) {
      setFromMonthValue(defaultRange.fromMonthValue);
      setToMonthValue(defaultRange.toMonthValue);
      setShowConfirmReminders(false);
    }
  }, [open, defaultRange.fromMonthValue, defaultRange.toMonthValue]);

  const matrix = useMemo(
    () => computeMdaSubmissionMatrix(submittedReports, fromMonthValue, toMonthValue),
    [fromMonthValue, toMonthValue, submittedReports]
  );

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

      const body = matrix.mdaNames.map((mdaName) => {
        const row: string[] = [mdaName];
        for (let colIdx = 0; colIdx < matrix.monthLabels.length; colIdx++) {
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
          fillColor: [20, 184, 166],
          textColor: [255, 255, 255],
          fontSize: 9,
          cellPadding: 1,
        },
        columnStyles: {
          0: { cellWidth: 75, halign: "left" },
        },
        didDrawCell: (data) => {
          if (data.section !== "body") return;
          if (data.column.index === 0) return;

          const rowIdx = data.row.index;
          const colIdx = data.column.index - 1;
          const submitted = matrix.statusGrid[rowIdx]?.[colIdx] ?? false;

          const cell = data.cell;
          const cx = cell.x + cell.width / 2;
          const cy = cell.y + cell.height / 2;
          const r = 1.6;

          const fill = submitted ? [34, 197, 94] : [239, 68, 68];
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

  const handleSendReminders = async () => {
    if (!fromMonthValue || !toMonthValue) {
      toast.error("Please select a valid month range.");
      return;
    }

    setSendingReminders(true);
    try {
      const result = await startMissingReportReminders({
        fromMonthValue,
        toMonthValue,
      });

      if (!result.success) {
        toast.info("No reform champions to notify for missing reports in this range.");
        setShowConfirmReminders(false);
        return;
      }

      toast.success(
        `Reminder emails queued for ${result.recipientCount} reform champion(s) in ${result.totalBatches} batch(es).`
      );
      setShowConfirmReminders(false);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to queue reminder emails.");
    } finally {
      setSendingReminders(false);
    }
  };

  const canRenderTable = !!submittedReports && matrix.monthLabels.length > 0 && matrix.mdaNames.length > 0;
  const canSendReminders = canRenderTable && (reminderPreview?.recipientCount ?? 0) > 0;

  return (
    <>
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

          <div className="px-6 pb-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-gray-600">
              Showing {matrix.monthLabels.length} months, {matrix.mdaNames.length} MDAs
              {reminderPreview && (
                <span className="block text-xs text-gray-500 mt-1">
                  {reminderPreview.missingSlotCount} missing submission slot(s) · {reminderPreview.recipientCount} reform champion email(s) ready to notify
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={() => setShowConfirmReminders(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2"
                disabled={!canSendReminders || sendingReminders}
              >
                <Mail className="w-4 h-4" />
                Notify Reform Champions
              </Button>
              <Button
                onClick={handleDownloadPdf}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                disabled={!canRenderTable}
              >
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
            </div>
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

      <Dialog open={showConfirmReminders} onOpenChange={setShowConfirmReminders}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send missing report reminders?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              This will email reform champions for MDAs with missing submissions in{" "}
              <strong>{reminderPreview?.rangeLabel ?? "the selected range"}</strong>.
            </p>
            <p>
              <strong>{reminderPreview?.recipientCount ?? 0}</strong> email(s) will be queued in the background
              across <strong>{Math.ceil((reminderPreview?.recipientCount ?? 0) / 15) || 0}</strong> batch(es).
            </p>
            {reminderPreview?.preview?.length ? (
              <div className="rounded-md border bg-gray-50 p-3 max-h-40 overflow-auto text-xs">
                {reminderPreview.preview.map((item) => (
                  <div key={`${item.email}-${item.mdaName}`} className="mb-2 last:mb-0">
                    <div className="font-medium">{item.email}</div>
                    <div>{item.mdaName}</div>
                    <div className="text-gray-500">Missing: {item.missingMonths.join(", ")}</div>
                  </div>
                ))}
                {(reminderPreview.recipientCount ?? 0) > (reminderPreview.preview?.length ?? 0) && (
                  <div className="text-gray-500 mt-2">…and more</div>
                )}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmReminders(false)} disabled={sendingReminders}>
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleSendReminders}
              disabled={sendingReminders || !canSendReminders}
            >
              {sendingReminders ? "Queueing..." : "Send Reminders"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
