// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow } from "./users";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
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