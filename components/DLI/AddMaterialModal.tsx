// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import FileUploader from "../file-uploader-comments";
import { Id } from "@/convex/_generated/dataModel";
interface AddMaterialModalProps {
  open: boolean;
  onClose: () => void;
  dliOptions: {
    id: Id<"dli">;
    label: string;
  }[];
  berapOptions: {
    id: Id<"berap">;
    label: string;
  }[];
  onSave: (data: {
    parentId: Id<"dli"> | Id<"berap">;
    parentType: "dli" | "berap";
    name: string;
    type: "note" | "video" | "document";
    fileId?: Id<"_storage">;
    link?: string;
    content?: string;
  }) => void;
}
export function AddMaterialModal({
  open,
  onClose,
  dliOptions,
  berapOptions,
  onSave
}: AddMaterialModalProps) {
  const [parentType, setParentType] = useState<"dli" | "berap">("dli");
  const [parentId, setParentId] = useState<string>("");
  const [type, setType] = useState<"note" | "video" | "document">("note");
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [fileId, setFileId] = useState<Id<"_storage"> | undefined>(undefined);
  const handleSave = () => {
    if (!parentId || !name) return;
    onSave({
      parentId: parentId as Id<"dli"> | Id<"berap">,
      parentType,
      name,
      type,
      fileId,
      link: link || undefined,
      content: noteContent || undefined
    });
    setParentType("dli");
    setParentId("");
    setType("note");
    setName("");
    setLink("");
    setNoteContent("");
    setFileId(undefined);
    onClose();
  };
  const parentOptions = parentType === "dli" ? dliOptions : berapOptions;
  return <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Material</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Label>Material Name</Label>
          <Input placeholder="e.g. SABER Q1 Report" value={name} onChange={e => setName(e.target.value)} />

          <div className="flex gap-2">
            <div className="w-1/2">
              <Label>Attach to</Label>
              <select className="w-full border p-2 rounded" value={parentType} onChange={e => setParentType(e.target.value as "dli" | "berap")}>
                <option value="dli">DLI</option>
                <option value="berap">BERAP</option>
              </select>
            </div>

            <div className="w-1/2">
              <Label>Item</Label>
              <select className="w-full border p-2 rounded" value={parentId} onChange={e => setParentId(e.target.value)}>
                <option value="">Select</option>
                {parentOptions.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <Label>Type</Label>
            <select className="w-full border p-2 rounded" value={type} onChange={e => setType(e.target.value as "note" | "video" | "document")}>
              <option value="note">Note</option>
              <option value="video">Video</option>
              <option value="document">Document</option>
            </select>
          </div>

          {type === "note" && <>
              <Label>Note Content</Label>
              <Textarea rows={4} value={noteContent} onChange={e => setNoteContent(e.target.value)} />
            </>}

          {type === "video" && <>
              <Label>Video URL</Label>
              <Input placeholder="https://..." value={link} onChange={e => setLink(e.target.value)} />
            </>}

          {type === "document" && <FileUploader setFileId={id => setFileId(id as Id<"_storage">)} />}
        </div>

        <DialogFooter className="mt-4">
          <Button onClick={handleSave} disabled={!parentId || !name}>Save Material</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>;
}