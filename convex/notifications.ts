// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow } from "./users";
export const getNotifications = query({
  args: {
    clerkUserId: v.string()
  },
  handler: async (ctx, {
    clerkUserId
  }) => {
    if (!clerkUserId) {
      throw new Error("ClerkUserId is required");
    }
    const user = await ctx.db.query("users").withIndex("byClerkUserId", q => q.eq("clerkUserId", clerkUserId)).unique();
    if (!user) {
      throw new Error("User not found");
    }
    const userId = user._id;
    const notifications = await ctx.db.query("notifications").withIndex("byUser", q => q.eq("userId", userId)).order("desc").collect();
    return notifications;
  }
});
export const updateNotificationStatus = mutation({
  args: {
    notificationId: v.id("notifications")
  },
  handler: async (ctx, {
    notificationId
  }) => {
    const notification = await ctx.db.get(notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }
    await ctx.db.patch(notificationId, {
      isRead: true
    });
    return true;
  }
});
export const getUserByClerkId = query({
  args: {
    clerkUserId: v.string()
  },
  handler: async (ctx, {
    clerkUserId
  }) => {
    const user = await ctx.db.query("users").withIndex("byClerkUserId", q => q.eq("clerkUserId", clerkUserId)).unique();
    return user;
  }
});
export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications")
  },
  handler: async (ctx, {
    notificationId
  }) => {
    if (!notificationId) {
      throw new Error("Notification ID is required");
    }
    await ctx.db.delete(notificationId);
    return true;
  }
});
export const getPostSlugById = query({
  args: {
    postId: v.id("posts")
  },
  handler: async (ctx, {
    postId
  }) => {
    const post = await ctx.db.get(postId);
    if (!post) {
      throw new Error("Post not found");
    }
    return post.slug;
  }
});
export const getUserNotifications = query({
  handler: async ctx => {
    const user = await getCurrentUserOrThrow(ctx);
    const allNotifications = await ctx.db.query("notifications").withIndex("byUser", q => q.eq("userId", user._id)).collect();
    return allNotifications.filter(notif => notif.isRead === false);
  }
});
export const markNotificationsAsRead = mutation({
  args: {
    ticketId: v.id("tickets")
  },
  handler: async (ctx, {
    ticketId
  }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const notifications = await ctx.db.query("notifications").withIndex("byUserAndTicket", q => q.eq("userId", user._id).eq("ticketId", ticketId)).collect();
    for (const notif of notifications) {
      if (!notif.isRead) {
        await ctx.db.patch(notif._id, {
          isRead: true
        });
      }
    }
  }
});