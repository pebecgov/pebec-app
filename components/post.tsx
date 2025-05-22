// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { combineName, formatDate } from "@/lib/utils";
import Editor from "@/components/editor/editor";
import { Spinner } from "@/components/ui/spinner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThumbsUp, Edit, Trash, ArrowLeft } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Id } from "@/convex/_generated/dataModel";
export default function Post({
  slug
}: {
  slug: string;
}) {
  const router = useRouter();
  const post = useQuery(api.posts.getPostBySlug, {
    slug
  });
  const likePost = useMutation(api.posts.likePost);
  const deletePost = useMutation(api.posts.deletePost);
  const {
    userId: clerkUserId
  } = useAuth();
  const safeClerkUserId = clerkUserId ?? null;
  const convexUser = useQuery(api.users.getUserByClerkId, safeClerkUserId ? {
    clerkUserId: safeClerkUserId
  } : "skip");
  useEffect(() => {
    if (post === null) {
      router.push("/portal");
    }
  }, [post, router]);
  const [open, setOpen] = useState(false);
  const isAuthor = convexUser ? convexUser._id === post?.authorId : false;
  const safePostId = post?._id as Id<"posts">;
  if (!post) {
    return <section className="pb-24 pt-20 sm:pt-25">
        <div className="container flex max-w-3xl items-center justify-center">
          <Spinner size="lg" />
        </div>
      </section>;
  }
  return <section className="pb-12 pt-20 bg-white dark:bg-black min-h-screen">
      <div className="container max-w-3xl mx-auto px-4 sm:px-0">
        {}
        <button onClick={() => router.push("/portal")} className="mb-8 flex items-center text-sm text-gray-500 hover:text-gray-800 transition-all">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Posts
        </button>

        {}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight mb-2">
          {post.title}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-base mb-6">
          {post.excerpt}
        </p>

        {}
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="w-12 h-12">
            <AvatarImage src={post.author?.imageUrl} alt={combineName(post.author)} />
            <AvatarFallback>{post.author?.firstName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-gray-800 dark:text-white">
              {combineName(post.author)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(post._creationTime)}
            </p>
          </div>
        </div>

        {}
        {post.coverImageUrl && <div className="w-full mb-8 rounded-md overflow-hidden border">
            <img src={post.coverImageUrl} alt={post.title} className="w-full max-h-[500px] object-contain bg-white" />
          </div>}

        {}
        <div className="flex justify-between items-center border-y py-4 mb-6 text-gray-600 dark:text-gray-300">
          <button onClick={() => likePost({
          slug: post.slug
        })} className="flex items-center gap-2 hover:text-green-700">
            <ThumbsUp className="w-5 h-5" strokeWidth={1.5} />
            <span>{post.likes}</span>
          </button>

          {isAuthor && <div className="flex gap-4">
              <button onClick={() => router.push(`/edit/${post.slug}`)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm">
                <Edit className="size-4" />
                Edit
              </button>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <button className="text-red-600 hover:text-red-800 flex items-center gap-1 text-sm">
                    <Trash className="size-4" />
                    Delete
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogTitle>Delete This Post?</DialogTitle>
                  <p className="text-sm text-gray-600">
                    This action cannot be undone. Are you sure?
                  </p>
                  <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={async () => {
                  await deletePost({
                    slug: post.slug
                  });
                  setOpen(false);
                  router.push("/portal");
                }}>
                      Delete
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>}
        </div>

        {}
        <div className="prose dark:prose-invert max-w-none">
          <Editor post={post} editable={false} />
        </div>

        {}
        {}
      </div>
    </section>;
}