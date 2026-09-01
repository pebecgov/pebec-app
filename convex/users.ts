// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.

//@ts-nocheck

import { UserJSON } from '@clerk/backend';
import { v, Validator } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { internalMutation, mutation, MutationCtx, query, QueryCtx } from './_generated/server';
import { Id } from './_generated/dataModel';
import { api, internal } from './_generated/api';
import {
  auditDisplayName,
  formatRoleSnapshot,
  logAuditEvent,
} from './utils/auditLog';
import {
  buildUserSearchText,
  isUserListSearchCursor,
  patchWithSearchText,
  userMatchesSearch,
  withSearchText,
} from './lib/userSearch';

export { buildUserSearchText } from './lib/userSearch';

async function insertUser(
  ctx: MutationCtx,
  fields: Parameters<typeof withSearchText>[0] & Record<string, unknown>
) {
  return await ctx.db.insert("users", withSearchText(fields));
}

async function patchUser(
  ctx: MutationCtx,
  userId: Id<"users">,
  existing: Parameters<typeof patchWithSearchText>[0],
  patch: Record<string, unknown>
) {
  await ctx.db.patch(userId, patchWithSearchText(existing, patch));
}

const MAX_EXPORT_USERS = 2000;

function buildUsersSearchQuery(
  ctx: QueryCtx,
  searchTerm: string,
  role?: string,
  staffStream?: string,
  mdaName?: string
) {
  return ctx.db.query("users").withSearchIndex("search_users", (q) => {
    let searchQuery = q.search("searchText", searchTerm);
    if (role && role !== "all") {
      searchQuery = searchQuery.eq("role", role);
    }
    if (staffStream && staffStream !== "all") {
      searchQuery = searchQuery.eq("staffStream", staffStream);
    }
    if (mdaName && mdaName !== "all") {
      searchQuery = searchQuery.eq("mdaName", mdaName);
    }
    return searchQuery;
  });
}

async function listUsersWithSearch(
  ctx: QueryCtx,
  args: {
    paginationOpts: { numItems: number; cursor: string | null };
    role?: string;
    staffStream?: string;
    mdaName?: string;
    searchTerm: string;
  }
) {
  // One paginate call via search index — avoids 32k document read limit from table scans.
  const safePaginationOpts = isUserListSearchCursor(args.paginationOpts.cursor)
    ? { ...args.paginationOpts, cursor: null }
    : args.paginationOpts;

  const page = await buildUsersSearchQuery(
    ctx,
    args.searchTerm,
    args.role,
    args.staffStream,
    args.mdaName
  ).paginate(safePaginationOpts);

  return {
    ...page,
    page: page.page.filter(
      (user) =>
        isValidListUser(user) && userMatchesSearch(user, args.searchTerm)
    ),
  };
}
function isValidListUser(user: { clerkUserId?: string }) {
  return Boolean(user.clerkUserId && !user.clerkUserId.startsWith("guest_"));
}

function passesUserListFilters(
  user: {
    clerkUserId?: string;
    role?: string;
    staffStream?: string;
    mdaName?: string;
  },
  staffStream?: string,
  mdaName?: string
) {
  if (!isValidListUser(user)) return false;
  if (staffStream && staffStream !== "all") {
    if (user.role !== "staff" || user.staffStream !== staffStream) return false;
  }
  if (mdaName && mdaName !== "all" && user.mdaName !== mdaName) return false;
  return true;
}

function buildUsersTableQuery(
  ctx: QueryCtx,
  role?: string,
  staffStream?: string,
  mdaName?: string
) {
  let usersQuery =
    role && role !== "all"
      ? ctx.db.query("users").withIndex("byRole", (q) => q.eq("role", role))
      : ctx.db.query("users");

  if (staffStream && staffStream !== "all") {
    usersQuery = usersQuery.filter((q) => q.eq(q.field("staffStream"), staffStream));
  }
  if (mdaName && mdaName !== "all") {
    usersQuery = usersQuery.filter((q) => q.eq(q.field("mdaName"), mdaName));
  }

  return usersQuery;
}

async function collectExportUsers(
  ctx: QueryCtx,
  args: {
    role?: string;
    staffStream?: string;
    mdaName?: string;
    search?: string;
  }
) {
  const searchTerm = args.search?.trim();

  if (searchTerm) {
    const users = await buildUsersSearchQuery(
      ctx,
      searchTerm,
      args.role,
      args.staffStream,
      args.mdaName
    ).take(MAX_EXPORT_USERS);
    return users.filter(
      (user) =>
        passesUserListFilters(user, args.staffStream, args.mdaName) &&
        userMatchesSearch(user, searchTerm)
    );
  }

  const usersQuery = buildUsersTableQuery(
    ctx,
    args.role,
    args.staffStream,
    args.mdaName
  );
  const users = await usersQuery.order("desc").take(MAX_EXPORT_USERS);
  return users.filter((user) =>
    passesUserListFilters(user, args.staffStream, args.mdaName)
  );
}

/** Kick off one-time searchText backfill for legacy users (new users are handled automatically). */
export const startUserSearchTextBackfill = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const admin = await getCurrentUserOrThrow(ctx);
    if (admin.role !== "admin") {
      throw new Error("Unauthorized: Only admins can run backfill");
    }
    await ctx.scheduler.runAfter(
      0,
      internal.migrations.backfillUserSearchText.backfillUserSearchText,
      {}
    );
    return null;
  },
});

export const getUsers = query({
  args: {},
  handler: async ctx => {
    return await ctx.db.query('users').take(100);
  }
});

/** Paginated users for admin user management. */
export const listUsers = query({
  args: {
    paginationOpts: paginationOptsValidator,
    role: v.optional(v.string()),
    staffStream: v.optional(v.string()),
    mdaName: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, { paginationOpts, role, staffStream, mdaName, search }) => {
    const searchTerm = search?.trim();

    if (searchTerm) {
      return await listUsersWithSearch(ctx, {
        paginationOpts,
        role,
        staffStream,
        mdaName,
        searchTerm,
      });
    }

    // Never pass a custom search cursor into Convex .paginate() — that throws InvalidCursor.
    const safePaginationOpts = isUserListSearchCursor(paginationOpts.cursor)
      ? { ...paginationOpts, cursor: null }
      : paginationOpts;

    const usersQuery = buildUsersTableQuery(ctx, role, staffStream, mdaName);
    const page = await usersQuery.order("desc").paginate(safePaginationOpts);
    return {
      ...page,
      page: page.page.filter((user) => passesUserListFilters(user, staffStream, mdaName)),
    };
  },
});

/** Export users matching filters (capped). */
export const exportUsers = query({
  args: {
    role: v.optional(v.string()),
    staffStream: v.optional(v.string()),
    mdaName: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await collectExportUsers(ctx, args);
  },
});

