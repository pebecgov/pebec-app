"use client";

import { ChangeEvent, useId, useState } from "react";
import { useMutation } from "convex/react";
import { FileText, ImageIcon, Loader2, Paperclip, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { convexErrorMessage } from "./convexError";

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const ACCEPT_ATTR =
  ".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.gif,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function isAllowedFile(file: File) {
  if (ACCEPTED_TYPES.includes(file.type)) return true;
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".pdf") ||
    name.endsWith(".doc") ||
    name.endsWith(".docx") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp") ||
    name.endsWith(".gif")
  );
}

function FileGlyph({ name }: { name: string }) {
  const lower = name.toLowerCase();
  if (/\.(png|jpe?g|webp|gif)$/.test(lower)) {
    return <ImageIcon className="h-4 w-4 text-sky-600" />;
  }
  return <FileText className="h-4 w-4 text-emerald-700" />;
}

export default function UndertakingUploader({
  fileName,
  fileUrl,
  onUploaded,
  onClear,
}: {
  fileName?: string;
  fileUrl?: string | null;
  onUploaded: (storageId: Id<"_storage">, fileName: string) => void;
  onClear?: () => void;
}) {
  const inputId = useId();
  const generateUploadUrl = useMutation(api.companyAssets.generateUploadUrl);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!isAllowedFile(file)) {
      toast.error("Please attach an image, PDF, or Word document");
      return;
    }

    const fileSizeMB = file.size / 1024 / 1024;
    if (fileSizeMB > 15) {
      toast.error("File is too large. Max size is 15MB");
      return;
    }

    try {
      setUploading(true);
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!result.ok) {
        throw new Error("Upload failed");
      }
      const json = (await result.json()) as { storageId?: string };
      if (!json.storageId) {
        throw new Error("No storage ID returned");
      }
      onUploaded(json.storageId as Id<"_storage">, file.name);
      toast.success("Undertaking attached");
    } catch (error) {
      toast.error(convexErrorMessage(error, "Could not upload file"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
        <Paperclip className="h-4 w-4 text-emerald-700" />
        Undertaking / signature file
      </div>
      <p className="mb-3 text-xs text-gray-500">
        Attach the signed undertaking. Images, PDF, or Word files are accepted.
      </p>
      {fileName ? (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            {uploading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-700" />
            ) : (
              <FileGlyph name={fileName} />
            )}
            {fileUrl && !uploading ? (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="truncate text-sm text-emerald-800 underline-offset-2 hover:underline"
              >
                {fileName}
              </a>
            ) : (
              <span className="truncate text-sm text-gray-700">
                {uploading ? "Uploading..." : fileName}
              </span>
            )}
          </div>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              disabled={uploading}
              aria-label="Remove file"
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:pointer-events-none disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <label
          htmlFor={uploading ? undefined : inputId}
          aria-disabled={uploading}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-3 text-sm text-gray-600",
            uploading
              ? "cursor-not-allowed opacity-60"
              : "cursor-pointer hover:bg-emerald-50",
          )}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? "Uploading..." : "Choose image, PDF, or Word file"}
        </label>
      )}
      <input
        id={inputId}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        disabled={uploading}
        onChange={handleFileSelect}
      />
      {fileName && (
        <div className="mt-2 flex justify-end">
          {uploading ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              disabled
            >
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Uploading...
            </Button>
          ) : (
            <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
              <label htmlFor={inputId} className="cursor-pointer">
                Replace file
              </label>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
