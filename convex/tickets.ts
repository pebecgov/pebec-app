import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrNull, getCurrentUserOrThrow } from "./users";
import { api } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

// ✅ Generate a unique ticket number
function generateTicketNumber() {
  return `TICKET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}


export const createTicket = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    assignedMDA: v.string(),
    fullName: v.string(),
    email: v.string(),
    phoneNumber: v.string(),
    incidentDate: v.number(),
    location: v.optional(v.string()),
    state: v.optional(v.string()),
    address: v.optional(v.string()),
    supportingDocuments: v.optional(v.array(v.id("_storage"))),
    businessName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);

    const mdaRecord = await ctx.db
      .query("mdas")
      .withIndex("byName", (q) => q.eq("name", args.assignedMDA))
      .first();

    const assignedMDAId = mdaRecord ? mdaRecord._id : undefined;

    // ✅ Generate date key: ddmmyy
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(-2);
    const dateKey = `${day}${month}${year}`; // e.g. 230425

    // ✅ Get existing tickets for today
    const startOfDay = new Date(now.setHours(0, 0, 0, 0)).getTime();
    const endOfDay = new Date(now.setHours(23, 59, 59, 999)).getTime();

    const todaysTickets = await ctx.db
      .query("tickets")
      .filter((q) =>
        q.and(
          q.gte(q.field("createdAt"), startOfDay),
          q.lte(q.field("createdAt"), endOfDay)
        )
      )
      .collect();

    const dailyCount = todaysTickets.length + 1;
    const ticketSuffix = String(dailyCount).padStart(3, "0");
    const ticketNumber = `REP-${dateKey}-${ticketSuffix}`;

    let guestUserId: Id<"users"> | null = null;
    if (!user) {
      guestUserId = await ctx.db.insert("users", {
        firstName: args.fullName.split(" ")[0] || "Guest",
        lastName: args.fullName.split(" ").slice(1).join(" ") || "",
        email: args.email,
        phoneNumber: args.phoneNumber,
        state: args.state ?? "",
        address: args.address ?? "",
        role: "user",
        imageUrl: "",
        clerkUserId: "guest_" + Date.now(),
      });
    }

    const ticketId = await ctx.db.insert("tickets", {
      title: args.title,
      description: args.description,
      ticketNumber,
      status: "open",
      createdBy: user?._id ?? guestUserId!,
      assignedMDA: assignedMDAId,
      assignedAgent: undefined,
      fullName: args.fullName,
      email: args.email,
      phoneNumber: args.phoneNumber,
      incidentDate: args.incidentDate,
      location: args.location,
      state: args.state ?? "",
      address: args.address ?? "",
      supportingDocuments: args.supportingDocuments ?? [],
      businessName: args.businessName ?? "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const admins = await ctx.db
      .query("users")
      .withIndex("byRole", (q) => q.eq("role", "admin"))
      .collect();

    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin._id,
        ticketId,
        message: `New ticket created: ${ticketNumber}`,
        isRead: false,
        createdAt: Date.now(),
        type: "new_ticket",
      });
    }

    if (assignedMDAId) {
      const mdaUsers = await ctx.db
        .query("users")
        .withIndex("byMdaId", (q) => q.eq("mdaId", assignedMDAId))
        .collect();

      for (const mdaUser of mdaUsers) {
        await ctx.db.insert("notifications", {
          userId: mdaUser._id,
          ticketId,
          message: `New ticket assigned to you: ${ticketNumber}`,
          isRead: false,
          createdAt: Date.now(),
          type: "ticket_assignment",
        });
      }

      await ctx.scheduler.runAfter(2 * 60 * 1000, api.tickets.checkAndSendReminder, { ticketId });
    }

    return { ticketId, ticketNumber };
  },
});



export const checkAndSendReminder = mutation({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, { ticketId }) => {
    const ticket = await ctx.db.get(ticketId);
    if (!ticket) {
      console.log("❌ Ticket not found, stopping reminder.");
      return;
    }

    // ✅ Stop reminders if ticket is updated to "in_progress"
    if (ticket.status !== "open") {
      console.log(`✅ Ticket ${ticket.ticketNumber} is updated. No reminder needed.`);
      return;
    }

    // ✅ Find MDA User assigned to this ticket
    const mdaUser = await ctx.db
      .query("users")
      .withIndex("byMdaId", (q) => q.eq("mdaId", ticket.assignedMDA)) // ✅ Proper index filtering
      .first();

    if (!mdaUser || !mdaUser.email) {
      console.log(`❌ No MDA user found for ticket ${ticket.ticketNumber}`);
      return;
    }

    console.log(`📧 Sending reminder to ${mdaUser.email} for ticket ${ticket.ticketNumber}`);

    // ✅ Reminder Email Template
    const emailTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <div style="background-color: #FF9800; padding: 15px; text-align: center; color: white; font-size: 20px; border-radius: 8px 8px 0 0;">
          <strong>Action Required: Update Your Ticket</strong>
        </div>
        <div style="padding: 20px; color: #333;">
          <p style="font-size: 16px;">Dear <strong>${mdaUser.firstName || "MDA Representative"}</strong>,</p>
          <p>The ticket <strong>#${ticket.ticketNumber}</strong> assigned to your MDA has not been updated.</p>
          <p>Please update the ticket status as soon as possible.</p>
          <p><strong>Title:</strong> ${ticket.title}</p>
          <p><strong>Description:</strong> ${ticket.description}</p>
          <p><strong>Status:</strong> <span style="color: red;">Open</span></p>
          <p>You can update the ticket by logging into your dashboard.</p>
        </div>
        <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
          <p>© 2025 PEBEC GOV. | <a href="https://www.pebec.gov.ng" style="color: #FF9800;">Visit Dashboard</a></p>
        </div>
      </div>
    `;

    // ✅ Send the Reminder Email
    await ctx.scheduler.runAfter(0, api.email.sendEmail, {
      to: mdaUser.email,
      subject: `Reminder: Update Ticket #${ticket.ticketNumber}`,
      html: emailTemplate,
    });

    // ✅ Schedule the next reminder for **10 AM Nigeria Time** the next day
    const nigeriaTimeOffset = 1 * 60 * 60 * 1000; // UTC+1 (Nigeria Timezone)
    const now = new Date();
    const tomorrow10AM = new Date(now);
    tomorrow10AM.setUTCDate(now.getUTCDate() + 1);
    tomorrow10AM.setUTCHours(9, 0, 0, 0); // 10 AM Nigeria time (UTC+1)

    console.log(`⏳ Next reminder scheduled for ${tomorrow10AM.toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}`);

    await ctx.scheduler.runAt(tomorrow10AM, api.tickets.checkAndSendReminder, { ticketId });
  },
});



