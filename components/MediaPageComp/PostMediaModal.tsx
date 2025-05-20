"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { Id } from "@/convex/_generated/dataModel";


export function PostMediaModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [categoryId, setCategoryId] = useState<Id<"mediaCategories"> | "">("");
  const [videoLinks, setVideoLinks] = useState<string[]>([""]);
  const [pictures, setPictures] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const generateUploadUrl = useMutation(api.tickets.generateUploadUrl);
  const createMedia = useMutation(api.media.createMediaPost);
  const categories = useQuery(api.media.getCategories) || [];

  const resetForm = () => {
    setTitle("");
    setDesc("");
    setCategoryId("");
    setPictures([]);
    setPreviewUrls([]);
    setVideoLinks([""]);
    setIsUploading(false);
  };
  
  const { user } = useUser();
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPictures(files);
    setPreviewUrls(files.map((f) => URL.createObjectURL(f)));
  };

  const handleAddVideo = () => {
    setVideoLinks([...videoLinks, ""]);
  };

  const handleRemoveVideo = (index: number) => {
    const updated = [...videoLinks];
    updated.splice(index, 1);
    setVideoLinks(updated);
  };
  

  const handlePost = async () => {
    if (!title || !categoryId || pictures.length === 0 || !convexUser) {
      return toast.error("Please fill in all required fields.");
    }

    try {
      setIsUploading(true);

      const uploadedIds: Id<"_storage">[] = [];

      for (const pic of pictures) {
        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": pic.type },
          body: pic,
        });
        const { storageId } = await res.json();
        uploadedIds.push(storageId as Id<"_storage">);
      }

      await createMedia({
        userId: convexUser._id,
        title,
        description: desc,
        categoryId: categoryId as Id<"mediaCategories">,
        pictureIds: uploadedIds,
        videoUrls: videoLinks.filter(Boolean),
      });

      toast.success("Media post created!");

      // Reset form
      setTitle("");
      setDesc("");
      setPictures([]);
      setPreviewUrls([]);
      setVideoLinks([""]);
      setCategoryId("");

      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to post media");
    } finally {
      setIsUploading(false);
    }
  };

  return (
<Dialog
  open={open}
  onOpenChange={(isOpen) => {
    if (!isOpen) {
      resetForm();
      onClose(); // still call the parent's onClose
    }
  }}
>
<DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Post Media</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto pr-2" style={{ maxHeight: '70vh' }}>

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
        />
        <Textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Write your description here..."
        />

        <select
          className="border rounded px-3 py-2"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value as Id<"mediaCategories">)}
        >
          <option value="">Select Category</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat._id}>
              {cat.name}
            </option>
          ))}
        </select>

        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageSelect}
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {previewUrls.map((src, idx) => (
            <Image
              key={idx}
              src={src}
              alt={`preview-${idx}`}
              width={100}
              height={100}
              className="rounded border"
            />
          ))}
        </div>

        {videoLinks.map((link, idx) => (
  <div key={idx} className="flex items-center gap-2 mt-2">
    <Input
      value={link}
      onChange={(e) => {
        const updated = [...videoLinks];
        updated[idx] = e.target.value;
        setVideoLinks(updated);
      }}
      placeholder="Video URL (YouTube, Vimeo)"
      className="flex-1"
    />
    <Button
      size="sm"
      variant="destructive"
      onClick={() => handleRemoveVideo(idx)}
      className="h-10"
    >
      Delete
    </Button>
  </div>
))}


        <Button
          size="sm"
          variant="ghost"
          onClick={handleAddVideo}
          className="mt-1"
        >
          + Add Video Link
        </Button>

        </div>


        <DialogFooter className="mt-4 flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handlePost} disabled={isUploading}>
            {isUploading ? "Posting..." : "Post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
