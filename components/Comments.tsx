// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash, Edit, Check, X } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
export default function Comments({
  postId
}: {
  postId: string;
}) {
  const {
    toast
  } = useToast();
  const {
    userId: clerkUserId
  } = useAuth();
  const convexUser = useQuery(api.users.getUserByClerkId, clerkUserId ? {
    clerkUserId
  } : "skip");
  const comments = useQuery(api.posts.getCommentsByPost, {
    postId: postId as Id<"posts">
  });
  const addComment = useMutation(api.posts.addComment);
  const editComment = useMutation(api.posts.editComment);
  const deleteComment = useMutation(api.posts.deleteComment);
  const [commentText, setCommentText] = useState("");
  const [guestName, setGuestName] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const commentsRef = useRef<HTMLDivElement | null>(null);
  const handleAddComment = async () => {
    if (commentText.trim() === "") return;
    try {
      if (clerkUserId) {
        await addComment({
          postId: postId as Id<"posts">,
          content: commentText
        });
      } else if (guestName.trim() !== "") {
        await addComment({
          postId: postId as Id<"posts">,
          content: commentText,
          guestName
        });
      } else {
        toast({
          title: "Error",
          description: "Please enter your name to comment as a guest.",
          variant: "destructive"
        });
        return;
      }
      setCommentText("");
      setGuestName("");
      toast({
        title: "Success!",
        description: "Comment posted successfully!"
      });
      if (commentsRef.current) {
        commentsRef.current.scrollIntoView({
          behavior: "smooth"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to post comment.",
        variant: "destructive"
      });
    }
  };
  const handleEditComment = async (commentId: string) => {
    if (!editedContent.trim()) return;
    try {
      await editComment({
        commentId: commentId as Id<"comments">,
        content: editedContent
      });
      setEditingComment(null);
      toast({
        title: "Success!",
        description: "Comment updated successfully!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update comment.",
        variant: "destructive"
      });
    }
  };
  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment({
        commentId: commentId as Id<"comments">
      });
      toast({
        title: "Deleted",
        description: "Comment deleted successfully!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete comment.",
        variant: "destructive"
      });
    }
  };
  return <div className="mt-10 max-w-2xl mx-auto">
      <h3 className="text-xl font-semibold mb-4">Comments</h3>

      {}
      <div className="bg-white shadow-md rounded-lg p-4 mb-6">
        {clerkUserId ? <Textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Write a comment..." rows={3} className="resize-none border border-gray-300 rounded-md p-3" /> : <>
            <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Your Name" className="w-full border border-gray-300 rounded-md p-2 mb-2" />
            <Textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Write a comment..." rows={3} className="resize-none border border-gray-300 rounded-md p-3" />
          </>}
        <Button onClick={handleAddComment} className="mt-3 bg-green-600 text-white hover:bg-green-700">
          Post Comment
        </Button>
      </div>

      {}
      <ul className="space-y-4">
        {comments?.map(comment => {
        const isCommentAuthor = clerkUserId && convexUser?._id === comment.authorId;
        const isGuestComment = !comment.authorId;
        return <li key={comment._id} className="bg-gray-50 p-4 rounded-lg shadow-sm flex gap-4">
              {}
              <Avatar className="w-10 h-10">
                <AvatarImage src={comment.author?.imageUrl} />
                <AvatarFallback className="bg-gray-300 text-gray-600">
                  {comment.author?.firstName?.charAt(0) || comment.guestName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>

              {}
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {comment.author?.firstName || comment.guestName}{" "}
                  <span className="text-gray-400 text-xs">
                    • {formatDistanceToNow(comment._creationTime, {
                  addSuffix: true
                })}
                  </span>
                </p>

                {}
                {editingComment === comment._id ? <div className="mt-2 flex gap-2">
                    <Textarea value={editedContent} onChange={e => setEditedContent(e.target.value)} rows={2} className="resize-none border p-2 rounded-md w-full" />
                    <Button onClick={() => handleEditComment(comment._id)} className="text-green-600">
                      <Check className="w-5 h-5" />
                    </Button>
                    <Button onClick={() => setEditingComment(null)} className="text-red-600">
                      <X className="w-5 h-5" />
                    </Button>
                  </div> : <p className="text-sm text-gray-700 mt-1">{comment.content}</p>}
              </div>

              {}
              {isCommentAuthor && !isGuestComment && <div className="flex gap-3">
                  <button onClick={() => {
              setEditingComment(comment._id);
              setEditedContent(comment.content);
            }} className="text-blue-500 hover:text-blue-700">
                    <Edit className="w-4 h-4" />
                  </button>

                  <button onClick={() => handleDeleteComment(comment._id)} className="text-red-500 hover:text-red-700">
                    <Trash className="w-4 h-4" />
                  </button>
                </div>}
            </li>;
      })}
      </ul>

      <div ref={commentsRef} />

      {}
      <Toaster />
    </div>;
}