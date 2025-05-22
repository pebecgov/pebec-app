// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { createImageUpload } from "novel";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
export function useImageUpload() {
  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const storeImage = useMutation(api.posts.storeImage);
  const onUpload = async (file: File) => {
    try {
      const postUrl = await generateUploadUrl();
      const uploadResult = await fetch(postUrl, {
        method: "POST",
        headers: {
          "Content-Type": file.type
        },
        body: file
      });
      const {
        storageId
      } = await uploadResult.json();
      console.log("✅ Image uploaded successfully:", storageId);
      await storeImage({
        storageId
      });
      return `/api/get-image?storageId=${storageId}`;
    } catch (error) {
      console.error("🚨 Image upload failed:", error);
      toast.error("Image upload failed. Please try again.");
      throw error;
    }
  };
  return {
    onUpload
  };
}
export const uploadFn = createImageUpload({
  onUpload: async file => {
    const {
      onUpload
    } = useImageUpload();
    return await onUpload(file);
  }
});