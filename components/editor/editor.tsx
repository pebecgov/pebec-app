// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Post } from "@/lib/types";
import { EditorCommand, EditorCommandEmpty, EditorCommandItem, EditorCommandList, EditorContent, type JSONContent, EditorRoot } from "novel";
import { ImageResizer, handleCommandNavigation, handleImageDrop, handleImagePaste } from "novel";
import { slashCommand, suggestionItems } from "@/components/editor/slash-command";
import EditorMenu from "@/components/editor/editor-menu";
import { useImageUpload } from "@/components/editor/image-upload";
import { defaultExtensions } from "@/components/editor/extensions";
import { TextButtons } from "@/components/editor/selectors/text-buttons";
import { LinkSelector } from "@/components/editor/selectors/link-selector";
import { NodeSelector } from "@/components/editor/selectors/node-selector";
import { MathSelector } from "@/components/editor/selectors/math-selector";
import { ColorSelector } from "@/components/editor/selectors/color-selector";
import { Separator } from "@/components/ui/separator";
const hljs = require("highlight.js");
const extensions = [...defaultExtensions, slashCommand];
export const defaultEditorContent: JSONContent = {
  type: "doc",
  content: [{
    type: "paragraph",
    content: []
  }]
};
interface EditorProps {
  post?: Post;
  editable?: boolean;
  setContent?: (content: JSONContent) => void;
}
export default function Editor({
  post,
  editable = true,
  setContent
}: EditorProps) {
  const [editorContent, setEditorContent] = useState<JSONContent>(post?.content ? JSON.parse(post.content) : defaultEditorContent);
  useEffect(() => {
    if (!post?.content || post.content.trim() === "") {
      console.warn("🚨 No valid content received for editor! Using default content.");
      return;
    }
    try {
      const parsedContent = JSON.parse(post.content);
      if (JSON.stringify(parsedContent) !== JSON.stringify(editorContent)) {
        console.log("📜 Setting content in editor:", parsedContent);
        setEditorContent(parsedContent);
      }
    } catch (error) {
      console.error("🚨 Failed to parse editor content:", error);
      setEditorContent(defaultEditorContent);
    }
  }, [post?.content]);
  if (!editorContent) return null;
  return <div className="relative w-full max-w-screen-lg">
      <EditorRoot>
        <EditorContent immediatelyRender={false} initialContent={editorContent} extensions={extensions} className={cn("relative w-full max-w-screen-lg bg-background", editable ? "h-[450px] overflow-scroll rounded-md border border-input shadow-sm" : "min-h-[500px]")} editorProps={{
        handleDOMEvents: {
          keydown: (_view, event) => handleCommandNavigation(event)
        },
        handlePaste: (view, event) => handleImagePaste(view, event, useImageUpload),
        handleDrop: (view, event, _slice, moved) => handleImageDrop(view, event, moved, useImageUpload),
        attributes: {
          class: `prose dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full ${editable ? "cursor-text text-sm" : "cursor-default !p-0"}`
        }
      }} onUpdate={({
        editor
      }) => {
        const jsonContent = editor.getJSON();
        console.log("📝 Editor updated content:", jsonContent);
        const imageNodes = jsonContent.content?.filter(node => node.type === "image") || [];
        const coverImageId = imageNodes.length > 0 ? imageNodes[0].attrs?.src : null;
        console.log("🖼 Detected coverImageId:", coverImageId);
        if (setContent) setContent({
          ...jsonContent,
          coverImageId
        });
        setEditorContent(jsonContent);
      }} onCreate={({
        editor
      }) => {
        if (!editable) editor.setEditable(editable);
      }} slotAfter={<ImageResizer />}>
          {}
          <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-muted bg-background px-1 py-2 shadow-md transition-all">
            <EditorCommandEmpty className="px-2 text-muted-foreground">
              No results
            </EditorCommandEmpty>
            <EditorCommandList>
              {suggestionItems.map(item => <EditorCommandItem value={item.title} onCommand={val => item.command?.(val)} className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent aria-selected:bg-accent" key={item.title}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </EditorCommandItem>)}
            </EditorCommandList>
          </EditorCommand>

          {}
          <EditorMenu open={false} onOpenChange={() => {}}>
            <Separator orientation="vertical" />
            <NodeSelector open={false} onOpenChange={() => {}} />
            <Separator orientation="vertical" />
            <LinkSelector open={false} onOpenChange={() => {}} />
            <Separator orientation="vertical" />
            <MathSelector />
            <Separator orientation="vertical" />
            <TextButtons />
            <Separator orientation="vertical" />
            <ColorSelector open={false} onOpenChange={() => {}} />
          </EditorMenu>
        </EditorContent>
      </EditorRoot>
    </div>;
}