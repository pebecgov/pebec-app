import type { IngestionReportRow } from "./ingestionReportRows";
import { rowsToAoA } from "./ingestionReportRows";
import type { IngestionErrorReportRow } from "./ingestionErrorReportRows";
import { errorRowsToAoA } from "./ingestionErrorReportRows";
import type {
  IngestionExportRequest,
  IngestionExportResponse,
} from "./workers/ingestionExport.worker";

function downloadBuffer(buffer: ArrayBuffer, mimeType: string, fileName: string) {
  const blob = new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function exportOnMainThread(request: IngestionExportRequest): Promise<void> {
  const XLSX = await import("xlsx");
  const aoa =
    request.reportKind === "errors" ? errorRowsToAoA(request.rows) : rowsToAoA(request.rows);
  const sheetName = request.reportKind === "errors" ? "All errors" : "Processing details";

  if (request.format === "xlsx") {
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(
      workbook,
      request.fileName.endsWith(".xlsx") ? request.fileName : `${request.fileName}.xlsx`
    );
    return;
  }

  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFontSize(14);
  doc.text(request.title, pageWidth / 2, 14, { align: "center" });
  doc.setFontSize(9);
  doc.text(request.rangeLabel, pageWidth / 2, 20, { align: "center" });

  if (request.reportKind === "errors") {
    autoTable(doc, {
      startY: 28,
      head: [["MDA", "Month", "Category", "Error", "Submission", "Completion", "Issue"]],
      body: request.rows.map((row) => [
        row.mdaName,
        row.monthLabel,
        row.errorCategory,
        row.errorType,
        row.submissionValue || "—",
        row.completionValue || "—",
        row.dateIssueSummary || row.errorDetail.slice(0, 80),
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [185, 28, 28] },
    });
  } else {
    autoTable(doc, {
      startY: 28,
      head: [["MDA", "Month", "Status", "Failure", "Headers"]],
      body: request.rows.map((row) => [
        row.mdaName,
        row.monthLabel,
        row.statusLabel,
        row.failureType || "—",
        row.detectedHeaders.slice(0, 100) || "—",
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [15, 118, 110] },
    });
  }

  doc.save(request.fileName.endsWith(".pdf") ? request.fileName : `${request.fileName}.pdf`);
}

function runExportInWorker(request: IngestionExportRequest): Promise<void> {
  return new Promise((resolve, reject) => {
    let worker: Worker | null = null;

    try {
      worker = new Worker(new URL("./workers/ingestionExport.worker.ts", import.meta.url));
    } catch {
      exportOnMainThread(request).then(resolve).catch(reject);
      return;
    }

    worker.onmessage = (event: MessageEvent<IngestionExportResponse>) => {
      worker?.terminate();
      const result = event.data;
      if (!result.ok) {
        reject(new Error(result.error));
        return;
      }
      downloadBuffer(result.buffer, result.mimeType, result.fileName);
      resolve();
    };

    worker.onerror = () => {
      worker?.terminate();
      exportOnMainThread(request).then(resolve).catch(reject);
    };

    worker.postMessage(request);
  });
}

export function exportIngestionReportInWorker(
  request: Omit<Extract<IngestionExportRequest, { reportKind: "headers" }>, "reportKind"> & {
    rows: IngestionReportRow[];
  }
): Promise<void> {
  if (typeof Worker === "undefined") {
    return exportOnMainThread({ ...request, reportKind: "headers" });
  }
  return runExportInWorker({ ...request, reportKind: "headers" });
}

export function exportIngestionErrorsInWorker(
  request: Omit<Extract<IngestionExportRequest, { reportKind: "errors" }>, "reportKind"> & {
    rows: IngestionErrorReportRow[];
  }
): Promise<void> {
  if (typeof Worker === "undefined") {
    return exportOnMainThread({ ...request, reportKind: "errors" });
  }
  return runExportInWorker({ ...request, reportKind: "errors" });
}
