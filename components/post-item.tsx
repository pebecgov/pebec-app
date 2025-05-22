// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Post } from "@/lib/types";
import { combineName, formatDate } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkle, ThumbsUp, Edit, Trash } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
type Props = {
  post: Post;
  showComments?: boolean;
  isNew?: boolean;
};
export default function PostItem({
  post,
  showComments = false,
  isNew = false
}: Props) {
  const {
    userId
  } = useAuth();
  const router = useRouter();
  const deletePost = useMutation(api.posts.deletePost);
  const comments = useQuery(api.posts.getCommentsByPost, post ? {
    postId: post._id as Id<"posts">
  } : "skip");
  const currentUser = useQuery(api.users.getCurrentUsers);
  const isAuthor = currentUser?._id === post.authorId || currentUser?.role === "admin";
  const commentCount = comments?.length ?? 0;
  const handleEditClick = () => router.push(`/edit/${post.slug}`);
  return <li className="relative mb-6">
      <Link href={`/posts/${post.slug}`} className="block group">
        <div className="bg-white dark:bg-gray-900 shadow-md rounded-lg p-5 transition hover:shadow-lg border border-gray-100 dark:border-gray-800">
          {}
          {isNew && <span className="absolute top-3 right-3 bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded shadow">
              NEW
            </span>}

          {}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={post.author?.imageUrl} alt={combineName(post.author)} />
                <AvatarFallback>{post.author?.firstName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-sm font-bold">{combineName(post.author)}</h2>
                <p className="text-xs text-gray-500">{formatDate(post._creationTime)}</p>
              </div>
            </div>

            {isAuthor && <div className="flex gap-3 text-sm">
                <button onClick={handleEditClick} className="text-blue-600 hover:underline flex items-center gap-1">
                  <Edit className="w-4 h-4" />
                  Edit
                </button>

                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-red-600 hover:underline flex items-center gap-1">
                      <Trash className="w-4 h-4" />
                      Delete
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogTitle>Delete Post</DialogTitle>
                    <p>This action cannot be undone. Are you sure?</p>
                    <DialogFooter className="mt-4">
                      <Button variant="outline">Cancel</Button>
                      <Button variant="destructive" onClick={async () => await deletePost({
                    slug: post.slug
                  })}>
                        Confirm
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>}
          </div>

          {}
          <div className="mt-5 flex flex-col sm:flex-row gap-5">
            {}
            <div className="flex-1 space-y-2">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {post.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                {post.excerpt}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-gray-500 text-sm mt-4">
                <div className="flex items-center gap-2">
                  <Sparkle className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span>{formatDate(post._creationTime)}</span>
                </div>
                <Separator orientation="vertical" className="h-4 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4" />
                  <span>{post.likes}</span>
                </div>

                {showComments && <div className="flex items-center gap-2">
                    <Separator orientation="vertical" className="h-4 hidden sm:block" />
                    <span className="text-sm">{commentCount} comments</span>
                  </div>}
              </div>
            </div>

            {}
            {post.coverImageUrl && <div className="sm:w-56 w-full h-36 flex items-center justify-center border rounded-md overflow-hidden bg-gray-100">
    <Image src={post.coverImageUrl} alt={post.title} width={220} height={160} className="object-contain w-full h-full" />
  </div>}
          </div>
        </div>
      </Link>
    </li>;
}