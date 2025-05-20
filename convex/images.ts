import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** ✅ Mutation to store image upload in Convex storage */
export const storeImage = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.db.insert("images", { storageId });
  },
});

/** ✅ Query to get image URL */
export const getImageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});