export const getRecentUsers = query({
  args: {},
  handler: async ctx => {
    return await ctx.db.query('users').order('desc').take(5);
  }
});
export const getUsersByIds = query({
  args: {
    userIds: v.array(v.id("users"))
  },
  handler: async (ctx, {
    userIds
  }) => {
    if (userIds.length === 0) return [];
    const users = await ctx.db.query("users").collect();
    return users.filter(user => userIds.includes(user._id));
  }
});
export const current = query({
  args: {},
  handler: async ctx => {
    return await getCurrentUser(ctx);
  }
});
export const upsertFromClerk = internalMutation({
  args: {
    data: v.any() as Validator<UserJSON>
  },
  async handler(ctx, {
    data
  }) {
    const primaryEmailId = data.primary_email_address_id;
    const primaryEmail = data.email_addresses?.find(email => email.id === primaryEmailId)?.email_address;
    if (!primaryEmail) {
      throw new Error("User must have a valid primary email.");
    }
    const existingUser = await userByClerkUserId(ctx, data.id);
    const userAttributes = {
      email: primaryEmail,
      clerkUserId: data.id,
      firstName: data.first_name ?? undefined,
      lastName: data.last_name ?? undefined,
      imageUrl: data.image_url ?? undefined,
      role: existingUser?.role ?? "user",
    };
    if (existingUser === null) {
      console.log("✅ Creating new user:", userAttributes);
      await insertUser(ctx, userAttributes);
    } else {
      console.log("🔄 Updating existing user:", userAttributes);
      await patchUser(ctx, existingUser._id, existingUser, userAttributes);
    }
  }
});
export const deleteFromClerk = internalMutation({
  args: {
    clerkUserId: v.string()
  },
  async handler(ctx, {
    clerkUserId
  }) {
    const user = await userByClerkUserId(ctx, clerkUserId);
    if (user !== null) {
      const targetName = auditDisplayName(user);
      const before = {
        role: user.role,
        staffStream: user.staffStream,
        state: user.state,
        email: user.email,
      };

      if (user.mdaId) {
        await ctx.scheduler.runAfter(0, api.users.removeUserFromMDA, {
          clerkUserId
        });
      }
      await ctx.db.delete(user._id);

      await logAuditEvent(ctx, {
        action: "user.deleted",
        category: "user",
        summary: `Deleted user ${targetName} (${formatRoleSnapshot(user)})`,
        actor: null,
        target: {
          type: "user",
          id: user._id,
          label: targetName,
        },
        metadata: { before },
      });
    } else {
      console.warn(`No user found for Clerk ID: ${clerkUserId}`);
    }
  }
});
export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const userRecord = await getCurrentUser(ctx);
  if (!userRecord) {
    throw new Error("User not authenticated");
  }
  return userRecord;
}
export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    return null;
  }
  return await userByClerkUserId(ctx, identity.subject);
}
async function userByClerkUserId(ctx: QueryCtx, clerkUserId: string | null | undefined) {
  if (!clerkUserId) return null;
  return await ctx.db.query('users').withIndex('byClerkUserId', q => q.eq('clerkUserId', clerkUserId)).unique();
}
export const getUserByClerkId = query({
  args: {
    clerkUserId: v.optional(v.string())
  },
  handler: async (ctx, {
    clerkUserId
  }) => {
    if (!clerkUserId) return null;
    return await ctx.db.query("users").withIndex("byClerkUserId", q => q.eq("clerkUserId", clerkUserId)).unique();
  }
});
export const setUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(
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
    )
  },
  handler: async (ctx, {
    userId,
    role
  }) => {
    const currentUser = await getCurrentUserOrThrow(ctx);
    if (currentUser.role !== "admin") {
      throw new Error("🚨 Only admins can change roles!");
    }
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("🚨 Target user not found");
    const isRemovingFromMDA = user.role === "mda" && role !== "mda";
    await ctx.db.patch(userId, {
      role
    });
    if (isRemovingFromMDA) {
      await ctx.scheduler.runAfter(0, api.users.removeUserFromMDA, {
        clerkUserId: user.clerkUserId
      });
    }
    console.log(`🔄 Updated role for user ${userId} to ${role}`);
  }
});
export const getUserRole = query({
  args: {
    clerkUserId: v.string()
  },
  handler: async (ctx, {
    clerkUserId
  }) => {
    const user = await ctx.db.query("users").withIndex("byClerkUserId", q => q.eq("clerkUserId", clerkUserId)).unique();
    return user?.role ?? "user";
  }
});
export const getUserRoles = query({
  args: {
    userId: v.string()
  },
  handler: async (ctx, {
    userId
  }) => {
    const user = await ctx.db.query("users").withIndex("byClerkUserId", q => q.eq("clerkUserId", userId)).first();
    return user?.role || "user";
  }
});
export const getUserById = query({
  args: {
    clerkUserId: v.string()
  },
  handler: async (ctx, {
    clerkUserId
  }) => {
    const user = await ctx.db.query("users").withIndex("byClerkUserId", q => q.eq("clerkUserId", clerkUserId)).unique();
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }
});
export const getUserByIds = query({
  args: {
    id: v.id("users")
  },
  handler: async (ctx, {
    id
  }) => {
    const user = await ctx.db.get(id);
    if (!user) throw new Error("User not found");
    return user;
  }
});
export const getUserByIdSafe = query({
  args: {
    id: v.id("users")
  },
  handler: async (ctx, {
    id
  }) => {
    const user = await ctx.db.get(id);
    return user;
  }
});
export const getCurrentUsers = query({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.query("users").withIndex("byClerkUserId", q => q.eq("clerkUserId", identity.subject)).unique();
    if (!user) return null;
    return {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      state: user.state,
      email: user.email,
      phoneNumber: user.phoneNumber,
      ecConfirmed: user.ecConfirmed ?? false,
      role: user.role,
      staffStream: user.staffStream ?? null,
      permissions: user.permissions ?? []
    };
  }
});
export const checkEmailExists = query({
  args: {
    email: v.string()
  },
  handler: async (ctx, {
    email
  }) => {
    const user = await ctx.db.query("users").filter(q => q.eq(q.field("email"), email)).first();
    return !!user;
  }
});
export const getTotalUsers = query({
  args: {},
  handler: async ctx => {
    const users = await ctx.db.query("users").collect();
    return users.length;
  }
});
/** All admin users (includes EMAIL_NOTIFICATION_BLACKLIST — use for admin UI lists only). */
export const getAdmins = query({
  args: {},
  handler: async ctx => {
    return await ctx.db.query("users").withIndex("byRole", q => q.eq("role", "admin")).collect();
  }
});

