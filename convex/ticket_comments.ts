import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow } from "./users";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";



export const addTicketComment = mutation({
  args: {
    ticketId: v.id("tickets"),
    content: v.string(),
    fileIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, { ticketId, content, fileIds }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const ticket = await ctx.db.get(ticketId);
    if (!ticket) throw new Error("Ticket not found");

    // Insert comment
    await ctx.db.insert("ticket_comments", {
      ticketId,
      content,
      authorId: user._id,
      clerkUserId: user.clerkUserId,
      authorName: user.firstName || "Unknown",
      authorImage: user.imageUrl || undefined,
      createdAt: Date.now(),
      fileIds: fileIds || [],
    });

    const timestamp = Date.now();

    // Notify ticket creator
    await ctx.db.insert("notifications", {
      userId: ticket.createdBy,
      ticketId,
      message: `A new comment has been added to your ticket #${ticket.ticketNumber}.`,
      isRead: false,
      createdAt: timestamp,
      type: "new_comment",
    });

    // Notify admins
    const admins = await ctx.db.query("users").withIndex("byRole", q => q.eq("role", "admin")).collect();
    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin._id,
        ticketId,
        message: `New comment on ticket #${ticket.ticketNumber}.`,
        isRead: false,
        createdAt: timestamp,
        type: "new_comment",
      });
    }

    // Notify assigned MDA
    if (ticket.assignedMDA) {
      const mdaUsers = await ctx.db.query("users").withIndex("byMdaId", q => q.eq("mdaId", ticket.assignedMDA)).collect();
      for (const mdaUser of mdaUsers) {
        await ctx.db.insert("notifications", {
          userId: mdaUser._id,
          ticketId,
          message: `New comment on a ticket assigned to your MDA.`,
          isRead: false,
          createdAt: timestamp,
          type: "new_comment",
        });
      }

      // Email MDA
      for (const mdaUser of mdaUsers) {
        if (mdaUser.email) {
          await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
            to: mdaUser.email,
            subject: `New comment on ticket #${ticket.ticketNumber}`,
            html: `<p>A new comment has been added to ticket #${ticket.ticketNumber}.</p><p><strong>Comment:</strong> ${content}</p>`,
          });
        }
      }
    }

    // Email the ticket creator
    const ticketCreator = await ctx.db.get(ticket.createdBy);
    if (ticketCreator?.email) {
      await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
        to: ticketCreator.email,
        subject: `New comment on your ticket #${ticket.ticketNumber}`,
        html: `<p>Dear ${ticketCreator.firstName || "User"},</p><p>A new comment has been added to your ticket <strong>#${ticket.ticketNumber}</strong>.</p><p><strong>Comment:</strong> ${content}</p>`,
      });
    }
  },
});



// Define the type of author as `User | null`
export const getTicketComments = query({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, { ticketId }) => {
    const comments = await ctx.db
      .query("ticket_comments")
      .withIndex("byTicket", (q) => q.eq("ticketId", ticketId))
      .order("desc")
      .collect();

    return Promise.all(
      comments.map(async (comment) => {
        const author = comment.authorId
          ? await ctx.db.get(comment.authorId) // Fetch the full author details
          : null;

        return {
          ...comment,
          author, // Attach author data
          authorId: author?._id, // Store Convex User ID
          clerkUserId: comment.clerkUserId || "", // ✅ Return Clerk User ID
        };
      })
    );
  },
});








// ✅ Delete a ticket comment
export const deleteTicketComment = mutation({
  args: { commentId: v.id("ticket_comments") },
  handler: async (ctx, { commentId }) => {
    await ctx.db.delete(commentId);
  },
});


export const editTicketComment = mutation({
  args: {
    commentId: v.id("ticket_comments"),
    content: v.string(),
  },
  handler: async (ctx, { commentId, content }) => {
    const user = await getCurrentUserOrThrow(ctx);

    // ✅ Fetch the comment
    const comment = await ctx.db.get(commentId);
    if (!comment) {
      throw new Error("Comment not found.");
    }

    // ✅ Ensure the user is the author of the comment
    if (comment.authorId !== user._id) {
      throw new Error("Unauthorized: You can only edit your own comments.");
    }

    // ✅ Update the comment with the new content
    await ctx.db.patch(commentId, {
      content,
      createdAt: Date.now(), // Optional: Track the last edit timestamp
    });

    return { success: true, message: "Comment updated successfully." };
  },
});



