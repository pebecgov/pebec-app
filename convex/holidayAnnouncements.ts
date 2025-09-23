// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new holiday announcement
export const createAnnouncement = mutation({
  args: {
    reason: v.union(v.literal("sick"), v.literal("official_assignment"), v.literal("leave")),
    startDate: v.string(),
    endDate: v.string(),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .first();
    
    if (!user) {
      throw new Error("User not found");
    }

    // Check if user has an active announcement
    const existingAnnouncement = await ctx.db
      .query("holidayAnnouncements")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (existingAnnouncement) {
      throw new Error("You already have an active announcement. Please end it first.");
    }

    const announcementId = await ctx.db.insert("holidayAnnouncements", {
      userId: user._id,
      userName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
      userRole: user.role || "staff",
      staffStream: user.staffStream,
      reason: args.reason,
      startDate: args.startDate,
      endDate: args.endDate,
      startTime: args.startTime,
      endTime: args.endTime,
      description: args.description,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return announcementId;
  },
});

// Get all active holiday announcements
export const getActiveAnnouncements = query({
  handler: async (ctx) => {
    const announcements = await ctx.db
      .query("holidayAnnouncements")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Sort by start date
    return announcements.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  },
});

// Get user's own announcements
export const getUserAnnouncements = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .first();
    
    if (!user) {
      throw new Error("User not found");
    }

    const announcements = await ctx.db
      .query("holidayAnnouncements")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Sort by creation date (newest first)
    return announcements.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// End an active announcement
export const endAnnouncement = mutation({
  args: {
    announcementId: v.id("holidayAnnouncements"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .first();
    
    if (!user) {
      throw new Error("User not found");
    }

    const announcement = await ctx.db.get(args.announcementId);
    if (!announcement) {
      throw new Error("Announcement not found");
    }

    if (announcement.userId !== user._id) {
      throw new Error("You can only end your own announcements");
    }

    await ctx.db.patch(args.announcementId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return args.announcementId;
  },
});

// Update an announcement
export const updateAnnouncement = mutation({
  args: {
    announcementId: v.id("holidayAnnouncements"),
    reason: v.optional(v.union(v.literal("sick"), v.literal("official_assignment"), v.literal("leave"))),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .first();
    
    if (!user) {
      throw new Error("User not found");
    }

    const announcement = await ctx.db.get(args.announcementId);
    if (!announcement) {
      throw new Error("Announcement not found");
    }

    if (announcement.userId !== user._id) {
      throw new Error("You can only update your own announcements");
    }

    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (args.reason !== undefined) updateData.reason = args.reason;
    if (args.startDate !== undefined) updateData.startDate = args.startDate;
    if (args.endDate !== undefined) updateData.endDate = args.endDate;
    if (args.startTime !== undefined) updateData.startTime = args.startTime;
    if (args.endTime !== undefined) updateData.endTime = args.endTime;
    if (args.description !== undefined) updateData.description = args.description;

    await ctx.db.patch(args.announcementId, updateData);

    return args.announcementId;
  },
});

// Delete an announcement
export const deleteAnnouncement = mutation({
  args: {
    announcementId: v.id("holidayAnnouncements"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .first();
    
    if (!user) {
      throw new Error("User not found");
    }

    const announcement = await ctx.db.get(args.announcementId);
    if (!announcement) {
      throw new Error("Announcement not found");
    }

    if (announcement.userId !== user._id) {
      throw new Error("You can only delete your own announcements");
    }

    await ctx.db.delete(args.announcementId);

    return args.announcementId;
  },
});
