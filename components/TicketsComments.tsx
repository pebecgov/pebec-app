// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MoreHorizontal, Trash, Edit, Paperclip } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import FileUploader from "./file-uploader-comments";
export default function TicketComments({
  ticketId
}: {
  ticketId: string;
}) {
  const {
    userId: clerkUserId
  } = useAuth();
  const {
    user
  } = useUser();
  const comments = useQuery(api.ticket_comments.getTicketComments, ticketId ? {
    ticketId: ticketId as Id<"tickets">
  } : "skip");
  const getStorageUrl = useMutation(api.tickets.getStorageUrl);
  const addComment = useMutation(api.ticket_comments.addTicketComment);
  const deleteComment = useMutation(api.ticket_comments.deleteTicketComment);
  const editComment = useMutation(api.ticket_comments.editTicketComment);
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<{
    id: Id<"_storage">;
    name: string;
  }[]>([]);
  const [commentFilesMap, setCommentFilesMap] = useState<Record<string, string[]>>({});
  const commentsRef = useRef<HTMLDivElement | null>(null);
  const handleFileAttach = (storageId: string, fileName: string) => {
    setAttachedFiles(prev => [...prev, {
      id: storageId as Id<"_storage">,
      name: fileName
    }]);
  };
  const handleAddComment = async () => {
    if (commentText.trim() === "" && attachedFiles.length === 0) return;
    await addComment({
      ticketId: ticketId as Id<"tickets">,
      content: commentText,
      fileIds: attachedFiles.map(f => f.id)
    });
    setCommentText("");
    setAttachedFiles([]);
    if (commentsRef.current) {
      commentsRef.current.scrollIntoView({
        behavior: "smooth"
      });
    }
  };
  const handleEditComment = async (commentId: string) => {
    if (editText.trim() === "") return;
    await editComment({
      commentId: commentId as Id<"ticket_comments">,
      content: editText
    });
    setEditingCommentId(null);
    setEditText("");
  };
  function formatDisplay(text?: string) {
    if (!text) return "";
    return text.toLowerCase().split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  }
  useEffect(() => {
    const fetchAllFileUrls = async () => {
      const map: Record<string, string[]> = {};
      await Promise.all(comments?.map(async comment => {
        if (!comment.fileIds?.length) return;
        const urls = await Promise.all(comment.fileIds.map(async fileId => {
          const url = await getStorageUrl({
            storageId: fileId
          });
          return url || "";
        }));
        map[comment._id] = urls.filter(Boolean);
      }) || []);
      setCommentFilesMap(map);
    };
    fetchAllFileUrls();
  }, [comments, getStorageUrl]);
  return <div className="w-full bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-semibold mb-4">Updates ({comments?.length || 0})</h3>

      <div className="flex flex-col gap-3 mb-6">
  <div className="relative">
    <Textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Write a comment..." rows={3} className="resize-none border p-2 rounded-md pr-10" />
    <div className="absolute top-2 right-2">
      <FileUploader setFileId={handleFileAttach} />
    </div>
  </div>

  {attachedFiles.length > 0 && <div className="mt-2 text-sm text-gray-700 border rounded-md p-3 bg-gray-50">
    <p className="font-medium mb-2">Attached Files:</p>
    <ul className="space-y-1">
      {attachedFiles.map((file, idx) => <li key={idx} className="flex items-center justify-between text-sm text-gray-800 bg-white px-3 py-1 rounded border">
          <span className="truncate">{file.name}</span>
          <button onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))} className="ml-2 text-red-500 hover:text-red-700 text-xs" aria-label="Remove file">
            ✕
          </button>
        </li>)}
    </ul>
  </div>}


      <Button onClick={handleAddComment} className="w-fit mt-2">
  Post
      </Button>
    </div>


      <ul className="space-y-6">
        {comments?.map(comment => {
        const isOwner = clerkUserId === comment.author?.clerkUserId;
        const fileUrls = commentFilesMap[comment._id] || [];
        return <li key={comment._id} className="pb-4 border-b last:border-b-0">
              <div className="flex items-start gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={comment.author?.imageUrl} />
                  <AvatarFallback>{comment.author?.firstName?.charAt(0)}</AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{comment.author?.firstName || "Anonymous"}</p>
                          {comment.author?.role && <span className="inline-block px-2 py-0.5 bg-green-600 text-white text-xs rounded-full capitalize">
                              {formatDisplay(comment.author.role)}
                            </span>}
                        </div>
                        {comment.author?.jobTitle && <p className="text-xs text-gray-500 mt-0.5">{formatDisplay(comment.author.jobTitle)}</p>}
                      </div>
                      <span className="text-xs text-gray-500">
                        {format(new Date(comment.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>

                    {}
                  </div>

                  {editingCommentId === comment._id ? <div className="mt-2">
                      <Textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2} className="resize-none border p-2 rounded-md" />
                      <div className="flex gap-2 mt-2">
                        <Button onClick={() => handleEditComment(comment._id)} size="sm">Save</Button>
                        <Button onClick={() => setEditingCommentId(null)} variant="outline" size="sm">Cancel</Button>
                      </div>
                    </div> : <p className="text-gray-700 mt-1">{comment.content}</p>}

                  {fileUrls.length > 0 && <div className="mt-2 text-sm text-blue-600 space-y-1">
                      {fileUrls.map((url, idx) => <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline">
                          <Paperclip className="w-4 h-4" /> View Attachment {idx + 1}
                        </a>)}
                    </div>}
                </div>
              </div>
            </li>;
      })}
      </ul>

      <div ref={commentsRef} />
    </div>;
}