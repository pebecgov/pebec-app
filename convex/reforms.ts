// convex/reforms.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ✅ Create a new reform
export const createReform = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    implementedDate: v.number(),
    imageId: v.optional(v.id("_storage")),
    videoLink: v.optional(v.string()),
    impact: v.array(v.string()),
    outcome: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("reforms", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// ✅ Get all reforms
export const getReforms = query({
  handler: async (ctx) => {
    return await ctx.db.query("reforms").order("desc").collect();
  },
});

// ✅ Get a reform by ID
export const getReformById = query({
  args: { id: v.id("reforms") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ✅ Update a reform
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
    outcome: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { ...args, updatedAt: Date.now() });
  },
});

// ✅ Delete a reform
export const deleteReform = mutation({
  args: { id: v.id("reforms") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});


  // ✅ Fetch all reforms
  export const getAllReforms = query({
    handler: async (ctx) => {
      return await ctx.db.query("reforms").order("desc").collect();
    },
  });


  // Fetch image URL from storage
  export const getImageUrl = query({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, { storageId }) => {
      return await ctx.storage.getUrl(storageId);
    },
  });
  