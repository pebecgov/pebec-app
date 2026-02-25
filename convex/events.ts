// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
//@ts-nocheck

import { mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow, filterAdminsForNotifications } from "./users";
import { v } from "convex/values";
import { PDFDocument, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { formatDate } from "@/lib/utils";
import { api } from "./_generated/api";
import sharp from "sharp";
export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    eventDate: v.number(),
    registrationDeadline: v.optional(v.number()),
    location: v.string(),
    host: v.string(),
    coverImageId: v.optional(v.id("_storage")),
    eventType: v.union(v.literal("vip"), v.literal("general"), v.literal("vip_and_general")),
    vipAccessCode: v.optional(v.string()),
    ticketLimit: v.optional(v.number()),
    vipTicketLimit: v.optional(v.number()),
    generalTicketLimit: v.optional(v.number()),
    isSaberEvent: v.optional(v.boolean()),
    customUrl: v.optional(v.string()),
    isSpecialEvent: v.optional(v.boolean()),
    hideOrganizationDesignation: v.optional(v.boolean()),
    requiresEligibilityModal: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    
    // Validate custom URL if provided
    if (args.customUrl) {
      // Check if custom URL is URL-safe (only alphanumeric, hyphens, underscores)
      const urlSafePattern = /^[a-zA-Z0-9-_]+$/;
      if (!urlSafePattern.test(args.customUrl)) {
        throw new Error("Custom URL can only contain letters, numbers, hyphens, and underscores");
      }
      
      // Check if custom URL is already taken
      const existingEvent = await ctx.db.query("events").withIndex("byCustomUrl", q => q.eq("customUrl", args.customUrl)).first();
      if (existingEvent) {
        throw new Error("Custom URL is already taken. Please choose a different one.");
      }
    }
    
    const createdAt = Date.now();
    const event = await ctx.db.insert("events", {
      title: args.title,
      description: args.description,
      eventDate: args.eventDate,
      registrationDeadline: args.registrationDeadline,
      location: args.location,
      host: args.host,
      coverImageId: args.coverImageId,
      createdBy: user._id,
      createdAt,
      updatedAt: createdAt,
      eventType: args.eventType,
      vipAccessCode: args.vipAccessCode,
      ticketLimit: args.ticketLimit,
      vipTicketLimit: args.vipTicketLimit,
      generalTicketLimit: args.generalTicketLimit,
      isSaberEvent: args.isSaberEvent || false,
      customUrl: args.customUrl,
      isSpecialEvent: args.isSpecialEvent || false,
      hideOrganizationDesignation: args.hideOrganizationDesignation || false,
      requiresEligibilityModal: args.requiresEligibilityModal ?? false
    });
    return event;
  }
});

// Mark existing event as SABER event
export const markEventAsSaber = mutation({
  args: {
    eventId: v.id("events")
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    // Only admins can mark events as SABER events
    if (user.role !== "admin") {
      throw new Error("Only admins can mark events as SABER events");
    }
    
    await ctx.db.patch(args.eventId, {
      isSaberEvent: true,
      updatedAt: Date.now()
    });
    
    return { success: true };
  }
});

// Remove SABER event designation
export const unmarkEventAsSaber = mutation({
  args: {
    eventId: v.id("events")
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    // Only admins can unmark events as SABER events
    if (user.role !== "admin") {
      throw new Error("Only admins can unmark events as SABER events");
    }
    
    await ctx.db.patch(args.eventId, {
      isSaberEvent: false,
      updatedAt: Date.now()
    });
    
    return { success: true };
  }
});
export const createEventQuestion = mutation({
  args: {
    eventId: v.id("events"),
    questionText: v.string(),
    questionType: v.union(v.literal("text"), v.literal("number"), v.literal("email"), v.literal("scale"), v.literal("radio"), v.literal("checkbox"), v.literal("textarea")),
    isRequired: v.optional(v.boolean()),
    options: v.optional(v.array(v.string())),
    section: v.optional(v.string()),
    order: v.optional(v.number())
  },
  handler: async (ctx, {
    eventId,
    questionText,
    questionType,
    isRequired,
    options,
    section,
    order
  }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const createdAt = Date.now();
    const question = await ctx.db.insert("event_questions", {
      eventId,
      questionText,
      questionType,
      isRequired: isRequired ?? false,
      options: options ?? undefined,
      section: section ?? undefined,
      order: order ?? undefined,
      createdBy: user._id,
      createdAt
    });
    return question;
  }
});

