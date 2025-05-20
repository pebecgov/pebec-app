"use client";

import { toast } from "sonner";
import { useState, ChangeEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface FileUploaderProps {
  setFileId: (storageId: string) => void;
}

export default function FileUploader({ setFileId }: FileUploaderProps) {
  const generateUploadUrl = useMutation(api.internal_reports.generateUploadUrl); // ✅ Use Convex for uploading
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.currentTarget.files?.[0];
    if (selectedFile) {
      if (selectedFile.size / 1024 / 1024 > 50) {
        toast.error("File size too big (max 50MB)");
      } else {
        setFile(selectedFile);
        toast.info(`Selected file: ${selectedFile.name}`);
      }
    }
  };

  async function handleUpload() {
    if (!file) {
      toast.error("No file selected");
      return;
    }

    setSaving(true);
    try {
      // ✅ Step 1: Get a short-lived upload URL from Convex
      const uploadUrl = await generateUploadUrl();
      
      // ✅ Step 2: Upload the file to the Convex storage URL
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const { storageId } = await uploadResponse.json(); // ✅ Get real Convex storage ID

      setFileId(storageId); // ✅ Store the real file ID
      toast.success("File uploaded successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload file.");
    } finally {
      setSaving(false);
      setFile(null); // ✅ Reset file input
    }
  }

  return (
    <div className="grid gap-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Upload Supporting Document</h2>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Accepted formats: .pdf, .doc, .docx, .pptx, .xls, .xlsx
        </p>
      </div>
      <label htmlFor="file-upload" className="cursor-pointer">
        <input id="file-upload" name="file" type="file" accept=".pdf,.doc,.docx,.pptx,.xls,.xlsx" className="sr-only" onChange={onFileChange} />
        <div className="h-48 w-full flex items-center justify-center border border-dashed rounded-md p-4 text-center">
          {file ? <p>{file.name}</p> : <p>Click to upload a file</p>}
        </div>
      </label>
      <Button onClick={handleUpload} disabled={!file || saving}>
        {saving ? <Spinner size="sm" /> : "Upload"}
      </Button>
    </div>
  );
}
