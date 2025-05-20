"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Id } from "@/convex/_generated/dataModel";
import { FaTimes } from "react-icons/fa"; // ✅ Close button icon
import ImageUploader from "../image-uploader";

const MAX_FILE_SIZE_MB = 30;
const ALLOWED_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

interface UploadReportsProps {
  onClose: () => void; // ✅ Function to close the modal
  onUploadComplete?: () => void; // ✅ Refresh reports after upload
}

export default function UploadReports({ onClose, onUploadComplete }: UploadReportsProps) {
  const user = useUser();
  const uploadReport = useMutation(api.reports.uploadReport);
  const generateUploadUrl = useMutation(api.reports.generateUploadUrl);
  const getUser = useQuery(api.reports.getByClerkUserId, { clerkUserId: user.user?.id || "" });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [reportCoverUrl, setReportCoverUrl] = useState<Id<"_storage"> | undefined>(); // ✅ Store Image ID

  if (!user || getUser?.role !== "admin") {
    return <p className="text-red-500 text-center mt-10">Unauthorized: Only admins can upload reports.</p>;
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      toast.error("Invalid file type. Only PDF, DOC, and DOCX are allowed.");
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`File too large! Max size is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setFile(selectedFile);
  };


  // ✅ Handle file upload
  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a report file to upload.");
      return;
    }
    setUploading(true);

    try {
      const uploadUrl = await generateUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId: fileId } = await uploadResponse.json();
      const fileSizeMB = Number((file.size / (1024 * 1024)).toFixed(2));

      // ✅ Save report data to database
      await uploadReport({
        title,
        description,
        fileId: fileId as Id<"_storage">, // ✅ Ensure correct type
        fileSize: fileSizeMB,
        uploadedBy: getUser?._id as Id<"users">, // ✅ Correct ID type
        publishedAt: Date.now(),
        reportCoverUrl, // ✅ Pass uploaded cover image ID (undefined if no cover)
      });

      toast.success("Report uploaded successfully!");
      setTitle("");
      setDescription("");
      setFile(null);
      setReportCoverUrl(undefined); // ✅ Reset cover image

      if (onUploadComplete) onUploadComplete(); // ✅ Refresh table on upload
      onClose(); // ✅ Close modal after upload
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload report.");
    } finally {
      setUploading(false);
    }
  };


  return (
<div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 overflow-auto p-4">
{/* Modal Container */}
<div className="relative w-full max-w-md bg-green-950 p-6 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white">
          <FaTimes size={18} />
        </button>

        <h3 className="text-lg font-semibold text-white">Upload Report</h3>
        <p className="text-sm text-slate-400">After submitting, the report will be visible on the website.</p>

        <input
          type="text"
          placeholder="Report Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 bg-green-800 rounded-md text-white placeholder-gray-400 mt-4"
        />

        <textarea
          placeholder="Report Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 bg-green-800 rounded-md text-white placeholder-gray-400 mt-4"
          rows={3}
        ></textarea>

        {/* File Upload Box */}
        <div className="group/dropzone mt-6">
          <div className="relative rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/50 p-8 transition-colors group-hover/dropzone:border-cyan-500/50">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className="absolute inset-0 z-50 h-full w-full cursor-pointer opacity-0"
            />
            <div className="text-center">
              <p className="text-base font-medium text-white">Drop your files here or browse</p>
              <p className="text-sm text-slate-400">Support files: PDF, DOC, DOCX</p>
              <p className="text-xs text-slate-400">Max file size: {MAX_FILE_SIZE_MB}MB</p>
            </div>
          </div>
        </div>

        

        {/* File Preview */}
        {file && (
          <div className="mt-4 rounded-xl bg-slate-900/50 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-cyan-500/10 p-2">📄</div>
              <div>
                <p className="font-medium text-white">{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            </div>
          </div>
        )}

         {/* Cover Image Upload (Using `ImageUploader.tsx`) */}
         <div className="mt-4">
          <label className="text-sm text-slate-400">Upload Cover Image</label>
          <ImageUploader setImageId={(storageId) => setReportCoverUrl(storageId as Id<"_storage">)} /> {/* ✅ Pass Image ID */}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <Button onClick={handleUpload} disabled={uploading || !file}>
            {uploading ? "Uploading..." : "Upload Report"}
          </Button>
          <Button onClick={() => setFile(null)} className="bg-gray-700 hover:bg-gray-600">
            Clear Upload
          </Button>
        </div>
      </div>
    </div>
  );
}
