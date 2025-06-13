// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
//@ts-nocheck

  import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
export const getTasksByStatus = query({
  args: {
    status: v.union(v.literal("to_do"), v.literal("in_progress"), v.literal("done"))
  },
  handler: async (ctx, {
    status
  }) => {
    return await ctx.db.query("tasks").withIndex("byStatus", q => q.eq("status", status)).order("desc").collect();
  }
});
export const getAllTasks = query({
  handler: async ctx => {
    return await ctx.db.query("tasks").order("desc").collect();
  }
});
export const getUsersByRole = query({
  args: {
    role: v.union(
      v.literal("user"),
      v.literal("admin"),
      v.literal("mda"),
      v.literal("staff"),
      v.literal("sub_national"),
      v.literal("federal"),
      v.literal("saber_agent"),
      v.literal("deputies"),
      v.literal("magistrates"),
      v.literal("state_governor"),
      v.literal("president"),
      v.literal("vice_president"),
      v.literal("world_bank")
    )
  },
  handler: async (ctx, {
    role
  }) => {
    return await ctx.db.query("users").withIndex("byRole", q => q.eq("role", role)).collect();
  }
});
export const createTask = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("to_do"), v.literal("in_progress"), v.literal("done"), v.literal("assigned")),
    assignedTo: v.optional(v.id("users")),
    assignedToName: v.optional(v.string()),
    assignedRole: v.optional(v.union(v.literal("user"), v.literal("admin"), v.literal("mda"), v.literal("staff"), v.literal("sub_national"), v.literal("federal"), v.literal("saber_agent"), v.literal("deputies"), v.literal("magistrates"), v.literal("state_governor"), v.literal("president"), v.literal("vice_president"))),
    priority: v.optional(v.string()),
    progress: v.optional(v.number()),
    comments: v.optional(v.number()),
    attachments: v.optional(v.number()),
    dueDate: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      status: args.status,
      assignedTo: args.assignedTo ?? undefined,
      assignedToName: args.assignedToName ?? "",
      assignedRole: args.assignedRole,
      priority: args.priority ?? "Low",
      progress: args.progress ?? 0,
      comments: args.comments ?? 0,
      attachments: args.attachments ?? 0,
      dueDate: args.dueDate ?? undefined,
      createdAt: Date.now()
    });
  }
});
export const updateTaskStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(v.literal("to_do"), v.literal("in_progress"), v.literal("done"))
  },
  handler: async (ctx, {
    taskId,
    status
  }) => {
    return await ctx.db.patch(taskId, {
      status,
      updatedAt: Date.now()
    });
  }
});
export const deleteTask = mutation({
  args: {
    taskId: v.id("tasks")
  },
  handler: async (ctx, {
    taskId
  }) => {
    return await ctx.db.delete(taskId);
  }
});