// ✅ Get tickets for the logged-in user
export const getUserTickets = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    // ✅ Fetch user tickets
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("byUser", (q) => q.eq("createdBy", user._id))
      .order("desc")
      .collect();

    // ✅ Fetch assigned MDA names
    const mdaIds = [...new Set(tickets.map(ticket => ticket.assignedMDA).filter((id): id is Id<"mdas"> => !!id))];
    const mdas = await Promise.all(mdaIds.map(mdaId => ctx.db.get(mdaId)));

    // ✅ Create lookup table { mdaId -> mdaName }
    const mdaMap: Record<string, string> = {};
    mdas.forEach(mda => {
      if (mda) mdaMap[mda._id] = mda.name;
    });

    return tickets.map(ticket => ({
      ...ticket,
      assignedMDA: ticket.assignedMDA, // ✅ Keep MDA ID
      assignedMDAName: ticket.assignedMDA ? mdaMap[ticket.assignedMDA] || "Unassigned" : "Unassigned", // ✅ Attach MDA Name
      createdByUser: {
        firstName: user.firstName || "Unknown",
        lastName: user.lastName || "",
        imageUrl: user.imageUrl || "",
      }, // ✅ Attach user details
    }));
  },
});


export const getAllTickets = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    const allowedRoles = ["admin", "staff", "president", "vice_president"];
    
    if (!user.role || !allowedRoles.includes(user.role)) {
      throw new Error("Unauthorized: You do not have permission to view all tickets.");
    }

    // ✅ Fetch all tickets
    const tickets = await ctx.db.query("tickets").order("desc").collect();

    // ✅ Fetch user details for ticket creators
    const userIds = [...new Set(tickets.map(ticket => ticket.createdBy))]; // Unique user IDs
    const users = await Promise.all(userIds.map(userId => ctx.db.get(userId)));

    // ✅ Create a lookup table { userId -> userDetails }
    const userMap: Record<string, { firstName?: string; lastName?: string; imageUrl?: string }> = {};
    users.forEach(user => {
      if (user) {
        userMap[user._id] = {
          firstName: user.firstName || "Unknown",
          lastName: user.lastName || "",
          imageUrl: user.imageUrl || "",
        };
      }
    });

    // ✅ Fetch assigned MDA names
    const mdaIds = [...new Set(
      tickets.map(ticket => ticket.assignedMDA).filter((id): id is Id<"mdas"> => !!id)
    )];

    const mdas = await Promise.all(mdaIds.map(mdaId => ctx.db.get(mdaId)));

    const mdaMap: Record<string, string> = {};
    mdas.forEach(mda => {
      if (mda) mdaMap[mda._id] = mda.name;
    });

    // ✅ Enrich and return tickets
    return tickets.map(ticket => ({
      ...ticket,
      assignedMDA: ticket.assignedMDA,
      assignedMDAName: ticket.assignedMDA
        ? mdaMap[ticket.assignedMDA] || "Unassigned"
        : "Unassigned",
      createdByUser: userMap[ticket.createdBy] || {
        firstName: "Unknown",
        lastName: "",
        imageUrl: "",
      },
    }));
  },
});






// ✅ Assign an agent to a ticket (Admin Only)
export const assignTicketAgent = mutation({
  args: { ticketId: v.id("tickets"), agentId: v.id("users") },
  handler: async (ctx, { ticketId, agentId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin") {
      throw new Error("Unauthorized: Only admins can assign agents.");
    }

    await ctx.db.patch(ticketId, { assignedAgent: agentId, updatedAt: Date.now() });
  },
});




export const updateTicketStatus = mutation({
  args: {
    ticketId: v.id("tickets"),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("resolved"),
      v.literal("closed")
    ),
    resolutionNote: v.optional(v.string()), // ✅ Required when resolving or closing
  },
  handler: async (ctx, { ticketId, status, resolutionNote }) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin" && user.role !== "mda") {
      throw new Error("Unauthorized: Only admins and MDAs can update ticket status.");
    }

    const ticket = await ctx.db.get(ticketId);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    // ✅ Ensure resolution note is required for resolved or closed status
    if ((status === "resolved" || status === "closed") && !resolutionNote) {
      throw new Error("Resolution note is required when resolving or closing a ticket.");
    }

    // ✅ Get the ticket creator's user info
    const ticketCreator = await ctx.db.get(ticket.createdBy);
    const firstName = ticketCreator?.firstName || "Citizen"; // Use first name or fallback

    // ✅ Update the ticket in the database
    const patch: Partial<Doc<"tickets">> = {
      status,
      updatedAt: Date.now(),
      resolutionNote,
    };
    
    // ✅ Set firstResponseAt ONLY if it hasn’t been set
    if (!ticket.firstResponseAt && ["in_progress", "resolved", "closed"].includes(status)) {
      patch.firstResponseAt = Date.now();
    }
    
    await ctx.db.patch(ticketId, patch);
    
    // ✅ Notify the user with an in-app notification
    const message = `Your ticket #${ticket.ticketNumber} status has been updated to ${status.replace("_", " ")}.`;
    await ctx.db.insert("notifications", {
      userId: ticket.createdBy,
      ticketId,
      message,
      isRead: false,
      createdAt: Date.now(),
      type: "ticket_update",
    });

    // ✅ Generate Styled Email Content
    let emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        
        <!-- Header -->
        <div style="background-color: #0047AB; padding: 15px; text-align: center; color: white; font-size: 20px; border-radius: 8px 8px 0 0;">
          <strong>PEBEC GOV - Support Ticket Update</strong>
        </div>

        <!-- Main Content -->
        <div style="padding: 20px; color: #333;">
          <p style="font-size: 16px;">Dear <strong>${firstName}</strong>,</p>
          <p>Your support ticket <strong>#${ticket.ticketNumber}</strong> has been updated.</p>

          <div style="background-color: #f8f8f8; padding: 15px; border-left: 5px solid #0047AB; margin: 15px 0;">
            <p style="font-size: 16px; font-weight: bold; text-align: center;">
              New Status: <span style="color: #0047AB;">${status.replace("_", " ")}</span>
            </p>
          </div>
    `;

    // ✅ Add Resolution Note for Resolved/Closed Status
    if (status === "resolved" || status === "closed") {
      emailBody += `
        <div style="background-color: #f1f1f1; padding: 15px; border-left: 5px solid #28a745; margin: 15px 0;">
          <p style="font-size: 16px; font-weight: bold;">Resolution Note:</p>
          <p style="color: #333; font-size: 14px;">${resolutionNote}</p>
        </div>
      `;
    }

    // ✅ Add View Ticket Button
    emailBody += `
        <p>You can check the latest updates by logging into your dashboard.</p>
        <div style="text-align: center; margin-top: 20px;">
          <a href="https://www.pebec.gov.ng/user/tickets/${ticket.ticketNumber}" 
            style="background-color: #0047AB; color: white; padding: 12px 20px; text-decoration: none; font-size: 16px; border-radius: 5px;">
            View Ticket
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
        <p>© 2025 PEBEC GOV. | <a href="https://www.pebec.gov.ng" style="color: #0047AB; text-decoration: none;">Visit Website</a></p>
        <p>Making Doing Business Easier in Nigeria</p>
      </div>
    </div>
    `;

    // ✅ Send Email Notification
    await ctx.scheduler.runAfter(0, api.email.sendEmail, {
      to: ticket.email,
      subject: `Update on Your Ticket #${ticket.ticketNumber}`,
      html: emailBody,
    });

    console.log(`📧 Email sent to ${ticket.email} for status update to ${status}`);

    return true;
  },
});




  

