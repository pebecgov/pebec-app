// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, ChangeEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Paperclip, Upload, X } from "lucide-react";

interface FileUploaderProps {
  setFileId: (storageId: string, fileName: string, fileSize?: number) => void;
  maxSizeMB?: number; // Optional max size, defaults to 200MB for large files
}

export default function FileUploader({
  setFileId,
  maxSizeMB = 200 // Default to 200MB to support large magazine files
}: FileUploaderProps) {
  const generateUploadUrl = useMutation(api.tickets.generateUploadUrl);
  const saveUploadedFile = useMutation(api.tickets.saveUploadedFile);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    
    const fileSizeMB = file.size / 1024 / 1024;
    if (fileSizeMB > maxSizeMB) {
      toast.error(`File size too big (max ${maxSizeMB}MB). Your file is ${fileSizeMB.toFixed(2)}MB`);
      event.target.value = '';
      return;
    }
    
    setSelectedFile(file);
    setUploaded(false);
    setUploadProgress(0);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    try {
      setSaving(true);
      setUploadProgress(0);
      
      // Get upload URL from Convex (returns URL string directly)
      const uploadUrl = await generateUploadUrl();
      
      if (!uploadUrl || typeof uploadUrl !== 'string') {
        throw new Error("Failed to get upload URL");
      }

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      });

      // Upload file directly to Convex storage URL
      const uploadPromise = new Promise<{ storageId: string }>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              // Convex returns { storageId: "..." } or { id: "..." }
              const storageId = response.storageId || response.id;
              if (!storageId) {
                reject(new Error("No storage ID in response"));
                return;
              }
              resolve({ storageId });
            } catch (e) {
              reject(new Error("Invalid response from server"));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error("Network error during upload"));
        });
        
        xhr.addEventListener('abort', () => {
          reject(new Error("Upload was cancelled"));
        });
        
        xhr.open('POST', uploadUrl);
        xhr.setRequestHeader('Content-Type', selectedFile.type);
        xhr.send(selectedFile);
      });

      const { storageId } = await uploadPromise;
      
      // Ensure storageId is a string
      const storageIdString = typeof storageId === 'string' ? storageId : String(storageId);
      
      // Save file metadata
      await saveUploadedFile({
        storageId: storageIdString as any,
        fileName: selectedFile.name
      });
      
      const fileSizeInMB = Math.round(selectedFile.size / 1024 / 1024 * 100) / 100;
      setFileId(storageIdString, selectedFile.name, fileSizeInMB);
      toast.success(`File uploaded successfully! (${fileSizeInMB}MB)`);
      setUploaded(true);
      setUploadProgress(100);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(`File upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      setUploadProgress(0);
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    
    const fileSizeMB = file.size / 1024 / 1024;
    if (fileSizeMB > maxSizeMB) {
      toast.error(`File size too big (max ${maxSizeMB}MB). Your file is ${fileSizeMB.toFixed(2)}MB`);
      event.target.value = '';
      return;
    }
    
    setSelectedFile(file);
    setUploaded(false);
    setUploadProgress(0);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploaded(false);
    setUploadProgress(0);
  };

  const fileSizeMB = selectedFile ? (selectedFile.size / 1024 / 1024).toFixed(2) : '0';

  return (
    <div className="relative w-full">
      {selectedFile ? (
        <div className="space-y-2 border rounded-lg p-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate" title={selectedFile.name}>
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {fileSizeMB} MB
              </p>
            </div>
            {!uploaded && !saving && (
              <button
                onClick={handleRemoveFile}
                className="text-gray-400 hover:text-red-600 p-1"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {!uploaded && !saving && (
            <button
              onClick={handleUpload}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload File
            </button>
          )}
          
          {saving && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
          
          {uploaded && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <span>✓ Uploaded successfully</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[100px] border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
          <label htmlFor="comment-attachment" className="cursor-pointer flex flex-col items-center gap-2 text-gray-500 hover:text-gray-700" title="Attach a file">
            <Paperclip className="w-8 h-8" />
            <span className="text-sm font-medium">Click to select file</span>
            <span className="text-xs text-gray-400">Max {maxSizeMB}MB</span>
            <input 
              type="file" 
              id="comment-attachment" 
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