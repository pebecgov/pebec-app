// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { UserJSON } from '@clerk/backend';
import { v, Validator } from 'convex/values';
import { internalMutation, mutation, MutationCtx, query, QueryCtx } from './_generated/server';
import { clerkClient } from '@clerk/nextjs/dist/types/server';
import { Id } from './_generated/dataModel';
import { api } from './_generated/api';
export const getUsers = query({
  args: {},
  handler: async ctx => {
    return await ctx.db.query('users').collect();
  }
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
      role: existingUser?.role ?? "user"
    };
    if (existingUser === null) {
      console.log("✅ Creating new user:", userAttributes);
      await ctx.db.insert("users", userAttributes);
    } else {
      console.log("🔄 Updating existing user:", userAttributes);
      await ctx.db.patch(existingUser._id, userAttributes);
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
      if (user.mdaId) {
        await ctx.scheduler.runAfter(0, api.users.removeUserFromMDA, {
          clerkUserId
        });
      }
      await ctx.db.delete(user._id);
    } else {
      console.warn(`No user found for Clerk ID: ${clerkUserId}`);
    }
  }
});
export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const userRecord = await getCurrentUser(ctx);
  if (!userRecord) throw new Error("Can't get current user");
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
    role: v.union(v.literal("user"), v.literal("admin"), v.literal("mda"), v.literal("staff"), v.literal("reform_champion"), v.literal("federal"), v.literal("saber_agent"), v.literal("deputies"), v.literal("magistrates"), v.literal("state_governor"), v.literal("president"), v.literal("vice_president"))
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
export const getAdmins = query({
  args: {},
  handler: async ctx => {
    return await ctx.db.query("users").withIndex("byRole", q => q.eq("role", "admin")).collect();
  }
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
    await ctx.db.patch(user._id, {
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
    role: v.union(v.literal("user"), v.literal("admin"), v.literal("mda")),
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
    await ctx.db.patch(user._id, {
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
    role: v.union(v.literal("user"), v.literal("admin"), v.literal("mda"), v.literal("staff"), v.literal("reform_champion"), v.literal("federal"), v.literal("saber_agent"), v.literal("deputies"), v.literal("magistrates"), v.literal("state_governor"), v.literal("president"), v.literal("vice_president")),
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
    const user = await ctx.db.query("users").withIndex("byClerkUserId", q => q.eq("clerkUserId", clerkUserId)).unique();
    if (!user) throw new Error(`User not found: ${clerkUserId}`);
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
        regulatory: ["/staff", "/staff/bfa-reports", "/staff/reportgov", "/staff/materials", "/staff/assigned-letters", "/staff/meetings", "/staff/received-letters", "/staff/send-letters", "/staff/profile"],
        innovation: ["/staff", "/staff/bfa-reports", "/staff/reportgov", "/staff/materials", "/staff/assigned-letters", "/staff/meetings", "/staff/received-letters", "/staff/send-letters", "/staff/profile"],
        judiciary: ["/staff", "/staff/deputies-reports", "/staff/magistrates-reports", "/staff/assigned-letters", "/staff/materials", "/staff/received-letters", "/staff/send-letters", "/staff/profile"],
        communications: ["/staff", "/staff/bfa-reports", "/staff/reportgov", "/staff/meetings", "/staff/assigned-letters", "/staff/newsletters", "/staff/subscribers", "/staff/received-letters", "/staff/send-letters", "/staff/materials", "/staff/profile"],
        investments: ["/staff", "/staff/projects", "/staff/assigned-letters", "/staff/received-letters", "/staff/send-letters", "/staff/profile"],
        receptionist: ["/staff/letters", "/staff/business-letters", "/staff/send-letters", "/staff/received-letters", "/staff/profile"],
        account: ["/staff/assigned-letters", "/staff/send-letters", "/staff/received-letters", "/staff/profile"],
        auditor: ["/staff/assinged-letters", "/staff/send-letters", "/staff/received-letters", "/staff/profile"]
      };
      patchData.permissions = permissionMap[staffStream] ?? [];
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
export const getAdminEmails = mutation(async ctx => {
  const users = await ctx.db.query("users").collect();
  const admins = users.filter(u => u.role === "admin" && u.email);
  return admins.map(u => u.email);
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
  args: {},
  handler: async ctx => {
    const users = await ctx.db.query("users").collect();
    return users.map(user => ({
      ...user,
      fullName: `${user.firstName || ""} ${user.lastName || ""}`.trim()
    }));
  }
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
const allowedRoles = v.union(v.literal("mda"), v.literal("staff"), v.literal("reform_champion"), v.literal("saber_agent"), v.literal("state_governor"), v.literal("deputies"), v.literal("magistrates"));
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
    await ctx.db.patch(user._id, {
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
    const admins = await ctx.db.query("users").withIndex("byRole", q => q.eq("role", "admin")).collect();
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
    await ctx.db.patch(user._id, {
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
      roleRequest: undefined
    });
    await ctx.scheduler.runAfter(0, api.email.sendEmail, {
      to: user.email,
      subject: "Your Internal Access Request Has Been Approved",
      html: `<p>Dear ${user.roleRequest.firstName},</p>
            <p>Your request for internal access has been approved. Next time you log in, you will have access to your dashboard. If you're already logged in, please refresh the page.</p>`
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