export const getTicketById = query({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, { ticketId }) => {
    const ticket = await ctx.db.get(ticketId);
    
    if (!ticket) throw new Error("Ticket not found");

    // ✅ Fetch MDA name
    const mda = ticket.assignedMDA ? await ctx.db.get(ticket.assignedMDA) : null;
    const mdaName = mda?.name || "Unassigned";

    // ✅ Fetch comments
    const comments = await ctx.db
      .query("ticket_comments")
      .withIndex("byTicket", q => q.eq("ticketId", ticketId))
      .order("desc")
      .collect();

    // ✅ Fetch the user who submitted the ticket
    const user = await ctx.db.get(ticket.createdBy);

    return {
      ...ticket,
      assignedMDAName: mdaName,
      comments,
      supportingDocuments: ticket.supportingDocuments ?? [],
      clerkUserId: user?.clerkUserId ?? null,
      businessName: user?.businessName ?? ticket.businessName ?? "",
    };
  },
});
  


  // ✅ New: Add Comment to a Ticket
export const addTicketComment = mutation({
    args: {
      ticketId: v.id("tickets"),
      authorId: v.optional(v.id("users")), // Optional for guest users
      content: v.string(),
    },
    
    handler: async (ctx, { ticketId, authorId, content }) => {
      await ctx.db.insert("ticket_comments", {
        ticketId,
        authorId,
        content,
        createdAt: Date.now(),
      });
      const ticket = await ctx.db.get(ticketId);
      if (ticket && !ticket.firstResponseAt) {
        await ctx.db.patch(ticketId, { firstResponseAt: Date.now() });
      }
    },
  });
  

  // ✅ Generate Upload URL for Convex Storage
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});


// ✅ New: Get URL for a stored file
export const getStorageUrl = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});

export const getIncidentsStats = query({
  args: {},
  handler: async (ctx) => {
    const incidents = await ctx.db.query("tickets").collect();

    return {
      total: incidents.length,
      open: incidents.filter((t) => t.status === "open").length, // ✅ Ensure "open" is included
      in_progress: incidents.filter((t) => t.status === "in_progress").length,
      resolved: incidents.filter((t) => t.status === "resolved").length,
      closed: incidents.filter((t) => t.status === "closed").length,
      pending: incidents.filter((t) => t.status === "open").length, // "open" is pending

    };
  },
});




export const getMDAIncidentsStats = query({
  args: {},
  handler: async (ctx) => {
    const incidents = await ctx.db.query("tickets").collect();

    const groupedByMDA: Record<string, {
      mdaName: string;
      total: number;
      open: number;
      in_progress: number;
      resolved: number;
      closed: number;
    }> = {};

    for (const incident of incidents) {
      if (!incident.assignedMDA) continue;

      const mda = await ctx.db.get(incident.assignedMDA);
      if (!mda) continue; // Skip incidents with deleted MDA

      const mdaName = mda.name;

      if (!groupedByMDA[incident.assignedMDA]) {
        groupedByMDA[incident.assignedMDA] = {
          mdaName,
          total: 0,
          open: 0,
          in_progress: 0,
          resolved: 0,
          closed: 0,
        };
      }

      groupedByMDA[incident.assignedMDA].total += 1;
      groupedByMDA[incident.assignedMDA][incident.status] += 1;
    }

    return groupedByMDA;
  },
});



export const getTicketsByMda = query({
  args: { mdaId: v.id("mdas") },
  handler: async (ctx, { mdaId }) => {
    // ✅ Fetch all tickets assigned to the MDA
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("byMDA", (q) => q.eq("assignedMDA", mdaId))
      .order("desc")
      .collect();

    // ✅ Fetch user details for ticket creators
    const userIds = [...new Set(tickets.map(ticket => ticket.createdBy))]; // Unique user IDs
    const users = await Promise.all(userIds.map(userId => ctx.db.get(userId)));

    // ✅ Create a lookup table { userId -> userDetails }
    const userMap: Record<string, { firstName?: string; lastName?: string; imageUrl?: string }> = {};
    users.forEach(user => {
      if (user) {
        userMap[user._id] = {
          firstName: user.firstName || "Unknown",
          lastName: user.lastName || "",
          imageUrl: user.imageUrl || "",
        };
      }
    });

    // ✅ Fetch the MDA details
    const mda = await ctx.db.get(mdaId);
    const mdaName = mda ? mda.name : "Unknown MDA";

    // ✅ Attach user details & MDA name to tickets
    return tickets.map(ticket => ({
      ...ticket,
      assignedMDA: ticket.assignedMDA, // ✅ Keep MDA ID
      assignedMDAName: mdaName, // ✅ Attach MDA Name
      createdByUser: userMap[ticket.createdBy] || {
        firstName: "Unknown",
        lastName: "",
        imageUrl: "",
      }, // ✅ Attach user details
    }));
  },
});