/** Admins who receive blast emails (tickets, feedback, etc.) — excludes EMAIL_NOTIFICATION_BLACKLIST. */
export const getAdminsForEmailNotifications = query({
  args: {},
  handler: async ctx => {
    const allAdmins = await ctx.db
      .query("users")
      .withIndex("byRole", (q) => q.eq("role", "admin"))
      .collect();
    return filterAdminsForNotifications(allAdmins);
  },
});
export const updateUserProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    state: v.optional(v.string()),
    address: v.optional(v.string()),
    businessName: v.optional(v.string()),
    industry: v.optional(v.string()),
    jobTitle: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    await patchUser(ctx, user._id, user, {
      firstName: args.firstName,
      lastName: args.lastName,
      phoneNumber: args.phoneNumber,
      state: args.state,
      address: args.address,
      businessName: args.businessName,
      industry: args.industry,
      jobTitle: args.jobTitle
    });
    return true;
  }
});
export const getUserDetail = query({
  args: {},
  handler: async ctx => {
    const user = await getCurrentUserOrThrow(ctx);
    return user;
  }
});
export const getUserDetails = query({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userDetails = await ctx.db.query("users").withIndex("byClerkUserId", q => q.eq("clerkUserId", identity.subject)).first();
    if (!userDetails) return null;
    return {
      phoneNumber: userDetails.phoneNumber ?? "",
      state: userDetails.state ?? "",
      address: userDetails.address ?? "",
      mdaId: userDetails.mdaId || null,
      businessName: userDetails.businessName ?? "",
      industry: userDetails.industry ?? ""
    };
  }
});
export const getUserProfile = query({
  args: {
    clerkUserId: v.string()
  },
  handler: async (ctx, {
    clerkUserId
  }) => {
    const user = await ctx.db.query("users").withIndex("byClerkUserId", q => q.eq("clerkUserId", clerkUserId)).unique();
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }
});
export const getMDAs = query({
  args: {},
  handler: async ctx => {
    return await ctx.db.query("mdas").collect();
  }
});
export const assignUserToMDA = mutation({
  args: {
    clerkUserId: v.string(),
    mdaName: v.string(),
    description: v.optional(v.string()),
    phoneNumber: v.optional(v.string())
  },
  handler: async (ctx, {
    clerkUserId,
    mdaName,
    description,
    phoneNumber
  }) => {
    type MDAType = {
      _id: Id<"mdas">;
      _creationTime: number;
      name: string;
      assignedUsers: Id<"users">[];
      description?: string;
      phoneNumber?: string;
      createdAt: number;
    };
    const user = await ctx.db.query("users").withIndex("byClerkUserId", q => q.eq("clerkUserId", clerkUserId)).unique();
    if (!user) {
      throw new Error("🚨 User not found in Convex");
    }
    if (user.mdaId) {
      const oldMda = await ctx.db.get(user.mdaId);
      if (oldMda && oldMda.assignedUsers) {
        const updatedUsers = oldMda.assignedUsers.filter(uid => uid.toString() !== user._id.toString());
        if (updatedUsers.length === 0) {
          await ctx.db.delete(oldMda._id);
        } else {
          await ctx.db.patch(oldMda._id, {
            assignedUsers: updatedUsers
          });
        }
      }
    }
    let mda = (await ctx.db.query("mdas").withIndex("byName", q => q.eq("name", mdaName)).unique()) as MDAType | null;
    if (!mda) {
      const mdaId = await ctx.db.insert("mdas", {
        name: mdaName,
        description: description || "",
        phoneNumber: phoneNumber || "",
        assignedUsers: [user._id],
        createdAt: Date.now()
      });
      mda = (await ctx.db.get(mdaId)) as MDAType;
    } else {
      const alreadyAssigned = mda.assignedUsers.some(id => id.toString() === user._id.toString());
      if (!alreadyAssigned) {
        await ctx.db.patch(mda._id, {
          assignedUsers: [...mda.assignedUsers, user._id]
        });
      }
      await ctx.db.patch(mda._id, {
        description,
        phoneNumber
      });
    }
    await ctx.db.patch(user._id, {
      mdaId: mda._id,
      mdaName: mda.name,
      ...(user.role === "user" ? {
        role: "mda"
      } : {})
    });
    console.log(`✅ ${user.email} assigned to MDA: ${mda.name}`);
    return {
      success: true,
      message: `✅ User assigned to ${mda.name}`
    };
  }
});
export const assignTicketToMDA = mutation({
  args: {
    ticketId: v.id("tickets"),
    mdaId: v.id("mdas")
  },
  handler: async (ctx, {
    ticketId,
    mdaId
  }) => {
    const ticket = await ctx.db.get(ticketId);
    if (!ticket) throw new Error("Ticket not found");
    await ctx.db.patch(ticketId, {
      assignedMDA: mdaId
    });
    return {
      success: true,
      message: "Ticket assigned to MDA successfully"
    };
  }
});
export const getUsersWithRole = query({
  args: {
    role: v.optional(v.string())
  },
  handler: async (ctx, {
    role
  }) => {
    let query = ctx.db.query("users");
    if (role) {
      query = query.filter(q => q.eq(q.field("role"), role));
    }
    return await query.collect();
  }
});
export const updateUserInConvex = mutation({
  args: {
    clerkUserId: v.string(),
    role: v.union(
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
    ),
    mdaId: v.optional(v.id("mdas")),
    mdaName: v.optional(v.string()),
    description: v.optional(v.string()),
    phoneNumber: v.optional(v.string())
  },
  handler: async (ctx, {
    clerkUserId,
    role,
    mdaId,
    mdaName,
    phoneNumber
  }) => {
    const user = await ctx.db.query("users").withIndex("byClerkUserId", q => q.eq("clerkUserId", clerkUserId)).first();
    if (!user) {
      throw new Error("User not found in Convex");
    }
    if (role === "mda" && mdaId) {
      const mda = await ctx.db.get(mdaId);
      if (!mda) throw new Error("MDA not found");
    }
    await patchUser(ctx, user._id, user, {
      role,
      mdaId,
      mdaName,
      phoneNumber
    });
  }
});
export async function getCurrentUserOrNull(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const user = await ctx.db.query("users").withIndex("byClerkUserId", q => q.eq("clerkUserId", identity.subject)).unique();
  return user;
}
export const updateUserRoleInConvex = mutation({
  args: {
    clerkUserId: v.string(),
    role: v.union(
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
    ),
    staffStream: v.optional(v.string()),
    state: v.optional(v.string()),
    permissions: v.optional(v.array(v.string()))
  },
  handler: async (ctx, {
    clerkUserId,
    role,
    staffStream,
    state,
    permissions
  }) => {
    const actor = await getCurrentUserOrThrow(ctx);
    if (actor.role !== "admin") {
      throw new Error("Unauthorized: Only admins can change user roles");
    }

    const user = await ctx.db.query("users").withIndex("byClerkUserId", q => q.eq("clerkUserId", clerkUserId)).unique();
    if (!user) throw new Error(`User not found: ${clerkUserId}`);

    const before = {
      role: user.role,
      staffStream: user.staffStream,
      state: user.state,
    };
    const targetName = auditDisplayName(user);

    const patchData: Record<string, any> = {
      role
    };
    if (user.role === "mda" && role !== "mda" && user.mdaId) {
      await ctx.scheduler.runAfter(0, api.users.removeUserFromMDA, {
        clerkUserId
      });
      patchData.mdaId = undefined;
      patchData.mdaName = undefined;
    }
    if (role === "staff" && staffStream) {
      const permissionMap: Record<string, string[]> = {
        regulatory: ["/staff", "/staff/tasks", "/staff/kanban", "/staff/rooms", "/staff/projects", "/staff/bfa-reports", "/staff/reportgov", "/staff/materials", "/staff/assigned-letters", "/staff/meetings", "/staff/received-letters", "/staff/send-letters", "/staff/holiday-whereabout", "/staff/leave-requests", "/staff/profile"],
        sub_national: ["/staff", "/staff/tasks", "/staff/kanban", "/staff/rooms", "/staff/projects", "/staff/bfa-reports", "/staff/reportgov", "/staff/materials", "/staff/assigned-letters", "/staff/meetings", "/staff/received-letters", "/staff/send-letters", "/staff/holiday-whereabout", "/staff/leave-requests", "/staff/profile"],
        innovation: ["/staff", "/staff/tasks", "/staff/kanban", "/staff/rooms", "/staff/projects", "/staff/bfa-reports", "/staff/reportgov", "/staff/materials", "/staff/assigned-letters", "/staff/meetings", "/staff/received-letters", "/staff/send-letters", "/staff/holiday-whereabout", "/staff/leave-requests", "/staff/profile"],
        judiciary: ["/staff", "/staff/tasks", "/staff/kanban", "/staff/rooms", "/staff/projects", "/staff/deputies-reports", "/staff/magistrates-reports", "/staff/assigned-letters", "/staff/materials", "/staff/received-letters", "/staff/send-letters", "/staff/holiday-whereabout", "/staff/leave-requests", "/staff/profile"],
        communications: ["/staff", "/staff/tasks", "/staff/kanban", "/staff/rooms", "/staff/projects", "/staff/bfa-reports", "/staff/reportgov", "/staff/meetings", "/staff/assigned-letters", "/staff/newsletters", "/staff/subscribers", "/staff/received-letters", "/staff/send-letters", "/staff/materials", "/staff/holiday-whereabout", "/staff/leave-requests", "/staff/profile"],
        investments: ["/staff", "/staff/tasks", "/staff/kanban", "/staff/rooms", "/staff/projects", "/staff/assigned-letters", "/staff/received-letters", "/staff/send-letters", "/staff/holiday-whereabout", "/staff/leave-requests", "/staff/profile"],
        receptionist: ["/staff", "/staff/tasks", "/staff/kanban", "/staff/rooms", "/staff/projects", "/staff/letters", "/staff/business-letters", "/staff/messages", "/staff/send-letters", "/staff/received-letters", "/staff/holiday-whereabout", "/staff/leave-requests", "/staff/profile"],
        account: ["/staff", "/staff/tasks", "/staff/kanban", "/staff/rooms", "/staff/projects", "/staff/assigned-letters", "/staff/send-letters", "/staff/received-letters", "/staff/holiday-whereabout", "/staff/leave-requests", "/staff/profile"],
        auditor: ["/staff/tasks", "/staff/projects", "/staff/assigned-letters", "/staff/send-letters", "/staff/received-letters", "/staff/holiday-whereabout", "/staff/leave-requests", "/staff/profile"],
        logistics: ["/staff", "/staff/rooms", "/staff/tasks", "/staff/assigned-letters", "/staff/received-letters", "/staff/send-letters", "/staff/holiday-whereabout", "/staff/leave-requests", "/staff/meetings", "/staff/meeting-calendar", "/staff/profile"]
      };

      // Get base staff permissions
      const baseStaffPermissions = permissionMap[staffStream] ?? [];

      // Merge with additional admin permissions if provided
      const additionalPermissions = permissions ?? [];
      const combinedPermissions = [...new Set([...baseStaffPermissions, ...additionalPermissions])];

      patchData.permissions = combinedPermissions;
      patchData.staffStream = staffStream;
    } else {
      patchData.permissions = permissions ?? undefined;
      patchData.staffStream = undefined;
    }
    if (["state_governor", "saber_agent", "deputies", "magistrates"].includes(role)) {
      patchData.state = state?.trim() || "";
    } else {
      patchData.state = undefined;
    }
    await ctx.db.patch(user._id, patchData);

    const after = {
      role,
      staffStream: patchData.staffStream,
      state: patchData.state,
    };

    await logAuditEvent(ctx, {
      action: "user.role_changed",
      category: "user",
      summary: `Changed ${targetName}'s role from ${formatRoleSnapshot(before)} to ${formatRoleSnapshot(after)}`,
      actor,
      target: {
        type: "user",
        id: user._id,
        label: targetName,
      },
      metadata: { before, after },
    });
  }
});
export const getTotalMDAs = query({
  args: {},
  handler: async ctx => {
    const mdas = await ctx.db.query("mdas").collect();
    return mdas.length;
  }
});
export const removeUserFromMDA = mutation({
  args: {
    clerkUserId: v.string()
  },
  handler: async (ctx, {
    clerkUserId
  }) => {
    const user = await ctx.db.query("users").withIndex("byClerkUserId", q => q.eq("clerkUserId", clerkUserId)).unique();
    if (!user || !user.mdaId) return;
    const mda = await ctx.db.get(user.mdaId);
    if (!mda || !Array.isArray(mda.assignedUsers)) return;
    const updatedUsers = mda.assignedUsers.filter(id => id.toString() !== user._id.toString());
    await ctx.db.patch(user._id, {
      mdaId: undefined,
      mdaName: undefined
    });
    if (updatedUsers.length === 0) {
      await ctx.db.delete(mda._id);
    } else {
      await ctx.db.patch(mda._id, {
        assignedUsers: updatedUsers
      });
    }
  }
});
export const removeMDAFromUsers = mutation({
  args: {
    mdaId: v.id("mdas")
  },
  handler: async (ctx, {
    mdaId
  }) => {
    const users = await ctx.db.query("users").filter(q => q.eq(q.field("mdaId"), mdaId)).collect();
    for (const user of users) {
      await ctx.db.patch(user._id, {
        mdaId: undefined,
        mdaName: undefined
      });
    }
    console.log(`✅ Removed MDA (${mdaId}) from ${users.length} users`);
  }
});
export const deleteMDA = mutation({
  args: {
    mdaId: v.id("mdas")
  },
  handler: async (ctx, {
    mdaId
  }) => {
    const mda = await ctx.db.get(mdaId);
    if (!mda) throw new Error("MDA not found");
    await ctx.scheduler.runAfter(0, api.users.removeMDAFromUsers, {
      mdaId
    });
    await ctx.db.delete(mdaId);
    console.log(`🔥 Deleted MDA: ${mda.name}`);
  }
});
/**
 * Admins excluded from blast emails, in-app admin notifications, and SABER deadline CCs:
 * tickets, business letters, event registrations, DLI (in-app), role requests, SABER reminders.
 */
