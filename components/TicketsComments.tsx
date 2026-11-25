// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MoreHorizontal, Trash, Edit, Paperclip, X } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import FileUploader from "./file-uploader-comments";
import { formatRole } from "@/lib/formatters";

export default function TicketComments({
  ticketId,
  readOnly = false
}: {
  ticketId: string;
  readOnly?: boolean;
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
  const ticket = useQuery(api.tickets.getTicketById, ticketId ? {
    ticketId: ticketId as Id<"tickets">
  } : "skip");
  const isWhatsAppTicket = Boolean(ticket?.whatsappPhone);
  const getStorageUrl = useMutation(api.tickets.getStorageUrl);
  const addComment = useAction(api.whatsapp.cloud.addTicketCommentAndNotify);
  const deleteComment = useMutation(api.ticket_comments.deleteTicketComment);
  const editComment = useMutation(api.ticket_comments.editTicketComment);
  const [commentText, setCommentText] = useState("");
  /** Default ON for WhatsApp tickets so "ask for info" reaches the citizen. */
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(false);
  const [notifyDefaultApplied, setNotifyDefaultApplied] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<{
    id: Id<"_storage">;
    name: string;
  }[]>([]);
  const [uploadKey, setUploadKey] = useState(0);
  const [isPosting, setIsPosting] = useState(false);
  const [commentFilesMap, setCommentFilesMap] = useState<Record<string, string[]>>({});
  const commentsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ticket === undefined || notifyDefaultApplied) return;
    setNotifyWhatsApp(Boolean(ticket?.whatsappPhone));
    setNotifyDefaultApplied(true);
  }, [ticket, notifyDefaultApplied]);
  const handleFileAttach = (storageId: string, fileName: string) => {
    setAttachedFiles(prev => [...prev, {
      id: storageId as Id<"_storage">,
      name: fileName
    }]);
  };
  const handleAddComment = async () => {
    if (commentText.trim() === "" && attachedFiles.length === 0) return;
    try {
      setIsPosting(true);
      const shouldNotify = notifyWhatsApp;
      const result = await addComment({
        ticketId: ticketId as Id<"tickets">,
        content: commentText,
        fileIds: attachedFiles.map((f) => f.id),
        notifyWhatsApp: shouldNotify,
      });
      setCommentText("");
      setNotifyWhatsApp(isWhatsAppTicket);
      setAttachedFiles([]);
      setUploadKey((k) => k + 1);
      if (result.whatsappSent) {
        toast.success(
          result.whatsappChannel === "template"
            ? "Update posted. WhatsApp template sent to citizen."
            : "Update posted. WhatsApp sent to citizen.",
        );
      } else if (result.whatsappError) {
        toast.warning(
          `Update posted, but WhatsApp failed: ${result.whatsappError}`,
        );
      } else if (shouldNotify) {
        toast.success("Update posted (WhatsApp not sent for this ticket).");
      } else {
        toast.success("Update posted. Citizen sees it on Follow Up; use Internal Notes for private chatter.");
      }
      if (commentsRef.current) {
        commentsRef.current.scrollIntoView({ behavior: "smooth" });
      }
    } catch (error) {
      console.error("Failed to post comment:", error);
      toast.error("Failed to post update. Please try again.");
    } finally {
      setIsPosting(false);
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
    <h3 className="text-xl font-semibold mb-4">Citizen updates ({comments?.length || 0})</h3>
    <p className="mb-4 text-sm text-gray-500">
      {isWhatsAppTicket
        ? "This complaint came from WhatsApp. Asking for info will message the citizen when Notify WhatsApp is checked (on by default)."
        : "These updates show when the citizen opens their ticket. For private staff chatter, use Internal Notes."}
    </p>

    {!readOnly && (
      <div className="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <Textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder={
            isWhatsAppTicket
              ? "Ask the citizen for information or send an update..."
              : "Write a citizen-facing update..."
          }
          rows={4}
          className="min-h-[110px] resize-none rounded-none border-0 border-b border-gray-200 px-4 py-3 shadow-none focus-visible:ring-0"
        />

        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3">
            {attachedFiles.map((file, idx) => (
              <div
                key={file.id}
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700"
              >
                <Paperclip className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-gray-400 hover:text-red-600"
                  aria-label="Remove attachment"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
          {isWhatsAppTicket && (
            <label className="flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyWhatsApp}
                onChange={(e) => setNotifyWhatsApp(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300"
              />
              <span>
                <span className="font-semibold">Notify citizen on WhatsApp</span>
                <span className="block text-xs text-sky-800">
                  Keep this checked to ask for info / send the update to their phone. Uncheck only for a silent dashboard note.
                </span>
              </span>
            </label>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <FileUploader key={uploadKey} setFileId={handleFileAttach} compact resetAfterUpload />
            <Button
              onClick={handleAddComment}
              disabled={isPosting || (commentText.trim() === "" && attachedFiles.length === 0)}
              className="w-full sm:w-auto"
            >
              {isPosting
                ? "Posting..."
                : isWhatsAppTicket && notifyWhatsApp
                  ? "Ask / send on WhatsApp"
                  : "Post update"}
            </Button>
          </div>
        </div>
      </div>
    )}


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
                      {comment.author?.role && (
                        <span className="inline-block px-2 py-0.5 bg-green-600 text-white text-xs rounded-full capitalize">
                          {formatRole(comment.author.role === "mda" ? "report gov agent" : comment.author.role)}
                        </span>
                      )}
                      {comment.notifyWhatsApp && (
                        <span className="inline-block px-2 py-0.5 bg-sky-600 text-white text-xs rounded-full">
                          WhatsApp
                        </span>
                      )}
                    </div>
                    {comment.author?.jobTitle && <p className="text-xs text-gray-500 mt-0.5">{formatDisplay(comment.author.jobTitle)}</p>}
                  </div>
                  <span className="text-xs text-gray-500">
                    {format(new Date(comment.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>

                { }
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