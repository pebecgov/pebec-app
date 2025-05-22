// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { toast } from "sonner";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
interface FileUploaderProps {
  fileBlob: Blob;
  fileName: string;
  setFileId: (storageId: string, fileName: string) => void;
}
export default function FileUploader({
  fileBlob,
  fileName,
  setFileId
}: FileUploaderProps) {
  const generateUploadUrl = useMutation(api.tickets.generateUploadUrl);
  const saveUploadedFile = useMutation(api.tickets.saveUploadedFile);
  const [saving, setSaving] = useState(false);
  async function handleUpload() {
    if (!fileBlob) {
      toast.error("No file to upload.");
      return;
    }
    setSaving(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": fileBlob.type || "application/pdf"
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
      toast.success(`Ticket uploaded: ${fileName}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload file.");
    } finally {
      setSaving(false);
    }
  }
  return <Button onClick={handleUpload} disabled={saving}>
      {saving ? <Spinner size="sm" /> : "Upload Ticket"}
    </Button>;
}