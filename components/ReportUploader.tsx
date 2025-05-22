// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { toast } from "sonner";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
interface ReportUploaderProps {
  fileBlob: Blob;
  fileName: string;
  setFileId: (storageId: string, fileName: string) => void;
}
export default function ReportUploader({
  fileBlob,
  fileName,
  setFileId
}: ReportUploaderProps) {
  const generateUploadUrl = useMutation(api.reports.generateUploadUrl);
  const saveUploadedFile = useMutation(api.tickets.saveUploadedFile);
  const [saving, setSaving] = useState(false);
  const MAX_FILE_SIZE_MB = 30;
  async function handleUpload() {
    if (!fileBlob) {
      toast.error("No file selected for upload.");
      return;
    }
    const fileSizeMB = fileBlob.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      toast.error(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit.`);
      return;
    }
    setSaving(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": fileBlob.type
        },
        body: fileBlob
      });
      const {
        storageId
      } = await uploadResponse.json();
      await saveUploadedFile({
        storageId,
        fileName
      });
      setFileId(storageId, fileName);
      toast.success(`Report uploaded: ${fileName}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload report.");
    } finally {
      setSaving(false);
    }
  }
  return <Button onClick={handleUpload} disabled={saving}>
      {saving ? <Spinner size="sm" /> : "Upload Report"}
    </Button>;
}