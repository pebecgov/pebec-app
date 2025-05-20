"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const POSTS_PER_PAGE = 5;

export default function AdminPostsPage() {
  const posts = useQuery(api.posts.getPosts);
  const deletePost = useMutation(api.posts.deletePost);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);

  const filteredPosts = useMemo(() => {
    return posts
      ?.filter((post) =>
        `${post.title} ${post.slug}`.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => b._creationTime - a._creationTime) ?? [];
  }, [posts, search]);

  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = filteredPosts.slice(
    (page - 1) * POSTS_PER_PAGE,
    page * POSTS_PER_PAGE
  );

  const handleDelete = async () => {
    if (!deleteSlug) return;
    try {
      await deletePost({ slug: deleteSlug });
      toast.success("✅ Post deleted.");
    } catch (err) {
      toast.error("❌ Failed to delete post.");
      console.error(err);
    } finally {
      setDeleteSlug(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-green-700">Manage Posts</h1>
        <Input
          placeholder="Search by title or slug..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-64"
        />
      </div>

      {filteredPosts.length === 0 ? (
        <p className="text-gray-500 mt-10 text-center">No posts found.</p>
      ) : (
        <div className="grid gap-6">
          {paginatedPosts.map((post) => (
            <div
              key={post._id}
              className="p-4 border rounded shadow-sm bg-white flex justify-between items-start"
            >
              <div>
                <h2 className="text-xl font-semibold">{post.title}</h2>
                <p className="text-sm text-gray-600 mb-1">
                  {post.excerpt.slice(0, 100)}...
                </p>
                <p className="text-xs text-gray-400">
                  By {post.author.firstName} · Slug: <code>{post.slug}</code>
                </p>
              </div>

              <div className="flex gap-2">
                <Link href={`/edit/${post.slug}`}>
                  <Button variant="outline">Edit</Button>
                </Link>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="destructive"
                      onClick={() => setDeleteSlug(post.slug)}
                    >
                      Delete
                    </Button>
                  </DialogTrigger>

                  {deleteSlug === post.slug && (
                    <DialogContent onEscapeKeyDown={() => setDeleteSlug(null)}>
                      <DialogHeader>
                        <DialogTitle>Delete Post</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to delete this post? This action
                          cannot be undone.
                        </DialogDescription>
                      </DialogHeader>

                      <DialogFooter className="mt-4 flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => setDeleteSlug(null)}
                        >
                          Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                          Confirm Delete
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  )}
                </Dialog>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-10 flex justify-center items-center gap-4">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage((prev) => prev - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage((prev) => prev + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
