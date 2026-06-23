// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { internalMutation, mutation, query, QueryCtx } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow } from "./users";
import { internal } from "./_generated/api";

const MAX_NOTIFICATION_LIMIT = 200;
const MAX_COUNT_SCAN = 8192;

async function resolveUserByClerkId(ctx: QueryCtx, clerkUserId: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("byClerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
    .unique();
  if (!user) {
    throw new Error("User not found");
  }
  return user;
}

/** Recent notifications for the header badge popover (capped). */
export const getNotifications = query({
  args: {
    clerkUserId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { clerkUserId, limit = 50 }) => {
    if (!clerkUserId) {
      throw new Error("ClerkUserId is required");
    }
    const user = await resolveUserByClerkId(ctx, clerkUserId);
    const cappedLimit = Math.min(Math.max(limit, 1), MAX_NOTIFICATION_LIMIT);
    return await ctx.db
      .query("notifications")
      .withIndex("byUser", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(cappedLimit);
  },
});

/** Paginated notifications for the full notifications page. */
export const listNotifications = query({
  args: {
    clerkUserId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { clerkUserId, paginationOpts }) => {
    const user = await resolveUserByClerkId(ctx, clerkUserId);
    return await ctx.db
      .query("notifications")
      .withIndex("byUser", (q) => q.eq("userId", user._id))
      .order("desc")
      .paginate(paginationOpts);
  },
});

export const getUnreadNotificationCount = query({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, { clerkUserId }) => {
    const user = await resolveUserByClerkId(ctx, clerkUserId);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("byUserAndIsRead", (q) =>
        q.eq("userId", user._id).eq("isRead", false)
      )
      .take(MAX_COUNT_SCAN);
    return unread.length;
  },
});

export const updateNotificationStatus = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, { notificationId }) => {
    const notification = await ctx.db.get(notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }
    await ctx.db.patch(notificationId, {
      isRead: true,
    });
    return true;
  },
});

export const getUserByClerkId = query({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, { clerkUserId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();
    return user;
  },
});

export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, { notificationId }) => {
    if (!notificationId) {
      throw new Error("Notification ID is required");
    }
    await ctx.db.delete(notificationId);
    return true;
  },
});

export const clearAllNotifications = mutation({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, { clerkUserId }) => {
    const user = await resolveUserByClerkId(ctx, clerkUserId);
    await ctx.scheduler.runAfter(0, internal.notifications.deleteNotificationsBatch, {
      userId: user._id,
      cursor: null,
    });
    return true;
  },
});

export const deleteNotificationsBatch = internalMutation({
  args: {
    userId: v.id("users"),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, { userId, cursor }) => {
    const page = await ctx.db
      .query("notifications")
      .withIndex("byUser", (q) => q.eq("userId", userId))
      .paginate({ numItems: 50, cursor });

    for (const notification of page.page) {
      await ctx.db.delete(notification._id);
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.notifications.deleteNotificationsBatch, {
        userId,
        cursor: page.continueCursor,
      });
    }
  },
});

export const getPostSlugById = query({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, { postId }) => {
    const post = await ctx.db.get(postId);
    if (!post) {
      throw new Error("Post not found");
    }
    return post.slug;
  },
});

export const getUserNotifications = query({
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    return await ctx.db
      .query("notifications")
      .withIndex("byUserAndIsRead", (q) =>
        q.eq("userId", user._id).eq("isRead", false)
      )
      .order("desc")
      .take(MAX_NOTIFICATION_LIMIT);
  },
});

export const markNotificationsAsRead = mutation({
  args: {
    ticketId: v.id("tickets"),
  },
  handler: async (ctx, { ticketId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("byUserAndTicket", (q) =>
        q.eq("userId", user._id).eq("ticketId", ticketId)
      )
      .collect();
    for (const notif of notifications) {
      if (!notif.isRead) {
        await ctx.db.patch(notif._id, {
          isRead: true,
        });
      }
    }
  },
});
