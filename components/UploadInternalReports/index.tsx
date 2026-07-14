// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Id } from "@/convex/_generated/dataModel";
import {
  MONTHS_LONG,
  formatBfaReportName,
  formatReportPeriodLabel,
  getSelectableReportYears,
} from "@/lib/reportPeriod";
import ReportSubmissionSuccessDialog from "@/components/ReformChampion/ReportSubmissionSuccessDialog";

const MAX_FILE_SIZE_MB = 20;
const ALLOWED_EXCEL_TYPES = ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv"];
const ALLOWED_DOC_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

interface UploadReportsProps {
  onClose: () => void;
  onUploadComplete?: () => void;
}

export default function UploadReports({
  onClose,
  onUploadComplete
}: UploadReportsProps) {
  const { user } = useUser();
  const convex = useConvex();
  const uploadReport = useMutation(api.internal_reports.submitReport);
  const generateUploadUrl = useMutation(api.internal_reports.generateUploadUrl);
  const saveUploadedFile = useMutation(api.tickets.saveUploadedFile);
  const convexUser = useQuery(api.users.getUserByClerkId, user?.id ? {
    clerkUserId: user.id
  } : "skip");

  const [reportType, setReportType] = useState("BFA Report");
  const [customTitle, setCustomTitle] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(MONTHS_LONG[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [existingReports, setExistingReports] = useState<Array<{
    _id: Id<"submitted_reports">;
    reportName?: string;
    fileName?: string;
    submittedAt: number;
  }>>([]);
  const [replaceReportId, setReplaceReportId] = useState<Id<"submitted_reports"> | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successWasReplace, setSuccessWasReplace] = useState(false);

  const hasBFAReport = convexUser?.role === "reform_champion";
  const yearOptions = getSelectableReportYears();
  const monthIndex = MONTHS_LONG.indexOf(selectedMonth);
  const reportPeriodYear = Number(selectedYear);

  const allowedRoles = ["user", "admin", "mda", "staff", "reform_champion", "federal", "saber_agent", "deputies", "magistrates", "state_governor", "president", "vice_president"] as const;
  type AllowedRole = typeof allowedRoles[number];
  const safeRole: AllowedRole = convexUser && allowedRoles.includes(convexUser.role as AllowedRole) ? convexUser.role as AllowedRole : "user";

  useEffect(() => {
    if (!hasBFAReport && reportType === "BFA Report") {
      setReportType("Other");
    }
  }, [hasBFAReport, reportType]);

  if (!user || !convexUser) return null;

  const isBfa = reportType === "BFA Report";

  const getFinalTitle = () => {
    if (isBfa && monthIndex >= 0) {
      return formatBfaReportName(monthIndex, reportPeriodYear);
    }
    return customTitle.trim()
      ? `${customTitle.trim()} (${selectedMonth})`
      : `Report (${selectedMonth})`;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    const allowedTypes = isBfa ? ALLOWED_EXCEL_TYPES : ALLOWED_DOC_TYPES;
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error(isBfa ? "Only Excel or CSV files are allowed for BFA Reports." : "Only PDF, DOC, or DOCX files are allowed.");
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`File too large! Max size is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }
    setFile(selectedFile);
  };

  const performUpload = async (replaceId?: Id<"submitted_reports"> | null) => {
    const finalTitle = getFinalTitle();
    if (!finalTitle || !file) {
      toast.error("Please provide a report name and select a file.");
      return;
    }

    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file
      });
      const { storageId } = await uploadResponse.json();
      await saveUploadedFile({ storageId, fileName: file.name });
      const fileSizeMB = Number((file.size / (1024 * 1024)).toFixed(2));

      await uploadReport({
        submittedBy: convexUser._id as Id<"users">,
        role: safeRole,
        fileId: storageId as Id<"_storage">,
        fileSize: fileSizeMB,
        fileName: file.name,
        reportName: finalTitle,
        submittedAt: Date.now(),
        ...(isBfa && monthIndex >= 0
          ? {
              reportPeriodMonth: monthIndex,
              reportPeriodYear,
              ...(replaceId ? { replaceReportId: replaceId } : {}),
            }
          : {}),
      });

      setCustomTitle("");
      setFile(null);
      setShowDuplicateDialog(false);
      setReplaceReportId(null);

      if (hasBFAReport) {
        setSuccessWasReplace(Boolean(replaceId));
        setShowSuccessDialog(true);
        return;
      }

      toast.success(replaceId ? "Report replaced successfully!" : "Report uploaded successfully!");
      if (onUploadComplete) onUploadComplete();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload report.");
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file.");
      return;
    }

    if (isBfa && monthIndex >= 0) {
      const existing = await convex.query(api.internal_reports.getExistingBfaReportsForPeriod, {
        submittedBy: convexUser._id as Id<"users">,
        reportPeriodMonth: monthIndex,
        reportPeriodYear,
      });

      if (existing.length > 0) {
        setExistingReports(existing);
        setReplaceReportId(existing[0]._id);
        setShowDuplicateDialog(true);
        return;
      }
    }

    await performUpload(null);
  };

  const periodLabel = monthIndex >= 0 ? formatReportPeriodLabel(monthIndex, reportPeriodYear) : selectedMonth;

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false);
    if (onUploadComplete) onUploadComplete();
    onClose();
  };

  return (
    <>
      {!showSuccessDialog && (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Upload Report</DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Select Report Type</label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-full bg-gray-100">
                <SelectValue placeholder="Select Report Type" />
              </SelectTrigger>
              <SelectContent>
                {hasBFAReport && <SelectItem value="BFA Report">BFA Report</SelectItem>}
                <SelectItem value="Other">Add Your Report Name</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                {isBfa ? "Report Month" : "Month label"}
              </label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full bg-gray-100">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS_LONG.map((month) => (
                    <SelectItem key={month} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isBfa && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Report Year</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-full bg-gray-100">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {reportType === "Other" && (
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Custom Report Name</label>
              <Input
                type="text"
                placeholder="Enter custom report name"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full p-2 bg-gray-100 rounded-md placeholder-gray-400"
              />
            </div>
          )}

          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Preview Report Name</label>
            <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-600">{getFinalTitle()}</div>
          </div>

          <div className="group/dropzone mt-6">
            <div className="relative rounded-xl border-2 border-dashed border-gray-400 bg-gray-50 p-6 text-center">
              <input
                type="file"
                accept={isBfa ? ".csv,.xls,.xlsx" : ".pdf,.doc,.docx"}
                onChange={handleFileChange}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              <p className="text-base font-medium text-gray-700">Drag and drop files here or click to browse</p>
              <p className="text-xs text-gray-500">
                Supported formats: {isBfa ? "XLS, XLSX, CSV" : "PDF, DOC, DOCX"} (Max {MAX_FILE_SIZE_MB}MB)
              </p>
            </div>
          </div>

          {file && (
            <div className="mt-4 bg-gray-100 p-3 rounded-md flex items-center justify-between gap-4 text-sm overflow-hidden">
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-gray-800" title={file.name}>{file.name}</p>
              </div>
              <Button size="sm" className="shrink-0 bg-red-500 text-white" onClick={() => setFile(null)}>Remove</Button>
            </div>
          )}

          <DialogFooter className="mt-6 flex flex-col sm:flex-row sm:justify-end sm:items-center gap-2">
            <Button onClick={handleUpload} disabled={uploading || !file}>
              {uploading ? "Uploading..." : "Upload Report"}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}

      <ReportSubmissionSuccessDialog
        open={showSuccessDialog}
        onOpenChange={setShowSuccessDialog}
        onConfirm={handleSuccessDialogClose}
        title={successWasReplace ? "Report replaced successfully" : "Report uploaded successfully"}
      />

      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report already exists</DialogTitle>
            <DialogDescription>
              You already have {existingReports.length} BFA report
              {existingReports.length === 1 ? "" : "s"} for <strong>{periodLabel}</strong>.
              Do you want to replace an existing one or upload as a separate report?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-40 overflow-y-auto text-sm text-gray-600">
            {existingReports.map((report) => (
              <div key={report._id} className="rounded border p-2">
                <p className="font-medium">{report.reportName ?? "BFA Report"}</p>
                <p className="text-xs text-gray-500">
                  Submitted {new Date(report.submittedAt).toLocaleDateString()}
                  {report.fileName ? ` · ${report.fileName}` : ""}
                </p>
              </div>
            ))}
          </div>

          {existingReports.length > 1 && (
            <div className="mt-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Replace which report?</label>
              <Select
                value={replaceReportId ?? existingReports[0]._id}
                onValueChange={(value) => setReplaceReportId(value as Id<"submitted_reports">)}
              >
                <SelectTrigger className="w-full bg-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {existingReports.map((report) => (
                    <SelectItem key={report._id} value={report._id}>
                      {new Date(report.submittedAt).toLocaleDateString()} — {report.fileName ?? report.reportName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => performUpload(null)}
              disabled={uploading}
            >
              Upload as separate
            </Button>
            <Button
              onClick={() =>
                performUpload(
                  replaceReportId ?? existingReports[0]?._id ?? null
                )
              }
              disabled={uploading || existingReports.length === 0}
            >
              Replace existing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
