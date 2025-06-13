// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
//@ts-nocheck

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
export const addSaberMaterial = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    fileSize: v.number(),
    materialUploadId: v.id("_storage"),
    createdBy: v.id("users"),
    createdAt: v.number(),
    roles: v.array(v.union(
      v.literal("user"),
      v.literal("admin"),
      v.literal("mda"),
      v.literal("staff"),
      v.literal("reform_champion"),
      v.literal("federal"),
      v.literal("saber_agent"),
      v.literal("deputies"),
      v.literal("magistrates"),
      v.literal("state_governor"),
      v.literal("president"),
      v.literal("vice_president"),
      v.literal("world_bank")
    )),
    reference: v.union(v.literal("saber"), v.literal("website"), v.literal("internal-general"), v.literal("framework"))
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("saber_materials", {
      ...args
    });
  }
});
export const deleteSaberMaterial = mutation({
  args: {
    materialId: v.id("saber_materials")
  },
  handler: async (ctx, {
    materialId
  }) => {
    await ctx.db.delete(materialId);
  }
});
export const getSaberMaterialsByRole = query({
  args: {
    role: v.union(v.literal("user"), v.literal("admin"), v.literal("mda"), v.literal("staff"), v.literal("reform_champion"), v.literal("federal"), v.literal("saber_agent"), v.literal("deputies"), v.literal("magistrates"), v.literal("state_governor"), v.literal("president"), v.literal("vice_president"))
  },
  handler: async (ctx, {
    role
  }) => {
    if (role === "admin") {
      return await ctx.db.query("saber_materials").order("desc").collect();
    }
    const all = await ctx.db.query("saber_materials").order("desc").collect();
    return all.filter(item => item.roles?.includes(role));
  }
});
export const getAllSaberMaterials = query(async ctx => {
  return await ctx.db.query("saber_materials").order("desc").collect();
});
export const getSaberMaterialsByReference = query({
  args: {
    reference: v.union(v.literal("saber"), v.literal("website"), v.literal("internal-general"), v.literal("framework"))
  },
  handler: async (ctx, {
    reference
  }) => {
    return await ctx.db.query("saber_materials").withIndex("byReference", q => q.eq("reference", reference)).order("desc").collect();
  }
});
export const updateSaberMaterialRoles = mutation({
  args: {
    materialId: v.id("saber_materials"),
    roles: v.array(v.union(
      v.literal("user"),
      v.literal("admin"),
      v.literal("mda"),
      v.literal("staff"),
      v.literal("reform_champion"),
      v.literal("federal"),
      v.literal("saber_agent"),
      v.literal("deputies"),
      v.literal("magistrates"),
      v.literal("state_governor"),
      v.literal("president"),
      v.literal("vice_president"),
      v.literal("world_bank")
    ))
  },
  handler: async (ctx, {
    materialId,
    roles
  }) => {
    await ctx.db.patch(materialId, {
      roles
    });
  }
});
export const updateSaberMaterialReference = mutation({
  args: {
    materialId: v.id("saber_materials"),
    reference: v.union(v.literal("saber"), v.literal("website"), v.literal("internal-general"), v.literal("framework"))
  },
  handler: async (ctx, {
    materialId,
    reference
  }) => {
    await ctx.db.patch(materialId, {
      reference
    });
  }
});