export const updateEventQuestion = mutation({
  args: {
    questionId: v.id("event_questions"),
    section: v.optional(v.string()),
    order: v.optional(v.number()),
    isRequired: v.optional(v.boolean())
  },
  handler: async (ctx, { questionId, section, order, isRequired }) => {
    await getCurrentUserOrThrow(ctx);
    const question = await ctx.db.get(questionId);
    if (!question) throw new Error("Question not found");
    const patch: { section?: string; order?: number; isRequired?: boolean } = {};
    if (section !== undefined) patch.section = section || undefined;
    if (order !== undefined) patch.order = order;
    if (isRequired !== undefined) patch.isRequired = isRequired;
    await ctx.db.patch(questionId, patch);
  }
});

export const getEventQuestions = query({
  args: {
    eventId: v.id("events")
  },
  handler: async (ctx, {
    eventId
  }) => {
    const questions = await ctx.db.query("event_questions").withIndex("byEvent", q => q.eq("eventId", eventId)).collect();
    return questions;
  }
});
export const rsvpEvent = mutation({
  args: {
    eventId: v.id("events"),
    answers: v.array(v.object({
      questionId: v.id("event_questions"),
      answer: v.string()
    })),
    structuredResponses: v.optional(v.any()), // For special events: { questionId: { answer: string | string[], questionText: string } }
    userId: v.optional(v.id("users")),
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    organization: v.optional(v.string()),
    designation: v.optional(v.string()),
    qrCode: v.string(),
    ticketPdfId: v.id("_storage"),
    isVip: v.optional(v.boolean())
  },
  handler: async (ctx, {
    eventId,
    answers,
    structuredResponses,
    userId,
    email,
    qrCode,
    ticketPdfId,
    isVip,
    firstName,
    lastName,
    phone,
    organization,
    designation
  }) => {
    console.log("📌 RSVP Mutation triggered for Event ID:", eventId);
    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("❌ Event not found");
    const registrations = await ctx.db.query("event_registrations").filter(q => q.eq(q.field("eventId"), eventId)).collect();
    const count = registrations.length;
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const index = String(count + 1).padStart(3, "0");
    const ticketNumber = `PEBEC-EV-${day}${month}${year}-${index}`;
    const registrationId = await ctx.db.insert("event_registrations", {
      eventId,
      userId: userId ?? undefined,
      email: email ?? undefined,
      firstName: firstName ?? undefined,
      lastName: lastName ?? undefined,
      phone: phone ?? undefined,
      organization: organization ?? undefined,
      designation: designation ?? undefined,
      questionnaireAnswers: answers.map(a => a.answer),
      structuredResponses: structuredResponses ?? undefined,
      ticketNumber,
      qrCode,
      ticketPdfId,
      isVip: isVip ?? false,
      registeredAt: Date.now()
    });
    console.log(`✅ RSVP stored. Registration ID: ${registrationId} — Ticket: ${ticketNumber}`);
    let userEmail = email ?? "";
    if (!userEmail && userId) {
      const user = await ctx.db.get(userId);
      userEmail = user?.email ?? "";
    }
    if (userEmail) {
      await ctx.scheduler.runAfter(0, api.sendTicketemail.sendTicketEmail, {
        to: userEmail,
        eventTitle: event.title,
        ticketPdfId
      });
      console.log("✅ Ticket email scheduled.");
    } else {
      console.warn("⚠️ No email found — ticket email skipped.");
    }
    const allAdmins = await ctx.db.query("users").withIndex("byRole", q => q.eq("role", "admin")).collect();
    const admins = filterAdminsForNotifications(allAdmins);
    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin._id,
        eventId,
        message: `New RSVP for "${event.title}" – Ticket: ${ticketNumber}`,
        isRead: false,
        createdAt: Date.now(),
        type: "new_registration"
      });
      if (admin.email) {
        const emailHtml = `
      <p>Hello ${admin.firstName || 'Admin'},</p>
      <p>A new registration was made for your event: <strong>${event.title}</strong>.</p>
      <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
      <p><strong>Registrant:</strong> ${firstName} ${lastName} (${email})</p>
    `;
        await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
          to: admin.email,
          subject: `New RSVP for "${event.title}"`,
          html: emailHtml
        });
      }
    }
    return {
      registrationId,
      ticketNumber
    };
  }
});

