import { mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users";
import { v } from "convex/values";
import { PDFDocument, rgb } from 'pdf-lib';  // We will no longer use fonts
import QRCode from 'qrcode';
import { formatDate } from "@/lib/utils";
import { api } from "./_generated/api";
import sharp from "sharp";


export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    eventDate: v.number(),
    location: v.string(),
    host: v.string(),
    coverImageId: v.optional(v.id("_storage")),
    eventType: v.union(v.literal("vip"), v.literal("general"), v.literal("vip_and_general")),
    vipAccessCode: v.optional(v.string()),
    ticketLimit: v.optional(v.number()),

    // ✅ ADD THESE TWO:
    vipTicketLimit: v.optional(v.number()),
    generalTicketLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const createdAt = Date.now();

    const event = await ctx.db.insert("events", {
      title: args.title,
      description: args.description,
      eventDate: args.eventDate,
      location: args.location,
      host: args.host,
      coverImageId: args.coverImageId,
      createdBy: user._id,
      createdAt,
      updatedAt: createdAt,
      eventType: args.eventType,
      vipAccessCode: args.vipAccessCode,
      ticketLimit: args.ticketLimit,

      // ✅ PASS THESE TO DATABASE:
      vipTicketLimit: args.vipTicketLimit,
      generalTicketLimit: args.generalTicketLimit,
    });

    return event;
  },
});


export const createEventQuestion = mutation({
  args: {
    eventId: v.id("events"),  
    questionText: v.string(),  
    questionType: v.union(
      v.literal("text"),
      v.literal("number"),
      v.literal("email"),
      v.literal("scale")
    ),
  },
  handler: async (ctx, { eventId, questionText, questionType }) => {
    const user = await getCurrentUserOrThrow(ctx);  // Ensure only the admin can create questions
  
    const createdAt = Date.now();
    const question = await ctx.db.insert("event_questions", {
      eventId,
      questionText,
      questionType,
      createdBy: user._id,
      createdAt,
    });
  
    return question; 
  },
});

export const getEventQuestions = query({
  args: { eventId: v.id("events") },  
  handler: async (ctx, { eventId }) => {
    const questions = await ctx.db.query("event_questions")
      .withIndex("byEvent", (q) => q.eq("eventId", eventId))
      .collect();
  
    return questions;  
  },
});


export const rsvpEvent = mutation({
  args: {
    eventId: v.id("events"),
    answers: v.array(
      v.object({
        questionId: v.id("event_questions"),
        answer: v.string(),
      })
    ),
    userId: v.optional(v.id("users")),
    email: v.optional(v.string()),

    firstName: v.optional(v.string()), // ✅ New
    lastName: v.optional(v.string()),  // ✅ New
    phone: v.optional(v.string()),     // ✅ New

    qrCode: v.string(),
    ticketPdfId: v.id("_storage"),
    isVip: v.optional(v.boolean()),
  },

  handler: async (
    ctx,
    { eventId, answers, userId, email, qrCode, ticketPdfId, isVip, firstName, lastName, phone }
  ) => {
    console.log("📌 RSVP Mutation triggered for Event ID:", eventId);

    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("❌ Event not found");

    // 🎫 Generate Unique Ticket Number per Event
    const registrations = await ctx.db
      .query("event_registrations")
      .filter((q) => q.eq(q.field("eventId"), eventId))
      .collect();

    const count = registrations.length;
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const index = String(count + 1).padStart(3, "0");
    const ticketNumber = `PEBEC-EV-${day}${month}${year}-${index}`;

    // 📝 Insert into database
    const registrationId = await ctx.db.insert("event_registrations", {
      eventId,
      userId: userId ?? undefined,
      email: email ?? undefined,
      firstName: firstName ?? undefined,
      lastName: lastName ?? undefined,
      phone: phone ?? undefined,
      questionnaireAnswers: answers.map((a) => a.answer),
      ticketNumber,
      qrCode,
      ticketPdfId,
      isVip: isVip ?? false,
      registeredAt: Date.now(),
    });

    console.log(`✅ RSVP stored. Registration ID: ${registrationId} — Ticket: ${ticketNumber}`);

    // 📧 Email logic
    let userEmail = email ?? "";
    if (!userEmail && userId) {
      const user = await ctx.db.get(userId);
      userEmail = user?.email ?? "";
    }

    if (userEmail) {
      await ctx.scheduler.runAfter(0, api.sendTicketemail.sendTicketEmail, {
        to: userEmail,
        eventTitle: event.title,
        ticketPdfId,
      });
      console.log("✅ Ticket email scheduled.");
    } else {
      console.warn("⚠️ No email found — ticket email skipped.");
    }

// ✅ Notify all admins
const admins = await ctx.db
  .query("users")
  .withIndex("byRole", (q) => q.eq("role", "admin"))
  .collect();

for (const admin of admins) {
  // Send notification
  await ctx.db.insert("notifications", {
    userId: admin._id,
    eventId,
    message: `New RSVP for "${event.title}" – Ticket: ${ticketNumber}`,
    isRead: false,
    createdAt: Date.now(),
    type: "new_registration",
  });

  // Send email
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
      html: emailHtml,
    });
  }
}

    

    return { registrationId, ticketNumber };
  },
});





