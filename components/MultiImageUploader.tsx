// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, ChangeEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
interface Props {
  setFileIds: (ids: string[]) => void;
}
export default function MultiImageUploader({
  setFileIds
}: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedIds, setUploadedIds] = useState<string[]>([]);
  const generateUploadUrl = useMutation(api.media.generateUploadUrl);
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const totalSize = selected.reduce((acc, file) => acc + file.size, 0) / 1024 / 1024;
    if (selected.length > 6) {
      toast.error("Maximum of 6 images allowed.");
      return;
    }
    if (totalSize > 15) {
      toast.error("Total image size cannot exceed 15MB.");
      return;
    }
    setFiles(selected);
    const previews = selected.map(file => URL.createObjectURL(file));
    setImagePreviews(previews);
  };
  const handleUploadAll = async () => {
    if (files.length === 0) {
      toast.error("Please select images to upload.");
      return;
    }
    setUploading(true);
    try {
      const ids: string[] = [];
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
        ids.push(storageId);
      }
      setUploadedIds(ids);
      setFileIds(ids);
      toast.success("All images uploaded successfully.");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  };
  return <div className="space-y-3">
      <input type="file" accept="image/*" multiple onChange={handleFileSelect} />
      <div className="text-sm text-muted-foreground">
        Max 6 images, up to 15MB total
      </div>

      {}
      <div className="flex flex-wrap gap-3 mt-2">
        {imagePreviews.map((src, idx) => <img key={idx} src={src} alt={`preview-${idx}`} className="w-20 h-20 object-cover rounded border" />)}
      </div>

      <Button onClick={handleUploadAll} disabled={uploading}>
        {uploading ? <Spinner size="sm" /> : "Upload Images"}
      </Button>

      {uploadedIds.length > 0 && <ul className="text-xs text-green-600 mt-2">
          {uploadedIds.map((id, idx) => <li key={idx}>✔ Image {idx + 1} uploaded</li>)}
        </ul>}
    </div>;
}