export function isEmailNotificationBlacklisted(email: string | undefined | null): boolean {
  if (!email?.trim()) return false;
  const blacklistEnv = process.env.EMAIL_NOTIFICATION_BLACKLIST;
  if (!blacklistEnv) return false;
  const blacklist = blacklistEnv.split(",").map((e) => e.trim().toLowerCase());
  return blacklist.includes(email.trim().toLowerCase());
}


/** Filter admins for ticket/letter/event/DLI/role-request emails and matching in-app notifications. */
export function filterAdminsForNotifications(admins: any[]) {
  return admins.filter(
    (admin) => admin.email && !isEmailNotificationBlacklisted(admin.email)
  );
}

/** Admins who receive SABER deadline reminder CC emails (same exclusions as other admin blasts). */
export function getAdminsForSaberReminders(admins: any[]) {
  return filterAdminsForNotifications(admins);
}

// Helper function to fetch external CC recipients for saber reminders from env
export function getExternalCcForSaberReminders(): { email: string }[] {
  const envEmails = process.env.SABER_EXTRA_CC_EMAILS;
  console.log("SABER_EXTRA_CC_EMAILS env value:", envEmails);

  if (!envEmails) {
    console.log("No SABER_EXTRA_CC_EMAILS found in environment");
    return [];
  }

  const emails = envEmails.split(',')
    .map(e => e.trim())
    .filter(Boolean)
    .map(email => ({ email }));

  console.log("Parsed external CC emails:", emails);
  return emails;
}

