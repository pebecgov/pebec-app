// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { mutation } from "./_generated/server";
import { v } from "convex/values";
export const uploadFile = mutation({
  args: {
    fileId: v.id("_storage"),
    uploadedBy: v.id("users"),
    ticketId: v.optional(v.id("tickets"))
  },
  handler: async (ctx, {
    fileId,
    uploadedBy,
    ticketId
  }) => {
    await ctx.db.insert("images", {
      storageId: fileId,
      uploadedBy,
      ticketId
    });
  }
});