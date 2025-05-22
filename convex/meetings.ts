// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
export const createMeeting = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    attendees: v.array(v.id("users")),
    meetingDate: v.number(),
    duration: v.number()
  },
  handler: async (ctx, {
    title,
    description,
    createdBy,
    attendees,
    meetingDate,
    duration
  }) => {
    const meetingId = await ctx.db.insert("meetings", {
      title,
      description,
      createdBy,
      attendees,
      acceptedAttendees: [],
      declinedAttendees: [],
      meetingDate,
      duration,
      status: "pending",
      createdAt: Date.now()
    });
    for (const attendee of attendees) {
      await ctx.db.insert("notifications", {
        userId: attendee,
        meetingId,
        message: `You have been invited to a meeting: ${title}`,
        isRead: false,
        createdAt: Date.now(),
        type: "meeting_invite"
      });
      const user = await ctx.db.get(attendee);
      if (user && user.email) {
        await ctx.scheduler.runAfter(0, api.email.sendEmail, {
          to: user.email,
          subject: `Meeting Invitation: ${title}`,
          html: `
            <p>Hello ${user.firstName || "User"},</p>
            <p>You have been invited to a meeting titled: <strong>${title}</strong>.</p>
            <p>Date: ${new Date(meetingDate).toLocaleString()}</p>
            <p>Duration: ${duration} minutes</p>
            <p>Please confirm your attendance.</p>
          `
        });
      }
    }
    return {
      success: true,
      meetingId
    };
  }
});
export const getUserMeetings = query({
  args: {
    userId: v.id("users")
  },
  handler: async (ctx, {
    userId
  }) => {
    const allMeetings = await ctx.db.query("meetings").collect();
    const userMeetings = allMeetings.filter(meeting => (meeting.createdBy === userId || meeting.attendees.includes(userId)) && meeting.status !== "cancelled" && !meeting.declinedAttendees?.includes(userId)).sort((a, b) => a.meetingDate - b.meetingDate);
    const meetingsWithCreators = await Promise.all(userMeetings.map(async meeting => {
      const creator = await ctx.db.get(meeting.createdBy);
      return {
        ...meeting,
        creatorImage: creator?.imageUrl || "/default-avatar.png",
        creatorName: creator?.firstName || "Unknown Organizer"
      };
    }));
    return meetingsWithCreators;
  }
});
export const getMeetingRequests = query({
  args: {
    userId: v.id("users")
  },
  handler: async (ctx, {
    userId
  }) => {
    const allMeetings = await ctx.db.query("meetings").collect();
    return allMeetings.filter(meeting => meeting.status === "pending" && meeting.attendees.includes(userId) && !meeting.acceptedAttendees.includes(userId) && !meeting.declinedAttendees.includes(userId));
  }
});
export const respondToMeetingInvite = mutation({
  args: {
    meetingId: v.id("meetings"),
    userId: v.id("users"),
    response: v.union(v.literal("accepted"), v.literal("declined"))
  },
  handler: async (ctx, {
    meetingId,
    userId,
    response
  }) => {
    const meeting = await ctx.db.get(meetingId);
    if (!meeting) throw new Error("Meeting not found");
    const user = await ctx.db.get(userId);
    const userName = user ? `${user.firstName} ${user.lastName}` : "Someone";
    if (response === "accepted") {
      const updatedAcceptedAttendees = [...new Set([...meeting.acceptedAttendees, userId])];
      const updatedDeclinedAttendees = meeting.declinedAttendees?.filter(att => att !== userId) || [];
      const isConfirmed = updatedAcceptedAttendees.length > 0;
      await ctx.db.patch(meetingId, {
        acceptedAttendees: updatedAcceptedAttendees,
        declinedAttendees: updatedDeclinedAttendees,
        status: isConfirmed ? "confirmed" : meeting.status
      });
      await ctx.db.insert("notifications", {
        userId: meeting.createdBy,
        meetingId,
        message: `${userName} accepted your meeting invite: ${meeting.title}`,
        isRead: false,
        createdAt: Date.now(),
        type: "meeting_response"
      });
    } else {
      const updatedDeclinedAttendees = [...new Set([...meeting.declinedAttendees, userId])];
      const remainingAttendees = meeting.attendees.filter(att => !updatedDeclinedAttendees.includes(att));
      const newStatus = remainingAttendees.length === 0 ? "declined" : meeting.status;
      await ctx.db.patch(meetingId, {
        declinedAttendees: updatedDeclinedAttendees,
        status: newStatus
      });
      await ctx.db.insert("notifications", {
        userId: meeting.createdBy,
        meetingId,
        message: `${userName} declined your meeting invite: ${meeting.title}`,
        isRead: false,
        createdAt: Date.now(),
        type: "meeting_response"
      });
      if (newStatus === "declined") {
        await ctx.db.insert("notifications", {
          userId: meeting.createdBy,
          meetingId,
          message: `Your meeting "${meeting.title}" has been declined by all invitees.`,
          isRead: false,
          createdAt: Date.now(),
          type: "meeting_response"
        });
      }
    }
    return {
      success: true
    };
  }
});
export const cancelMeeting = mutation({
  args: {
    meetingId: v.id("meetings"),
    userId: v.id("users")
  },
  handler: async (ctx, {
    meetingId,
    userId
  }) => {
    const meeting = await ctx.db.get(meetingId);
    if (!meeting) throw new Error("Meeting not found");
    const user = await ctx.db.get(userId);
    const userName = user ? `${user.firstName} ${user.lastName}` : "The host";
    await ctx.db.patch(meetingId, {
      status: "cancelled"
    });
    for (const attendee of meeting.attendees) {
      await ctx.db.insert("notifications", {
        userId: attendee,
        meetingId,
        message: `${userName} cancelled the meeting "${meeting.title}".`,
        isRead: false,
        createdAt: Date.now(),
        type: "meeting_cancelled"
      });
      const attendeeUser = await ctx.db.get(attendee);
      if (attendeeUser && attendeeUser.email) {
        await ctx.scheduler.runAfter(0, api.email.sendEmail, {
          to: attendeeUser.email,
          subject: `Meeting Cancelled: ${meeting.title}`,
          html: `<p>${userName} has cancelled the meeting "${meeting.title}".</p>`
        });
      }
    }
  }
});
export const rescheduleMeeting = mutation({
  args: {
    meetingId: v.id("meetings"),
    newDate: v.number(),
    userId: v.id("users")
  },
  handler: async (ctx, {
    meetingId,
    newDate,
    userId
  }) => {
    const meeting = await ctx.db.get(meetingId);
    if (!meeting) throw new Error("Meeting not found");
    const user = await ctx.db.get(userId);
    const userName = user ? `${user.firstName} ${user.lastName}` : "The host";
    await ctx.db.patch(meetingId, {
      meetingDate: newDate,
      status: "pending",
      acceptedAttendees: [],
      declinedAttendees: []
    });
    for (const attendee of meeting.attendees) {
      await ctx.db.insert("notifications", {
        userId: attendee,
        meetingId,
        message: `${userName} rescheduled the meeting "${meeting.title}". Please confirm your availability.`,
        isRead: false,
        createdAt: Date.now(),
        type: "meeting_rescheduled"
      });
    }
  }
});
export const getMeetingById = query({
  args: {
    meetingId: v.id("meetings")
  },
  handler: async (ctx, {
    meetingId
  }) => {
    const meeting = await ctx.db.get(meetingId);
    if (!meeting) {
      throw new Error("Meeting not found");
    }
    const creator = await ctx.db.get(meeting.createdBy);
    return {
      ...meeting,
      creatorImage: creator?.imageUrl || "/default-avatar.png",
      creatorName: `${creator?.firstName || "Unknown"} ${creator?.lastName || "Organizer"}`
    };
  }
});
export const getUpcomingMeetingsByStream = query({
  args: {
    userId: v.id("users")
  },
  handler: async (ctx, {
    userId
  }) => {
    const user = await ctx.db.get(userId);
    if (!user || !user.staffStream) return [];
    const meetings = await ctx.db.query("meetings").collect();
    const relevantMeetings = meetings.filter(meeting => meeting.attendees.includes(userId) && meeting.meetingDate >= Date.now());
    const slots = await ctx.db.query("availability").filter(q => q.eq(q.field("workstream"), user.staffStream)).collect();
    const slotDates = new Set(slots.map(slot => new Date(slot.date).toDateString()));
    const filteredMeetings = relevantMeetings.filter(meeting => {
      const meetingDate = new Date(meeting.meetingDate).toDateString();
      return slotDates.has(meetingDate);
    });
    return filteredMeetings;
  }
});
export const getAttendees = query({
  args: {
    meetingId: v.id("meetings")
  },
  handler: async (ctx, {
    meetingId
  }) => {
    const meeting = await ctx.db.get(meetingId);
    if (!meeting) throw new Error("Meeting not found.");
    const attendees = await Promise.all(meeting.attendees.map(async userId => {
      const user = await ctx.db.get(userId);
      return user ? {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl || "/default-avatar.png",
        status: meeting.acceptedAttendees.includes(user._id) ? "accepted" : "pending"
      } : null;
    }));
    return attendees.filter(attendee => attendee !== null);
  }
});
export const deleteMeeting = mutation({
  args: {
    meetingId: v.id("meetings"),
    userId: v.id("users")
  },
  handler: async (ctx, {
    meetingId,
    userId
  }) => {
    const meeting = await ctx.db.get(meetingId);
    if (!meeting) throw new Error("Meeting not found");
    const user = await ctx.db.get(userId);
    const userName = user ? `${user.firstName} ${user.lastName}` : "The host";
    await ctx.db.delete(meetingId);
    for (const attendee of meeting.attendees) {
      await ctx.db.insert("notifications", {
        userId: attendee,
        message: `${userName} deleted the meeting "${meeting.title}".`,
        isRead: false,
        createdAt: Date.now(),
        type: "meeting_deleted"
      });
      const attendeeUser = await ctx.db.get(attendee);
      if (attendeeUser && attendeeUser.email) {
        await ctx.scheduler.runAfter(0, api.email.sendEmail, {
          to: attendeeUser.email,
          subject: `Meeting Deleted: ${meeting.title}`,
          html: `<p>${userName} has deleted the meeting "${meeting.title}".</p>`
        });
      }
    }
  }
});
export const getPastMeetings = query({
  args: {
    userId: v.id("users")
  },
  handler: async (ctx, {
    userId
  }) => {
    const meetings = await ctx.db.query("meetings").collect();
    return meetings.filter(meeting => (meeting.createdBy === userId || meeting.attendees.includes(userId)) && meeting.meetingDate < Date.now()).sort((a, b) => b.meetingDate - a.meetingDate);
  }
});
export const getCancelledMeetings = query({
  args: {
    userId: v.id("users")
  },
  handler: async (ctx, {
    userId
  }) => {
    const meetings = await ctx.db.query("meetings").collect();
    return meetings.filter(meeting => (meeting.createdBy === userId || meeting.attendees.includes(userId)) && meeting.status === "cancelled").sort((a, b) => b.meetingDate - a.meetingDate);
  }
});
export const setAvailability = mutation({
  args: {
    userId: v.id("users"),
    workstream: v.string(),
    day: v.string(),
    date: v.string(),
    startTime: v.string(),
    duration: v.number()
  },
  handler: async (ctx, {
    userId,
    workstream,
    day,
    date,
    startTime,
    duration
  }) => {
    const startHour = parseInt(startTime.split(":")[0]);
    if (startHour < 10 || startHour >= 16) {
      throw new Error("Slot must be between 10 AM and 4 PM.");
    }
    await ctx.db.insert("availability", {
      userId,
      workstream,
      day,
      date,
      startTime,
      duration,
      createdAt: Date.now()
    });
  }
});
export const getStaffAvailability = query({
  args: {
    userId: v.id("users"),
    workstream: v.string()
  },
  handler: async (ctx, {
    userId,
    workstream
  }) => {
    return await ctx.db.query("availability").filter(q => q.and(q.eq(q.field("userId"), userId), q.eq(q.field("workstream"), workstream))).collect();
  }
});
export const deactivateSlot = mutation({
  args: {
    slotId: v.id("availability"),
    deactivate: v.boolean()
  },
  handler: async (ctx, {
    slotId,
    deactivate
  }) => {
    const slot = await ctx.db.get(slotId);
    if (!slot) throw new Error("Slot not found.");
    await ctx.db.patch(slotId, {
      deactivated: deactivate
    });
    if (deactivate && slot.bookedBy) {
      const mda = await ctx.db.get(slot.bookedBy);
      if (mda?.email) {
        await ctx.scheduler.runAfter(0, api.email.sendEmail, {
          to: mda.email,
          subject: "Booked Slot Deactivated",
          html: `<p>Your booked slot on ${slot.date} at ${slot.startTime} has been deactivated.</p>`
        });
        await ctx.db.insert("notifications", {
          userId: mda._id,
          message: `Your booked slot on ${slot.date} at ${slot.startTime} was deactivated.`,
          isRead: false,
          createdAt: Date.now(),
          type: "slot_deactivated"
        });
      }
    }
  }
});
export const deleteSlot = mutation({
  args: {
    slotId: v.id("availability")
  },
  handler: async (ctx, {
    slotId
  }) => {
    await ctx.db.delete(slotId);
  }
});
export const getAllAvailableSlots = query({
  args: {},
  handler: async ctx => {
    return await ctx.db.query("availability").collect();
  }
});
export const getMyBookedSlots = query({
  args: {
    userId: v.id("users")
  },
  handler: async (ctx, {
    userId
  }) => {
    const slots = await ctx.db.query("availability").filter(q => q.eq(q.field("bookedBy"), userId)).collect();
    return slots;
  }
});
export const cancelSlot = mutation({
  args: {
    slotId: v.id("availability")
  },
  handler: async (ctx, {
    slotId
  }) => {
    const slot = await ctx.db.get(slotId);
    if (!slot || !slot.bookedBy) throw new Error("Slot not found or not booked.");
    const mda = await ctx.db.get(slot.bookedBy);
    const staff = await ctx.db.query("users").withIndex("byRole", q => q.eq("role", "staff")).collect();
    const staffInStream = staff.filter(s => s.staffStream === slot.workstream);
    await ctx.db.patch(slotId, {
      bookedBy: undefined
    });
    if (mda?.email) {
      await ctx.scheduler.runAfter(0, api.email.sendEmail, {
        to: mda.email,
        subject: "Slot Booking Cancelled",
        html: `<p>Your slot on ${slot.date} at ${slot.startTime} has been cancelled.</p>`
      });
      await ctx.db.insert("notifications", {
        userId: mda._id,
        message: `Your slot on ${slot.date} at ${slot.startTime} has been cancelled.`,
        isRead: false,
        createdAt: Date.now(),
        type: "meeting_cancelled"
      });
    }
    for (const s of staffInStream) {
      await ctx.scheduler.runAfter(0, api.email.sendEmail, {
        to: s.email,
        subject: "Slot Cancelled",
        html: `<p>The slot on ${slot.date} at ${slot.startTime} has been cancelled by the MDA.</p>`
      });
      await ctx.db.insert("notifications", {
        userId: s._id,
        message: `The slot on ${slot.date} at ${slot.startTime} has been cancelled.`,
        isRead: false,
        createdAt: Date.now(),
        type: "meeting_cancelled"
      });
    }
  }
});
export const bookSlot = mutation({
  args: {
    slotId: v.id("availability"),
    mdaId: v.id("users")
  },
  handler: async (ctx, {
    slotId,
    mdaId
  }) => {
    const slot = await ctx.db.get(slotId);
    const mda = await ctx.db.get(mdaId);
    if (!slot || slot.bookedBy || !mda) {
      throw new Error("Invalid slot or MDA.");
    }
    const staffUser = await ctx.db.get(slot.userId);
    if (!staffUser) {
      throw new Error("Staff user not found.");
    }
    await ctx.db.patch(slotId, {
      bookedBy: mdaId,
      bookedAt: Date.now(),
      mdaInfo: {
        firstName: mda.firstName,
        lastName: mda.lastName,
        jobTitle: mda.jobTitle,
        role: mda.role,
        mdaName: mda.mdaName,
        email: mda.email
      },
      staffInfo: {
        firstName: staffUser.firstName,
        lastName: staffUser.lastName,
        jobTitle: staffUser.jobTitle,
        role: staffUser.role,
        email: staffUser.email
      }
    });
    const meetingDetails = `${slot.date} at ${slot.startTime}`;
    await ctx.db.insert("notifications", {
      userId: mdaId,
      message: `You successfully booked a meeting with ${staffUser.firstName} ${staffUser.lastName} (${staffUser.jobTitle}) on ${meetingDetails}.`,
      isRead: false,
      createdAt: Date.now(),
      type: "meeting_booked"
    });
    await ctx.db.insert("notifications", {
      userId: staffUser._id,
      message: `Hello, ${mda.mdaName}, (${mda.firstName} ${mda.lastName}, ${mda.jobTitle}) has booked a meeting with you on ${meetingDetails}.`,
      isRead: false,
      createdAt: Date.now(),
      type: "meeting_booked"
    });
    await ctx.scheduler.runAfter(0, api.email.sendEmail, {
      to: mda.email,
      subject: "✅ Slot Booked Successfully",
      html: `
        <p>Hello ${mda.firstName},</p>
        <p>You have successfully booked a meeting with:</p>
        <ul>
          <li><strong>Name:</strong> ${staffUser.firstName} ${staffUser.lastName}</li>
          <li><strong>Job Title:</strong> ${staffUser.jobTitle}</li>
          <li><strong>Department:</strong> ${slot.workstream}</li>
          <li><strong>Date & Time:</strong> ${meetingDetails}</li>
        </ul>
        <p>Please be on time and prepared.</p>
      `
    });
    await ctx.scheduler.runAfter(0, api.email.sendEmail, {
      to: staffUser.email,
      subject: "📅 New Meeting Booked",
      html: `
        <p>Hello,</p>
        <p>${mda.mdaName} has booked a meeting with you. Here are the details:</p>
        <ul>
          <li><strong>Name:</strong> ${mda.firstName} ${mda.lastName}</li>
          <li><strong>Job Title:</strong> ${mda.jobTitle}</li>
          <li><strong>Date & Time:</strong> ${meetingDetails}</li>
        </ul>
        <p>Please be prepared for the session.</p>
      `
    });
  }
});
export const getUpcomingMeetings = query({
  args: {
    userId: v.id("users"),
    workstream: v.string()
  },
  handler: async (ctx, {
    userId,
    workstream
  }) => {
    const now = Date.now();
    const streamUsers = await ctx.db.query("users").filter(q => q.eq(q.field("staffStream"), workstream)).collect();
    const streamUserIds = streamUsers.map(u => u._id);
    const allMeetings = await ctx.db.query("meetings").filter(q => q.gte(q.field("meetingDate"), now)).collect();
    const filteredMeetings = allMeetings.filter(meeting => {
      const isCreatedByStreamUser = streamUserIds.includes(meeting.createdBy);
      const hasStreamAttendee = meeting.attendees.some(attId => streamUserIds.includes(attId));
      return isCreatedByStreamUser || hasStreamAttendee;
    });
    return filteredMeetings;
  }
});
export const getAvailableSlotsForStaff = query({
  args: {
    userId: v.id("users")
  },
  handler: async (ctx, {
    userId
  }) => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const slots = await ctx.db.query("availability").filter(q => q.and(q.eq(q.field("userId"), userId), q.eq(q.field("deactivated"), false), q.eq(q.field("bookedBy"), undefined), q.gte(q.field("date"), todayStr))).order("asc").collect();
    const now = new Date();
    const futureSlots = slots.filter(slot => {
      const slotDate = new Date(`${slot.date}T${slot.startTime}`);
      return slotDate > now;
    });
    return futureSlots;
  }
});