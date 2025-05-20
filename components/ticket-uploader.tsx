"use client";

import { toast } from "sonner";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface FileUploaderProps {
  fileBlob: Blob; // ✅ Blob from PDF
  fileName: string;
  setFileId: (storageId: string, fileName: string) => void; // 🆙 set both id and name
}

export default function FileUploader({ fileBlob, fileName, setFileId }: FileUploaderProps) {
  const generateUploadUrl = useMutation(api.tickets.generateUploadUrl);
  const saveUploadedFile = useMutation(api.tickets.saveUploadedFile); // 🆕 Save to uploaded_files
  const [saving, setSaving] = useState(false);

  async function handleUpload() {
    if (!fileBlob) {
      toast.error("No file to upload.");
      return;
    }

    setSaving(true);
    try {
      // ✅ Step 1: Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();

      // ✅ Step 2: Upload the file to Convex Storage
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": fileBlob.type || "application/pdf" },
        body: fileBlob,
      });

      const { storageId } = await uploadResponse.json();

      // ✅ Step 3: Save the uploaded file metadata
      await saveUploadedFile({
        storageId,
        fileName,
      });

      // ✅ Step 4: Set storageId and filename for parent
      setFileId(storageId, fileName);

      toast.success(`Ticket uploaded: ${fileName}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload file.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Button onClick={handleUpload} disabled={saving}>
      {saving ? <Spinner size="sm" /> : "Upload Ticket"}
    </Button>
  );
}
