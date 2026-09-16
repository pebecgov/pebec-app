// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow, filterAdminsForNotifications } from "./users";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { internal } from "./_generated/api";
import { followUpCopy } from "./whatsapp/i18n";
export const addTicketComment = mutation({
  args: {
    ticketId: v.id("tickets"),
    content: v.string(),
    fileIds: v.optional(v.array(v.id("_storage")))
  },
  handler: async (ctx, {
    ticketId,
    content,
    fileIds
  }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const ticket = await ctx.db.get(ticketId);
    if (!ticket) throw new Error("Ticket not found");
    await ctx.db.insert("ticket_comments", {
      ticketId,
      content,
      authorId: user._id,
      clerkUserId: user.clerkUserId,
      authorName: user.firstName || "Unknown",
      authorImage: user.imageUrl || undefined,
      createdAt: Date.now(),
      fileIds: fileIds || []
    });
    const timestamp = Date.now();
    await ctx.db.insert("notifications", {
      userId: ticket.createdBy,
      ticketId,
      message: `A new comment has been added to your ticket #${ticket.ticketNumber}.`,
      isRead: false,
      createdAt: timestamp,
      type: "new_comment"
    });
    const admins = await ctx.db.query("users").withIndex("byRole", q => q.eq("role", "admin")).collect();
    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin._id,
        ticketId,
        message: `New comment on ticket #${ticket.ticketNumber}.`,
        isRead: false,
        createdAt: timestamp,
        type: "new_comment"
      });
    }
    if (ticket.assignedMDA) {
      const mdaUsers = await ctx.db.query("users").withIndex("byMdaId", q => q.eq("mdaId", ticket.assignedMDA)).collect();
      for (const mdaUser of mdaUsers) {
        await ctx.db.insert("notifications", {
          userId: mdaUser._id,
          ticketId,
          message: `New comment on a ticket assigned to your MDA.`,
          isRead: false,
          createdAt: timestamp,
          type: "new_comment"
        });
      }
      for (const mdaUser of mdaUsers) {
        if (mdaUser.email) {
          await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
            to: mdaUser.email,
            subject: `New comment on ticket #${ticket.ticketNumber}`,
            html: `<p>A new comment has been added to ticket #${ticket.ticketNumber}.</p><p><strong>Comment:</strong> ${content}</p>`
          });
        }
      }
    }
    const ticketCreator = await ctx.db.get(ticket.createdBy);
    if (ticketCreator?.email) {
      await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
        to: ticketCreator.email,
        subject: `New comment on your ticket #${ticket.ticketNumber}`,
        html: `<p>Dear ${ticketCreator.firstName || "User"},</p><p>A new comment has been added to your ticket <strong>#${ticket.ticketNumber}</strong>.</p><p><strong>Comment:</strong> ${content}</p>`
      });
    }
    const whatsappPhone = ticket.whatsappPhone;
    if (whatsappPhone && user._id !== ticket.createdBy) {
      const clipped =
        content.length > 900 ? `${content.slice(0, 900)}…` : content;
      const session = await ctx.db
        .query("whatsapp_sessions")
        .withIndex("byPhone", (q) => q.eq("phone", whatsappPhone))
        .first();
      const fu = followUpCopy(session?.language);
      await ctx.scheduler.runAfter(0, internal.whatsapp.cloud.notifyCitizen, {
        phone: whatsappPhone,
        body: fu.officerUpdate(ticket.ticketNumber, clipped),
        replyTicketId: ticket._id,
        replyTitle: fu.reply,
        menuTitle: fu.menuButton,
      });
    }
  }
});
export const getTicketComments = query({
  args: {
    ticketId: v.id("tickets")
  },
  handler: async (ctx, {
    ticketId
  }) => {
    const comments = await ctx.db.query("ticket_comments").withIndex("byTicket", q => q.eq("ticketId", ticketId)).order("desc").collect();
    return Promise.all(comments.map(async comment => {
      const author = comment.authorId ? await ctx.db.get(comment.authorId) : null;
      return {
        ...comment,
        author,
        authorId: author?._id,
        clerkUserId: comment.clerkUserId || ""
      };
    }));
  }
});
export const deleteTicketComment = mutation({
  args: {
    commentId: v.id("ticket_comments")
  },
  handler: async (ctx, {
    commentId
  }) => {
    await ctx.db.delete(commentId);
  }
});
export const editTicketComment = mutation({
  args: {
    commentId: v.id("ticket_comments"),
    content: v.string()
  },
  handler: async (ctx, {
    commentId,
    content
  }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const comment = await ctx.db.get(commentId);
    if (!comment) {
      throw new Error("Comment not found.");
    }
    if (comment.authorId !== user._id) {
      throw new Error("Unauthorized: You can only edit your own comments.");
    }
    await ctx.db.patch(commentId, {
      content,
      createdAt: Date.now()
    });
    return {
      success: true,
      message: "Comment updated successfully."
    };
  }
});

export async function saveWhatsAppCitizenComment(
  ctx: MutationCtx,
  args: {
    phone: string;
    ticketId: Id<"tickets">;
    content: string;
    fileIds?: Id<"_storage">[];
  },
): Promise<string | null> {
  const ticket = await ctx.db.get(args.ticketId);
  if (!ticket || ticket.whatsappPhone !== args.phone) {
    return null;
  }

  const author = await ctx.db.get(ticket.createdBy);
  await ctx.db.insert("ticket_comments", {
    ticketId: args.ticketId,
    content: args.content,
    authorId: ticket.createdBy,
    clerkUserId: author?.clerkUserId,
    authorName: author?.firstName || ticket.fullName || "WhatsApp Citizen",
    authorImage: author?.imageUrl || undefined,
    createdAt: Date.now(),
    fileIds: args.fileIds ?? [],
  });
  await ctx.db.patch(args.ticketId, { updatedAt: Date.now() });

  const timestamp = Date.now();
  const allAdmins = await ctx.db
    .query("users")
    .withIndex("byRole", (q) => q.eq("role", "admin"))
    .collect();
  const admins = filterAdminsForNotifications(allAdmins);
  for (const admin of admins) {
    await ctx.db.insert("notifications", {
      userId: admin._id,
      ticketId: args.ticketId,
      message: `New comment on ticket #${ticket.ticketNumber}.`,
      isRead: false,
      createdAt: timestamp,
      type: "new_comment",
    });
  }

  const assignedMDAId = ticket.assignedMDA;
  if (assignedMDAId) {
    const mdaUsers = filterAdminsForNotifications(
      await ctx.db
        .query("users")
        .withIndex("byMdaId", (q) => q.eq("mdaId", assignedMDAId))
        .collect(),
    );
    for (const mdaUser of mdaUsers) {
      await ctx.db.insert("notifications", {
        userId: mdaUser._id,
        ticketId: args.ticketId,
        message: `New comment on a ticket assigned to your MDA.`,
        isRead: false,
        createdAt: timestamp,
        type: "new_comment",
      });
      await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
        to: mdaUser.email,
        subject: `New comment on ticket #${ticket.ticketNumber}`,
        html: `<p>A new WhatsApp follow-up was added to ticket #${ticket.ticketNumber}.</p><p><strong>Comment:</strong> ${args.content}</p>`,
      });
    }
  }

  return ticket.ticketNumber;
}