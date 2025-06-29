import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users";

// Add internal note to a ticket (MDA and Admin only)
export const addInternalNote = mutation({
  args: {
    ticketId: v.id("tickets"),
    content: v.string()
  },
  handler: async (ctx, { ticketId, content }) => {
    const user = await getCurrentUserOrThrow(ctx);
    
    // Only MDA and admin staff can add internal notes
    if (!["mda", "admin", "staff"].includes(user.role || "")) {
      throw new Error("Unauthorized: Only MDA and admin staff can add internal notes");
    }

    // Verify ticket exists and has assigned MDA
    const ticket = await ctx.db.get(ticketId);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    if (!ticket.assignedMDA) {
      throw new Error("Internal notes are only available for tickets assigned to an MDA");
    }

    // For MDA users, verify they're assigned to this ticket
    if (user.role === "mda" && user.mdaId !== ticket.assignedMDA) {
      throw new Error("You can only add internal notes to tickets assigned to your MDA");
    }

    const noteId = await ctx.db.insert("ticket_internal_notes", {
      content: content.trim(),
      ticketId,
      authorId: user._id,
      authorName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown",
      authorRole: user.role || "unknown",
      createdAt: Date.now()
    });

    return noteId;
  }
});

// Get internal notes for a ticket (MDA and Admin only)
export const getTicketInternalNotes = query({
  args: {
    ticketId: v.id("tickets")
  },
  handler: async (ctx, { ticketId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    
    // Only MDA and admin staff can view internal notes
    if (!["mda", "admin", "staff"].includes(user.role || "")) {
      throw new Error("Unauthorized: Only MDA and admin staff can view internal notes");
    }

    // Verify ticket exists and has assigned MDA
    const ticket = await ctx.db.get(ticketId);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    if (!ticket.assignedMDA) {
      return []; // No internal notes for unassigned tickets
    }

    // For MDA users, verify they're assigned to this ticket
    if (user.role === "mda" && user.mdaId !== ticket.assignedMDA) {
      throw new Error("You can only view internal notes for tickets assigned to your MDA");
    }

    const notes = await ctx.db
      .query("ticket_internal_notes")
      .withIndex("byTicket", (q) => q.eq("ticketId", ticketId))
      .order("asc")
      .collect();

    return notes;
  }
});

// Delete internal note (only author or admin)
export const deleteInternalNote = mutation({
  args: {
    noteId: v.id("ticket_internal_notes")
  },
  handler: async (ctx, { noteId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    
    const note = await ctx.db.get(noteId);
    if (!note) {
      throw new Error("Note not found");
    }

    // Only author or admin can delete
    if (note.authorId !== user._id && !["admin", "staff"].includes(user.role || "")) {
      throw new Error("Unauthorized: You can only delete your own notes or be an admin");
    }

    await ctx.db.delete(noteId);
  }
});

// Update internal note (only author)
export const updateInternalNote = mutation({
  args: {
    noteId: v.id("ticket_internal_notes"),
    content: v.string()
  },
  handler: async (ctx, { noteId, content }) => {
    const user = await getCurrentUserOrThrow(ctx);
    
    const note = await ctx.db.get(noteId);
    if (!note) {
      throw new Error("Note not found");
    }

    // Only author can edit
    if (note.authorId !== user._id) {
      throw new Error("Unauthorized: You can only edit your own notes");
    }

    await ctx.db.patch(noteId, {
      content: content.trim()
    });
  }
}); 