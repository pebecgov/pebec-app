// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
import { ArrowUp, ArrowDown, X, GripVertical } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

export default function HomeNewsManagementPage() {
  const posts = useQuery(api.posts.getPostsForHomePageManagement);
  const updateOrder = useMutation(api.posts.updateHomePageOrder);
  const [search, setSearch] = useState("");

  // Filter posts that have publishedDate (required for home page display)
  const eligiblePosts = useMemo(() => {
    if (!posts) return [];
    return posts
      .filter(post => post.publishedDate) // Only posts with publishedDate
      .filter(post => 
        search === "" || 
        post.title.toLowerCase().includes(search.toLowerCase()) ||
        post.slug.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        // Posts with homePageOrder first, sorted by order
        if (a.homePageOrder !== undefined && b.homePageOrder !== undefined) {
          return a.homePageOrder - b.homePageOrder;
        }
        if (a.homePageOrder !== undefined) return -1;
        if (b.homePageOrder !== undefined) return 1;
        // Then by publishedDate (newest first)
        return (b.publishedDate ?? 0) - (a.publishedDate ?? 0);
      });
  }, [posts, search]);

  const featuredPosts = eligiblePosts.filter(p => p.homePageOrder !== undefined);
  const availablePosts = eligiblePosts.filter(p => p.homePageOrder === undefined);

  const handleSetOrder = async (postId: Id<"posts">, order: number | undefined) => {
    try {
      await updateOrder({ postId, homePageOrder: order });
      toast.success("✅ Order updated successfully");
    } catch (error) {
      toast.error("❌ Failed to update order");
      console.error(error);
    }
  };

  const handleMoveUp = async (postId: Id<"posts">, currentOrder: number) => {
    if (currentOrder <= 1) return;
    await handleSetOrder(postId, currentOrder - 1);
  };

  const handleMoveDown = async (postId: Id<"posts">, currentOrder: number) => {
    const maxOrder = Math.max(...featuredPosts.map(p => p.homePageOrder ?? 0));
    if (currentOrder >= maxOrder) return;
    await handleSetOrder(postId, currentOrder + 1);
  };

  const handleAddToHomePage = async (postId: Id<"posts">) => {
    const maxOrder = featuredPosts.length > 0 
      ? Math.max(...featuredPosts.map(p => p.homePageOrder ?? 0))
      : 0;
    await handleSetOrder(postId, maxOrder + 1);
  };

  const handleRemoveFromHomePage = async (postId: Id<"posts">) => {
    await handleSetOrder(postId, undefined);
  };

  if (!posts) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-green-700 mb-2">Manage Home Page News</h1>
        <p className="text-gray-600">
          Arrange the order of news articles displayed on the home page. Only posts with a published date can be featured.
        </p>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search posts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
      </div>

      {/* Featured Posts Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Featured on Home Page</CardTitle>
          <CardDescription>
            These posts will appear on the home page in the order shown below (up to 3 will be displayed).
            Drag to reorder or use the arrow buttons.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {featuredPosts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No posts are currently featured on the home page. Add posts from the "Available Posts" section below.
            </p>
          ) : (
            <div className="space-y-4">
              {featuredPosts.map((post, index) => (
                <div
                  key={post._id}
                  className="flex items-center gap-4 p-4 border rounded-lg bg-white hover:shadow-md transition"
                >
                  <div className="flex items-center gap-2 text-gray-400">
                    <GripVertical className="w-5 h-5" />
                    <span className="text-sm font-semibold text-green-600">
                      #{post.homePageOrder}
                    </span>
                  </div>

                  {post.coverImageUrl && (
                    <div className="relative w-20 h-20 rounded overflow-hidden flex-shrink-0">
                      <Image
                        src={post.coverImageUrl}
                        alt={post.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{post.title}</h3>
                    <p className="text-sm text-gray-600 truncate">{post.excerpt}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Published: {post.publishedDate ? formatDate(post.publishedDate) : "N/A"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleMoveUp(post._id, post.homePageOrder ?? 0)}
                      disabled={index === 0}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleMoveDown(post._id, post.homePageOrder ?? 0)}
                      disabled={index === featuredPosts.length - 1}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemoveFromHomePage(post._id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Posts Section */}
      <Card>
        <CardHeader>
          <CardTitle>Available Posts</CardTitle>
          <CardDescription>
            Posts that can be added to the home page. Only posts with a published date are shown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availablePosts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {search ? "No posts match your search." : "All eligible posts are already featured on the home page."}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availablePosts.map((post) => (
                <div
                  key={post._id}
                  className="p-4 border rounded-lg bg-white hover:shadow-md transition"
                >
                  {post.coverImageUrl && (
                    <div className="relative w-full h-32 rounded overflow-hidden mb-3">
                      <Image
                        src={post.coverImageUrl}
                        alt={post.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2">{post.title}</h3>
                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">{post.excerpt}</p>
                  <p className="text-xs text-gray-400 mb-3">
                    Published: {post.publishedDate ? formatDate(post.publishedDate) : "N/A"}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => handleAddToHomePage(post._id)}
                    className="w-full"
                  >
                    Add to Home Page
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