export const getUserTickets = query({
  args: { clerkUserId: v.string() }, // ✅ Accept Clerk's User ID
  handler: async (ctx, { clerkUserId }) => {
    // ✅ Find Convex User ID from Clerk User ID
    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .first();

    if (!user) throw new Error("User not found");

    // ✅ Fetch Tickets Using Convex User ID
    const tickets = await ctx.db
      .query("event_registrations")
      .withIndex("byUser", (q) => q.eq("userId", user._id))
      .collect();

    return Promise.all(
      tickets.map(async (ticket) => ({
        ...ticket,
        pdfUrl: ticket.ticketPdfId ? await ctx.storage.getUrl(ticket.ticketPdfId) : null,
        event: await ctx.db.get(ticket.eventId),
      }))
    );
  },
});



export const getEventById = query({
    args: { eventId: v.id("events") },
    handler: async (ctx, { eventId }) => {
      const event = await ctx.db.get(eventId);
      if (!event) throw new Error("Event not found");
      return event;
    },
  });



  export const getAllEvents = query({
    args: {},
    handler: async (ctx) => {
      const events = await ctx.db.query("events").collect();
      return events;  // Return all events
    },
  });



  export const getEvents = query({
    args: {},
    handler: async (ctx) => {
      const events = await ctx.db.query("events").order("desc").collect();
  
      return Promise.all(
        events.map(async (event) => {
          const createdBy = await ctx.db.get(event.createdBy);
  
          // ✅ Fetch registrations for this event
          const registrations = await ctx.db
            .query("event_registrations")
            .withIndex("byEvent", (q) => q.eq("eventId", event._id))
            .collect();
  
          const vipTicketsSold = registrations.filter((r) => r.isVip).length;
          const generalTicketsSold = registrations.filter((r) => !r.isVip).length;
  
          return {
            ...event,
            createdBy,
            vipTicketsSold,
            generalTicketsSold,
            ...(event.coverImageId
              ? {
                  coverImageUrl:
                    (await ctx.storage.getUrl(event.coverImageId)) ?? "",
                }
              : {}),
          };
        })
      );
    },
  });
  

 
  

  
  export const saveTicketPdf = mutation({
    args: { 
      eventId: v.id("events"), 
      userId: v.optional(v.id("users")), 
      storageId: v.id("_storage") 
    },
    handler: async (ctx, { eventId, userId, storageId }) => {
      if (!userId) {
        throw new Error("❌ No user ID provided.");
      }
  
      // ✅ Find the user's event registration
      const registration = await ctx.db
        .query("event_registrations")
        .withIndex("byEvent", (q) => q.eq("eventId", eventId))
        .filter((q) => q.eq(q.field("userId"), userId)) // ✅ Use q.field() to avoid type errors
        .first();
  
      if (!registration) {
        throw new Error("❌ No registration found for this event and user.");
      }
  
      // ✅ Save ticket PDF reference
      await ctx.db.patch(registration._id, { ticketPdfId: storageId });
  
      console.log(`✅ Ticket PDF saved for user ${userId} in event ${eventId}`);
    },
  });
  

  export const getTicketPdf = query({
    args: { 
      eventId: v.id("events"), 
      userId: v.optional(v.id("users")) 
    },
    handler: async (ctx, { eventId, userId }) => {
      if (!userId) return null;
  
      // ✅ Corrected userId type inside filter()
      const registration = await ctx.db
        .query("event_registrations")
        .withIndex("byEvent", (q) => q.eq("eventId", eventId))
        .filter((q) => q.eq(q.field("userId"), userId)) // ✅ Use q.field() to match userId properly
        .first();
  
      if (!registration || !registration.ticketPdfId) {
        return null;
      }
  
      return ctx.storage.getUrl(registration.ticketPdfId);
    },
  });



  export const getEventRegistration = query({
    args: { ticketNumber: v.string() },
    handler: async (ctx, { ticketNumber }) => {
      const registration = await ctx.db
        .query("event_registrations")
        .withIndex("byTicketNumber", (q) => q.eq("ticketNumber", ticketNumber))
        .first();
  
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
      // ✅ Fetch event questions
      const questions = await ctx.db
  .query("event_questions")
  .withIndex("byEvent", (q) => q.eq("eventId", eventId))
  .collect();

console.log(`📜 Found ${questions.length} questions for event ID: ${eventId}`);

const userResponses = questions.map((q, index) => ({
  questionText: q.questionText,
  answer: registration.questionnaireAnswers?.[index] ?? "No Answer",
}));
  
return {
  ...registration,
  event: event
    ? {
        ...event,
        eventDate: event.eventDate,
        coverImageUrl,
      }
    : {
        title: "Unknown Event",
        eventDate: null,
        coverImageUrl: null,
        location: "Unknown Location", // ✅ Added default location
        host: "Unknown Host", // ✅ Added default host
      },
  questions: questions || [],
  userResponses: userResponses || [],
};

    },
  });
  
  
  
  
  
  export const getEventResponses = query({
    args: {},
    handler: async (ctx) => {
      const events = await ctx.db.query("events").collect();
      const responses = await ctx.db.query("event_registrations").collect();
  
      return events.map((event) => ({
        eventName: event.title,
        responses: responses.filter((r) => r.eventId === event._id).length,
      }));
    },
  });
  


  // ✅ Get total number of events