export const getAdminEmails = mutation(async ctx => {
  const users = await ctx.db.query("users").collect();
  const admins = users.filter(
    (u) => u.role === "admin" && u.email && !isEmailNotificationBlacklisted(u.email)
  );
  return admins.map((u) => u.email);
});
export const getGrowthStats = query(async ({
  db
}) => {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const lastMonthEnd = currentMonthStart - 1;
  const totalUsers = (await db.query("users").collect()).length;
  const totalPosts = (await db.query("posts").collect()).length;
  const totalMDAs = (await db.query("mdas").collect()).length;
  const usersLastMonth = (await db.query("users").filter(q => q.gte(q.field("_creationTime"), lastMonthStart)).collect()).length;
  const usersThisMonth = (await db.query("users").filter(q => q.and(q.gte(q.field("_creationTime"), currentMonthStart), q.lte(q.field("_creationTime"), lastMonthEnd))).collect()).length;
  const postsLastMonth = (await db.query("posts").filter(q => q.gte(q.field("_creationTime"), lastMonthStart)).collect()).length;
  const postsThisMonth = (await db.query("posts").filter(q => q.and(q.gte(q.field("_creationTime"), currentMonthStart), q.lte(q.field("_creationTime"), lastMonthEnd))).collect()).length;
  const mdasLastMonth = (await db.query("mdas").filter(q => q.gte(q.field("_creationTime"), lastMonthStart)).collect()).length;
  const mdasThisMonth = (await db.query("mdas").filter(q => q.and(q.gte(q.field("_creationTime"), currentMonthStart), q.lte(q.field("_creationTime"), lastMonthEnd))).collect()).length;
  console.log("🔥 Total Users:", totalUsers);
  console.log("🔥 Users Last Month:", usersLastMonth);
  console.log("🔥 Users This Month:", usersThisMonth);
  console.log("🔥 Total Posts:", totalPosts);
  console.log("🔥 Posts Last Month:", postsLastMonth);
  console.log("🔥 Posts This Month:", postsThisMonth);
  console.log("🔥 Total MDAs:", totalMDAs);
  console.log("🔥 MDAs Last Month:", mdasLastMonth);
  console.log("🔥 MDAs This Month:", mdasThisMonth);
  return {
    total: {
      users: totalUsers,
      posts: totalPosts,
      mdas: totalMDAs
    },
    growth: {
      users: {
        current: usersThisMonth,
        previous: usersLastMonth
      },
      posts: {
        current: postsThisMonth,
        previous: postsLastMonth
      },
      mdas: {
        current: mdasThisMonth,
        previous: mdasLastMonth
      }
    }
  };
});
export const getAllUsers = query({
  args: {
    limit: v.optional(v.number()),
    role: v.optional(v.string()),
  },
  handler: async (ctx, { limit, role }) => {
    const cappedLimit = Math.min(Math.max(limit ?? 8000, 1), 8191);
    const users = role
      ? await ctx.db
          .query("users")
          .withIndex("byRole", (q) => q.eq("role", role))
          .take(cappedLimit)
      : await ctx.db.query("users").take(cappedLimit);
    return users.map((user) => ({
      ...user,
      fullName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
    }));
  },
});
export const getAllAdminsAndStaff = query({
  handler: async ctx => {
    return await ctx.db.query("users").filter(q => q.or(q.eq(q.field("role"), "admin"), q.eq(q.field("role"), "staff"))).collect();
  }
});
export const isAdmin = (user: {
  role?: string;
}) => {
  if (user.role !== "admin") {
    throw new Error("Forbidden: Admins only.");
  }
};
const allowedRoles = v.union(
  v.literal("mda"),
  v.literal("staff"),
  v.literal("reform_champion"),
  v.literal("saber_agent"),
  v.literal("state_governor"),
  v.literal("deputies"),
  v.literal("magistrates"),
  v.literal("world_bank"),
  v.literal("ngf"),
  v.literal("dmo")
);
export const requestInternalRole = mutation({
  args: {
    requestedRole: allowedRoles,
    mdaId: v.optional(v.id("mdas")),
    mdaName: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    state: v.optional(v.string()),
    address: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (!user) throw new Error("User not found");
    await patchUser(ctx, user._id, user, {
      firstName: args.firstName,
      lastName: args.lastName,
      phoneNumber: args.phoneNumber,
      address: args.address,
      jobTitle: args.jobTitle,
      state: args.state,
      roleRequest: {
        requestedRole: args.requestedRole,
        mdaId: args.mdaId,
        mdaName: args.mdaName,
        jobTitle: args.jobTitle,
        state: args.state,
        address: args.address,
        phoneNumber: args.phoneNumber,
        firstName: args.firstName,
        lastName: args.lastName,
        status: "pending",
        submittedAt: Date.now()
      }
    });
    const allAdmins = await ctx.db.query("users").withIndex("byRole", q => q.eq("role", "admin")).collect();
    const admins = filterAdminsForNotifications(allAdmins);
    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin._id,
        message: `User ${args.firstName} ${args.lastName} requested access for role ${args.requestedRole} - MDA: ${args.mdaName}, State: ${args.state}, Address: ${args.address}, Phone: ${args.phoneNumber}`,
        isRead: false,
        createdAt: Date.now(),
        type: "role_request"
      });
    }
    await ctx.scheduler.runAfter(0, api.email.sendEmail, {
      to: user.email,
      subject: "Internal Role Access Request Submitted",
      html: `<p>Dear ${args.firstName},</p><p>Your request for internal access has been submitted successfully. An admin will review and approve your request shortly.</p>`
    });
    for (const admin of admins) {
      await ctx.scheduler.runAfter(0, api.email.sendEmail, {
        to: admin.email,
        subject: `New Internal Role Request from ${args.firstName} ${args.lastName}`,
        html: `<p>User <strong>${args.firstName} ${args.lastName}</strong> has requested internal access.</p>
               <p>Role: ${args.requestedRole}</p>
               <p>MDA: ${args.mdaName}</p>
               <p>State: ${args.state}</p>
               <p>Address: ${args.address}</p>
               <p>Phone: ${args.phoneNumber}</p>`
      });
    }
  }
});
export const getPendingRoleRequests = query({
  args: {},
  handler: async ctx => {
    const admin = await getCurrentUserOrThrow(ctx);
    if (admin.role !== "admin") throw new Error("Unauthorized");
    return await ctx.db.query("users").filter(q => q.eq(q.field("roleRequest.status"), "pending")).collect();
  }
});
export const approveRoleRequest = mutation({
  args: {
    userId: v.id("users"),
    role: allowedRoles,
    mdaName: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    state: v.optional(v.string()),
    staffStream: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUserOrThrow(ctx);
    if (admin.role !== "admin") throw new Error("Unauthorized");
    const user = await ctx.db.get(args.userId);
    if (!user?.roleRequest || user.roleRequest.status !== "pending") {
      throw new Error("No pending request found.");
    }
    let mdaId: Id<"mdas"> | undefined = user.roleRequest?.mdaId;
    if (args.role === "mda") {
      if (!args.mdaName) throw new Error("MDA Name is required for MDA role.");
      const existingMda = await ctx.db.query("mdas").withIndex("byName", q => q.eq("name", args.mdaName!)).unique();
      if (existingMda) {
        mdaId = existingMda._id;
        if (!existingMda.assignedUsers.includes(args.userId)) {
          await ctx.db.patch(mdaId, {
            assignedUsers: [...existingMda.assignedUsers, args.userId]
          });
        }
      } else {
        mdaId = await ctx.db.insert("mdas", {
          name: args.mdaName,
          assignedUsers: [args.userId],
          createdAt: Date.now()
        });
      }
    }
    const approvalEntry = {
      adminId: admin._id,
      adminName: `${admin.firstName ?? ""} ${admin.lastName ?? ""}`.trim() || admin.email || "Admin",
      approvedAt: Date.now(),
      role: args.role,
      mdaName: args.mdaName ?? user.roleRequest.mdaName
    };
    const existingHistory = user.roleApprovalHistory ?? [];
    await patchUser(ctx, user._id, user, {
      role: args.role,
      mdaId,
      mdaName: args.mdaName,
      jobTitle: user.roleRequest.jobTitle,
      state: args.state,
      address: user.roleRequest.address,
      phoneNumber: args.phoneNumber,
      staffStream: args.staffStream,
      firstName: user.roleRequest.firstName,
      lastName: user.roleRequest.lastName,
      roleRequest: undefined,
      roleApprovalHistory: [...existingHistory, approvalEntry],
    });
    await ctx.scheduler.runAfter(0, api.email.sendEmail, {
      to: user.email,
      subject: "Your Internal Access Request Has Been Approved",
      html: `<p>Dear ${user.roleRequest.firstName},</p>
            <p>Your request for internal access has been approved. Next time you log in, you will have access to your dashboard. If you're already logged in, please refresh the page.</p>`
    });

    const targetName = auditDisplayName(user);
    await logAuditEvent(ctx, {
      action: "user.role_request_approved",
      category: "user",
      summary: `Approved role request for ${targetName} as ${formatRoleSnapshot({ role: args.role, staffStream: args.staffStream, state: args.state })}`,
      actor: admin,
      target: {
        type: "user",
        id: user._id,
        label: targetName,
      },
      metadata: {
        before: { role: user.role, roleRequest: user.roleRequest },
        after: { role: args.role, staffStream: args.staffStream, state: args.state, mdaName: args.mdaName },
      },
    });
  }
});
export const rejectRoleRequest = mutation({
  args: {
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUserOrThrow(ctx);
    if (admin.role !== "admin") throw new Error("Unauthorized");
    const user = await ctx.db.get(args.userId);
    if (!user?.roleRequest || user.roleRequest.status !== "pending") {
      throw new Error("No pending request found.");
    }
    await ctx.db.patch(user._id, {
      roleRequest: {
        ...user.roleRequest,
        status: "rejected"
      }
    });

    const targetName = auditDisplayName(user);
    await logAuditEvent(ctx, {
      action: "user.role_request_rejected",
      category: "user",
      summary: `Rejected role request for ${targetName}`,
      actor: admin,
      target: {
        type: "user",
        id: user._id,
        label: targetName,
      },
      metadata: {
        roleRequest: user.roleRequest,
      },
    });
  }
});
export const getMdaByName = query({
  args: {
    name: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db.query("mdas").filter(q => q.eq(q.field("name"), args.name)).first();
  }
});
export const generateMonthlyAccessCode = mutation({
  args: {},
  handler: async ctx => {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const existing = await ctx.db.query("access_codes").withIndex("byDate").filter(q => q.gte("generatedAt", firstOfMonth as any)).first();
    if (existing) return existing.code;
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(-2);
    const randomDigits = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
    const code = `PEBEC-INTREQ${day}${month}${year}${randomDigits}`;
    await ctx.db.insert("access_codes", {
      code,
      generatedAt: Date.now()
    });
    return code;
  }
});
export const generateMonthlyAccessCodeInternal = internalMutation({
  args: {},
  handler: async ctx => {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const existing = await ctx.db.query("access_codes").withIndex("byDate").filter(q => q.gte("generatedAt", firstOfMonth as any)).first();
    if (existing) return existing.code;
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(-2);
    const randomDigits = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
    const code = `PEBEC-INTREQ${day}${month}${year}${randomDigits}`;
    await ctx.db.insert("access_codes", {
      code,
      generatedAt: Date.now()
    });
    return code;
  }
});
export const debugUserPermissions = query({
  args: {
    clerkUserId: v.string()
  },
  handler: async (ctx, { clerkUserId }) => {
    const user = await ctx.db.query("users")
      .withIndex("byClerkUserId", q => q.eq("clerkUserId", clerkUserId))
      .unique();

    if (!user) {
      return { error: "User not found" };
    }

    return {
      userId: user._id,
      role: user.role,
      staffStream: user.staffStream,
      permissions: user.permissions || [],
      permissionsCount: (user.permissions || []).length,
      adminPermissions: (user.permissions || []).filter(p => p.startsWith('/admin')),
      hasDebugPermissions: true
    };
  }
});

