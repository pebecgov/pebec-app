// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { filterAdminsForNotifications } from "./users";
import { api } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_MESSAGES_PER_DAY = 1;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeIp(ip: string | undefined): string | undefined {
  if (!ip) return undefined;
  const cleaned = ip.trim();
  return cleaned || undefined;
}

async function assertWithinDailyLimit(
  ctx: MutationCtx,
  email: string,
  ipAddress?: string
) {
  const windowStart = Date.now() - ONE_DAY_MS;

  const recentByEmail = await ctx.db
    .query("contact_messages")
    .withIndex("byEmail", (q) => q.eq("email", email))
    .order("desc")
    .take(MAX_MESSAGES_PER_DAY);

  if (recentByEmail.some((msg) => msg.createdAt >= windowStart)) {
    throw new Error(
      "You have already sent a contact message today. Please try again tomorrow."
    );
  }

  if (ipAddress && ipAddress !== "unknown") {
    const recentByIp = await ctx.db
      .query("contact_messages")
      .withIndex("byIp", (q) => q.eq("ipAddress", ipAddress))
      .order("desc")
      .take(MAX_MESSAGES_PER_DAY);

    if (recentByIp.some((msg) => msg.createdAt >= windowStart)) {
      throw new Error(
        "A contact message was already sent from this network today. Please try again tomorrow."
      );
    }
  }
}

