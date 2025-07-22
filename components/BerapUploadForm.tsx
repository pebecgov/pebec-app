'use client';

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState } from "react";

type FormData = {
  title: string;
  description?: string;
};

export function BerapUploadForm() {
  const generateUploadUrl = useMutation(api.tickets.generateUploadUrl);
  const uploadBerapDoc = useMutation(api.berapDocuments.uploadBerapDocument);
  const { register, handleSubmit, reset } = useForm<FormData>();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const onSubmit = async (data: FormData) => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    try {
      setIsUploading(true);
      
      // Step 1: Get upload URL
      const uploadUrl = await generateUploadUrl();
      
      // Step 2: Upload file
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await uploadResponse.json();

      // Step 3: Save document
      await uploadBerapDoc({
        title: data.title,
        description: data.description,
        storageId,
        fileName: file.name,
      });

      toast.success("Document uploaded successfully!");
      reset();
      setFile(null);
    } catch (error) {
      console.error(error);
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 border rounded-lg">
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input 
          id="title" 
          {...register("title", { required: true })}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Input 
          id="description" 
          {...register("description")}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="file">Document *</Label>
        <Input
          id="file"
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          accept=".pdf,.doc,.docx,.xls,.xlsx"
          className="mt-1"
          disabled={isUploading}
        />
      </div>
      <Button type="submit" disabled={isUploading}>
        {isUploading ? "Uploading..." : "Upload Document"}
      </Button>
    </form>
  );
} 