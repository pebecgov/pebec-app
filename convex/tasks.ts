// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
//@ts-nocheck

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow } from "./users";

export const getTasksByStatus = query({
  args: {
    status: v.union(v.literal("to_do"), v.literal("in_progress"), v.literal("done"), v.literal("assigned"))
  },
  handler: async (ctx, { status }) => {
    return await ctx.db.query("tasks").withIndex("byStatus", q => q.eq("status", status)).order("desc").collect();
  }
});

export const getAllTasks = query({
  handler: async ctx => {
    return await ctx.db.query("tasks").order("desc").collect();
  }
});

// Get tasks assigned to the current user (for staff)
export const getMyTasks = query({
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    return await ctx.db
      .query("tasks")
      .withIndex("byAssignedTo", q => q.eq("assignedTo", user._id))
      .order("desc")
      .collect();
  }
});

// Get tasks created by the current user (for admins)
export const getTasksICreated = query({
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin") {
      throw new Error("Only admins can view tasks they created");
    }
    return await ctx.db
      .query("tasks")
      .withIndex("byCreatedBy", q => q.eq("createdBy", user._id))
      .order("desc")
      .collect();
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
      v.literal("world_bank"),
      v.literal("ngf"),
      v.literal("dmo")
    )
  },
  handler: async (ctx, { role }) => {
    return await ctx.db.query("users").withIndex("byRole", q => q.eq("role", role)).collect();
  }
});

// Create a new task (admin only)
export const createTask = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    assignedTo: v.id("users"),
    assignedToName: v.string(),
    priority: v.optional(v.string()),
    dueDate: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    
    // Only admins can create tasks
    if (user.role !== "admin") {
      throw new Error("Only admins can create tasks");
    }

    // Verify assigned user exists and is staff
    const assignedUser = await ctx.db.get(args.assignedTo);
    if (!assignedUser) {
      throw new Error("Assigned user not found");
    }
    if (assignedUser.role !== "staff") {
      throw new Error("Tasks can only be assigned to staff members");
    }

    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      status: "assigned",
      assignedTo: args.assignedTo,
      assignedToName: args.assignedToName,
      assignedRole: assignedUser.role,
      priority: args.priority ?? "Medium",
      progress: 0,
      comments: 0,
      attachments: 0,
      dueDate: args.dueDate ?? undefined,
      createdBy: user._id,
      createdByName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Admin",
      createdAt: Date.now()
    });

    // Create notification for assigned staff member
    await ctx.db.insert("notifications", {
      userId: args.assignedTo,
      taskId,
      message: `You have been assigned a new task: "${args.title}"`,
      isRead: false,
      createdAt: Date.now(),
      type: "task_assignment"
    });

    return taskId;
  }
});

// Update task status (staff can update their assigned tasks)
export const updateTaskStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(v.literal("to_do"), v.literal("in_progress"), v.literal("done"))
  },
  handler: async (ctx, { taskId, status }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const task = await ctx.db.get(taskId);
    
    if (!task) {
      throw new Error("Task not found");
    }

    // Only assigned staff or admin can update status
    if (task.assignedTo !== user._id && user.role !== "admin") {
      throw new Error("You can only update tasks assigned to you");
    }

    const updateData: any = {
      status,
      updatedAt: Date.now()
    };

    // If marking as done, set completedAt
    if (status === "done" && !task.completedAt) {
      updateData.completedAt = Date.now();
    }

    return await ctx.db.patch(taskId, updateData);
  }
});

// Update task details and notes (staff can update their assigned tasks)
export const updateTaskDetails = mutation({
  args: {
    taskId: v.id("tasks"),
    taskDetails: v.optional(v.string()),
    completionNotes: v.optional(v.string()),
    progress: v.optional(v.number()),
    status: v.optional(v.union(v.literal("to_do"), v.literal("in_progress"), v.literal("done")))
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const task = await ctx.db.get(args.taskId);
    
    if (!task) {
      throw new Error("Task not found");
    }

    // Only assigned staff or admin can update details
    if (task.assignedTo !== user._id && user.role !== "admin") {
      throw new Error("You can only update tasks assigned to you");
    }

    const updateData: any = {
      updatedAt: Date.now()
    };

    if (args.taskDetails !== undefined) {
      updateData.taskDetails = args.taskDetails;
    }

    if (args.completionNotes !== undefined) {
      updateData.completionNotes = args.completionNotes;
    }

    if (args.progress !== undefined) {
      updateData.progress = Math.max(0, Math.min(100, args.progress));
    }

    if (args.status !== undefined) {
      updateData.status = args.status;
      // If marking as done, set completedAt
      if (args.status === "done" && !task.completedAt) {
        updateData.completedAt = Date.now();
      }
    }

    return await ctx.db.patch(args.taskId, updateData);
  }
});

// Delete task (admin only)
export const deleteTask = mutation({
  args: {
    taskId: v.id("tasks")
  },
  handler: async (ctx, { taskId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    
    // Only admins can delete tasks
    if (user.role !== "admin") {
      throw new Error("Only admins can delete tasks");
    }

    return await ctx.db.delete(taskId);
  }
});
