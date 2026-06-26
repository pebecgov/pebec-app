// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
//@ts-nocheck

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow } from "./users";
import {
  inferMaterialTypeFromTitle,
  parseStateFromMaterialTitle,
} from "./saberMaterialUtils";

const materialTypeValidator = v.union(
  v.literal("general"),
  v.literal("final_results"),
  v.literal("prior_results")
);

const roleValidator = v.union(
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
);

export const addSaberMaterial = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    fileSize: v.number(),
    materialUploadId: v.id("_storage"),
    thumbnailId: v.optional(v.id("_storage")),
    createdBy: v.id("users"),
    createdAt: v.number(),
    roles: v.array(roleValidator),
    reference: v.union(v.literal("saber"), v.literal("website"), v.literal("internal-general"), v.literal("framework")),
    isPublic: v.optional(v.boolean()),
    materialType: v.optional(materialTypeValidator),
    state: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const materialType = args.materialType ?? "general";
    return await ctx.db.insert("saber_materials", {
      ...args,
      materialType,
      isPublic: args.isPublic || false,
    });
  },
});

export const deleteSaberMaterial = mutation({
  args: {
    materialId: v.id("saber_materials"),
  },
  handler: async (ctx, { materialId }) => {
    await ctx.db.delete(materialId);
  },
});

export const getSaberMaterialsByRole = query({
  args: {
    role: roleValidator,
  },
  handler: async (ctx, { role }) => {
    if (role === "admin") {
      return await ctx.db.query("saber_materials").order("desc").collect();
    }
    const all = await ctx.db.query("saber_materials").order("desc").collect();
    return all.filter((item) => item.roles?.includes(role));
  },
});

export const getAllSaberMaterials = query(async (ctx) => {
  return await ctx.db.query("saber_materials").order("desc").collect();
});

export const getSaberMaterialsByReference = query({
  args: {
    reference: v.union(v.literal("saber"), v.literal("website"), v.literal("internal-general"), v.literal("framework")),
  },
  handler: async (ctx, { reference }) => {
    return await ctx.db
      .query("saber_materials")
      .withIndex("byReference", (q) => q.eq("reference", reference))
      .order("desc")
      .collect();
  },
});

function isPublicSaberMaterial(material: {
  isPublic?: boolean;
  reference?: string;
}) {
  return material.isPublic === true && material.reference === "saber";
}

function sortStateReports<T extends { state?: string; title: string }>(materials: T[]) {
  return [...materials].sort((a, b) => {
    const stateCompare = (a.state ?? a.title).localeCompare(b.state ?? b.title);
    return stateCompare;
  });
}

// Get public SABER materials for dashboard display
export const getPublicSaberMaterials = query({
  args: {},
  handler: async (ctx) => {
    const publicMaterials = await ctx.db
      .query("saber_materials")
      .withIndex("byPublic", (q) => q.eq("isPublic", true))
      .order("desc")
      .collect();

    return publicMaterials.filter((material) => material.reference === "saber");
  },
});

export const getPublicSaberMaterialsGrouped = query({
  args: {},
  handler: async (ctx) => {
    const publicMaterials = await ctx.db
      .query("saber_materials")
      .withIndex("byPublic", (q) => q.eq("isPublic", true))
      .order("desc")
      .collect();

    const saberMaterials = publicMaterials.filter(isPublicSaberMaterial);

    const finalResults = sortStateReports(
      saberMaterials.filter((m) => m.materialType === "final_results")
    );
    const priorResults = sortStateReports(
      saberMaterials.filter((m) => m.materialType === "prior_results")
    );
    const generalMaterials = saberMaterials.filter(
      (m) => !m.materialType || m.materialType === "general"
    );

    return {
      finalResults,
      priorResults,
      generalMaterials,
      total: saberMaterials.length,
    };
  },
});

// Get SABER materials for dashboard (public + role-specific)
export const getSaberMaterialsForDashboard = query({
  args: {
    role: v.optional(roleValidator),
  },
  handler: async (ctx, { role }) => {
    const publicMaterials = await ctx.db
      .query("saber_materials")
      .withIndex("byPublic", (q) => q.eq("isPublic", true))
      .collect();

    let roleMaterials = [];
    if (role && role !== "admin") {
      roleMaterials = await ctx.db
        .query("saber_materials")
        .withIndex("byRoles", (q) => q.eq("roles", role))
        .collect();
    } else if (role === "admin") {
      roleMaterials = await ctx.db.query("saber_materials").collect();
    }

    const allMaterials = [...publicMaterials, ...roleMaterials];
    const uniqueMaterials = allMaterials.filter(
      (material, index, self) => index === self.findIndex((m) => m._id === material._id)
    );

    return uniqueMaterials.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const updateSaberMaterialRoles = mutation({
  args: {
    materialId: v.id("saber_materials"),
    roles: v.array(roleValidator),
  },
  handler: async (ctx, { materialId, roles }) => {
    await ctx.db.patch(materialId, { roles });
  },
});

export const updateSaberMaterialReference = mutation({
  args: {
    materialId: v.id("saber_materials"),
    reference: v.union(v.literal("saber"), v.literal("website"), v.literal("internal-general"), v.literal("framework")),
  },
  handler: async (ctx, { materialId, reference }) => {
    await ctx.db.patch(materialId, { reference });
  },
});

export const updateSaberMaterialClassification = mutation({
  args: {
    materialId: v.id("saber_materials"),
    materialType: materialTypeValidator,
    state: v.optional(v.string()),
  },
  handler: async (ctx, { materialId, materialType, state }) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin") {
      throw new Error("Not authorized");
    }

    const patch: Record<string, unknown> = { materialType };
    if (materialType === "general") {
      patch.state = undefined;
    } else if (state) {
      patch.state = state;
    }

    await ctx.db.patch(materialId, patch);
  },
});

/** Option A: tag existing uploads from title — no re-upload. Admin only. */
export const autoTagStateReportMaterials = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { dryRun = false }) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin") {
      throw new Error("Not authorized");
    }

    const materials = await ctx.db.query("saber_materials").collect();
    const candidates = materials.filter(
      (m) =>
        m.reference === "saber" &&
        (!m.materialType || m.materialType === "general")
    );

    const updated: Array<{ id: string; title: string; materialType: string; state?: string }> = [];
    const skipped: Array<{ id: string; title: string; reason: string }> = [];

    for (const material of candidates) {
      const inferredType = inferMaterialTypeFromTitle(material.title);
      if (!inferredType || inferredType === "general") {
        skipped.push({
          id: material._id,
          title: material.title,
          reason: "Title does not match Final or Prior Results pattern",
        });
        continue;
      }

      const state = parseStateFromMaterialTitle(material.title);
      if (!state) {
        skipped.push({
          id: material._id,
          title: material.title,
          reason: `Matched ${inferredType} but could not parse state from title`,
        });
        continue;
      }

      if (!dryRun) {
        await ctx.db.patch(material._id, {
          materialType: inferredType,
          state,
        });
      }

      updated.push({
        id: material._id,
        title: material.title,
        materialType: inferredType,
        state,
      });
    }

    return {
      dryRun,
      updatedCount: updated.length,
      skippedCount: skipped.length,
      updated,
      skipped,
    };
  },
});
