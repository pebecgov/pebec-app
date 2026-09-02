/// <reference lib="webworker" />

import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { IngestionReportRow } from "../ingestionReportRows";
import { INGESTION_REPORT_COLUMNS, rowsToAoA } from "../ingestionReportRows";
import type { IngestionErrorReportRow } from "../ingestionErrorReportRows";
import { errorRowsToAoA, INGESTION_ERROR_REPORT_COLUMNS } from "../ingestionErrorReportRows";

export type IngestionExportRequest =
  | {
      reportKind: "headers";
      format: "xlsx" | "pdf";
      rows: IngestionReportRow[];
      fileName: string;
      title: string;
      rangeLabel: string;
    }
  | {
      reportKind: "errors";
      format: "xlsx" | "pdf";
      rows: IngestionErrorReportRow[];
      fileName: string;
      title: string;
      rangeLabel: string;
    };

export type IngestionExportResponse =
  | { ok: true; buffer: ArrayBuffer; mimeType: string; fileName: string }
  | { ok: false; error: string };

function buildHeadersExcelBuffer(rows: IngestionReportRow[]): ArrayBuffer {
  const aoa = rowsToAoA(rows);
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Processing details");

  const colWidths = INGESTION_REPORT_COLUMNS.map((col) => {
    if (col.key === "detectedHeaders" || col.key === "failureDetail" || col.key === "allSheetsSummary") {
      return { wch: 48 };
    }
    if (col.key === "mdaName") return { wch: 36 };
    return { wch: 18 };
  });
  worksheet["!cols"] = colWidths;

  return XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

function buildErrorsExcelBuffer(rows: IngestionErrorReportRow[]): ArrayBuffer {
  const aoa = errorRowsToAoA(rows);
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "All errors");

  const colWidths = INGESTION_ERROR_REPORT_COLUMNS.map((col) => {
    if (
      col.key === "errorDetail" ||
      col.key === "dateIssueSummary" ||
      col.key === "submissionValue" ||
      col.key === "completionValue"
    ) {
      return { wch: 28 };
    }
    if (col.key === "mdaName") return { wch: 36 };
    return { wch: 14 };
  });
  worksheet["!cols"] = colWidths;

  return XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

function buildHeadersPdfBuffer(rows: IngestionReportRow[], title: string, rangeLabel: string): ArrayBuffer {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageWidth / 2, 14, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(rangeLabel, pageWidth / 2, 20, { align: "center" });
  doc.text(`${rows.length} row(s)`, pageWidth / 2, 25, { align: "center" });

  autoTable(doc, {
    startY: 30,
    head: [["MDA", "Month", "Status", "Failure", "Sheet", "Headers (truncated)", "Valid/Total"]],
    body: rows.map((row) => [
      row.mdaName,
      row.monthLabel,
      row.statusLabel,
      row.failureType || "—",
      row.sheetName || "—",
      row.detectedHeaders.length > 100 ? `${row.detectedHeaders.slice(0, 97)}…` : row.detectedHeaders || "—",
      row.validRows && row.totalRows ? `${row.validRows}/${row.totalRows}` : "—",
    ]),
    styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak" },
    headStyles: { fillColor: [15, 118, 110], fontSize: 7 },
    margin: { left: 8, right: 8 },
  });

  return doc.output("arraybuffer") as ArrayBuffer;
}

function buildErrorsPdfBuffer(rows: IngestionErrorReportRow[], title: string, rangeLabel: string): ArrayBuffer {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageWidth / 2, 14, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(rangeLabel, pageWidth / 2, 20, { align: "center" });
  doc.text(`${rows.length} error row(s)`, pageWidth / 2, 25, { align: "center" });

  autoTable(doc, {
    startY: 30,
    head: [["MDA", "Month", "Category", "Error", "Row #", "Submission", "Completion", "Timeline", "Issue"]],
    body: rows.map((row) => [
      row.mdaName,
      row.monthLabel,
      row.errorCategory,
      row.errorType.length > 40 ? `${row.errorType.slice(0, 37)}…` : row.errorType,
      row.dataRowIndex || "—",
      row.submissionValue || "—",
      row.completionValue || "—",
      row.timelineValue || "—",
      row.dateIssueSummary || row.errorDetail.slice(0, 60),
    ]),
    styles: { fontSize: 6.5, cellPadding: 1.2, overflow: "linebreak" },
    headStyles: { fillColor: [185, 28, 28], fontSize: 6.5 },
    margin: { left: 6, right: 6 },
  });

  return doc.output("arraybuffer") as ArrayBuffer;
}

self.onmessage = (event: MessageEvent<IngestionExportRequest>) => {
  try {
    const { format, fileName, title, rangeLabel, reportKind } = event.data;

    if (format === "xlsx") {
      const buffer =
        reportKind === "errors"
          ? buildErrorsExcelBuffer(event.data.rows)
          : buildHeadersExcelBuffer(event.data.rows);
      const response: IngestionExportResponse = {
        ok: true,
        buffer,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileName: fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`,
      };
      self.postMessage(response, [buffer]);
      return;
    }

    const buffer =
      reportKind === "errors"
        ? buildErrorsPdfBuffer(event.data.rows, title, rangeLabel)
        : buildHeadersPdfBuffer(event.data.rows, title, rangeLabel);
    const response: IngestionExportResponse = {
      ok: true,
      buffer,
      mimeType: "application/pdf",
      fileName: fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`,
    };
    self.postMessage(response, [buffer]);
  } catch (error) {
    const response: IngestionExportResponse = {
      ok: false,
      error: error instanceof Error ? error.message : "Export failed",
    };
    self.postMessage(response);
  }
};

export {};