// Submit eligibility pop-up (participant info + foreign ownership) for events with requiresEligibilityModal
export const submitEligibilityForm = mutation({
  args: {
    eventId: v.id("events"),
    fullName: v.string(),
    companyName: v.string(),
    jobTitle: v.optional(v.string()),
    email: v.string(),
    phone: v.string(),
    foreignOwnershipAnswer: v.union(v.literal("yes"), v.literal("no"), v.literal("not_sure"))
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");
    const status = args.foreignOwnershipAnswer === "yes" ? "eligible" : "pending_review";
    await ctx.db.insert("event_eligibility_submissions", {
      eventId: args.eventId,
      fullName: args.fullName.trim(),
      companyName: args.companyName.trim(),
      jobTitle: args.jobTitle?.trim() || undefined,
      email: args.email.trim().toLowerCase(),
      phone: args.phone.trim(),
      foreignOwnershipAnswer: args.foreignOwnershipAnswer,
      status,
      submittedAt: Date.now()
    });
    return { success: true, status };
  }
});

export const getUserTickets = query({
  args: {
    clerkUserId: v.string()
  },
  handler: async (ctx, {
    clerkUserId
  }) => {
    const user = await ctx.db.query("users").withIndex("byClerkUserId", q => q.eq("clerkUserId", clerkUserId)).first();
    if (!user) throw new Error("User not found");
    const tickets = await ctx.db.query("event_registrations").withIndex("byUser", q => q.eq("userId", user._id)).collect();
    return Promise.all(tickets.map(async ticket => ({
      ...ticket,
      pdfUrl: ticket.ticketPdfId ? await ctx.storage.getUrl(ticket.ticketPdfId) : null,
      event: await ctx.db.get(ticket.eventId)
    })));
  }
});
export const getEventById = query({
  args: {
    eventId: v.id("events")
  },
  handler: async (ctx, {
    eventId
  }) => {
    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Event not found");
    return event;
  }
});

export const getEventByCustomUrl = query({
  args: {
    customUrl: v.string()
  },
  handler: async (ctx, {
    customUrl
  }) => {
    const event = await ctx.db.query("events").withIndex("byCustomUrl", q => q.eq("customUrl", customUrl)).first();
    if (!event) {
      return null;
    }
    const createdBy = await ctx.db.get(event.createdBy);
    const registrations = await ctx.db.query("event_registrations").withIndex("byEvent", q => q.eq("eventId", event._id)).collect();
    const vipTicketsSold = registrations.filter(r => r.isVip).length;
    const generalTicketsSold = registrations.filter(r => !r.isVip).length;
    return {
      ...event,
      createdBy,
      vipTicketsSold,
      generalTicketsSold,
      ...(event.coverImageId ? {
        coverImageUrl: (await ctx.storage.getUrl(event.coverImageId)) ?? ""
      } : {})
    };
  }
});

