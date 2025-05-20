import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users";
import { Id } from "./_generated/dataModel";

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const getPosts = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").order("desc").collect();
    
    return Promise.all(
      posts.map(async (post) => {
        const author = await ctx.db.get(post.authorId);

        if (!author) {
          console.warn(`🚨 Author not found for post: ${post._id}`);
        }

        return {
          ...post,
          author: author
            ? {
                _id: author._id,
                _creationTime: author._creationTime, // ✅ Ensure it's included
                clerkUserId: author.clerkUserId, // ✅ Ensure it's included
                firstName: author.firstName ?? "PEBEC Gov",
                lastName: author.lastName ?? "",
                email: author.email ?? "",
                imageUrl: author.imageUrl ?? "",
              }
            : {
                _id: "unknown" as Id<"users">,
                _creationTime: Date.now(),
                clerkUserId: "unknown",
                firstName: "Pebec Gov",
                lastName: "",
                email: "unknown@example.com",
                imageUrl: "",
              },
          ...(post.coverImageId
            ? { coverImageUrl: (await ctx.storage.getUrl(post.coverImageId)) ?? "" }
            : {}),
        };
      })
    );
  },
});



export const getRecentPosts = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").order("desc").take(4);
    return Promise.all(
      posts.map(async (post) => {
        const author = await ctx.db.get(post.authorId);

        return {
          ...post,
          author,
        };
      })
    );
  },
});

export const getPostBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const post = await ctx.db
      .query("posts")
      .withIndex("bySlug", (q) => q.eq("slug", slug))
      .unique();

    if (!post) {
      return null;
    }

    // ✅ Fetch the author using `post.authorId`
    const author = await ctx.db.get(post.authorId); // 🔥 Fix: Use `_id` directly

    return {
      ...post,
      author, // ✅ Now the author data is included
      ...(post.coverImageId
        ? { coverImageUrl: (await ctx.storage.getUrl(post.coverImageId)) ?? "" }
        : {}),
    };
  },
});


export const createPost = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    content: v.string(),
    coverImageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx); // Get the current logged-in user

    let { slug } = args;
    let attempt = 1;
    let existingPost = await ctx.db
      .query("posts")
      .withIndex("bySlug", (q) => q.eq("slug", slug))
      .unique();

    // If slug exists, generate a new one with a number suffix
    while (existingPost) {
      slug = `${args.slug}-${attempt}`;
      attempt++;
      existingPost = await ctx.db
        .query("posts")
        .withIndex("bySlug", (q) => q.eq("slug", slug))
        .unique();
    }

    // Prepare the data object for the new post
    const data = {
      ...args,
      slug, // Use the unique slug
      authorId: user._id, // Associate the current user as the author of the post
      likes: 0,
    };

    // Insert the post into the database
    const postId = await ctx.db.insert("posts", data); // postId will now hold the Id<"posts">

    // Fetch the post using the inserted postId to get the slug
    const post = await ctx.db.get(postId); // Now we have the full post object

    // Notify the admin about the new post
    const admins = await ctx.db
      .query("users")
      .withIndex("byRole", (q) => q.eq("role", "admin"))
      .collect();

    // Send notifications to all admins
    for (const admin of admins) {
      const message = `A new post titled "${args.title}" has been published.`;

      // Insert notification for admin
      await ctx.db.insert("notifications", {
        userId: admin._id, // Notify admins about the new post
        postId, // Link to the post
        message,
        isRead: false, // Initially set as unread
        createdAt: Date.now(),
        type: "new_post", // Type of notification
      });
    }

    // Optionally, notify the user who created the post (if necessary)
    const userMessage = `Your post titled "${args.title}" has been published.`;
    await ctx.db.insert("notifications", {
      userId: user._id, // Notify the user who created the post
      postId, // Link to the post
      message: userMessage,
      isRead: false,
      createdAt: Date.now(),
      type: "new_post", // Type of notification
    });

    return slug; // Return the unique slug after the post is created
  },
});






// Server-side mutation to like a post
export const likePost = mutation({
  args: { slug: v.string() },  // No userId argument needed
  handler: async (ctx, { slug }) => {
    // Find the post by slug
    const post = await ctx.db
      .query("posts")
      .withIndex("bySlug", (q) => q.eq("slug", slug))
      .unique();

    if (!post) {
      throw new Error("Post not found");
    }

    // Increment the number of likes
    await ctx.db.patch(post._id, { likes: post.likes + 1 });

    return true; // Return success
  },
});


