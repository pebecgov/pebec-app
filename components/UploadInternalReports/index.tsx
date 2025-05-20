"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Id } from "@/convex/_generated/dataModel";

const MAX_FILE_SIZE_MB = 20;
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const ALLOWED_EXCEL_TYPES = [
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "text/csv", // .csv
];


const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
];

interface UploadReportsProps {
  onClose: () => void;
  onUploadComplete?: () => void;
}

export default function UploadReports({ onClose, onUploadComplete }: UploadReportsProps) {
  const { user } = useUser();
  const uploadReport = useMutation(api.internal_reports.submitReport);
  const generateUploadUrl = useMutation(api.internal_reports.generateUploadUrl);
  const saveUploadedFile = useMutation(api.tickets.saveUploadedFile); // ✅ Save to uploaded_files table
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  const [reportType, setReportType] = useState("BFA Report");
  const [customTitle, setCustomTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const hasBFAReport = convexUser?.role === "reform_champion";

  const allowedRoles = [
    "user",
    "admin",
    "mda",
    "staff",
    "reform_champion",
    "federal",
    "saber_agent",
    "deputies",
    "magistrates",
    "state_governor",
    "president",
    "vice_president",
  ] as const;

  type AllowedRole = typeof allowedRoles[number];
  
  const safeRole: AllowedRole =
    convexUser && allowedRoles.includes(convexUser.role as AllowedRole)
      ? (convexUser.role as AllowedRole)
      : "user";

  useEffect(() => {
    if (!hasBFAReport && reportType === "BFA Report") {
      setReportType("Other");
    }
  }, [hasBFAReport, reportType]);

  if (!user || !convexUser) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
  
    const isBFA = reportType === "BFA Report";
    const allowedTypes = isBFA ? ALLOWED_EXCEL_TYPES : ALLOWED_DOC_TYPES;
  
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error(
        isBFA
          ? "Only Excel or CSV files are allowed for BFA Reports."
          : "Only PDF, DOC, or DOCX files are allowed."
      );
      return;
    }
  
    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`File too large! Max size is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }
  
    setFile(selectedFile);
  };
  

  const handleUpload = async () => {
    const finalTitle = reportType === "Other" ? customTitle.trim() : reportType;

    if (!finalTitle || !file) {
      toast.error("Please provide a report name and select a file.");
      return;
    }

    setUploading(true);

    try {
      // Step 1: Upload to Convex Storage
      const uploadUrl = await generateUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const { storageId } = await uploadResponse.json();

      // Step 2: Save to uploaded_files table
      await saveUploadedFile({ storageId, fileName: file.name });

      const fileSizeMB = Number((file.size / (1024 * 1024)).toFixed(2));

      // Step 3: Save report
      await uploadReport({
        submittedBy: convexUser._id as Id<"users">,
        role: safeRole,
        fileId: storageId as Id<"_storage">,
        fileSize: fileSizeMB,
        fileName: file.name,
        reportName: finalTitle,
        submittedAt: Date.now(),
      });

      toast.success("Report uploaded successfully!");
      setCustomTitle("");
      setFile(null);

      if (onUploadComplete) onUploadComplete();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload report.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Upload Report</DialogTitle>
        </DialogHeader>

        {/* Report Type Selector */}
        <div className="mt-4">
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Select Report Type
          </label>

          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-full bg-gray-100">
              <SelectValue placeholder="Select Report Type" />
            </SelectTrigger>

            <SelectContent>
              {hasBFAReport && (
                <SelectItem value="BFA Report">BFA Report</SelectItem>
              )}
              <SelectItem value="Other">Add Your Report Name</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {reportType === "Other" && (
          <Input
            type="text"
            placeholder="Enter custom report name"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            className="w-full p-2 bg-gray-100 rounded-md placeholder-gray-400 mt-4"
          />
        )}

        {/* File Upload Box */}
        <div className="group/dropzone mt-6">
          <div className="relative rounded-xl border-2 border-dashed border-gray-400 bg-gray-50 p-6 text-center">
          <input
  type="file"
  accept={reportType === "BFA Report" ? ".csv,.xls,.xlsx" : ".pdf,.doc,.docx"}
  onChange={handleFileChange}
  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
/>

            <p className="text-base font-medium text-gray-700">
              Drag and drop files here or click to browse
            </p>
            <p className="text-xs text-gray-500">
  Supported formats:{" "}
  {reportType === "BFA Report"
    ? "XLS, XLSX, CSV"
    : "PDF, DOC, DOCX"}{" "}
  (Max {MAX_FILE_SIZE_MB}MB)
</p>

          </div>
        </div>

        {file && (
  <div className="mt-4 bg-gray-100 p-3 rounded-md flex items-center justify-between gap-4 text-sm overflow-hidden">
    <div className="flex-1 overflow-hidden">
      <p className="truncate text-gray-800" title={file.name}>
        {file.name}
      </p>
    </div>
    <Button
      size="sm"
      className="shrink-0 bg-red-500 text-white"
      onClick={() => setFile(null)}
    >
      Remove
    </Button>
  </div>
)}

        <DialogFooter className="mt-6 flex flex-col sm:flex-row sm:justify-end sm:items-center gap-2">
          <Button onClick={handleUpload} disabled={uploading || !file}>
            {uploading ? "Uploading..." : "Upload Report"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
