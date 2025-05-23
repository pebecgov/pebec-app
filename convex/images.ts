// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
export const storeImage = mutation({
  args: {
    storageId: v.id("_storage")
  },
  handler: async (ctx, {
    storageId
  }) => {
    return await ctx.db.insert("images", {
      storageId
    });
  }
});
export const getImageUrl = query({
  args: {
    storageId: v.id("_storage")
  },
  handler: async (ctx, {
    storageId
  }) => {
    return await ctx.storage.getUrl(storageId);
  }
});