export const checkCustomUrlAvailability = query({
  args: {
    customUrl: v.string()
  },
  handler: async (ctx, {
    customUrl
  }) => {
    const existingEvent = await ctx.db.query("events").withIndex("byCustomUrl", q => q.eq("customUrl", customUrl)).first();
    return !existingEvent;
  }
});
export const getAllEvents = query({
  args: {},
  handler: async ctx => {
    const events = await ctx.db.query("events").collect();
    return events;
  }
});
export const getEvents = query({
  args: {},
  handler: async ctx => {
    const events = await ctx.db.query("events").order("desc").collect();
    return Promise.all(events.map(async event => {
      const createdBy = await ctx.db.get(event.createdBy);
      const registrations = await ctx.db.query("event_registrations").withIndex("byEvent", q => q.eq("eventId", event._id)).collect();
      const vipTicketsSold = registrations.filter(r => r.isVip).length;
      const generalTicketsSold = registrations.filter(r => !r.isVip).length;
      return {
        ...event,
        createdBy,
        vipTicketsSold,
        generalTicketsSold,
        ...(event.coverImageId ? {
          coverImageUrl: (await ctx.storage.getUrl(event.coverImageId)) ?? ""
        } : {})
      };
    }));
  }
});

// Get SABER-specific events
export const getSaberEvents = query({
  args: {},
  handler: async ctx => {
    const events = await ctx.db.query("events")
      .withIndex("bySaberEvent", q => q.eq("isSaberEvent", true))
      .order("desc")
      .collect();
    
    return Promise.all(events.map(async event => {
      const createdBy = await ctx.db.get(event.createdBy);
      const registrations = await ctx.db.query("event_registrations")
        .withIndex("byEvent", q => q.eq("eventId", event._id))
        .collect();
      const vipTicketsSold = registrations.filter(r => r.isVip).length;
      const generalTicketsSold = registrations.filter(r => !r.isVip).length;
      
      return {
        ...event,
        createdBy,
        vipTicketsSold,
        generalTicketsSold,
        ...(event.coverImageId ? {
          coverImageUrl: (await ctx.storage.getUrl(event.coverImageId)) ?? ""
        } : {})
      };
    }));
  }
});
export const saveTicketPdf = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.optional(v.id("users")),
    storageId: v.id("_storage")
  },
  handler: async (ctx, {
    eventId,
    userId,
    storageId
  }) => {
    if (!userId) {
      throw new Error("❌ No user ID provided.");
    }
    const registration = await ctx.db.query("event_registrations").withIndex("byEvent", q => q.eq("eventId", eventId)).filter(q => q.eq(q.field("userId"), userId)).first();
    if (!registration) {
      throw new Error("❌ No registration found for this event and user.");
    }
    await ctx.db.patch(registration._id, {
      ticketPdfId: storageId
    });
    console.log(`✅ Ticket PDF saved for user ${userId} in event ${eventId}`);
  }
});
export const getTicketPdf = query({
  args: {
    eventId: v.id("events"),
    userId: v.optional(v.id("users"))
  },
  handler: async (ctx, {
    eventId,
    userId
  }) => {
    if (!userId) return null;
    const registration = await ctx.db.query("event_registrations").withIndex("byEvent", q => q.eq("eventId", eventId)).filter(q => q.eq(q.field("userId"), userId)).first();
    if (!registration || !registration.ticketPdfId) {
      return null;
    }
    return ctx.storage.getUrl(registration.ticketPdfId);
  }
});
export const getEventRegistration = query({
  args: {
    ticketNumber: v.string()
  },
  handler: async (ctx, {
    ticketNumber
  }) => {
    const registration = await ctx.db.query("event_registrations").withIndex("byTicketNumber", q => q.eq("ticketNumber", ticketNumber)).first();
    if (!registration) {
      console.warn(`⚠️ No event registration found for ticket: ${ticketNumber}`);
      return null;
    }
    const eventId = registration.eventId;
    const event = eventId ? await ctx.db.get(eventId) : null;
    if (!event) {
      console.warn(`⚠️ No event found for ID: ${eventId}`);
    }
    const coverImageUrl = event?.coverImageId ? await ctx.storage.getUrl(event.coverImageId) : null;
    console.log(`📷 Cover Image URL fetched: ${coverImageUrl}`);
    const questions = await ctx.db.query("event_questions").withIndex("byEvent", q => q.eq("eventId", eventId)).collect();
    console.log(`📜 Found ${questions.length} questions for event ID: ${eventId}`);
    const userResponses = questions.map((q, index) => ({
      questionText: q.questionText,
      answer: registration.questionnaireAnswers?.[index] ?? "No Answer"
    }));
    return {
      ...registration,
      event: event ? {
        ...event,
        eventDate: event.eventDate,
        coverImageUrl
      } : {
        title: "Unknown Event",
        eventDate: null,
        coverImageUrl: null,
        location: "Unknown Location",
        host: "Unknown Host"
      },
      questions: questions || [],
      userResponses: userResponses || []
    };
  }
});