export const getIncidentsStatsByMonth = query({
  args: {},
  handler: async (ctx) => {
    const incidents = await ctx.db.query("tickets").collect();

    const statsByMonth = {};

    incidents.forEach((incident) => {
      const month = new Date(incident.createdAt).toLocaleString("en-US", {
        month: "short",
      });

      if (!statsByMonth[month]) {
        statsByMonth[month] = {
          total: 0,        // ✅ Total tickets for the month
          resolved: 0,     // ✅ Resolved tickets
          in_progress: 0,  // ✅ In progress tickets
          closed: 0,       // ✅ Closed tickets
          pending: 0,      // ✅ Open (pending) tickets
        };
      }

      // ✅ Count Total Tickets for the Month
      statsByMonth[month].total += 1;

      // ✅ Count by Status
      if (incident.status === "resolved") statsByMonth[month].resolved += 1;
      if (incident.status === "in_progress") statsByMonth[month].in_progress += 1;
      if (incident.status === "closed") statsByMonth[month].closed += 1;
      if (incident.status === "open") statsByMonth[month].pending += 1;
    });

    return statsByMonth;
  },
});



// ✅ Get tickets by state (for analytics)
export const getTicketsByState = query({
  args: {},
  handler: async (ctx) => {
    const tickets = await ctx.db.query("tickets").collect();

    const ticketsByState: Record<string, number> = {};

    tickets.forEach((ticket) => {
      if (ticket.state) {
        ticketsByState[ticket.state] = (ticketsByState[ticket.state] || 0) + 1;
      }
    });

    return ticketsByState;
  },
});

export const assignTicketMDA = mutation({
  args: {
    ticketId: v.id("tickets"),
    mdaId: v.id("mdas"),
  },
  handler: async (ctx, { ticketId, mdaId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin") {
      throw new Error("Unauthorized: Only admins can assign MDAs.");
    }

    // ✅ Check if the ticket exists
    const ticket = await ctx.db.get(ticketId);
    if (!ticket) {
      throw new Error("Ticket not found.");
    }

    // ✅ Check if the MDA exists
    const mda = await ctx.db.get(mdaId);
    if (!mda) {
      throw new Error("MDA not found.");
    }

    // ✅ Update the ticket with the assigned MDA
    await ctx.db.patch(ticketId, {
      assignedMDA: mdaId,
      updatedAt: Date.now(),
    });

    // 🔥 Debug: Fetch the updated ticket after updating
    const updatedTicket = await ctx.db.get(ticketId);
    console.log(`✅ Updated Ticket:`, updatedTicket);

    // ✅ Notify MDA Users
    const mdaUsers = await ctx.db
      .query("users")
      .withIndex("byMdaId", (q) => q.eq("mdaId", mdaId))
      .collect();

    for (const mdaUser of mdaUsers) {
      await ctx.db.insert("notifications", {
        userId: mdaUser._id,
        ticketId,
        message: `New ticket assigned to ${mda.name}`,
        isRead: false,
        createdAt: Date.now(),
        type: "ticket_assignment",
      });
    }

    return { success: true, message: `Ticket assigned to ${mda.name}` };
  },
});



export const cancelTicket = mutation({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, { ticketId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const ticket = await ctx.db.get(ticketId);
    if (!ticket) throw new Error("Ticket not found.");

    await ctx.db.patch(ticketId, { status: "closed", updatedAt: Date.now() });

    // ✅ Notify the user (who canceled the ticket)
    await ctx.db.insert("notifications", {
      userId: user._id,
      ticketId,
      message: `You canceled ticket #${ticket.ticketNumber}.`,
      isRead: false,
      createdAt: Date.now(),
      type: "ticket_canceled",
    });

    // ✅ Notify assigned MDA (if exists)
    if (ticket.assignedMDA) {
      const mdaUsers = await ctx.db
        .query("users")
        .withIndex("byMdaId", (q) => q.eq("mdaId", ticket.assignedMDA))
        .collect();

      for (const mdaUser of mdaUsers) {
        await ctx.db.insert("notifications", {
          userId: mdaUser._id,
          ticketId,
          message: `A ticket assigned to your MDA (#${ticket.ticketNumber}) was canceled.`,
          isRead: false,
          createdAt: Date.now(),
          type: "ticket_canceled",
        });
      }
    }

    // ✅ Notify all admins
    const admins = await ctx.db.query("users").withIndex("byRole", (q) => q.eq("role", "admin")).collect();
    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin._id,
        ticketId,
        message: `A ticket (#${ticket.ticketNumber}) was canceled.`,
        isRead: false,
        createdAt: Date.now(),
        type: "ticket_canceled",
      });
    }
  },
});

export const reopenTicket = mutation({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, { ticketId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const ticket = await ctx.db.get(ticketId);
    if (!ticket) throw new Error("Ticket not found.");

    await ctx.db.patch(ticketId, { status: "open", updatedAt: Date.now() });

    // ✅ Notify the user (who reopened the ticket)
    await ctx.db.insert("notifications", {
      userId: user._id,
      ticketId,
      message: `Your ticket #${ticket.ticketNumber} has been reopened.`,
      isRead: false,
      createdAt: Date.now(),
      type: "ticket_reopened",
    });

    // ✅ Notify assigned MDA (if exists)
    if (ticket.assignedMDA) {
      const mdaUsers = await ctx.db
        .query("users")
        .withIndex("byMdaId", (q) => q.eq("mdaId", ticket.assignedMDA))
        .collect();

      for (const mdaUser of mdaUsers) {
        await ctx.db.insert("notifications", {
          userId: mdaUser._id,
          ticketId,
          message: `A ticket assigned to your MDA (#${ticket.ticketNumber}) has been reopened.`,
          isRead: false,
          createdAt: Date.now(),
          type: "ticket_reopened",
        });
      }
    }

    // ✅ Notify all admins
    const admins = await ctx.db.query("users").withIndex("byRole", (q) => q.eq("role", "admin")).collect();
    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin._id,
        ticketId,
        message: `A ticket (#${ticket.ticketNumber}) was reopened.`,
        isRead: false,
        createdAt: Date.now(),
        type: "ticket_reopened",
      });
    }
  },
});


// ✅ Delete ticket after 24 hours
export const deleteTicket = mutation({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, { ticketId }) => {
    const ticket = await ctx.db.get(ticketId);
    if (!ticket) return;

    if (ticket.status === "closed") {
      await ctx.db.delete(ticketId);
    }
  },
});



