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

    const todayStr = new Date().toISOString().split("T")[0];
    if (args.startDate < todayStr) {
      throw new Error("You cannot select a past date.");
    }

    // Check if user has an overlapping active announcement
    const userAnnouncements = await ctx.db
      .query("holidayAnnouncements")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const newStart = new Date(args.startDate).getTime();
    const newEnd = new Date(args.endDate).getTime();

    const hasOverlap = userAnnouncements.some(a => {
      const existingStart = new Date(a.startDate).getTime();
      const existingEnd = new Date(a.endDate).getTime();

      // Check for overlap: (StartA <= EndB) && (EndA >= StartB)
      return newStart <= existingEnd && newEnd >= existingStart;
    });

    if (hasOverlap) {
      throw new Error("You have an active leave in that time.");
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

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const announcementEnd = new Date(announcement.endDate).getTime();

    // Prevent editing past announcements (unless it's active and extends into today/future essentially, but logical check: if end date < today, it's past)
    // Note: JS timestamp comparison. 
    if (announcementEnd < today) {
      throw new Error("Cannot edit past announcements.");
    }

    if (args.startDate || args.endDate) {
      // Check for overlaps excluding self
      const userAnnouncements = await ctx.db
        .query("holidayAnnouncements")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      const newStart = args.startDate ? new Date(args.startDate).getTime() : new Date(announcement.startDate).getTime();
      const newEnd = args.endDate ? new Date(args.endDate).getTime() : new Date(announcement.endDate).getTime();

      const hasOverlap = userAnnouncements.some(a => {
        if (a._id === args.announcementId) return false; // Skip self

        const existingStart = new Date(a.startDate).getTime();
        const existingEnd = new Date(a.endDate).getTime();

        return newStart <= existingEnd && newEnd >= existingStart;
      });

      if (hasOverlap) {
        throw new Error("The new dates overlap with another active announcement.");
      }
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
// Get announcements filtered by type (active/upcoming vs past)
export const getAnnouncementsByType = query({
  args: {
    type: v.union(v.literal("active"), v.literal("past")),
  },
  handler: async (ctx, args) => {
    const announcements = await ctx.db
      .query("holidayAnnouncements")
      .collect();

    const now = new Date();
    // Reset time to start of day for comparison to include today in active
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const filtered = announcements.filter(a => {
      const endDate = new Date(a.endDate).getTime();

      if (args.type === "active") {
        // Active if end date is today or in the future
        // We use the end of the day for the end date comparison to be inclusive
        const endDateTime = new Date(a.endDate);
        endDateTime.setHours(23, 59, 59, 999);
        return endDateTime.getTime() >= today && a.isActive !== false;
      } else {
        // Past if end date is before today
        const endDateTime = new Date(a.endDate);
        endDateTime.setHours(23, 59, 59, 999);
        return endDateTime.getTime() < today || a.isActive === false;
      }
    });

    // Sort active by start date (ascending - nearest first)
    // Sort past by end date (descending - most recent first)
    return filtered.sort((a, b) => {
      if (args.type === "active") {
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      } else {
        return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
      }
    });
  },
});
