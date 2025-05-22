// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, ChangeEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
interface Props {
  setFileIds: (ids: {
    storageId: string;
    fileName: string;
  }[]) => void;
}
export default function MultiFileUploader({
  setFileIds
}: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{
    storageId: string;
    fileName: string;
  }[]>([]);
  const generateUploadUrl = useMutation(api.tickets.generateUploadUrl);
  const saveUploadedFile = useMutation(api.tickets.saveUploadedFile);
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const totalSize = selected.reduce((acc, file) => acc + file.size, 0) / 1024 / 1024;
    if (selected.length > 6) {
      toast.error("Maximum of 6 files allowed.");
      return;
    }
    if (totalSize > 15) {
      toast.error("Total file size cannot exceed 15MB.");
      return;
    }
    setFiles(selected);
  };
  const handleUploadAll = async () => {
    if (files.length === 0) {
      toast.error("Please select files to upload.");
      return;
    }
    setUploading(true);
    try {
      const uploaded: {
        storageId: string;
        fileName: string;
      }[] = [];
      for (const file of files) {
        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type": file.type
          },
          body: file
        });
        const {
          storageId
        } = await res.json();
        await saveUploadedFile({
          storageId,
          fileName: file.name
        });
        uploaded.push({
          storageId,
          fileName: file.name
        });
      }
      setUploadedFiles(uploaded);
      setFileIds(uploaded);
      toast.success("All files uploaded successfully.");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  };
  return <div className="space-y-3">
      <input type="file" multiple onChange={handleFileSelect} accept=".pdf,.doc,.docx,.pptx,.xls,.xlsx" />
      <div className="text-sm text-muted-foreground">Max 6 files, up to 15MB total</div>
      <Button onClick={handleUploadAll} disabled={uploading}>
        {uploading ? <Spinner size="sm" /> : "Upload Files"}
      </Button>

      {uploadedFiles.length > 0 && <ul className="text-xs text-green-600 mt-2">
          {uploadedFiles.map((file, idx) => <li key={idx}>✔ {file.fileName}</li>)}
        </ul>}
    </div>;
}