export const deleteTicketMutation = mutation({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, { ticketId }) => {
    const ticket = await ctx.db.get(ticketId);
    if (!ticket) {
      console.log(`⚠ Ticket ${ticketId} not found or already deleted.`);
      return;
    }

    const user = await ctx.db.get(ticket.createdBy);
    if (!user) {
      console.log(`⚠ User who created ticket ${ticketId} not found.`);
      return;
    }

    // ✅ Remove all related notifications
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("byTicket", (q) => q.eq("ticketId", ticketId)) // ✅ FIXED INDEX
      .collect();
    
    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }

    // ✅ Notify the ticket creator
    await ctx.db.insert("notifications", {
      userId: ticket.createdBy,
      ticketId,
      message: `Your ticket #${ticket.ticketNumber} has been deleted.`,
      isRead: false,
      createdAt: Date.now(),
      type: "ticket_deleted",
    });

    // ✅ Notify assigned MDA (if exists)
    if (ticket.assignedMDA) {
      const mdaUsers = await ctx.db
        .query("users")
        .withIndex("byMdaId", (q) => q.eq("mdaId", ticket.assignedMDA))
        .collect();

      for (const mdaUser of mdaUsers) {
        await ctx.db.insert("notifications", {
          userId: mdaUser._id,
          ticketId,
          message: `A ticket assigned to your MDA (#${ticket.ticketNumber}) has been deleted.`,
          isRead: false,
          createdAt: Date.now(),
          type: "ticket_deleted",
        });
      }
    }

    // ✅ Notify all admins
    const admins = await ctx.db
      .query("users")
      .withIndex("byRole", (q) => q.eq("role", "admin"))
      .collect();

    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin._id,
        ticketId,
        message: `A ticket (#${ticket.ticketNumber}) has been deleted.`,
        isRead: false,
        createdAt: Date.now(),
        type: "ticket_deleted",
      });
    }

    // ✅ Send emails using Resend
    await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
      to: user.email,
      subject: `Your Ticket #${ticket.ticketNumber} Has Been Deleted`,
      html: `<p>Dear ${user.firstName || user.email},</p><p>Your support ticket <strong>#${ticket.ticketNumber}</strong> has been deleted.</p>`,
    });

    if (ticket.assignedMDA) {
      const mdaUser = await ctx.db
        .query("users")
        .withIndex("byMdaId", (q) => q.eq("mdaId", ticket.assignedMDA))
        .first();
      
      if (mdaUser) {
        await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
          to: mdaUser.email,
          subject: `Ticket #${ticket.ticketNumber} Assigned to Your MDA Has Been Deleted`,
          html: `<p>A ticket assigned to your MDA (${ticket.assignedMDA}) has been deleted.</p>`,
        });
      }
    }

    for (const admin of admins) {
      await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
        to: admin.email,
        subject: `Ticket #${ticket.ticketNumber} Has Been Deleted`,
        html: `<p>Ticket #${ticket.ticketNumber} has been deleted by an administrator.</p>`,
      });
    }

    // ✅ Delete the ticket from the database
    await ctx.db.delete(ticketId);

    console.log(`✅ Ticket ${ticket.ticketNumber} has been deleted.`);
  },
});




export const getMDAIncidentsStat = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    if (user.role !== "mda") {
      throw new Error("Unauthorized: Only MDA users can access this data.");
    }

    const tickets = await ctx.db
      .query("tickets")
      .withIndex("byMDA", (q) => q.eq("assignedMDA", user.mdaId))
      .collect();

    const now = Date.now();
    const twoDaysInMillis = 48 * 60 * 60 * 1000; // 48 hours

    let resolvedCount = 0;
    let closedCount = 0; // ✅ New variable to count closed tickets
    let totalAssigned = tickets.length;
    let score = 0;

    tickets.forEach((ticket) => {
      if (ticket.status === "resolved") {
        resolvedCount++;

        const updatedAt = ticket.updatedAt || ticket.createdAt;

        // ✅ Check if resolved within 48 hours
        if (updatedAt - ticket.createdAt <= twoDaysInMillis) {
          score += 10; // Award points for fast resolution
        }
      } else if (ticket.status === "closed") {
        closedCount++; // ✅ Count closed tickets
      } else if (ticket.status === "in_progress" || ticket.status === "open") {
        const ticketAge = now - ticket.createdAt;

        // ✅ Penalize only if the ticket is older than 48 hours
        if (ticketAge > twoDaysInMillis) {
          score -= 10;
        }
      }
    });

    // ✅ Prevent negative scores (minimum 0)
    if (score < 0) score = 0;

    return {
      totalAssigned,
      resolved: resolvedCount,
      unresolved: totalAssigned - resolvedCount - closedCount, // ✅ Adjust unresolved count
      closed: closedCount, // ✅ Return closed ticket count
      resolvedPercentage: totalAssigned > 0
      ? Math.round(((resolvedCount + closedCount) / totalAssigned) * 100)
      : 0,
          score,
    };
  },
});






export const getMDAIncidentsStatsByMonth = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    if (user.role !== "mda") {
      throw new Error("Unauthorized: Only MDA users can access this data.");
    }

    // ✅ Fetch all tickets assigned to the logged-in MDA
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("byMDA", (q) => q.eq("assignedMDA", user.mdaId))
      .collect();

    const statsByMonth = {};

    tickets.forEach((ticket) => {
      const month = new Date(ticket.createdAt).toLocaleString("en-US", {
        month: "short",
      });

      if (!statsByMonth[month]) {
        statsByMonth[month] = {
          total: 0,
          resolved: 0,
          in_progress: 0,
          closed: 0,
          pending: 0,
        };
      }

      statsByMonth[month].total += 1;

      if (ticket.status === "resolved") statsByMonth[month].resolved += 1;
      if (ticket.status === "in_progress") statsByMonth[month].in_progress += 1;
      if (ticket.status === "closed") statsByMonth[month].closed += 1;
      if (ticket.status === "open") statsByMonth[month].pending += 1;
    });

    return statsByMonth;
  },
});


