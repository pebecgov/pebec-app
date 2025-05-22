// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
interface AddBERAPModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    year: number;
    title: string;
    description: string;
    privateSectorNotes?: string;
    progressReport?: string;
    approvedByExco: boolean;
  }) => void;
}
export function AddBERAPModal({
  open,
  onClose,
  onSave
}: AddBERAPModalProps) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [report, setReport] = useState("");
  const [approved, setApproved] = useState(false);
  const editor = useEditor({
    extensions: [StarterKit],
    content: ""
  });
  const handleSave = () => {
    const htmlDescription = editor?.getHTML() || "";
    onSave({
      year,
      title,
      description: htmlDescription,
      approvedByExco: approved,
      privateSectorNotes: notes || undefined,
      progressReport: report || undefined
    });
  };
  return <Dialog open={open} onOpenChange={onClose}>
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">        <DialogHeader>
          <DialogTitle>Add BERAP Entry</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input placeholder="Year" type="number" value={year} onChange={e => setYear(Number(e.target.value))} />
          <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
      <div>
  <Label>Description</Label>
  {editor && <div className="mb-2 flex flex-wrap gap-1">
      <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().toggleBold().run()}>
        Bold
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()}>
        Italic
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().toggleHeading({
              level: 1
            }).run()}>
        H1
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().toggleHeading({
              level: 2
            }).run()}>
        H2
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()}>
        Bullet
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().setParagraph().run()}>
        Normal
      </Button>
    </div>}
  <div className="border rounded p-2 min-h-[120px]">
    <EditorContent editor={editor} />
  </div>
        </div>

          <Textarea placeholder="Private Sector Notes (optional)" className="resize-y" value={notes} onChange={e => setNotes(e.target.value)} />
          <Textarea placeholder="Progress Report (optional)" className="resize-y" value={report} onChange={e => setReport(e.target.value)} />
          <div className="flex items-center space-x-3">
            <Switch checked={approved} onCheckedChange={setApproved} />
            <Label>Approved by Exco?</Label>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button onClick={handleSave}>Save BERAP</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>;
}