export const getTotalEvents = query({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db.query("events").collect();
    return events.length;
  },
});


export const getEventRegistrations = query({
  args: {
    eventId: v.id("events"),
    ticketType: v.optional(v.string()), // "vip" or "general"
  },
  handler: async (ctx, args) => {
    let registrations = await ctx.db
      .query("event_registrations")
      .withIndex("byEvent", (q) => q.eq("eventId", args.eventId))
      .collect();

    if (args.ticketType === "vip") {
      registrations = registrations.filter((reg) => reg.isVip === true);
    } else if (args.ticketType === "general") {
      registrations = registrations.filter((reg) => reg.isVip !== true);
    }

    return registrations;
  },
});




export const getFilteredEvents = query({
  args: {
    eventType: v.optional(v.string()),
    eventName: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
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
  },
});



export const getEventDetails = query({
  args: { eventId: v.id('events') },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;

    const registrations = await ctx.db
      .query("event_registrations")
      .withIndex("byEvent", (q) => q.eq("eventId", args.eventId))
      .collect();

    const vipCount = registrations.filter((reg) => reg.isVip === true).length;
    const generalCount = registrations.filter((reg) => reg.isVip !== true).length;

    return {
      ...event,
      vipTicketsSold: vipCount,
      generalTicketsSold: generalCount,
      totalAttendees: registrations.length,
      registrations, // optionally include all for view
    };
  },
});




export const getAllEventsWithStats = query({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db.query("events").order("desc").collect();

    return Promise.all(
      events.map(async (event) => {
        const registrations = await ctx.db
          .query("event_registrations")
          .withIndex("byEvent", (q) => q.eq("eventId", event._id))
          .collect();

        const vipCount = registrations.filter((reg) => reg.isVip === true).length;
        const generalCount = registrations.filter((reg) => reg.isVip !== true).length;

        return {
          ...event,
          vipTicketsSold: vipCount,
          generalTicketsSold: generalCount,
          totalAttendees: registrations.length,
        };
      })
    );
  },
});


