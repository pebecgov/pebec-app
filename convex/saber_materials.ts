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
    thumbnailId: v.optional(v.id("_storage")),
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
      v.literal("world_bank"),
      v.literal("ngf"),
      v.literal("dmo")
    )),
    reference: v.union(v.literal("saber"), v.literal("website"), v.literal("internal-general"), v.literal("framework")),
    isPublic: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("saber_materials", {
      ...args,
      isPublic: args.isPublic || false
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
    role: v.union(v.literal("user"), v.literal("admin"), v.literal("mda"), v.literal("staff"), v.literal("reform_champion"), v.literal("federal"), v.literal("saber_agent"), v.literal("deputies"), v.literal("magistrates"), v.literal("state_governor"), v.literal("president"), v.literal("vice_president"), v.literal("world_bank"), v.literal("ngf"), v.literal("dmo"))
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

// Get public SABER materials for dashboard display
export const getPublicSaberMaterials = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("saber_materials")
      .withIndex("byPublic", q => q.eq("isPublic", true))
      .order("desc")
      .collect();
  }
});

// Get SABER materials for dashboard (public + role-specific)
export const getSaberMaterialsForDashboard = query({
  args: {
    role: v.optional(v.union(
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
      v.literal("world_bank"),
      v.literal("ngf"),
      v.literal("dmo")
    ))
  },
  handler: async (ctx, { role }) => {
    const publicMaterials = await ctx.db.query("saber_materials")
      .withIndex("byPublic", q => q.eq("isPublic", true))
      .collect();
    
    let roleMaterials = [];
    if (role && role !== "admin") {
      roleMaterials = await ctx.db.query("saber_materials")
        .withIndex("byRoles", q => q.eq("roles", role))
        .collect();
    } else if (role === "admin") {
      roleMaterials = await ctx.db.query("saber_materials").collect();
    }
    
    // Combine and deduplicate
    const allMaterials = [...publicMaterials, ...roleMaterials];
    const uniqueMaterials = allMaterials.filter((material, index, self) => 
      index === self.findIndex(m => m._id === material._id)
    );
    
    return uniqueMaterials.sort((a, b) => b.createdAt - a.createdAt);
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
      v.literal("world_bank"),
      v.literal("ngf"),
      v.literal("dmo")
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