"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

type MediaItem = {
  _id: Id<"media">;
  title: string;
  description: string;
  categoryId: Id<"mediaCategories">;
  eventDate?: number;
  videoUrls?: string[];
  isSaber?: boolean;
};

export function EditMediaModal({
  open,
  onClose,
  mediaItem,
}: {
  open: boolean;
  onClose: () => void;
  mediaItem: MediaItem | null;
}) {
  const categories = useQuery(api.media.getCategories) || [];
  const updateMediaPost = useMutation(api.media.updateMediaPost);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<Id<"mediaCategories"> | "">("");
  const [eventDate, setEventDate] = useState("");
  const [videoLinks, setVideoLinks] = useState<string[]>([""]);
  const [isSaber, setIsSaber] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!mediaItem) return;
    setTitle(mediaItem.title);
    setDescription(mediaItem.description);
    setCategoryId(mediaItem.categoryId);
    setEventDate(mediaItem.eventDate ? new Date(mediaItem.eventDate).toISOString().split("T")[0] : "");
    setVideoLinks(mediaItem.videoUrls && mediaItem.videoUrls.length > 0 ? mediaItem.videoUrls : [""]);
    setIsSaber(Boolean(mediaItem.isSaber));
  }, [mediaItem]);

  const handleSave = async () => {
    if (!mediaItem || !title.trim() || !categoryId || !eventDate) {
      toast.error("Please fill in the required fields.");
      return;
    }

    try {
      setIsSaving(true);
      await updateMediaPost({
        mediaId: mediaItem._id,
        title: title.trim(),
        description: description.trim(),
        categoryId: categoryId as Id<"mediaCategories">,
        eventDate: new Date(eventDate).getTime(),
        videoUrls: videoLinks.filter(Boolean),
        isSaber,
      });
      toast.success("Media post updated.");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update media post.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Media Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />

          <select
            className="border rounded px-3 py-2 w-full"
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

          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              Date of Event <span className="text-red-500">*</span>
            </p>
            <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isSaber}
              onChange={(e) => setIsSaber(e.target.checked)}
              className="h-4 w-4"
            />
            Mark this gallery item as SABER-related
          </label>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Video URLs</p>
            {videoLinks.map((link, idx) => (
              <Input
                key={idx}
                value={link}
                onChange={(e) => {
                  const updated = [...videoLinks];
                  updated[idx] = e.target.value;
                  setVideoLinks(updated);
                }}
                placeholder="Video URL"
              />
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setVideoLinks((prev) => [...prev, ""])}
            >
              + Add Video Link
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
