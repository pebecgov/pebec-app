// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import ListItem from "@tiptap/extension-list-item";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { Bold, Italic, Strikethrough, Link as LinkIcon, List, ListOrdered, PaintBucket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import Heading from "@tiptap/extension-heading";
import { DialogClose } from "@radix-ui/react-dialog";
export default function RichTextEditor({
  value,
  onChange
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [linkUrl, setLinkUrl] = useState("");
  const [color, setColor] = useState("#000000");
  const editor = useEditor({
    extensions: [StarterKit.configure({
      heading: false
    }), Heading.configure({
      levels: [1, 2, 3]
    }), Link.configure({
      openOnClick: true
    }), Image, ListItem, TextStyle, Color.configure({
      types: ["textStyle"]
    }), Placeholder.configure({
      placeholder: "Please describe in detail, including locations, relevant names, or anything that might help us process your report quicker.",
      emptyEditorClass: "editor-placeholder"
    })],
    content: value,
    onUpdate: ({
      editor
    }) => {
      onChange(editor.getHTML());
    }
  });
  if (!editor) return null;
  return <div className="border rounded-md p-2 bg-white w-full">
      <div className="flex flex-wrap gap-2 mb-2 border-b pb-2">
        <Button size="sm" variant="outline" onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="w-4 h-4" />
        </Button>

        <Dialog>
  <DialogTrigger asChild>
    <Button size="sm" variant="outline">
      <LinkIcon className="w-4 h-4" />
    </Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Insert Link</DialogTitle>
    </DialogHeader>
    <Input type="url" placeholder="Enter link URL" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} />
    {}
    <DialogClose asChild>
      <Button onClick={() => {
              if (linkUrl) {
                editor.chain().focus().setLink({
                  href: linkUrl
                }).run();
                setLinkUrl("");
              }
            }}>
        Insert Link
      </Button>
    </DialogClose>
  </DialogContent>
      </Dialog>

        <input type="color" value={color} onChange={e => {
        setColor(e.target.value);
        editor.chain().focus().setColor(e.target.value).run();
      }} className="w-8 h-8 border rounded-md" />
      </div>

      {}
      <EditorContent editor={editor} className="w-full min-h-[200px] p-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 prose prose-sm [&_a]:underline [&_a]:text-blue-600" />

    </div>;
}