// Get MDA statistics for filtering by number of agents and reform champions
export const getMDAStatistics = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentUserOrThrow(ctx);
    if (admin.role !== "admin") throw new Error("Unauthorized");

    // Get all users with specific roles
    const allUsers = await ctx.db.query("users").collect();

    // Group users by MDA name and count agents and champions
    const mdaStats: Record<string, {
      mdaName: string;
      reportGovAgents: number;
      reformChampions: number;
    }> = {};

    for (const user of allUsers) {
      if (user.mdaName && (user.role === "mda" || user.role === "reform_champion")) {
        if (!mdaStats[user.mdaName]) {
          mdaStats[user.mdaName] = {
            mdaName: user.mdaName,
            reportGovAgents: 0,
            reformChampions: 0
          };
        }

        if (user.role === "mda") {
          mdaStats[user.mdaName].reportGovAgents++;
        } else if (user.role === "reform_champion") {
          mdaStats[user.mdaName].reformChampions++;
        }
      }
    }

    return Object.values(mdaStats);
  }
});

export const getMDAById = query({
  args: { mdaId: v.id("mdas") },
  handler: async (ctx, { mdaId }) => {
    const mda = await ctx.db.get(mdaId);
    if (!mda) return null;
    return mda;
  }
});

// User Activity Tracking Functions - Smart tracking based on activity type
export const trackUserActivity = mutation({
  args: {
    activityType: v.union(
      v.literal("login"),
      v.literal("page_view"),
      v.literal("action"),
      v.literal("logout")
    ),
    page: v.optional(v.string()),
    action: v.optional(v.string()),
    metadata: v.optional(v.object({
      userAgent: v.optional(v.string()),
      ipAddress: v.optional(v.string()),
      sessionDuration: v.optional(v.number()),
      staffStream: v.optional(v.string()),
      elementType: v.optional(v.string()),
      elementText: v.optional(v.string()),
      formName: v.optional(v.string()),
      messageType: v.optional(v.string()),
      hasFile: v.optional(v.boolean()),
      letterName: v.optional(v.string())
    }))
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Only track for staff users
    if (user.role !== "staff") {
      return { tracked: false, reason: "Only staff users are tracked" };
    }

    const now = Date.now();

    // Get start of today (00:00:00)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfDay = today.getTime();
    const endOfDay = startOfDay + (24 * 60 * 60 * 1000) - 1;

    // Check for daily limitations based on activity type
    let shouldCheckDailyLimit = false;

    if (args.activityType === "login" ||
      args.activityType === "page_view" ||
      (args.activityType === "action" && args.action === "daily_message")) {
      shouldCheckDailyLimit = true;
    }

    // Letter submissions should NOT have daily limits (track every submission)
    // Only login, page_view, and daily_message should have daily limits

    // For activities with daily limits, check if already tracked today
    if (shouldCheckDailyLimit) {
      const existingActivity = await ctx.db
        .query("user_activity")
        .withIndex("byUser", q => q.eq("userId", user._id))
        .filter(q => q.and(
          q.eq(q.field("activityType"), args.activityType),
          q.gte(q.field("timestamp"), startOfDay),
          q.lte(q.field("timestamp"), endOfDay)
        ))
        .first();

      if (existingActivity) {
        return { tracked: false, reason: "Already tracked today" };
      }
    }

    // Track the activity
    await ctx.db.insert("user_activity", {
      userId: user._id,
      activityType: args.activityType,
      page: args.page,
      action: args.action,
      metadata: {
        ...args.metadata,
        staffStream: user.staffStream
      },
      timestamp: now
    });

    console.log(`Activity tracked: ${args.activityType} - ${args.action} for user ${user._id}`);
    return { tracked: true, reason: "Activity tracked successfully" };
  }
});