export const getEventRegistrationsWithUserDetails = query({
  args: {
    eventId: v.id('events'),
    ticketType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let registrations = await ctx.db
      .query('event_registrations')
      .withIndex('byEvent', (q) => q.eq('eventId', args.eventId))
      .collect();

    if (args.ticketType === 'vip') {
      registrations = registrations.filter((r) => r.isVip);
    } else if (args.ticketType === 'general') {
      registrations = registrations.filter((r) => !r.isVip);
    }

    return await Promise.all(
      registrations.map(async (reg) => {
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
          phone,
        };
      })
    );
  },
});



export const getRegistrationByEmail = query({
  args: {
    eventId: v.id("events"),
    email: v.string(),
  },
  handler: async (ctx, { eventId, email }) => {
    const registration = await ctx.db
      .query("event_registrations")
      .withIndex("byEvent", (q) => q.eq("eventId", eventId))
      .filter((q) => q.eq(q.field("email"), email.toLowerCase()))
      .first();

    return registration || null;
  },
});



export const toggleSignUps = mutation({
  args: {
    eventId: v.id("events"),
    disable: v.boolean(), // true to disable, false to enable
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventId, {
      signUpsDisabled: args.disable,
    });
  },
});





export const editEvent = mutation({
  args: {
    eventId: v.id("events"),
    title: v.string(),
    description: v.string(),
    eventDate: v.number(),
    location: v.string(),
    host: v.string(),
    coverImageId: v.optional(v.id("_storage")),
    eventType: v.union(
      v.literal("vip"),
      v.literal("general"),
      v.literal("vip_and_general")
    ),
    vipAccessCode: v.optional(v.string()),
    ticketLimit: v.optional(v.number()),
    vipTicketLimit: v.optional(v.number()),
    generalTicketLimit: v.optional(v.number()),
  },

  handler: async (ctx, args) => {
    const { eventId, ...updateData } = args;

    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Event not found");

    // 🔍 Compare fields to detect changes
    const changes: string[] = [];
    if (event.title !== updateData.title)
      changes.push(`Title: "${event.title}" → "${updateData.title}"`);
    if (event.description !== updateData.description)
      changes.push(`Description was updated`);
    if (event.eventDate !== updateData.eventDate)
      changes.push(
        `Date: ${new Date(event.eventDate).toLocaleString()} → ${new Date(updateData.eventDate).toLocaleString()}`
      );
    if (event.location !== updateData.location)
      changes.push(`Location: "${event.location}" → "${updateData.location}"`);
    if (event.host !== updateData.host)
      changes.push(`Host: "${event.host}" → "${updateData.host}"`);
    if (event.eventType !== updateData.eventType)
      changes.push(`Type: "${event.eventType}" → "${updateData.eventType}"`);

    // ✏️ Update the event document
    await ctx.db.patch(eventId, {
      ...updateData,
      updatedAt: Date.now(),
    });

    // 👥 Notify attendees
    const registrations = await ctx.db
      .query("event_registrations")
      .withIndex("byEvent", (q) => q.eq("eventId", eventId))
      .collect();

    const changeDetails = changes.length
      ? `<ul>${changes.map((c) => `<li>${c}</li>`).join("")}</ul>`
      : "<p>No major details were changed.</p>";

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
          `,
        });
      }
    }
  },
});





export const deleteEvent = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Event not found");

    const registrations = await ctx.db
      .query("event_registrations")
      .withIndex("byEvent", (q) => q.eq("eventId", eventId))
      .collect();

    for (const reg of registrations) {
      if (reg.email) {
        await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
          to: reg.email,
          subject: `Event "${event.title}" has been canceled`,
          html: `<p>We're sorry to inform you that the event <strong>${event.title}</strong> has been canceled.</p>`,
        });
      }

      await ctx.db.delete(reg._id);
    }

    await ctx.db.delete(eventId);
  },
});