/* ✅ ADDING EDIT & DELETE MUTATIONS */

/** 
 * Edit Post Mutation
 * - Only the post author can edit
 */
export const editPost = mutation({
  args: {
    slug: v.string(),
    title: v.string(),
    excerpt: v.string(),
    content: v.string(),
    coverImageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const post = await ctx.db
      .query("posts")
      .withIndex("bySlug", (q) => q.eq("slug", args.slug))
      .unique();

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
      content: args.content, // ✅ Ensure content is stored correctly
      coverImageId: args.coverImageId,
    });

    return true;
  },
});


export const deletePost = mutation({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const user = await getCurrentUserOrThrow(ctx);

    const post = await ctx.db
      .query("posts")
      .withIndex("bySlug", (q) => q.eq("slug", slug))
      .unique();

    if (!post) {
      throw new Error("Post not found");
    }

    // ✅ Allow if user is author or has admin role
    const isAuthor = post.authorId === user._id;
    const isAdmin = user.role === "admin";

    if (!isAuthor && !isAdmin) {
      throw new Error("Unauthorized: You are not allowed to delete this post.");
    }

    await ctx.db.delete(post._id);

    return true;
  },
});





export const getCommentsByPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("byPost", (q) => q.eq("postId", postId))
      .order("desc")
      .collect();

    return Promise.all(
      comments.map(async (comment) => {
        let author: { 
          _id: Id<"users">; 
          firstName?: string; 
          lastName?: string; 
          imageUrl?: string; 
        } | null = null; // ✅ Ensure author can be null or an object

        if (comment.authorId) {
          author = await ctx.db.get(comment.authorId) ?? null; // ✅ Safely assign null if user doesn't exist
        }

        console.log("Fetched Author for Comment:", author); // ✅ Debugging

        return { 
          ...comment, 
          author, 
          authorId: comment.authorId, // ✅ Explicitly return authorId
        };
      })
    );
  },
});



export const addComment = mutation({
  args: {
    postId: v.id("posts"),
    content: v.string(),
    guestName: v.optional(v.string()),
  },
  handler: async (ctx, { postId, content, guestName }) => {
    const user = await getCurrentUserOrThrow(ctx).catch(() => null);

    if (!user && !guestName) {
      throw new Error("Guest name is required for non-logged-in users");
    }

    const commentData = {
      postId,
      content,
      authorId: user ? user._id : undefined, // ✅ Ensure this is stored
      guestName: user ? undefined : guestName,
      createdAt: Date.now(),
    };

    console.log("Adding Comment:", commentData); // ✅ Debugging

    await ctx.db.insert("comments", commentData);
  },
});







// ✅ Delete a Comment (Only Author Can Delete)
export const deleteComment = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, { commentId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const comment = await ctx.db.get(commentId);

    if (!comment) throw new Error("Comment not found");
    if (comment.authorId !== user._id) throw new Error("Unauthorized");

    await ctx.db.delete(commentId);
  },
});




export const getCommentCount = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const comments = await ctx.db.query("comments").withIndex("byPost", (q) => q.eq("postId", postId)).collect();
    return comments.length; // ✅ Return the number of comments
  },
});




// Fetch image URL from storage
export const getImageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});


// ✅ Get total number of posts
export const getTotalPosts = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").collect();
    return posts.length;
  },
});


export const editComment = mutation({
  args: {
    commentId: v.id("comments"),
    content: v.string(),
  },
  handler: async (ctx, { commentId, content }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const comment = await ctx.db.get(commentId);

    if (!comment) throw new Error("Comment not found");
    if (comment.authorId !== user._id) throw new Error("Unauthorized");

    if (!content.trim()) throw new Error("Comment cannot be empty!");

    await ctx.db.patch(commentId, { content });
  },
});


// In your Convex `posts.ts`

export const getMostLikedPostExcerpts = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;

    const posts = await ctx.db
      .query("posts")
      .order("desc") // Sorting by creation time first
      .collect();

    // Sort by likes (descending) and return top N
    const mostLiked = posts
      .sort((a, b) => b.likes - a.likes)
      .slice(0, limit)
      .map(({ slug, excerpt }) => ({ slug, excerpt }));

    return mostLiked;
  },
});
