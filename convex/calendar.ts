// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create a new calendar meeting
export const createCalendarMeeting = mutation({
    args: {
        name: v.string(),
        date: v.string(), // yyyy-MM-dd
        startTime: v.string(), // HH:mm
        endTime: v.string(), // HH:mm
        description: v.optional(v.string()),
        meetingType: v.optional(v.union(v.literal("internal"), v.literal("external"))),
        internalParticipants: v.optional(v.array(v.object({
            type: v.union(v.literal("staff"), v.literal("workstream")),
            id: v.string(),
            name: v.string()
        }))),
        externalParticipants: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("byClerkUserId", (q) => q.eq("clerkUserId", identity.subject))
            .first();

        if (!user) throw new Error("User not found");

        // Validate that end time is after start time
        const [startHour, startMin] = args.startTime.split(":").map(Number);
        const [endHour, endMin] = args.endTime.split(":").map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        if (endMinutes <= startMinutes) {
            throw new Error("End time must be after start time");
        }

        const meetingId = await ctx.db.insert("calendar_meetings", {
            name: args.name,
            date: args.date,
            startTime: args.startTime,
            endTime: args.endTime,
            description: args.description,
            meetingType: args.meetingType,
            internalParticipants: args.internalParticipants,
            externalParticipants: args.externalParticipants,
            createdBy: user._id,
            createdByName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
            createdByStaffStream: user.staffStream,
            createdAt: Date.now(),
        });

        return meetingId;
    },
});

// Update an existing calendar meeting
export const updateCalendarMeeting = mutation({
    args: {
        meetingId: v.id("calendar_meetings"),
        name: v.string(),
        date: v.string(),
        startTime: v.string(),
        endTime: v.string(),
        description: v.optional(v.string()),
        meetingType: v.optional(v.union(v.literal("internal"), v.literal("external"))),
        internalParticipants: v.optional(v.array(v.object({
            type: v.union(v.literal("staff"), v.literal("workstream")),
            id: v.string(),
            name: v.string()
        }))),
        externalParticipants: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("byClerkUserId", (q) => q.eq("clerkUserId", identity.subject))
            .first();

        if (!user) throw new Error("User not found");

        const meeting = await ctx.db.get(args.meetingId);
        if (!meeting) throw new Error("Meeting not found");

        // Check if the user is the creator of the meeting
        if (meeting.createdBy !== user._id) {
            throw new Error("You can only edit meetings that you created");
        }

        // Validate that end time is after start time
        const [startHour, startMin] = args.startTime.split(":").map(Number);
        const [endHour, endMin] = args.endTime.split(":").map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        if (endMinutes <= startMinutes) {
            throw new Error("End time must be after start time");
        }

        await ctx.db.patch(args.meetingId, {
            name: args.name,
            date: args.date,
            startTime: args.startTime,
            endTime: args.endTime,
            description: args.description,
            meetingType: args.meetingType,
            internalParticipants: args.internalParticipants,
            externalParticipants: args.externalParticipants,
            createdByStaffStream: meeting.createdByStaffStream || user.staffStream,
            updatedAt: Date.now(),
        });

        return args.meetingId;
    },
});

// Delete a calendar meeting
export const deleteCalendarMeeting = mutation({
    args: {
        meetingId: v.id("calendar_meetings"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("byClerkUserId", (q) => q.eq("clerkUserId", identity.subject))
            .first();

        if (!user) throw new Error("User not found");

        const meeting = await ctx.db.get(args.meetingId);
        if (!meeting) throw new Error("Meeting not found");

        // Check if the user is the creator of the meeting
        if (meeting.createdBy !== user._id) {
            throw new Error("You can only delete meetings that you created");
        }

        await ctx.db.delete(args.meetingId);
        return { success: true };
    },
});

// Get all calendar meetings (optionally filter by date)
export const getCalendarMeetings = query({
    args: {
        date: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        if (args.date) {
            // Get meetings for a specific date
            const meetings = await ctx.db
                .query("calendar_meetings")
                .withIndex("byDate", (q) => q.eq("date", args.date as string))
                .collect();

            return meetings.sort((a, b) => a.startTime.localeCompare(b.startTime));
        }

        // Get all meetings
        const meetings = await ctx.db.query("calendar_meetings").collect();

        // Enrich with staff stream fallback
        const enrichedMeetings = await Promise.all(
            meetings.map(async (meeting) => {
                if (meeting.createdByStaffStream) return meeting;
                const creator = await ctx.db.get(meeting.createdBy);
                return { ...meeting, createdByStaffStream: creator?.staffStream };
            })
        );

        return enrichedMeetings.sort((a, b) => {
            const dateCompare = a.date.localeCompare(b.date);
            if (dateCompare !== 0) return dateCompare;
            return a.startTime.localeCompare(b.startTime);
        });
    },
});

// Get calendar meetings within a date range
export const getCalendarMeetingsByDateRange = query({
    args: {
        startDate: v.string(), // yyyy-MM-dd
        endDate: v.string(), // yyyy-MM-dd
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const allMeetings = await ctx.db.query("calendar_meetings").collect();

        const filteredMeetings = allMeetings.filter(
            (meeting) => meeting.date >= args.startDate && meeting.date <= args.endDate
        );

        // Enrich with staff stream fallback
        const enrichedMeetings = await Promise.all(
            filteredMeetings.map(async (meeting) => {
                if (meeting.createdByStaffStream) return meeting;
                const creator = await ctx.db.get(meeting.createdBy);
                return { ...meeting, createdByStaffStream: creator?.staffStream };
            })
        );

        return enrichedMeetings.sort((a, b) => {
            const dateCompare = a.date.localeCompare(b.date);
            if (dateCompare !== 0) return dateCompare;
            return a.startTime.localeCompare(b.startTime);
        });
    },
});

// Get upcoming calendar meetings (for dashboard)
export const getUpcomingMeetings = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const limit = args.limit || 5;
        const now = new Date();
        const today = now.toISOString().split("T")[0]; // yyyy-MM-dd
        const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

        // Calculate start and end of current week
        const startOfWeek = new Date();
        const day = startOfWeek.getDay(); // 0 (Sun) to 6 (Sat)
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
        const monday = new Date(startOfWeek.setDate(diff));
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        const formatDateStr = (d: Date) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
        };

        const startDateStr = formatDateStr(monday);
        const endDateStr = formatDateStr(sunday);

        const allMeetings = await ctx.db.query("calendar_meetings").collect();

        // Filter for meetings of the week
        const weeklyMeetings = allMeetings.filter((meeting) => {
            return meeting.date >= startDateStr && meeting.date <= endDateStr;
        });

        // Filter for upcoming meetings (today or future, and if today, not yet ended)
        const upcomingMeetings = weeklyMeetings.filter((meeting) => {
            if (meeting.date > today) return true;
            if (meeting.date === today && meeting.endTime > currentTime) return true;
            return false;
        });

        // Sort by date and time
        const sortedMeetings = upcomingMeetings.sort((a, b) => {
            const dateCompare = a.date.localeCompare(b.date);
            if (dateCompare !== 0) return dateCompare;
            return a.startTime.localeCompare(b.startTime);
        });

        const limitedMeetings = sortedMeetings.slice(0, limit);

        // Enrich with staff stream fallback
        const enrichedMeetings = await Promise.all(
            limitedMeetings.map(async (meeting) => {
                if (meeting.createdByStaffStream) return meeting;
                const creator = await ctx.db.get(meeting.createdBy);
                return { ...meeting, createdByStaffStream: creator?.staffStream };
            })
        );

        return enrichedMeetings;
    },
});
