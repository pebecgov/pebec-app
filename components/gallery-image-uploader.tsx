// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useCallback, ChangeEvent, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { X } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import Image from "next/image";

interface GalleryImageUploaderProps {
  imageIds: Id<"_storage">[];
  setImageIds: (ids: Id<"_storage">[]) => void;
}

export default function GalleryImageUploader({
  imageIds,
  setImageIds
}: GalleryImageUploaderProps) {
  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const [previews, setPreviews] = useState<{ id: string; url: string; storageId?: Id<"_storage"> }[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  
  // Fetch URLs for existing imageIds
  const existingImageUrls = useQuery(
    api.posts.getImageUrls,
    imageIds.length > 0 ? { storageIds: imageIds } : "skip"
  );

  const handleFileSelect = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files || []);
    if (files.length === 0) return;

    // Filter valid image files
    const imageFiles = files.filter(file => {
      if (file.size / 1024 / 1024 > 50) {
        toast.error(`${file.name} is too big (max 50MB)`);
        return false;
      }
      return file.type.startsWith('image/');
    });

    if (imageFiles.length === 0) return;

    // Create previews
    const newPreviews = await Promise.all(
      imageFiles.map(async (file) => {
        const reader = new FileReader();
        return new Promise<{ id: string; url: string }>((resolve) => {
          reader.onload = (e) => {
            resolve({
              id: file.name + Date.now(),
              url: e.target?.result as string
            });
          };
          reader.readAsDataURL(file);
        });
      })
    );

    setPreviews([...previews, ...newPreviews]);

    // Upload each file
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const previewId = newPreviews[i].id;
      setUploading(previewId);
      
      try {
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: "POST",
          headers: {
            "Content-Type": file.type
          },
          body: file
        });
        const { storageId } = await result.json();
        const newIds = [...imageIds, storageId];
        setImageIds(newIds);
        
        // Update preview with storageId
        setPreviews(prev => prev.map(p => 
          p.id === previewId ? { ...p, storageId } : p
        ));
        
        toast.success(`${file.name} uploaded successfully!`);
      } catch (error) {
        console.error(error);
        toast.error(`Failed to upload ${file.name}`);
        // Remove failed preview
        setPreviews(prev => prev.filter(p => p.id !== previewId));
      } finally {
        setUploading(null);
      }
    }

    // Reset input
    event.currentTarget.value = '';
  }, [imageIds, setImageIds, previews, generateUploadUrl]);

  const removeImage = useCallback((index: number) => {
    const newIds = imageIds.filter((_, i) => i !== index);
    setImageIds(newIds);
    setPreviews(prev => prev.filter((_, i) => i !== index));
    toast.success("Image removed");
  }, [imageIds, setImageIds]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block font-semibold text-gray-700 mb-2">
          Gallery Images
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Upload multiple images for the carousel. If no custom cover image is set above, the first gallery image will automatically become the cover image.
        </p>
        
        <label
          htmlFor="gallery-upload"
          className="group relative flex h-32 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-gray-300 shadow-sm transition-all bg-gray-50 hover:bg-gray-100"
        >
          <p className="text-sm text-gray-600">Click to add images or drag & drop</p>
          <p className="text-xs text-gray-400 mt-1">Multiple files supported (Max 50MB each)</p>
          <input
            id="gallery-upload"
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={handleFileSelect}
          />
        </label>
      </div>

      {(previews.length > 0 || imageIds.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {/* Show previews for newly uploaded images */}
          {previews.map((preview, index) => {
            const displayIndex = index;
            return (
              <div key={preview.id} className="relative group">
                <div className="aspect-square rounded-md overflow-hidden border bg-gray-100">
                  <img
                    src={preview.url}
                    alt={`Preview ${displayIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                {uploading === preview.id ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                    <Spinner size="sm" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      // Find the actual index in imageIds
                      const actualIndex = preview.storageId 
                        ? imageIds.findIndex(id => id === preview.storageId)
                        : displayIndex;
                      removeImage(actualIndex >= 0 ? actualIndex : displayIndex);
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
          
          {/* Show existing images from imageIds that aren't in previews */}
          {existingImageUrls?.map(({ storageId, url }, index) => {
            const isInPreviews = previews.some(p => p.storageId === storageId);
            if (isInPreviews || !url) return null;
            
            return (
              <div key={storageId} className="relative group">
                <div className="aspect-square rounded-md overflow-hidden border bg-gray-100">
                  <Image
                    src={url}
                    alt={`Gallery image ${index + 1}`}
                    width={200}
                    height={200}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const actualIndex = imageIds.findIndex(id => id === storageId);
                    if (actualIndex >= 0) removeImage(actualIndex);
                  }}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
