// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useCallback, useMemo, ChangeEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
interface ImageUploaderProps {
  setImageId: (storageId: string) => void;
  onFileSelect?: () => void;
  onUploadConfirmed?: () => void;
}
export default function ImageUploader({
  setImageId,
  onFileSelect,
  onUploadConfirmed
}: ImageUploaderProps) {
  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const [data, setData] = useState<{
    image: string | null;
  }>({
    image: null
  });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadConfirmed, setUploadConfirmed] = useState(false);
  const onChangePicture = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (file.size / 1024 / 1024 > 50) {
      toast.error("File size too big (max 50MB)");
      return;
    }
    setFile(file);
    setUploadConfirmed(false);
    const reader = new FileReader();
    reader.onload = e => {
      setData({
        image: e.target?.result as string
      });
      onFileSelect?.();
    };
    reader.readAsDataURL(file);
  }, [onFileSelect]);
  const saveDisabled = useMemo(() => {
    return !data.image || saving || uploadConfirmed;
  }, [data.image, saving, uploadConfirmed]);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setSaving(true);
    try {
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: {
          "Content-Type": file!.type
        },
        body: file
      });
      const {
        storageId
      } = await result.json();
      setImageId(storageId);
      setUploadConfirmed(true);
      toast.success("File uploaded successfully!");
      onUploadConfirmed?.();
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload image.");
    } finally {
      setSaving(false);
    }
  };
  return <form className="grid gap-4" onSubmit={handleSubmit}>
      <div>
        <label className="block font-semibold text-gray-700">
          Upload Cover Image
        </label>
        <p className="text-xs text-gray-500">
          Accepted formats: .png, .jpg, .webp (Max 50MB)
        </p>

        <label htmlFor="image-upload" className="group relative mt-2 flex h-64 cursor-pointer flex-col items-center justify-center rounded-md border shadow-sm transition-all bg-gray-100 hover:bg-gray-200">
          {data.image ? <img src={data.image} alt="Preview" className="h-full w-full rounded-md object-cover" /> : <p className="text-sm text-gray-600">Drag & drop or click to upload</p>}
          <input id="image-upload" type="file" accept="image/*" className="sr-only" onChange={onChangePicture} />
        </label>
      </div>

      <Button type="submit" disabled={saveDisabled}>
        {saving ? <p className="flex items-center gap-2 text-sm">
            <Spinner size="sm" />
            <span>Uploading...</span>
          </p> : <p className="text-sm">
            {uploadConfirmed ? "Uploaded ✅" : "Confirm Upload"}
          </p>}
      </Button>
    </form>;
}