export const getMDAReports = query({
  args: {
    fromDate: v.number(), // ✅ Start timestamp
    toDate: v.number(),   // ✅ End timestamp
    mdaIds: v.array(v.id("mdas")), // ✅ List of MDA IDs
  },
  handler: async (ctx, { fromDate, toDate, mdaIds }) => {
    // ✅ Fetch all tickets within the date range
    const tickets = await ctx.db
      .query("tickets")
      .filter((q) =>
        q.and(
          q.gte(q.field("createdAt"), fromDate), // ✅ Filter by start date
          q.lte(q.field("createdAt"), toDate)    // ✅ Filter by end date
        )
      )
      .order("desc")
      .collect();

    // ✅ Ensure only tickets with assigned MDAs are processed
    const validTickets = tickets.filter((ticket) => 
      ticket.assignedMDA !== undefined && mdaIds.includes(ticket.assignedMDA)
    );

    // ✅ Fetch MDA names safely
    const mdaMap: Record<string, string> = {};
    for (const mdaId of new Set(validTickets.map((ticket) => ticket.assignedMDA))) {
      if (!mdaId) continue; // ✅ Skip undefined values
      const mda = await ctx.db.get(mdaId);
      if (mda && "name" in mda) {
        mdaMap[mdaId] = mda.name;
      }
    }

    // ✅ Format and return tickets with all fields
    return validTickets.map((ticket) => ({
      ...ticket,
      assignedMDAName: ticket.assignedMDA ? mdaMap[ticket.assignedMDA] || "Unassigned" : "Unassigned",
      createdAt: new Date(ticket.createdAt).toLocaleString(),
      updatedAt: ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString() : "Not Updated",
    }));
  },
});


export const getAllTicketUsers = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getCurrentUserOrThrow(ctx);

    const allowedRoles = ["admin", "staff", "president", "vice_president", "mda"];

    if (!currentUser.role || !allowedRoles.includes(currentUser.role)) {
      throw new Error("Unauthorized");
    }

    const tickets = await ctx.db.query("tickets").collect();

    const userIds = [...new Set(tickets.map((t) => t.createdBy))];

    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));

    return users
      .filter((u): u is Doc<"users"> => u !== null)
      .map((u) => ({
        _id: u._id,
        firstName: u.firstName || "",
        lastName: u.lastName || "",
        email: u.email || "",
        businessName: u.businessName || "",
        role: u.role || "user",
      }));
  },
});






export const getTicketsByUserId = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    // Optionally: auth check
    // const currentUser = await getCurrentUserOrThrow(ctx);

    const tickets = await ctx.db
      .query("tickets")
      .withIndex("byUser", (q) => q.eq("createdBy", userId))
      .order("desc")
      .collect();

    return tickets;
  },
});


export const getFilteredTickets = query({
  args: {
    userId: v.optional(v.id("users")),
    businessName: v.optional(v.string()),
    status: v.optional(v.string()),
    mdaName: v.optional(v.string()), // ✅ Added
    fromDate: v.optional(v.number()),
    toDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const allowedRoles = ["admin", "staff", "president", "vice_president", "mda"];
    if (!user.role || !allowedRoles.includes(user.role)) {
      throw new Error("Unauthorized");
    }

    // ✅ Step 1: Get all tickets
    let tickets: Doc<"tickets">[] = [];

    if (user.role === "admin") {
      tickets = await ctx.db.query("tickets").collect();
    } else if (user.role === "mda" && user.mdaId) {
      tickets = await ctx.db
        .query("tickets")
        .withIndex("byMDA", (q) => q.eq("assignedMDA", user.mdaId))
        .collect();
    } else {
      // For staff, president, and vice_president — show all like admin
      tickets = await ctx.db.query("tickets").collect();
    }
    

    // ✅ Step 2: Filter by MDA Name (admin only)
    if (args.mdaName && user.role === "admin") {
      const mda = await ctx.db
        .query("mdas")
        .withIndex("byName", (q) => q.eq("name", args.mdaName!))
        .first();

      if (!mda) return [];
      tickets = tickets.filter((ticket) => ticket.assignedMDA === mda._id);
    }

    // ✅ Step 3: Filter by userId
    if (args.userId) {
      tickets = tickets.filter((ticket) => ticket.createdBy === args.userId);
    }

    // ✅ Step 4: Filter by businessName
    if (args.businessName) {
      const userIdsInTickets = [...new Set(tickets.map((t) => t.createdBy))];
      const users = await Promise.all(userIdsInTickets.map((id) => ctx.db.get(id)));
    
      const matchingUserIds = users
        .filter((u) => u?.businessName?.toLowerCase() === args.businessName?.toLowerCase())
        .map((u) => u!._id);
    
      tickets = tickets.filter((ticket) =>
        matchingUserIds.includes(ticket.createdBy) ||
        ticket.businessName?.toLowerCase() === args.businessName?.toLowerCase()
      );
    }
    
    // ✅ Step 5: Filter by status
    if (args.status) {
      tickets = tickets.filter((ticket) => ticket.status === args.status);
    }

    // ✅ Step 6: Filter by date range
    if (args.fromDate || args.toDate) {
      tickets = tickets.filter((ticket) => {
        const createdAt = ticket.createdAt ?? ticket._creationTime;
        return (
          (!args.fromDate || createdAt >= args.fromDate) &&
          (!args.toDate || createdAt <= args.toDate)
        );
      });
    }

    // Enhance with assignedMDAName
    const mdaIds = [...new Set(tickets.map(t => t.assignedMDA).filter((id): id is Id<"mdas"> => !!id))];
    const mdas = await Promise.all(mdaIds.map(id => ctx.db.get(id)));
const mdaMap: Record<string, string> = {};
mdas.forEach(mda => {
  if (mda) mdaMap[mda._id] = mda.name;
});
getTicketById 
// ✅ Fetch user info for all ticket creators
const creatorUserIds = [...new Set(tickets.map((t) => t.createdBy))];
const creators = await Promise.all(creatorUserIds.map((id) => ctx.db.get(id)));

const userMap: Record<string, { businessName?: string }> = {};
creators.forEach((u) => {
  if (u) {
    userMap[u._id] = {
      businessName: u.businessName ?? "",
    };
  }
});

// ✅ Enhance tickets with MDA name and business name
const enhanced = tickets.map(ticket => ({
  ...ticket,
  assignedMDAName: ticket.assignedMDA ? mdaMap[ticket.assignedMDA] || "Unassigned" : "Unassigned",
  businessName: userMap[ticket.createdBy]?.businessName || ticket.businessName || "",
}));
    return enhanced;
  },
});






export const getMdaMonthlySummaryStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    if (user.role !== "mda" || !user.mdaId) {
      throw new Error("Unauthorized: Only MDA users can view this data.");
    }

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const threeDays = 72 * 60 * 60 * 1000; // ✅ Use 72 hours instead of 48

    const tickets = await ctx.db
      .query("tickets")
      .withIndex("byMDA", (q) => q.eq("assignedMDA", user.mdaId))
      .collect();

    // ✅ Filter tickets for this month
    const thisMonthTickets = tickets.filter(
      (ticket) => ticket.createdAt >= currentMonthStart
    );

    // ✅ Count resolved within 48h
    const resolvedIn72hrs = tickets.filter((ticket) => {
      const resolvedOrClosed =
        ticket.status === "resolved" || ticket.status === "closed";
      const updated = ticket.updatedAt ?? ticket._creationTime;
      return (
        resolvedOrClosed &&
        updated - ticket.createdAt <= threeDays
      );
    }).length;
    

    return {
      ticketsThisMonth: thisMonthTickets.length,
      resolvedIn72hrs,
    };
  },
});



export const getAdminMonthlyStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    const allowedRoles = ["admin", "staff", "president", "vice_president"];
    if (!user.role || !allowedRoles.includes(user.role)) {
      throw new Error("Unauthorized");
    }
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const threeDaysMs = 72 * 60 * 60 * 1000; // ⬅️ ✅ Now 72 hours

    const tickets = await ctx.db.query("tickets").order("desc").collect();

    const userMap: Record<string, { firstName?: string; lastName?: string }> = {};
    const mdaMap: Record<string, string> = {};

    const userIds = [...new Set(tickets.map((t) => t.createdBy))];
    const mdaIds = [...new Set(tickets.map((t) => t.assignedMDA).filter(Boolean))];

    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    users.forEach((u) => {
      if (u) userMap[u._id] = { firstName: u.firstName, lastName: u.lastName };
    });

    const validMdaIds = mdaIds.filter((id): id is Id<"mdas"> => id !== undefined);
    const mdas = await Promise.all(validMdaIds.map((id) => ctx.db.get(id)));
    mdas.forEach((m) => {
      if (m) mdaMap[m._id] = m.name;
    });

    const monthlyTickets = tickets.filter((t) => t.createdAt >= startOfMonth);

    const withStats = monthlyTickets.map((t) => {
      const updated = t.updatedAt ?? t.createdAt;
      const resolvedWithin72h = (t.status === "resolved") && (updated - t.createdAt <= threeDaysMs);
      const closedWithin72h = (t.status === "closed") && (updated - t.createdAt <= threeDaysMs);

      return {
        ticketNumber: t.ticketNumber,
        title: t.title,
        mdaName: t.assignedMDA ? mdaMap[t.assignedMDA] ?? "Unassigned" : "Unassigned",
        createdAt: t.createdAt,
        updatedAt: updated,
        resolvedWithin72h,
        closedWithin72h,
        userFirstName: userMap[t.createdBy]?.firstName ?? "",
        userLastName: userMap[t.createdBy]?.lastName ?? "",
      };
    });

    return {
      total: withStats.length,
      resolvedWithin72h: withStats.filter((t) => t.resolvedWithin72h).length,
      closedWithin72h: withStats.filter((t) => t.closedWithin72h).length,
      tickets: withStats,
    };
  },
});


export const saveUploadedFile = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("uploaded_files", {
      storageId: args.storageId,
      fileName: args.fileName,
      uploadedAt: Date.now(),
    });
  },
});

export const getAdminMonthlyTopResolved = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    const allowedRoles = ["admin", "staff", "president", "vice_president"];
    if (!user.role || !allowedRoles.includes(user.role)) {
      throw new Error("Unauthorized");
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const twoDays = 48 * 60 * 60 * 1000;

    const tickets = await ctx.db.query("tickets").collect();
    const thisMonth = tickets.filter((t) => t.createdAt >= monthStart);
    const resolvedQuickly = thisMonth.filter(
      (t) =>
        ["resolved", "closed"].includes(t.status) &&
        (t.updatedAt ?? t.createdAt) - t.createdAt <= twoDays
    );

    return {
      reportsThisMonth: thisMonth.length,
      resolvedWithin48h: resolvedQuickly.length,
    };
  },
});



export const getTopMdasByResolution = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    const allowedRoles = ["admin", "staff", "president", "vice_president"];
    if (!user.role || !allowedRoles.includes(user.role)) {
      throw new Error("Unauthorized");
    }

    const tickets = await ctx.db.query("tickets").collect();

    const mdaStats: Record<string, number> = {};

    for (const ticket of tickets) {
      if (["resolved", "closed"].includes(ticket.status) && ticket.assignedMDA) {
        mdaStats[ticket.assignedMDA] = (mdaStats[ticket.assignedMDA] || 0) + 1;
      }
    }

    const results = await Promise.all(
      Object.entries(mdaStats).map(async ([mdaId, count]) => {
        const mda = await ctx.db.get(mdaId as Id<"mdas">);
        if (!mda) return null;

        const usersInMDA = await ctx.db
          .query("users")
          .withIndex("byMdaId", (q) => q.eq("mdaId", mdaId as Id<"mdas">))
          .collect();

        if (usersInMDA.length === 0) return null;

        return {
          mdaName: mda.name,
          count,
        };
      })
    );

    const filteredResults = results.filter((r) => r !== null) as { mdaName: string; count: number }[];

    return filteredResults.sort((a, b) => b.count - a.count);
  },
});



export const getAllMdas = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("mdas").collect();
  },
});

export const getAllMdasAdmin = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin") throw new Error("Unauthorized");
    return await ctx.db.query("mdas").collect();
  },
});