export const createContactMessage = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    subject: v.string(),
    phone: v.optional(v.string()),
    message: v.string(),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const ipAddress = normalizeIp(args.ipAddress);
    const name = args.name.trim();
    const subject = args.subject.trim();
    const message = args.message.trim();

    if (!name || !email || !subject || !message) {
      throw new Error("Please fill in all required fields.");
    }
    if (!email.includes("@")) {
      throw new Error("Please enter a valid email address.");
    }

    await assertWithinDailyLimit(ctx, email, ipAddress);

    const messageId = await ctx.db.insert("contact_messages", {
      name,
      email,
      subject,
      phone: args.phone,
      message,
      createdAt: Date.now(),
      ipAddress,
      status: "pending",
    });

    // Notify admins
    const allAdmins = await ctx.db
      .query("users")
      .withIndex("byRole", (q) => q.eq("role", "admin"))
      .collect();
    const admins = filterAdminsForNotifications(allAdmins);

    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin._id,
        message: `📩 New contact message from ${name}`,
        isRead: false,
        createdAt: Date.now(),
        type: "contact_message",
      });
    }

    // Send email notification to info@pebec.gov.ng
    await ctx.scheduler.runAfter(1000, api.email.sendEmail, {
      to: "info@pebec.gov.ng",
      subject: `New Contact Message: ${subject}`,
      html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${args.phone || "N/A"}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong><br/>${message}</p>
        `,
    });

    return {
      messageId,
    };
  },
});

export const getAllContactMessages = query({
  args: {
    refreshKey: v.optional(v.number()),
  },
  handler: async (ctx, _args) => {
    return await ctx.db.query("contact_messages").order("desc").collect();
  },
});

export const deleteContactMessage = mutation({
  args: {
    messageId: v.id("contact_messages"),
  },
  handler: async (ctx, { messageId }) => {
    await ctx.db.delete(messageId);
  },
});

export const updateMessageStatus = mutation({
  args: {
    messageId: v.id("contact_messages"),
    status: v.union(
      v.literal("acknowledged"),
      v.literal("in_progress"),
      v.literal("resolved")
    ),
  },
  handler: async (ctx, { messageId, status }) => {
    const message = await ctx.db.get(messageId);
    if (!message) throw new Error("Message not found");

    const allowedTransitions: Record<string, string[]> = {
      pending: ["acknowledged"],
      acknowledged: ["in_progress"],
      in_progress: ["resolved"],
      resolved: [],
    };

    if (!allowedTransitions[message.status || "pending"].includes(status)) {
      throw new Error("Invalid status transition");
    }

    await ctx.db.patch(messageId, {
      status,
    });

    // Notify assigned staff if any
    if (message.assignedTo && message.assignedTo.length > 0) {
      const staffUsers = await ctx.db
        .query("users")
        .filter((q) =>
          q.or(...message.assignedTo!.map((id) => q.eq(q.field("_id"), id)))
        )
        .collect();

      const allAdmins = await ctx.db
        .query("users")
        .withIndex("byRole", (q) => q.eq("role", "admin"))
        .collect();
      const filteredAdmins = filterAdminsForNotifications(allAdmins);
      const notifyUsers = [...staffUsers, ...filteredAdmins];

      for (const user of notifyUsers) {
        await ctx.db.insert("notifications", {
          userId: user._id,
          message: `Contact message from "${message.name}" status changed to ${status.replace("_", " ")}`,
          isRead: false,
          createdAt: Date.now(),
          type: "contact_message_status",
        });

        await ctx.scheduler.runAfter(0, api.email.sendEmail, {
          to: user.email,
          subject: `Contact Message Status Update - ${message.subject}`,
          html: `
            <p>Hi ${user.firstName || "there"},</p>
            <p>The status of the contact message from <strong>${message.name}</strong> (Subject: "${message.subject}") has been updated to <strong>${status.replace("_", " ").toUpperCase()}</strong>.</p>
            <p>View details in your dashboard.</p>
          `,
        });
      }
    }
  },
});

export const assignMessagesToStaff = mutation({
  args: {
    messageIds: v.array(v.id("contact_messages")),
    staffIds: v.array(v.id("users")),
    staffNames: v.array(v.string()),
  },
  handler: async (ctx, { messageIds, staffIds, staffNames }) => {
    for (const messageId of messageIds) {
      await ctx.db.patch(messageId, {
        assignedTo: staffIds,
        assignedToName: staffNames,
        status: "pending",
      });
    }

    const staffUsers = await Promise.all(
      staffIds.map(async (id) => await ctx.db.get(id))
    );

    for (const staff of staffUsers) {
      if (!staff) continue;

      await ctx.db.insert("notifications", {
        userId: staff._id,
        message: `New contact message(s) assigned to you. Please check your assigned messages section.`,
        isRead: false,
        createdAt: Date.now(),
        type: "contact_message_assignment",
      });

      await ctx.scheduler.runAfter(0, api.email.sendEmail, {
        to: staff.email,
        subject: `New Contact Message(s) Assigned`,
        html: `
          <p>Hi ${staff.firstName || "there"},</p>
          <p>New contact message(s) have been assigned to you. Please check your assigned messages section.</p>
        `,
      });
    }
  },
});

export const markAsViewed = mutation({
  args: {
    messageId: v.id("contact_messages"),
  },
  handler: async (ctx, { messageId }) => {
    const message = await ctx.db.get(messageId);
    if (!message) throw new Error("Message not found");

    // Only update to "viewed" if current status is "pending"
    if (message.status === "pending" || !message.status) {
      await ctx.db.patch(messageId, {
        status: "viewed",
      });
    }
  },
});

export const replyToMessage = mutation({
  args: {
    messageId: v.id("contact_messages"),
    replyMessage: v.string(),
  },
  handler: async (ctx, { messageId, replyMessage }) => {
    const message = await ctx.db.get(messageId);
    if (!message) throw new Error("Message not found");

    // Update status to "replied"
    await ctx.db.patch(messageId, {
      status: "replied",
    });

    // Send reply email to the original sender
    await ctx.scheduler.runAfter(0, api.email.sendEmail, {
      to: message.email,
      subject: `Re: ${message.subject}`,
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Re: ${message.subject}</h2>
                    <p>Dear ${message.name},</p>
                    <p>Thank you for contacting us. Here is our response to your message:</p>
                    <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0;">
                        ${replyMessage.replace(/\n/g, "<br/>")}
                    </div>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;"/>
                    <p style="color: #666; font-size: 14px;"><strong>Your Original Message:</strong></p>
                    <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #ddd; margin: 20px 0;">
                        ${message.message.replace(/\n/g, "<br/>")}
                    </div>
                    <p style="color: #666; font-size: 12px; margin-top: 30px;">
                        Best regards,<br/>
                        Presidential Enabling Business Environment Council (PEBEC)<br/>
                        Email: info@pebec.gov.ng<br/>
                        Phone: +234 807 507 9164
                    </p>
                </div>
            `,
    });

    return {
      success: true,
    };
  },
});
