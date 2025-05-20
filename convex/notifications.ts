import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow } from "./users";

// Query notifications for a specific user
export const getNotifications = query({
  args: { clerkUserId: v.string() },  // Take clerkUserId as an argument
  handler: async (ctx, { clerkUserId }) => {
    if (!clerkUserId) {
      throw new Error("ClerkUserId is required");
    }

    // Fetch the userId using clerkUserId
    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q) => q.eq("clerkUserId", clerkUserId)) // Lookup userId via clerkUserId
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const userId = user._id; // Get the _id from the fetched user

    // Fetch notifications based on the userId
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("byUser", (q) => q.eq("userId", userId)) // Use userId for querying notifications
      .order("desc")  // Sort notifications in descending order
      .collect();

    return notifications;  // Return the list of notifications for the user
  },
});



// ✅ Update the read status of a notification
export const updateNotificationStatus = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    // Fetch the notification using its ID
    const notification = await ctx.db.get(notificationId);

    if (!notification) {
      throw new Error("Notification not found");
    }

    // Update the notification's status to 'read'
    await ctx.db.patch(notificationId, { isRead: true });

    return true;  // Indicate success
  },
});



export const getUserByClerkId = query({
  args: { clerkUserId: v.string() },  // clerkUserId argument
  handler: async (ctx, { clerkUserId }) => {
    // Fetch the user based on the clerkUserId
    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique(); // Expecting a single result, hence using unique
    
    return user;  // Return the user (or null if not found)
  }
});



// Delete notification mutation
export const deleteNotification = mutation({
  args: { notificationId: v.id("notifications") }, // Accepts the notificationId
  handler: async (ctx, { notificationId }) => {
    // Ensure notificationId is provided
    if (!notificationId) {
      throw new Error("Notification ID is required");
    }

    // Delete the notification from the database
    await ctx.db.delete(notificationId);

    return true; // Return true on successful deletion
  },
});


export const getPostSlugById = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const post = await ctx.db.get(postId);

    if (!post) {
      throw new Error("Post not found");
    }

    return post.slug; // Return the slug from the post
  },
});









export const getUserNotifications = query({
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    // ✅ First, collect the results
    const allNotifications = await ctx.db
      .query("notifications")
      .withIndex("byUser", (q) => q.eq("userId", user._id))
      .collect();

    // ✅ Then, filter in JavaScript (NOT inside .query())
    return allNotifications.filter((notif) => notif.isRead === false);
  },
});






export const markNotificationsAsRead = mutation({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, { ticketId }) => {
    const user = await getCurrentUserOrThrow(ctx);

    // ✅ Get all unread notifications for this ticket
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("byUserAndTicket", (q) => q.eq("userId", user._id).eq("ticketId", ticketId))
      .collect();

    // ✅ Update each unread notification
    for (const notif of notifications) {
      if (!notif.isRead) {
        await ctx.db.patch(notif._id, { isRead: true });
      }
    }
  },
});