export const getTopAndBottomMdaPerformanceByMonth = query({
  args: {
    from: v.number(),
    to: v.number(),
  },
  handler: async (ctx, { from, to }) => {
    const tickets = await ctx.db
      .query("tickets")
      .filter((q) =>
        q.and(q.gte(q.field("createdAt"), from), q.lte(q.field("createdAt"), to))
      )
      .collect();

    const mdaMap: Record<
      string,
      {
        name: string;
        times: number[];
        resolved: number;
        total: number;
      }
    > = {};

    for (const ticket of tickets) {
      if (!ticket.assignedMDA) continue;

      if (!mdaMap[ticket.assignedMDA]) {
        const mda = await ctx.db.get(ticket.assignedMDA);
        if (!mda) continue;
        mdaMap[ticket.assignedMDA] = {
          name: mda.name,
          times: [],
          resolved: 0,
          total: 0,
        };
      }

      mdaMap[ticket.assignedMDA].total += 1;

      if (ticket.status === "resolved" && ticket.createdAt && ticket.updatedAt) {
        const timeTaken = ticket.updatedAt - ticket.createdAt;
        mdaMap[ticket.assignedMDA].times.push(timeTaken);
        mdaMap[ticket.assignedMDA].resolved += 1;
      }
    }

    const mdaStats = Object.values(mdaMap).map((entry) => {
      const avgTime =
        entry.times.length > 0
          ? entry.times.reduce((a, b) => a + b, 0) / entry.times.length
          : 0;
      return {
        name: entry.name,
        count: entry.resolved,
        total: entry.total,
        avgTime,
      };
    });

    // Updated sorting logic
    const top3 = [...mdaStats]
      .filter((mda) => mda.count > 0) // only those who resolved something
      .sort((a, b) => b.count - a.count || a.avgTime - b.avgTime)
      .slice(0, 3);

    const bottom3 = [...mdaStats]
      .sort((a, b) => a.count - b.count || b.avgTime - a.avgTime)
      .slice(0, 3);

    return { top3, bottom3 };
  },
});



export const getOverallResponseTimes = query({
  args: {},
  handler: async (ctx) => {
    const tickets = await ctx.db.query("tickets").collect();

    return tickets
      .filter((t) => t.status === "resolved" && typeof t.updatedAt === "number")
      .map((t) => {
        const updated = t.updatedAt as number; // Now safe
        return (updated - t.createdAt) / 3600000; // Convert ms to hours
      });
  },
});



// ✅ Get a ticket by ticket number and either email or phone number
export const getPublicTicketByReference = query({
  args: {
    ticketNumber: v.string(),
    email: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
  },
  handler: async (ctx, { ticketNumber, email, phoneNumber }) => {
    // Validate at least email or phone number provided
    if (!email && !phoneNumber) {
      throw new Error("Email or phone number is required.");
    }

    const ticket = await ctx.db
      .query("tickets")
      .withIndex("byTicketNumber", (q) => q.eq("ticketNumber", ticketNumber))
      .first();

    if (!ticket) return null;

    // Match either phone or email
    const isEmailMatch = email && ticket.email?.toLowerCase() === email.toLowerCase();
    const isPhoneMatch = phoneNumber && ticket.phoneNumber === phoneNumber;

    if (isEmailMatch || isPhoneMatch) {
      const mda = ticket.assignedMDA ? await ctx.db.get(ticket.assignedMDA) : null;
      return {
        ...ticket,
        assignedMDAName: mda?.name || "Unassigned",
      };
    }

    return null; // Not matched
  },
});



export const getAllBusinessNames = query({
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    let tickets: Doc<"tickets">[] = [];

    if (user.role && ["admin", "staff", "president", "vice_president"].includes(user.role)) {
      tickets = await ctx.db.query("tickets").collect();
    } else if (user.role === "mda" && user.mdaId) {
      tickets = await ctx.db
        .query("tickets")
        .withIndex("byMDA", (q) => q.eq("assignedMDA", user.mdaId))
        .collect();
    } else {
      return []; // Unprivileged roles shouldn't see any
    }

    const businessNamesFromUsers = new Set<string>();
    const businessNamesFromTickets = new Set<string>();

    for (const ticket of tickets) {
      if (ticket.businessName) {
        businessNamesFromTickets.add(ticket.businessName.trim());
      }

      if (ticket.createdBy) {
        const creator = await ctx.db.get(ticket.createdBy);
        if (creator?.businessName) {
          businessNamesFromUsers.add(creator.businessName.trim());
        }
      }
    }

    const combined = Array.from(new Set([
      ...businessNamesFromUsers,
      ...businessNamesFromTickets,
    ]));

    return combined.filter((name) => !!name);
  },
});



function skipWeekendsHours(start: number, end: number): number {
  let current = new Date(start);
  let endDate = new Date(end);
  let hours = 0;
  while (current < endDate) {
    if (current.getDay() !== 6 && current.getDay() !== 0) {
      hours++;
    }
    current.setHours(current.getHours() + 1);
  }
  return hours;
}



export const getTicketStats = query({
  args: {
    fromDate: v.optional(v.number()),
    toDate: v.optional(v.number()),
    mdaId: v.optional(v.id("mdas")),
  },
  handler: async (ctx, { fromDate, toDate, mdaId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const isAdmin = ["admin", "staff", "president", "vice_president"].includes(user.role || "");

    let tickets = await ctx.db.query("tickets").collect();

    if (fromDate || toDate) {
      tickets = tickets.filter((t) =>
        (!fromDate || t.createdAt >= fromDate) &&
        (!toDate || t.createdAt <= toDate)
      );
    }

    if (mdaId) {
      tickets = tickets.filter(t => t.assignedMDA === mdaId);
    }

    let resolved = 0, closed = 0, open = 0, resolved72h = 0, closed72h = 0, overdue = 0;
    let resolutionTimes: number[] = [];
    let responseTimes: number[] = [];

    const now = Date.now();

    for (const t of tickets) {
      const startTime = t.reassignedAt ?? t.createdAt;
      const updated = t.updatedAt ?? now;

      const hours = skipWeekendsHours(startTime, updated);

      if (t.status === "resolved") {
        resolved++;
        resolutionTimes.push(hours);
        if (hours <= 72) resolved72h++;
      }

      if (t.status === "closed") {
        closed++;
        if (hours <= 72) closed72h++;
      }

      if (t.status === "open") {
        open++;
        if (skipWeekendsHours(t.createdAt, now) > 72) overdue++;
      }

      if (t.firstResponseAt) {
        const responseHrs = skipWeekendsHours(startTime, t.firstResponseAt);
        responseTimes.push(responseHrs);
      }
    }

    const avgResolution = resolutionTimes.length
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
      : 0;

    const avgResponse = responseTimes.length
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    return {
      totalTickets: tickets.length,
      resolved,
      closed,
      open,
      resolvedWithin72h: resolved72h,
      closedWithin72h: closed72h,
      avgResolutionTime: Math.round(avgResolution * 100) / 100,
      avgResponseTime: Math.round(avgResponse * 100) / 100,
      overdue,
    };
  },
});