import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const uploadFile = mutation({
  args: {
    fileId: v.id("_storage"), // ✅ Convex storage ID
    uploadedBy: v.id("users"), // ✅ Track who uploaded it
    ticketId: v.optional(v.id("tickets")), // ✅ Associate with a ticket (optional)
  },
  handler: async (ctx, { fileId, uploadedBy, ticketId }) => {
    await ctx.db.insert("images", { storageId: fileId, uploadedBy, ticketId });
  },
});
