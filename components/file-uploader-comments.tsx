// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useId, useState, ChangeEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Paperclip, Upload, X } from "lucide-react";

interface FileUploaderProps {
  setFileId: (storageId: string, fileName: string, fileSize?: number) => void;
  maxSizeMB?: number;
  compact?: boolean;
  resetAfterUpload?: boolean;
}

export default function FileUploader({
  setFileId,
  maxSizeMB = 200,
  compact = false,
  resetAfterUpload = compact,
}: FileUploaderProps) {
  const inputId = useId();
  const generateUploadUrl = useMutation(api.tickets.generateUploadUrl);
  const saveUploadedFile = useMutation(api.tickets.saveUploadedFile);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const resetPicker = () => {
    setSelectedFile(null);
    setUploadProgress(0);
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.target.value = "";
    if (!file) return;

    const fileSizeMB = file.size / 1024 / 1024;
    if (fileSizeMB > maxSizeMB) {
      toast.error(`File size too big (max ${maxSizeMB}MB). Your file is ${fileSizeMB.toFixed(2)}MB`);
      return;
    }

    setSelectedFile(file);
    setUploadProgress(0);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setSaving(true);
      setUploadProgress(0);

      const uploadUrl = await generateUploadUrl();
      if (!uploadUrl || typeof uploadUrl !== "string") {
        throw new Error("Failed to get upload URL");
      }

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      });

      const uploadPromise = new Promise<{ storageId: string }>((resolve, reject) => {
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              const storageId = response.storageId || response.id;
              if (!storageId) {
                reject(new Error("No storage ID in response"));
                return;
              }
              resolve({ storageId });
            } catch {
              reject(new Error("Invalid response from server"));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
        xhr.addEventListener("abort", () => reject(new Error("Upload was cancelled")));

        xhr.open("POST", uploadUrl);
        xhr.setRequestHeader("Content-Type", selectedFile.type);
        xhr.send(selectedFile);
      });

      const { storageId } = await uploadPromise;
      const storageIdString = typeof storageId === "string" ? storageId : String(storageId);

      await saveUploadedFile({
        storageId: storageIdString as any,
        fileName: selectedFile.name,
      });

      const fileSizeInMB = Math.round((selectedFile.size / 1024 / 1024) * 100) / 100;
      setFileId(storageIdString, selectedFile.name, fileSizeInMB);

      if (resetAfterUpload) {
        resetPicker();
      } else {
        setUploadProgress(100);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(`File upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      setUploadProgress(0);
    } finally {
      setSaving(false);
    }
  };

  const fileSizeMB = selectedFile ? (selectedFile.size / 1024 / 1024).toFixed(2) : "0";

  if (compact && !selectedFile && !saving) {
    return (
      <label
        htmlFor={inputId}
        className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 transition-colors hover:border-green-500 hover:bg-green-50 hover:text-green-700"
        title="Attach a file"
      >
        <Paperclip className="h-4 w-4" />
        <span>Attach file</span>
        <input
          type="file"
          id={inputId}
          accept=".pdf,.doc,.docx,.pptx,.xls,.xlsx,.zip,.rar"
          onChange={handleFileSelect}
          disabled={saving}
          className="hidden"
        />
      </label>
    );
  }

  if (compact && (selectedFile || saving)) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
        {selectedFile && (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Paperclip className="h-4 w-4 shrink-0 text-gray-500" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-700" title={selectedFile.name}>
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500">{fileSizeMB} MB</p>
            </div>
          </div>
        )}

        {saving && (
          <div className="flex min-w-[120px] flex-1 items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-green-600 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{uploadProgress}%</span>
          </div>
        )}

        {!saving && selectedFile && (
          <>
            <button
              type="button"
              onClick={handleUpload}
              className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload
            </button>
            <button
              type="button"
              onClick={resetPicker}
              className="rounded-md p-1 text-gray-400 hover:text-red-600"
              title="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {selectedFile ? (
        <div className="space-y-2 rounded-lg border bg-gray-50 p-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-700" title={selectedFile.name}>
                {selectedFile.name}
              </p>
              <p className="mt-1 text-xs text-gray-500">{fileSizeMB} MB</p>
            </div>
            {!saving && (
              <button
                type="button"
                onClick={resetPicker}
                className="p-1 text-gray-400 hover:text-red-600"
                title="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {!saving && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded bg-green-500 px-3 py-2 text-sm text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              Upload File
            </button>
          )}

          {saving && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex min-h-[100px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 transition-colors hover:border-gray-400">
          <label
            htmlFor={inputId}
            className="flex cursor-pointer flex-col items-center gap-2 text-gray-500 hover:text-gray-700"
            title="Attach a file"
          >
            <Paperclip className="h-8 w-8" />
            <span className="text-sm font-medium">Click to select file</span>
            <span className="text-xs text-gray-400">Max {maxSizeMB}MB</span>
            <input
              type="file"
              id={inputId}
              accept=".pdf,.doc,.docx,.pptx,.xls,.xlsx,.zip,.rar"
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