export const getStaffUsageMetrics = query({
  args: {
    timeRange: v.optional(v.union(
      v.literal("7d"),
      v.literal("30d"),
      v.literal("90d"),
      v.literal("1y"),
      v.literal("all")
    )),
    stream: v.optional(v.string()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, { timeRange = "30d", stream, limit }) => {
    try {
      const currentUser = await getCurrentUserOrThrow(ctx);

      // Only admins and staff can view these metrics
      if (!["admin", "staff"].includes(currentUser.role || "")) {
        throw new Error("Unauthorized access to staff metrics");
      }

      const now = Date.now();
      const timeRanges = {
        "7d": 7 * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000,
        "90d": 90 * 24 * 60 * 60 * 1000,
        "1y": 365 * 24 * 60 * 60 * 1000
      };

      const startTime = timeRange === "all" ? 0 : now - timeRanges[timeRange];

      // Get all staff users (filter by stream if provided)
      let staffUsersQuery = ctx.db
        .query("users")
        .withIndex("byRole", q => q.eq("role", "staff"));

      const staffUsers = await staffUsersQuery.collect();

      // Filter by stream if provided
      const filteredStaffUsers = stream
        ? staffUsers.filter(user => user.staffStream === stream)
        : staffUsers;

      // Get activity data for the time range
      const activities = await ctx.db
        .query("user_activity")
        .withIndex("byTimestamp", q => q.gte("timestamp", startTime))
        .collect();

      // Process metrics by staff stream
      const streamMetrics: Record<string, {
        totalUsers: number;
        activeUsers: number;
        totalLogins: number;
        totalPageViews: number;
        totalActions: number;
        averageSessionDuration: number;
        mostActiveUsers: Array<{
          userId: string;
          name: string;
          activityCount: number;
          lastActive: number;
        }>;
      }> = {};

      const staffStreams = ["regulatory", "sub_national", "innovation", "judiciary", "communications", "investments", "receptionist", "account", "auditor", "logistics"];

      for (const stream of staffStreams) {
        const streamUsers = filteredStaffUsers.filter(user => user.staffStream === stream);
        const streamUserIds = streamUsers.map(user => user._id);
        const streamActivities = activities.filter(activity =>
          streamUserIds.includes(activity.userId)
        );

        // Calculate metrics
        const loginActivities = streamActivities.filter(a => a.activityType === "login");
        const pageViewActivities = streamActivities.filter(a => a.activityType === "page_view");
        const actionActivities = streamActivities.filter(a => a.activityType === "action");

        // Get unique active users
        const activeUserIds = new Set(streamActivities.map(a => a.userId));

        // Calculate average session duration
        const sessionDurations = streamActivities
          .filter(a => a.metadata?.sessionDuration)
          .map(a => a.metadata!.sessionDuration!);
        const avgSessionDuration = sessionDurations.length > 0
          ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
          : 0;

        // Get most active users
        const userActivityCounts: Record<string, number> = {};
        const userLastActive: Record<string, number> = {};

        streamActivities.forEach(activity => {
          const userId = activity.userId;
          userActivityCounts[userId] = (userActivityCounts[userId] || 0) + 1;
          userLastActive[userId] = Math.max(userLastActive[userId] || 0, activity.timestamp);
        });

        const mostActiveUsers = Object.entries(userActivityCounts)
          .map(([userId, count]) => {
            const user = streamUsers.find(u => u._id === userId);
            return {
              userId,
              name: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Unknown",
              activityCount: count,
              lastActive: userLastActive[userId]
            };
          })
          .sort((a, b) => b.activityCount - a.activityCount)
          .slice(0, limit || 5);

        streamMetrics[stream] = {
          totalUsers: streamUsers.length,
          activeUsers: activeUserIds.size,
          totalLogins: loginActivities.length,
          totalPageViews: pageViewActivities.length,
          totalActions: actionActivities.length,
          averageSessionDuration: Math.round(avgSessionDuration / 1000 / 60), // Convert to minutes
          mostActiveUsers
        };
      }

      return {
        timeRange,
        totalStaffUsers: staffUsers.length,
        totalActiveStaff: new Set(activities.map(a => a.userId)).size,
        streamMetrics,
        generatedAt: now
      };
    } catch (error) {
      console.error("Error in getStaffUsageMetrics:", error);
      throw new Error("Failed to retrieve staff usage metrics");
    }
  }
});

export const getStaffUserActivity = query({
  args: {
    userId: v.optional(v.id("users")),
    timeRange: v.optional(v.union(
      v.literal("7d"),
      v.literal("30d"),
      v.literal("90d"),
      v.literal("1y")
    )),
    activityType: v.optional(v.union(
      v.literal("login"),
      v.literal("page_view"),
      v.literal("action"),
      v.literal("logout")
    )),
    limit: v.optional(v.number())
  },
  handler: async (ctx, { userId, timeRange = "30d", activityType, limit }) => {
    try {
      const currentUser = await getCurrentUserOrThrow(ctx);

      // Only admins and staff can view these metrics
      if (!["admin", "staff"].includes(currentUser.role || "")) {
        throw new Error("Unauthorized access to user activity");
      }

      const targetUserId = userId || currentUser._id;
      const now = Date.now();
      const timeRanges = {
        "7d": 7 * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000,
        "90d": 90 * 24 * 60 * 60 * 1000,
        "1y": 365 * 24 * 60 * 60 * 1000
      };

      const startTime = now - timeRanges[timeRange];

      let activitiesQuery = ctx.db
        .query("user_activity")
        .withIndex("byUser", q => q.eq("userId", targetUserId))
        .filter(q => q.gte(q.field("timestamp"), startTime))
        .order("desc");

      // Filter by activity type if provided
      if (activityType) {
        activitiesQuery = activitiesQuery.filter(q => q.eq(q.field("activityType"), activityType));
      }

      // Apply limit if provided
      const activities = limit
        ? await activitiesQuery.take(limit)
        : await activitiesQuery.collect();

      const user = await ctx.db.get(targetUserId);

      // Group activities by day
      // Helper to sanitize keys for Convex response objects (ASCII only)
      const sanitizeKey = (key: string) => key.replace(/[^\x20-\x7E]/g, '').trim().replace(/\s+/g, '_');

      const dailyActivity: Record<string, number> = {};
      const pageViews: Record<string, number> = {};
      const actions: Record<string, number> = {};

      activities.forEach(activity => {
        const date = new Date(activity.timestamp).toISOString().split('T')[0];
        dailyActivity[date] = (dailyActivity[date] || 0) + 1;

        if (activity.activityType === "page_view" && activity.page) {
          const safePage = sanitizeKey(activity.page);
          if (safePage) pageViews[safePage] = (pageViews[safePage] || 0) + 1;
        }

        if (activity.activityType === "action" && activity.action) {
          const safeAction = sanitizeKey(activity.action);
          if (safeAction) actions[safeAction] = (actions[safeAction] || 0) + 1;
        }
      });

      return {
        user: {
          id: user?._id,
          name: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Unknown",
          email: user?.email,
          role: user?.role,
          staffStream: user?.staffStream
        },
        timeRange,
        totalActivities: activities.length,
        dailyActivity,
        pageViews,
        actions,
        recentActivities: activities.slice(0, limit || 20).map(activity => ({
          type: activity.activityType,
          page: activity.page,
          action: activity.action,
          timestamp: activity.timestamp,
          metadata: activity.metadata
        }))
      };
    } catch (error) {
      console.error("Error in getStaffUserActivity:", error);
      throw new Error("Failed to retrieve user activity data");
    }
  }
});

export const refreshStaffPermissions = mutation({
  args: {},
  handler: async (ctx) => {
    // If run from dashboard/internally, identity might be null or different
    // We can rely on Convex's built-in security for who can call mutations from the dashboard
    // But let's try to be safe: check if there's an identity at least, or just allow it if we trust dashboard access.
    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      const user = await ctx.db.query("users").withIndex("byClerkUserId", q => q.eq("clerkUserId", identity.subject)).unique();
      if (user && user.role !== "admin") {
        throw new Error("Only admins can refresh permissions");
      }
    }
    // If no identity (e.g. CLI/Internal), we allow it as it's a maintenance task.

    const staffUsers = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("role"), "staff"))
      .collect();

    const permissionMap: Record<string, string[]> = {
      regulatory: ["/staff", "/staff/tasks", "/staff/kanban", "/staff/rooms", "/staff/bfa-reports", "/staff/reportgov", "/staff/materials", "/staff/assigned-letters", "/staff/meetings", "/staff/received-letters", "/staff/send-letters", "/staff/holiday-whereabout", "/staff/leave-requests", "/staff/profile"],
      sub_national: ["/staff", "/staff/tasks", "/staff/kanban", "/staff/rooms", "/staff/bfa-reports", "/staff/reportgov", "/staff/materials", "/staff/assigned-letters", "/staff/meetings", "/staff/received-letters", "/staff/send-letters", "/staff/holiday-whereabout", "/staff/leave-requests", "/staff/profile"],
      innovation: ["/staff", "/staff/tasks", "/staff/kanban", "/staff/rooms", "/staff/bfa-reports", "/staff/reportgov", "/staff/materials", "/staff/assigned-letters", "/staff/meetings", "/staff/received-letters", "/staff/send-letters", "/staff/holiday-whereabout", "/staff/leave-requests", "/staff/profile"],
      judiciary: ["/staff", "/staff/tasks", "/staff/kanban", "/staff/rooms", "/staff/deputies-reports", "/staff/magistrates-reports", "/staff/assigned-letters", "/staff/materials", "/staff/received-letters", "/staff/send-letters", "/staff/holiday-whereabout", "/staff/leave-requests", "/staff/profile"],
      communications: ["/staff", "/staff/tasks", "/staff/kanban", "/staff/rooms", "/staff/bfa-reports", "/staff/reportgov", "/staff/meetings", "/staff/assigned-letters", "/staff/newsletters", "/staff/subscribers", "/staff/received-letters", "/staff/send-letters", "/staff/materials", "/staff/holiday-whereabout", "/staff/leave-requests", "/staff/profile"],
      investments: ["/staff", "/staff/tasks", "/staff/kanban", "/staff/rooms", "/staff/projects", "/staff/assigned-letters", "/staff/received-letters", "/staff/send-letters", "/staff/holiday-whereabout", "/staff/leave-requests", "/staff/profile"],
      receptionist: ["/staff", "/staff/tasks", "/staff/kanban", "/staff/rooms", "/staff/letters", "/staff/business-letters", "/staff/messages", "/staff/send-letters", "/staff/received-letters", "/staff/holiday-whereabout", "/staff/leave-requests", "/staff/profile"],
      account: ["/staff", "/staff/tasks", "/staff/kanban", "/staff/rooms", "/staff/assigned-letters", "/staff/send-letters", "/staff/received-letters", "/staff/holiday-whereabout", "/staff/leave-requests", "/staff/profile"],
      auditor: ["/staff/tasks", "/staff/assigned-letters", "/staff/send-letters", "/staff/received-letters", "/staff/holiday-whereabout", "/staff/leave-requests", "/staff/profile"],
      logistics: ["/staff", "/staff/rooms", "/staff/tasks", "/staff/assigned-letters", "/staff/received-letters", "/staff/send-letters", "/staff/holiday-whereabout", "/staff/leave-requests", "/staff/meetings", "/staff/meeting-calendar", "/staff/profile"]
    };

    let count = 0;
    for (const staff of staffUsers) {
      if (staff.staffStream) {
        const basePermissions = permissionMap[staff.staffStream] ?? [];
        const currentPermissions = staff.permissions ?? [];
        const combinedPermissions = [...new Set([...basePermissions, ...currentPermissions])];

        await ctx.db.patch(staff._id, {
          permissions: combinedPermissions
        });
        count++;
      }
    }

    return { success: true, count };
  }
});
