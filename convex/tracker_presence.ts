import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users";

/** Consider a visitor "online" if they heartbeated within this window. */
export const ACTIVE_WINDOW_MS = 45_000;

const MAX_SESSION_ID_LEN = 80;
const MAX_PATH_LEN = 300;

function classifyPath(path: string): "mdas" | "states" | "other" {
  const normalized = path.split("?")[0] || "/";
  if (normalized.startsWith("/tracker/mdas") || normalized.startsWith("/scores/mdas")) {
    return "mdas";
  }
  if (normalized.startsWith("/tracker/states") || normalized.startsWith("/scores/states")) {
    return "states";
  }
  return "other";
}

function assertStaffOrAdmin(role: string | undefined) {
  if (role !== "admin" && role !== "staff") {
    throw new Error("Unauthorized");
  }
}

/**
 * Public heartbeat from the MDA/state tracker. Creates or refreshes a session row.
 * No auth — sessionId is an opaque browser tab id.
 */
export const heartbeat = mutation({
  args: {
    sessionId: v.string(),
    path: v.string(),
    now: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sessionId = args.sessionId.trim().slice(0, MAX_SESSION_ID_LEN);
    if (!sessionId || sessionId.length < 8) {
      throw new Error("Invalid session");
    }
    let path = args.path.trim().slice(0, MAX_PATH_LEN);
    if (!path.startsWith("/tracker") && !path.startsWith("/scores")) {
      path = "/tracker";
    }
    const now = Number.isFinite(args.now) ? args.now : Date.now();
    const section = classifyPath(path);

    const existing = await ctx.db
      .query("tracker_presence")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        path,
        section,
        lastSeenAt: now,
      });
    } else {
      await ctx.db.insert("tracker_presence", {
        sessionId,
        path,
        section,
        lastSeenAt: now,
        createdAt: now,
      });
    }
    return null;
  },
});

/** Optional cleanup when a tab closes (best-effort). */
export const leave = mutation({
  args: {
    sessionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sessionId = args.sessionId.trim().slice(0, MAX_SESSION_ID_LEN);
    if (!sessionId) return null;
    const existing = await ctx.db
      .query("tracker_presence")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});

/**
 * Admin/staff live counts for people currently on the public tracker.
 * Pass `now` from the client so this query stays cache-friendly.
 */
export const getLiveCounts = query({
  args: {
    now: v.number(),
  },
  returns: v.object({
    total: v.number(),
    mdas: v.number(),
    states: v.number(),
    other: v.number(),
    activeWindowMs: v.number(),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    assertStaffOrAdmin(user.role);

    const now = Number.isFinite(args.now) ? args.now : 0;
    const cutoff = now - ACTIVE_WINDOW_MS;

    const active = await ctx.db
      .query("tracker_presence")
      .withIndex("by_lastSeen", (q) => q.gte("lastSeenAt", cutoff))
      .collect();

    let mdas = 0;
    let states = 0;
    let other = 0;
    for (const row of active) {
      if (row.section === "mdas") mdas++;
      else if (row.section === "states") states++;
      else other++;
    }

    return {
      total: active.length,
      mdas,
      states,
      other,
      activeWindowMs: ACTIVE_WINDOW_MS,
    };
  },
});

/** Drop stale presence rows so the table stays small. */
export const pruneStale = internalMutation({
  args: {
    olderThanMs: v.optional(v.number()),
  },
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx, args) => {
    const olderThanMs = args.olderThanMs ?? 5 * 60_000;
    const cutoff = Date.now() - olderThanMs;
    const stale = await ctx.db
      .query("tracker_presence")
      .withIndex("by_lastSeen", (q) => q.lt("lastSeenAt", cutoff))
      .take(500);

    for (const row of stale) {
      await ctx.db.delete(row._id);
    }
    return { deleted: stale.length };
  },
});
