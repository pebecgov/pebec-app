import { createImageUpload } from "novel";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useImageUpload() {
  const generateUploadUrl = useMutation(api.posts.generateUploadUrl); // ✅ Fetch upload URL from Convex
  const storeImage = useMutation(api.posts.storeImage); // ✅ Store image reference in Convex DB

  const onUpload = async (file: File) => {
    try {
      // ✅ Step 1: Get Convex Upload URL
      const postUrl = await generateUploadUrl();

      // ✅ Step 2: Upload the image to Convex Storage
      const uploadResult = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const { storageId } = await uploadResult.json();
      console.log("✅ Image uploaded successfully:", storageId);

      // ✅ Step 3: Store image reference in Convex database
      await storeImage({ storageId });

      // ✅ Step 4: Return the final image URL
      return `/api/get-image?storageId=${storageId}`;
    } catch (error) {
      console.error("🚨 Image upload failed:", error);
      toast.error("Image upload failed. Please try again.");
      throw error;
    }
  };

  return { onUpload };
}

// ✅ Export upload function
export const uploadFn = createImageUpload({
  onUpload: async (file) => {
    const { onUpload } = useImageUpload(); // ✅ Call our function
    return await onUpload(file);
  },
});
