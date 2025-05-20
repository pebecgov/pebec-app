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
  setFileId: (storageId: string, fileName: string) => void; // 🆙 Allow fileName too
}

export default function ReportUploader({ fileBlob, fileName, setFileId }: ReportUploaderProps) {
  const generateUploadUrl = useMutation(api.reports.generateUploadUrl);
  const saveUploadedFile = useMutation(api.tickets.saveUploadedFile); // ✅ Save filename
  const [saving, setSaving] = useState(false);

  const MAX_FILE_SIZE_MB = 30; // 30MB Limit

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
      // Step 1: Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Step 2: Upload blob to Convex
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": fileBlob.type },
        body: fileBlob,
      });

      const { storageId } = await uploadResponse.json();

      // Step 3: Save storageId + fileName to a proper database table
      await saveUploadedFile({ storageId, fileName });

      setFileId(storageId, fileName); // Update parent
      toast.success(`Report uploaded: ${fileName}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload report.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Button onClick={handleUpload} disabled={saving}>
      {saving ? <Spinner size="sm" /> : "Upload Report"}
    </Button>
  );
}
