"use client";

import { useState, ChangeEvent, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Id } from "@/convex/_generated/dataModel";
import { v4 as uuidv4 } from 'uuid';
import { Trash, Upload, XCircle } from 'lucide-react';

interface FileEntry {
  id: string;
  file: File | null;
  status: 'empty' | 'pending' | 'uploading' | 'uploaded' | 'error';
  storageId?: Id<"_storage">;
  fileName?: string;
  errorMessage?: string;
}

interface FileUploaderProps {
  onFileUploaded: (storageId: Id<"_storage">, fileName: string) => void;
  onFileRemoved: (storageId: Id<"_storage">) => void;
  existingFiles: { storageId: Id<"_storage">; fileName: string }[];
}

export default function FileUploader({
  onFileUploaded,
  onFileRemoved,
  existingFiles,
}: FileUploaderProps) {
  const generateUploadUrl = useMutation(api.tickets.generateUploadUrl);
  const saveUploadedFile = useMutation(api.tickets.saveUploadedFile);

  const [fileEntries, setFileEntries] = useState<FileEntry[]>([
    { id: uuidv4(), file: null, status: 'empty' }
  ]);

  const fileInputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  const filesToUpload = fileEntries.filter(
    (entry) => entry.file !== null && (entry.status === 'pending' || entry.status === 'error')
  );

  const handleAddDocument = () => {
    setFileEntries(prev => [
      ...prev,
      { id: uuidv4(), file: null, status: 'empty' }
    ]);

    // Scroll to bottom
    setTimeout(() => {
      containerRef.current?.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);
  };

  const onFileChange = (fileEntryId: string) => (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.currentTarget.files?.[0];

    setFileEntries(prev =>
      prev.map(entry => {
        if (entry.id === fileEntryId) {
          if (selectedFile) {
            if (selectedFile.size / 1024 / 1024 > 50) {
              toast.error(`File "${selectedFile.name}" is too big (max 50MB).`);
              return { ...entry, file: null, status: 'error', errorMessage: 'File too big' };
            } else {
              return { ...entry, file: selectedFile, status: 'pending', errorMessage: undefined };
            }
          } else {
            return { ...entry, file: null, status: 'empty', errorMessage: undefined };
          }
        }
        return entry;
      })
    );

    const inputElement = fileInputRefs.current.get(fileEntryId);
    if (inputElement) {
      inputElement.value = '';
    }
  };

  const handleUploadAll = async () => {
    if (filesToUpload.length === 0) {
      toast.info("No files selected for upload.");
      return;
    }

    const uploadToastId = toast.loading(`Uploading ${filesToUpload.length} file(s)...`);
    let allSucceeded = true;
    let successfulUploadsCount = 0;

    for (const entryToUpload of filesToUpload) {
      const file = entryToUpload.file;
      if (!file) continue;

      setFileEntries(prev =>
        prev.map(entry =>
          entry.id === entryToUpload.id ? { ...entry, status: 'uploading', errorMessage: undefined } : entry
        )
      );

      try {
        const uploadUrl = await generateUploadUrl();
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

        const { storageId } = await uploadResponse.json();

        await saveUploadedFile({
          storageId,
          fileName: file.name,
        });

        setFileEntries(prev =>
          prev.map(entry =>
            entry.id === entryToUpload.id
              ? { ...entry, status: 'uploaded', storageId, fileName: file.name, file: null }
              : entry
          )
        );
        onFileUploaded(storageId, file.name);
        successfulUploadsCount++;

      } catch (error) {
        console.error("Upload failed for file:", file.name, error);
        const errorMessage = "Upload failed";
        setFileEntries(prev =>
          prev.map(entry =>
            entry.id === entryToUpload.id
              ? { ...entry, status: 'error', errorMessage }
              : entry
          )
        );
        allSucceeded = false;
      }
    }

    if (allSucceeded && successfulUploadsCount > 0) {
      toast.success(`${successfulUploadsCount} file(s) uploaded successfully!`, { id: uploadToastId });
    } else if (successfulUploadsCount > 0) {
      toast.warning(`Uploaded ${successfulUploadsCount} file(s), some failed.`, { id: uploadToastId });
    } else {
      toast.error("All file uploads failed.", { id: uploadToastId });
    }
  };

  const handleRemoveEntry = (fileEntryId: string) => {
    setFileEntries(prev => {
      const entryToRemove = prev.find(entry => entry.id === fileEntryId);
      if (entryToRemove && entryToRemove.status === 'uploaded' && entryToRemove.storageId) {
        onFileRemoved(entryToRemove.storageId);
      }
      return prev.filter(entry => entry.id !== fileEntryId);
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <p className="mt-1 text-xs text-muted-foreground/60">
          Accepted formats: .pdf, .doc, .docx, .pptx, .xls, .xlsx, .jpeg, .jpg, .png (Max 50MB per file)
        </p>
      </div>

      <div
        ref={containerRef}
        className="flex-grow overflow-y-auto space-y-2 pr-2 mb-4 scrollbar-thin scrollbar-thumb-gray-400 h-[150px] scrollbar-track-gray-200"
      >
        {fileEntries.map(entry => (
          <div key={entry.id} className="flex items-center gap-2 border rounded-md p-2">
            <input
              id={`file-upload-${entry.id}`}
              name={`file-${entry.id}`}
              type="file"
              accept=".pdf,.doc,.docx,.pptx,.xls,.xlsx,.jpeg,.jpg,.png"
              className="sr-only"
              onChange={onFileChange(entry.id)}
              ref={(el) => {
                fileInputRefs.current.set(entry.id, el);
              }}
              disabled={entry.status === 'uploading' || entry.status === 'uploaded'}
            />

            <label
              htmlFor={`file-upload-${entry.id}`}
              className={`flex-grow h-10 flex items-center justify-center border rounded-md px-3 py-2 text-sm font-medium transition-colors
              ${entry.status === 'uploaded' || entry.status === 'uploading'
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 cursor-pointer'
                }`}
            >
              {entry.status === 'empty' && (<div className="flex items-center gap-2 text-gray-600">
                <Upload size={16} />
                <span className="text-sm">Choose file</span>
              </div>)}
              {entry.status === 'pending' && entry.file && `Selected: ${entry.file.name}`}
              {entry.status === 'uploading' && <span className="flex items-center gap-1 text-blue-600"><Spinner size="sm" /> Uploading...</span>}
              {entry.status === 'uploaded' && <span className="text-green-600">Uploaded: {entry.fileName}</span>}
              {entry.status === 'error' && <span className="text-red-600">Error: {entry.errorMessage || 'Failed to select/upload'}</span>}
            </label>

            <Button
              onClick={() => handleRemoveEntry(entry.id)}
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700"
              disabled={entry.status === 'uploading'}
            >

              <Trash className="h-5 w-5" />
            </Button>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 bg-white pt-2 flex gap-2">
        <Button onClick={handleAddDocument} variant="outline" className="w-1/2 bg-green-600 text-white hover:bg-green-700 hover:text-white">
          Add Evidence
        </Button>

        <Button
          onClick={handleUploadAll}
         // disabled={filesToUpload.length === 0 || filesToUpload.some(f => f.status === 'uploading')}
          className={`w-1/2 ${filesToUpload.length === 0 || filesToUpload.some(f => f.status === 'uploading') ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        >
          {filesToUpload.length > 0 ? `Upload (${filesToUpload.length}) File(s)` : 'Upload File(s)'}
        </Button>
      </div>

      {existingFiles.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Already Uploaded Files:</h3>
          <ul className="text-sm border rounded-md divide-y divide-gray-200">
            {existingFiles.map(file => (
              <li key={file.storageId} className="flex items-center justify-between py-2 px-3">
                <span className="text-gray-700">{file.fileName}</span>
                <Button
                  onClick={() => onFileRemoved(file.storageId)}
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700"
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

}
