"use client";

import { useState, ChangeEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Paperclip } from "lucide-react";

interface FileUploaderProps {
  setFileId: (storageId: string, fileName: string) => void;
}

export default function FileUploader({ setFileId }: FileUploaderProps) {
  const generateUploadUrl = useMutation(api.tickets.generateUploadUrl);
  const saveUploadedFile = useMutation(api.tickets.saveUploadedFile);
  const [saving, setSaving] = useState(false);

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.currentTarget.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size / 1024 / 1024 > 50) {
      toast.error("File size too big (max 50MB)");
      return;
    }

    try {
      setSaving(true);
      const uploadUrl = await generateUploadUrl();

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      const { storageId } = await uploadResponse.json();
      await saveUploadedFile({ storageId, fileName: selectedFile.name });

      setFileId(storageId, selectedFile.name);
      toast.success("File attached successfully!");
    } catch (error) {
      console.error(error);
      toast.error("File upload failed.");
    } finally {
      setSaving(false);
      event.target.value = ""; // reset file input
    }
  };

  return (
    <div className="relative">
      <label
        htmlFor="comment-attachment"
        className="absolute right-2 top-2 cursor-pointer text-gray-500 hover:text-gray-800"
        title="Attach a file"
      >
        <Paperclip className="w-5 h-5" />
        <input
          type="file"
          id="comment-attachment"
          accept=".pdf,.doc,.docx,.pptx,.xls,.xlsx"
          onChange={onFileChange}
          disabled={saving}
          className="hidden"
        />
      </label>
    </div>
  );
}
