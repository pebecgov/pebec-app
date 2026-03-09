// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
export const createCategory = mutation({
  args: {
    name: v.string()
  },
  handler: async (ctx, {
    name
  }) => {
    return await ctx.db.insert("mediaCategories", {
      name,
      createdAt: Date.now()
    });
  }
});
export const getCategories = query({
  args: {},
  handler: async ctx => {
    return await ctx.db.query("mediaCategories").collect();
  }
});
export const createMediaPost = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    description: v.string(),
    pictureIds: v.array(v.id("_storage")),
    videoUrls: v.optional(v.array(v.string())),
    categoryId: v.id("mediaCategories"),
    eventDate: v.optional(v.number()), // Optional in schema for backward compatibility, but required in UI
    isSaber: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("media", {
      ...args,
      createdAt: Date.now()
    });
  }
});
export const getMediaByCategory = query({
  args: {
    categoryId: v.id("mediaCategories")
  },
  handler: async (ctx, {
    categoryId
  }) => {
    const media = await ctx.db.query("media").filter(q => q.eq(q.field("categoryId"), categoryId)).collect();
    // Sort by eventDate (if available) or createdAt, descending (newest first)
    return media.sort((a, b) => {
      const dateA = a.eventDate ?? a.createdAt;
      const dateB = b.eventDate ?? b.createdAt;
      return dateB - dateA; // Descending order
    });
  }
});
export const generateUploadUrl = mutation({
  args: {},
  handler: async ctx => {
    return await ctx.storage.generateUploadUrl();
  }
});
export const getAllMedia = query({
  args: {},
  handler: async ctx => {
    const media = await ctx.db.query("media").collect();
    // Sort by eventDate (if available) or createdAt, descending (newest first)
    const sortedMedia = media.sort((a, b) => {
      const dateA = a.eventDate ?? a.createdAt;
      const dateB = b.eventDate ?? b.createdAt;
      return dateB - dateA; // Descending order
    });
    return Promise.all(sortedMedia.map(async item => {
      const coverImageUrl = item.pictureIds?.[0] ? await ctx.storage.getUrl(item.pictureIds[0]) : null;
      return {
        ...item,
        coverImageUrl
      };
    }));
  }
});
export const getSaberMedia = query({
  args: {},
  handler: async ctx => {
    const media = await ctx.db.query("media").collect();
    const saberMedia = media.filter(item => item.isSaber === true);
    const sortedMedia = saberMedia.sort((a, b) => {
      const dateA = a.eventDate ?? a.createdAt;
      const dateB = b.eventDate ?? b.createdAt;
      return dateB - dateA;
    });
    return Promise.all(sortedMedia.map(async item => {
      const coverImageUrl = item.pictureIds?.[0] ? await ctx.storage.getUrl(item.pictureIds[0]) : null;
      return {
        ...item,
        coverImageUrl
      };
    }));
  }
});
export const getMediaById = query({
  args: {
    mediaId: v.id("media")
  },
  handler: async (ctx, {
    mediaId
  }) => {
    const media = await ctx.db.get(mediaId);
    if (!media) throw new Error("Media not found");
    const pictureUrls = await Promise.all(media.pictureIds.map(id => ctx.storage.getUrl(id)));
    return {
      ...media,
      pictureUrls: pictureUrls.filter(Boolean)
    };
  }
});
export const getMediaWithUrls = query({
  args: {},
  handler: async ctx => {
    const mediaPosts = await ctx.db.query("media").collect();
    // Sort by eventDate (if available) or createdAt, descending (newest first)
    const sortedMedia = mediaPosts.sort((a, b) => {
      const dateA = a.eventDate ?? a.createdAt;
      const dateB = b.eventDate ?? b.createdAt;
      return dateB - dateA; // Descending order
    });
    return await Promise.all(sortedMedia.map(async post => {
      const pictureUrls = await Promise.all(post.pictureIds.map(async id => {
        const url = await ctx.storage.getUrl(id);
        return url;
      }));
      return {
        ...post,
        pictureUrls: pictureUrls.filter(Boolean)
      };
    }));
  }
});
export const updateMediaSaberStatus = mutation({
  args: {
    mediaId: v.id("media"),
    isSaber: v.boolean()
  },
  handler: async (ctx, { mediaId, isSaber }) => {
    await ctx.db.patch(mediaId, {
      isSaber
    });
  }
});
export const deleteMediaPost = mutation({
  args: {
    mediaId: v.id("media")
  },
  handler: async (ctx, {
    mediaId
  }) => {
    await ctx.db.delete(mediaId);
  }
});