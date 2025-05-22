// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users";
import { Id } from "./_generated/dataModel";
export const generateUploadUrl = mutation(async ctx => {
  return await ctx.storage.generateUploadUrl();
});
export const getPosts = query({
  args: {},
  handler: async ctx => {
    const posts = await ctx.db.query("posts").order("desc").collect();
    return Promise.all(posts.map(async post => {
      const author = await ctx.db.get(post.authorId);
      if (!author) {
        console.warn(`🚨 Author not found for post: ${post._id}`);
      }
      return {
        ...post,
        author: author ? {
          _id: author._id,
          _creationTime: author._creationTime,
          clerkUserId: author.clerkUserId,
          firstName: author.firstName ?? "PEBEC Gov",
          lastName: author.lastName ?? "",
          email: author.email ?? "",
          imageUrl: author.imageUrl ?? ""
        } : {
          _id: "unknown" as Id<"users">,
          _creationTime: Date.now(),
          clerkUserId: "unknown",
          firstName: "Pebec Gov",
          lastName: "",
          email: "unknown@example.com",
          imageUrl: ""
        },
        ...(post.coverImageId ? {
          coverImageUrl: (await ctx.storage.getUrl(post.coverImageId)) ?? ""
        } : {})
      };
    }));
  }
});
export const getRecentPosts = query({
  args: {},
  handler: async ctx => {
    const posts = await ctx.db.query("posts").order("desc").take(4);
    return Promise.all(posts.map(async post => {
      const author = await ctx.db.get(post.authorId);
      return {
        ...post,
        author
      };
    }));
  }
});
export const getPostBySlug = query({
  args: {
    slug: v.string()
  },
  handler: async (ctx, {
    slug
  }) => {
    const post = await ctx.db.query("posts").withIndex("bySlug", q => q.eq("slug", slug)).unique();
    if (!post) {
      return null;
    }
    const author = await ctx.db.get(post.authorId);
    return {
      ...post,
      author,
      ...(post.coverImageId ? {
        coverImageUrl: (await ctx.storage.getUrl(post.coverImageId)) ?? ""
      } : {})
    };
  }
});
export const createPost = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    content: v.string(),
    coverImageId: v.optional(v.id("_storage"))
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    let {
      slug
    } = args;
    let attempt = 1;
    let existingPost = await ctx.db.query("posts").withIndex("bySlug", q => q.eq("slug", slug)).unique();
    while (existingPost) {
      slug = `${args.slug}-${attempt}`;
      attempt++;
      existingPost = await ctx.db.query("posts").withIndex("bySlug", q => q.eq("slug", slug)).unique();
    }
    const data = {
      ...args,
      slug,
      authorId: user._id,
      likes: 0
    };
    const postId = await ctx.db.insert("posts", data);
    const post = await ctx.db.get(postId);
    const admins = await ctx.db.query("users").withIndex("byRole", q => q.eq("role", "admin")).collect();
    for (const admin of admins) {
      const message = `A new post titled "${args.title}" has been published.`;
      await ctx.db.insert("notifications", {
        userId: admin._id,
        postId,
        message,
        isRead: false,
        createdAt: Date.now(),
        type: "new_post"
      });
    }
    const userMessage = `Your post titled "${args.title}" has been published.`;
    await ctx.db.insert("notifications", {
      userId: user._id,
      postId,
      message: userMessage,
      isRead: false,
      createdAt: Date.now(),
      type: "new_post"
    });
    return slug;
  }
});
export const likePost = mutation({
  args: {
    slug: v.string()
  },
  handler: async (ctx, {
    slug
  }) => {
    const post = await ctx.db.query("posts").withIndex("bySlug", q => q.eq("slug", slug)).unique();
    if (!post) {
      throw new Error("Post not found");
    }
    await ctx.db.patch(post._id, {
      likes: post.likes + 1
    });
    return true;
  }
});
export const editPost = mutation({
  args: {
    slug: v.string(),
    title: v.string(),
    excerpt: v.string(),
    content: v.string(),
    coverImageId: v.optional(v.id("_storage"))
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const post = await ctx.db.query("posts").withIndex("bySlug", q => q.eq("slug", args.slug)).unique();
    if (!post) {
      throw new Error("🚨 Post not found!");
    }
    if (post.authorId !== user._id) {
      throw new Error("🚨 Unauthorized: Only the author can edit this post!");
    }
    if (!args.content || args.content.trim() === "") {
      throw new Error("🚨 Content cannot be empty when editing a post!");
    }
    console.log("✏️ Updating post with content:", args.content);
    await ctx.db.patch(post._id, {
      title: args.title,
      excerpt: args.excerpt,
      content: args.content,
      coverImageId: args.coverImageId
    });
    return true;
  }
});
export const deletePost = mutation({
  args: {
    slug: v.string()
  },
  handler: async (ctx, {
    slug
  }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const post = await ctx.db.query("posts").withIndex("bySlug", q => q.eq("slug", slug)).unique();
    if (!post) {
      throw new Error("Post not found");
    }
    const isAuthor = post.authorId === user._id;
    const isAdmin = user.role === "admin";
    if (!isAuthor && !isAdmin) {
      throw new Error("Unauthorized: You are not allowed to delete this post.");
    }
    await ctx.db.delete(post._id);
    return true;
  }
});
export const getCommentsByPost = query({
  args: {
    postId: v.id("posts")
  },
  handler: async (ctx, {
    postId
  }) => {
    const comments = await ctx.db.query("comments").withIndex("byPost", q => q.eq("postId", postId)).order("desc").collect();
    return Promise.all(comments.map(async comment => {
      let author: {
        _id: Id<"users">;
        firstName?: string;
        lastName?: string;
        imageUrl?: string;
      } | null = null;
      if (comment.authorId) {
        author = (await ctx.db.get(comment.authorId)) ?? null;
      }
      console.log("Fetched Author for Comment:", author);
      return {
        ...comment,
        author,
        authorId: comment.authorId
      };
    }));
  }
});
export const addComment = mutation({
  args: {
    postId: v.id("posts"),
    content: v.string(),
    guestName: v.optional(v.string())
  },
  handler: async (ctx, {
    postId,
    content,
    guestName
  }) => {
    const user = await getCurrentUserOrThrow(ctx).catch(() => null);
    if (!user && !guestName) {
      throw new Error("Guest name is required for non-logged-in users");
    }
    const commentData = {
      postId,
      content,
      authorId: user ? user._id : undefined,
      guestName: user ? undefined : guestName,
      createdAt: Date.now()
    };
    console.log("Adding Comment:", commentData);
    await ctx.db.insert("comments", commentData);
  }
});
export const deleteComment = mutation({
  args: {
    commentId: v.id("comments")
  },
  handler: async (ctx, {
    commentId
  }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const comment = await ctx.db.get(commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.authorId !== user._id) throw new Error("Unauthorized");
    await ctx.db.delete(commentId);
  }
});
export const getCommentCount = query({
  args: {
    postId: v.id("posts")
  },
  handler: async (ctx, {
    postId
  }) => {
    const comments = await ctx.db.query("comments").withIndex("byPost", q => q.eq("postId", postId)).collect();
    return comments.length;
  }
});
export const getImageUrl = query({
  args: {
    storageId: v.id("_storage")
  },
  handler: async (ctx, {
    storageId
  }) => {
    return await ctx.storage.getUrl(storageId);
  }
});
export const getTotalPosts = query({
  args: {},
  handler: async ctx => {
    const posts = await ctx.db.query("posts").collect();
    return posts.length;
  }
});
export const editComment = mutation({
  args: {
    commentId: v.id("comments"),
    content: v.string()
  },
  handler: async (ctx, {
    commentId,
    content
  }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const comment = await ctx.db.get(commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.authorId !== user._id) throw new Error("Unauthorized");
    if (!content.trim()) throw new Error("Comment cannot be empty!");
    await ctx.db.patch(commentId, {
      content
    });
  }
});
export const getMostLikedPostExcerpts = query({
  args: {
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;
    const posts = await ctx.db.query("posts").order("desc").collect();
    const mostLiked = posts.sort((a, b) => b.likes - a.likes).slice(0, limit).map(({
      slug,
      excerpt
    }) => ({
      slug,
      excerpt
    }));
    return mostLiked;
  }
});