export const checkInAttendee = mutation({
  args: {
    ticketNumber: v.string()
  },
  handler: async (ctx, { ticketNumber }) => {
    const registration = await ctx.db.query("event_registrations").withIndex("byTicketNumber", q => q.eq("ticketNumber", ticketNumber)).first();
    if (!registration) {
      throw new Error("Ticket not found");
    }
    if (registration.checkedInAt) {
      throw new Error("Already checked in");
    }
    // Check if event date has passed - allow check-in only on or after event date
    const event = await ctx.db.get(registration.eventId);
    if (!event) {
      throw new Error("Event not found");
    }
    const eventDate = new Date(event.eventDate);
    const now = new Date();
    // Compare dates (ignore time) - allow check-in on event day or after
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (today < eventDay) {
      throw new Error(`Check-in is only available on or after the event date: ${eventDay.toLocaleDateString()}`);
    }
    await ctx.db.patch(registration._id, {
      checkedInAt: Date.now()
    });
    return { success: true, checkedInAt: Date.now() };
  }
});
export const getEventResponses = query({
  args: {},
  handler: async ctx => {
    const events = await ctx.db.query("events").collect();
    const responses = await ctx.db.query("event_registrations").collect();
    return events.map(event => ({
      eventName: event.title,
      responses: responses.filter(r => r.eventId === event._id).length
    }));
  }
});
export const getTotalEvents = query({
  args: {},
  handler: async ctx => {
    const events = await ctx.db.query("events").collect();
    return events.length;
  }
});
export const getEventRegistrations = query({
  args: {
    eventId: v.id("events"),
    ticketType: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    let registrations = await ctx.db.query("event_registrations").withIndex("byEvent", q => q.eq("eventId", args.eventId)).collect();
    if (args.ticketType === "vip") {
      registrations = registrations.filter(reg => reg.isVip === true);
    } else if (args.ticketType === "general") {
      registrations = registrations.filter(reg => reg.isVip !== true);
    }
    return registrations;
  }
});
export const getFilteredEvents = query({
  args: {
    eventType: v.optional(v.string()),
    eventName: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    let events = await ctx.db.query('events').collect();
    if (args.eventType) {
      events = events.filter(event => event.eventType === args.eventType);
    }
    if (args.eventName) {
      const nameLower = args.eventName.toLowerCase();
      events = events.filter(event => event.title.toLowerCase().includes(nameLower));
    }
    if (args.startDate) {
      const start = new Date(args.startDate);
      events = events.filter(event => new Date(event.eventDate) >= start);
    }
    if (args.endDate) {
      const end = new Date(args.endDate);
      events = events.filter(event => new Date(event.eventDate) <= end);
    }
    return events;
  }
});
export const getEventDetails = query({
  args: {
    eventId: v.id('events')
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;
    const registrations = await ctx.db.query("event_registrations").withIndex("byEvent", q => q.eq("eventId", args.eventId)).collect();
    const vipCount = registrations.filter(reg => reg.isVip === true).length;
    const generalCount = registrations.filter(reg => reg.isVip !== true).length;
    return {
      ...event,
      vipTicketsSold: vipCount,
      generalTicketsSold: generalCount,
      totalAttendees: registrations.length,
      registrations
    };
  }
});
export const getAllEventsWithStats = query({
  args: {},
  handler: async ctx => {
    const events = await ctx.db.query("events").order("desc").collect();
    return Promise.all(events.map(async event => {
      const registrations = await ctx.db.query("event_registrations").withIndex("byEvent", q => q.eq("eventId", event._id)).collect();
      const vipCount = registrations.filter(reg => reg.isVip === true).length;
      const generalCount = registrations.filter(reg => reg.isVip !== true).length;
      return {
        ...event,
        vipTicketsSold: vipCount,
        generalTicketsSold: generalCount,
        totalAttendees: registrations.length
      };
    }));
  }
});
export const getEventRegistrationsWithUserDetails = query({
  args: {
    eventId: v.id('events'),
    ticketType: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    let registrations = await ctx.db.query('event_registrations').withIndex('byEvent', q => q.eq('eventId', args.eventId)).collect();
    if (args.ticketType === 'vip') {
      registrations = registrations.filter(r => r.isVip);
    } else if (args.ticketType === 'general') {
      registrations = registrations.filter(r => !r.isVip);
    }
    return await Promise.all(registrations.map(async reg => {
      let firstName = reg.firstName || '';
      let lastName = reg.lastName || '';
      let email = reg.email || '';
      let phone = reg.phone || '';
      if (reg.userId) {
        const user = await ctx.db.get(reg.userId);
        if (user) {
          firstName = user.firstName || firstName;
          lastName = user.lastName || lastName;
          email = user.email || email;
          phone = user.phoneNumber || phone;
        }
      }
      return {
        ...reg,
        firstName,
        lastName,
        email,
        phone
      };
    }));
  }
});
export const getRegistrationByEmail = query({
  args: {
    eventId: v.id("events"),
    email: v.string()
  },
  handler: async (ctx, {
    eventId,
    email
  }) => {
    const registration = await ctx.db.query("event_registrations").withIndex("byEvent", q => q.eq("eventId", eventId)).filter(q => q.eq(q.field("email"), email.toLowerCase())).first();
    return registration || null;
  }
});
export const toggleSignUps = mutation({
  args: {
    eventId: v.id("events"),
    disable: v.boolean()
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventId, {
      signUpsDisabled: args.disable
    });
  }
});
export const editEvent = mutation({
  args: {
    eventId: v.id("events"),
    title: v.string(),
    description: v.string(),
    eventDate: v.number(),
    registrationDeadline: v.optional(v.number()),
    location: v.string(),
    host: v.string(),
    coverImageId: v.optional(v.id("_storage")),
    eventType: v.union(v.literal("vip"), v.literal("general"), v.literal("vip_and_general")),
    vipAccessCode: v.optional(v.string()),
    ticketLimit: v.optional(v.number()),
    vipTicketLimit: v.optional(v.number()),
    generalTicketLimit: v.optional(v.number()),
    customUrl: v.optional(v.string()),
    isSaberEvent: v.optional(v.boolean()),
    isSpecialEvent: v.optional(v.boolean()),
    hideOrganizationDesignation: v.optional(v.boolean()),
    requiresEligibilityModal: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const {
      eventId,
      customUrl,
      hideOrganizationDesignation,
      requiresEligibilityModal,
      ...updateData
    } = args;
    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Event not found");
    // Validate custom URL uniqueness when provided (exclude current event)
    if (customUrl !== undefined) {
      const urlSafePattern = /^[a-zA-Z0-9-_]+$/;
      if (customUrl && !urlSafePattern.test(customUrl)) {
        throw new Error("Custom URL can only contain letters, numbers, hyphens, and underscores");
      }
      if (customUrl) {
        const existing = await ctx.db.query("events").withIndex("byCustomUrl", q => q.eq("customUrl", customUrl)).first();
        if (existing && existing._id !== eventId) {
          throw new Error("Custom URL is already taken. Please choose a different one.");
        }
      }
    }
    const changes: string[] = [];
    if (event.title !== updateData.title) changes.push(`Title: "${event.title}" → "${updateData.title}"`);
    if (event.description !== updateData.description) changes.push(`Description was updated`);
    if (event.eventDate !== updateData.eventDate) changes.push(`Event date: ${new Date(event.eventDate).toLocaleString()} → ${new Date(updateData.eventDate).toLocaleString()}`);
    if (event.registrationDeadline !== updateData.registrationDeadline) changes.push(`Registration deadline was updated`);
    if (event.location !== updateData.location) changes.push(`Location: "${event.location}" → "${updateData.location}"`);
    if (event.host !== updateData.host) changes.push(`Host: "${event.host}" → "${updateData.host}"`);
    if (event.eventType !== updateData.eventType) changes.push(`Type: "${event.eventType}" → "${updateData.eventType}"`);
    await ctx.db.patch(eventId, {
      ...updateData,
      ...(customUrl !== undefined && { customUrl: customUrl || undefined }),
      ...(args.isSaberEvent !== undefined && { isSaberEvent: args.isSaberEvent }),
      ...(args.isSpecialEvent !== undefined && { isSpecialEvent: args.isSpecialEvent }),
      ...(hideOrganizationDesignation !== undefined && { hideOrganizationDesignation }),
      ...(requiresEligibilityModal !== undefined && { requiresEligibilityModal }),
      updatedAt: Date.now()
    });
    const registrations = await ctx.db.query("event_registrations").withIndex("byEvent", q => q.eq("eventId", eventId)).collect();
    const changeDetails = changes.length ? `<ul>${changes.map(c => `<li>${c}</li>`).join("")}</ul>` : "<p>No major details were changed.</p>";
    for (const reg of registrations) {
      if (reg.email) {
        await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
          to: reg.email,
          subject: `Event "${updateData.title}" has been updated`,
          html: `
            <p>Hello,</p>
            <p>The event <strong>${updateData.title}</strong> has recently been updated. Please find the changes below:</p>
            ${changeDetails}
            <p>Thank you for your interest.</p>
          `
        });
      }
    }
  }
});
// Get special event registrations with structured responses
export const getSpecialEventResponses = query({
  args: {
    eventId: v.id("events")
  },
  handler: async (ctx, { eventId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin") {
      throw new Error("Only admins can view event responses");
    }
    
    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Event not found");
    
    const registrations = await ctx.db.query("event_registrations")
      .withIndex("byEvent", q => q.eq("eventId", eventId))
      .collect();
    
    const questions = await ctx.db.query("event_questions")
      .withIndex("byEvent", q => q.eq("eventId", eventId))
      .collect();
    
    // Sort questions by section and order
    const sortedQuestions = questions.sort((a, b) => {
      if (a.section !== b.section) {
        return (a.section || "").localeCompare(b.section || "");
      }
      return (a.order || 0) - (b.order || 0);
    });
    
    const registrationsWithUrls = await Promise.all(
      registrations.map(async (reg) => ({
        ...reg,
        ticketPdfUrl: reg.ticketPdfId ? await ctx.storage.getUrl(reg.ticketPdfId) : null
      }))
    );

    return {
      event,
      questions: sortedQuestions,
      registrations: registrationsWithUrls
    };
  }
});

export const deleteEvent = mutation({
  args: {
    eventId: v.id("events")
  },
  handler: async (ctx, {
    eventId
  }) => {
    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Event not found");
    const registrations = await ctx.db.query("event_registrations").withIndex("byEvent", q => q.eq("eventId", eventId)).collect();
    for (const reg of registrations) {
      if (reg.email) {
        await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
          to: reg.email,
          subject: `Event "${event.title}" has been canceled`,
          html: `<p>We're sorry to inform you that the event <strong>${event.title}</strong> has been canceled.</p>`
        });
      }
      await ctx.db.delete(reg._id);
    }
    await ctx.db.delete(eventId);
  }
});