// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, ChangeEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Paperclip, Upload } from "lucide-react";

interface FileUploaderProps {
  setFileId: (storageId: string, fileName: string, fileSize?: number) => void;
}

export default function FileUploader({
  setFileId
}: FileUploaderProps) {
  const generateUploadUrl = useMutation(api.tickets.generateUploadUrl);
  const saveUploadedFile = useMutation(api.tickets.saveUploadedFile);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState(false);

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    
    if (file.size / 1024 / 1024 > 50) {
      toast.error("File size too big (max 50MB)");
      return;
    }
    
    setSelectedFile(file);
    setUploaded(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    try {
      setSaving(true);
      const uploadUrl = await generateUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": selectedFile.type
        },
        body: selectedFile
      });
      const {
        storageId
      } = await uploadResponse.json();
      await saveUploadedFile({
        storageId,
        fileName: selectedFile.name
      });
      const fileSizeInMB = Math.round(selectedFile.size / 1024 / 1024 * 100) / 100; // Round to 2 decimal places
      setFileId(storageId, selectedFile.name, fileSizeInMB);
      toast.success("File attached successfully!");
      setUploaded(true);
      // Don't clear selectedFile - keep showing the file name
    } catch (error) {
      console.error(error);
      toast.error("File upload failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    
    if (file.size / 1024 / 1024 > 50) {
      toast.error("File size too big (max 50MB)");
      return;
    }
    
    setSelectedFile(file);
    setUploaded(false);
  };

  return (
    <div className="relative">
      {selectedFile ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 truncate max-w-32">
            {selectedFile.name}
          </span>
          {!uploaded && !saving && (
            <>
              <button
                onClick={handleUpload}
                disabled={saving}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Upload file"
              >
                <Upload className="w-3 h-3" />
                Upload
              </button>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-gray-400 hover:text-gray-600 text-xs"
                title="Remove file"
              >
                ×
              </button>
            </>
          )}
          {saving && (
            <span className="text-xs text-gray-500">Uploading...</span>
          )}
        </div>
      ) : (
        <div className="flex justify-center items-center min-h-[60px]">
          <label htmlFor="comment-attachment" className="cursor-pointer text-gray-500 hover:text-gray-800" title="Attach a file">
            <Paperclip className="w-6 h-6" />
            <input 
              type="file" 
              id="comment-attachment" 
              accept=".pdf,.doc,.docx,.pptx,.xls,.xlsx" 
              onChange={handleFileSelect} 
              disabled={saving} 
              className="hidden" 
            />
          </label>
        </div>
      )}
    </div>
  );
}