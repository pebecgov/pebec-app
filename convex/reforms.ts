// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
export const createReform = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    implementedDate: v.number(),
    imageId: v.optional(v.id("_storage")),
    videoLink: v.optional(v.string()),
    impact: v.array(v.string()),
    outcome: v.array(v.string())
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("reforms", {
      ...args,
      createdAt: Date.now()
    });
  }
});
export const getReforms = query({
  handler: async ctx => {
    return await ctx.db.query("reforms").order("desc").collect();
  }
});
export const getReformById = query({
  args: {
    id: v.id("reforms")
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  }
});
export const updateReform = mutation({
  args: {
    id: v.id("reforms"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    implementedDate: v.optional(v.number()),
    imageId: v.optional(v.id("_storage")),
    videoLink: v.optional(v.string()),
    impact: v.optional(v.array(v.string())),
    outcome: v.optional(v.array(v.string()))
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      ...args,
      updatedAt: Date.now()
    });
  }
});
export const deleteReform = mutation({
  args: {
    id: v.id("reforms")
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  }
});
export const getAllReforms = query({
  handler: async ctx => {
    return await ctx.db.query("reforms").order("desc").collect();
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