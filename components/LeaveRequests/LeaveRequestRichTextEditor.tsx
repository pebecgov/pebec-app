"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Props = {
  value?: string;
  onChange: (html: string) => void;
  label?: string;
};

export function LeaveRequestRichTextEditor({ value, onChange, label = "Message" }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value ?? "",
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== undefined && editor.getHTML() !== value) {
      editor.commands.setContent(value, false);
    }
  }, [editor, value]);

  return (
    <div>
      <Label>{label}</Label>
      {editor && (
        <div className="mb-2 mt-1 flex flex-wrap gap-1">
          <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().toggleBold().run()}>
            Bold
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()}>
            Italic
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            Bullet
          </Button>
        </div>
      )}
      <div className="min-h-[120px] rounded border p-2">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
