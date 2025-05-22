// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
export const createDLI = mutation({
  args: {
    number: v.number(),
    title: v.string(),
    summary: v.string(),
    icon: v.string(),
    content: v.string()
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("dli", args);
  }
});
export const updateDLI = mutation({
  args: {
    id: v.id("dli"),
    number: v.number(),
    title: v.string(),
    summary: v.string(),
    icon: v.string(),
    content: v.string()
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      number: args.number,
      title: args.title,
      summary: args.summary,
      icon: args.icon,
      content: args.content
    });
  }
});
export const createBERAP = mutation({
  args: {
    year: v.number(),
    title: v.string(),
    description: v.string(),
    privateSectorNotes: v.optional(v.string()),
    progressReport: v.optional(v.string()),
    approvedByExco: v.boolean()
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("berap", args);
  }
});
export const uploadMaterial = mutation({
  args: {
    parentId: v.union(v.id("dli"), v.id("berap")),
    parentType: v.union(v.literal("dli"), v.literal("berap")),
    name: v.string(),
    type: v.union(v.literal("note"), v.literal("video"), v.literal("document")),
    fileId: v.optional(v.id("_storage")),
    content: v.optional(v.string()),
    link: v.optional(v.string()),
    uploadedAt: v.number()
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("materials", args);
  }
});
export const deleteDLI = mutation({
  args: {
    id: v.id("dli")
  },
  handler: async (ctx, {
    id
  }) => {
    await ctx.db.delete(id);
  }
});
export const deleteMaterial = mutation({
  args: {
    id: v.id("materials")
  },
  handler: async (ctx, {
    id
  }) => {
    await ctx.db.delete(id);
  }
});
export const getAllDLIs = query(async ({
  db
}) => {
  return await db.query("dli").collect();
});
export const getAllBERAPs = query(async ({
  db
}) => {
  return await db.query("berap").collect();
});
export const getAllMaterials = query({
  handler: async ctx => {
    return await ctx.db.query("materials").collect();
  }
});
export const deleteBERAP = mutation({
  args: {
    id: v.id("berap")
  },
  handler: async (ctx, {
    id
  }) => {
    await ctx.db.delete(id);
  }
});
export const getStorageUrl = mutation({
  args: {
    storageId: v.id("_storage")
  },
  handler: async (ctx, {
    storageId
  }) => {
    return await ctx.storage.getUrl(storageId);
  }
});
export const getDLIById = query({
  args: {
    id: v.id("dli")
  },
  handler: async (ctx, {
    id
  }) => {
    return await ctx.db.get(id);
  }
});
export const getBERAPById = query({
  args: {
    id: v.id("berap")
  },
  handler: async (ctx, {
    id
  }) => {
    return await ctx.db.get(id);
  }
});
export const getMaterialsByParent = query({
  args: {
    parentId: v.id("berap")
  },
  handler: async (ctx, {
    parentId
  }) => {
    return await ctx.db.query("materials").filter(q => q.eq(q.field("parentId"), parentId)).collect();
  }
});