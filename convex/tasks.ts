// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
//@ts-nocheck

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { getCurrentUserOrThrow, getCurrentUser } from "./users";

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

        // Get tasks assigned specifically to this user
        const individualTasks = await ctx.db
            .query("tasks")
            .withIndex("byAssignedTo", q => q.eq("assignedTo", user._id))
            .collect();

        // Get tasks assigned to the user's workstream
        let streamTasks: any[] = [];
        if (user.staffStream) {
            streamTasks = await ctx.db
                .query("tasks")
                .withIndex("byAssignedStream", q => q.eq("assignedStream", user.staffStream))
                .collect();
        }

        // Combine and sort by creation time descending
        const allMyTasks = [...individualTasks, ...streamTasks];

        // Remove duplicates if any (a task shouldn't be assigned both ways normally, but safety first)
        const uniqueTasks = Array.from(new Map(allMyTasks.map(t => [t._id, t])).values());

        return uniqueTasks.sort((a, b) => b.createdAt - a.createdAt);
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
        customTaskId: v.optional(v.string()),
        title: v.string(),
        description: v.optional(v.string()),
        assignedStream: v.optional(v.string()),
        assignedTo: v.optional(v.id("users")),
        assignedToName: v.optional(v.string()),
        priority: v.optional(v.string()),
        dueDate: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUserOrThrow(ctx);

        // Only admins can create tasks
        if (user.role !== "admin") {
            throw new Error("Only admins can create tasks");
        }

        let assignedRole = "staff";

        // Verify assigned user if provided
        if (args.assignedTo) {
            const assignedUser = await ctx.db.get(args.assignedTo);
            if (!assignedUser) {
                throw new Error("Assigned user not found");
            }
            assignedRole = assignedUser.role || "staff";
        }

        const taskId = await ctx.db.insert("tasks", {
            customTaskId: args.customTaskId,
            title: args.title,
            description: args.description,
            status: "assigned",
            assignedTo: args.assignedTo,
            assignedToName: args.assignedToName,
            assignedStream: args.assignedStream,
            assignedRole: assignedRole,
            priority: args.priority ?? "Medium",
            progress: 0,
            comments: 0,
            attachments: 0,
            dueDate: args.dueDate ?? undefined,
            createdBy: user._id,
            createdByName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Admin",
            createdAt: Date.now()
        });

        // Create notifications and send emails
        if (args.assignedTo) {
            // Notify specific staff member
            await ctx.db.insert("notifications", {
                userId: args.assignedTo,
                taskId,
                message: `You have been assigned a new task: "${args.title}"`,
                isRead: false,
                createdAt: Date.now(),
                type: "task_assignment"
            });

            // Send email to staff member
            const assignedUser = await ctx.db.get(args.assignedTo);
            if (assignedUser?.email) {
                await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
                    to: assignedUser.email,
                    subject: `New Task Assigned: ${args.title}`,
                    html: `
                        <div style="font-family: sans-serif; padding: 20px;">
                            <h2 style="color: #059669;">New Task Assigned</h2>
                            <p>Hello ${assignedUser.firstName || "Staff"},</p>
                            <p>You have been assigned a new task: <strong>"${args.title}"</strong></p>
                            <p><strong>Priority:</strong> ${args.priority ?? "Medium"}</p>
                            ${args.dueDate ? `<p><strong>Due Date:</strong> ${new Date(args.dueDate).toLocaleDateString()}</p>` : ""}
                            ${args.description ? `<p><strong>Description:</strong> ${args.description}</p>` : ""}
                            <p style="margin-top: 20px;">Please log in to the portal to view the details and start working on it.</p>
                        </div>
                    `
                });
            }
        } else if (args.assignedStream) {
            // Notify all staff in the workstream
            const streamUsers = await ctx.db
                .query("users")
                .withIndex("byRole", q => q.eq("role", "staff"))
                .filter(q => q.eq(q.field("staffStream"), args.assignedStream))
                .collect();

            for (const streamUser of streamUsers) {
                await ctx.db.insert("notifications", {
                    userId: streamUser._id,
                    taskId,
                    message: `New task for your workstream (${args.assignedStream}): "${args.title}"`,
                    isRead: false,
                    createdAt: Date.now(),
                    type: "task_assignment"
                });

                // Send email to stream member
                if (streamUser.email) {
                    await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
                        to: streamUser.email,
                        subject: `New Task for ${args.assignedStream} Stream: ${args.title}`,
                        html: `
                            <div style="font-family: sans-serif; padding: 20px;">
                                <h2 style="color: #059669;">New Workstream Task</h2>
                                <p>Hello ${streamUser.firstName || "Staff"},</p>
                                <p>A new task has been assigned to your workstream (<strong>${args.assignedStream}</strong>): <strong>"${args.title}"</strong></p>
                                <p><strong>Priority:</strong> ${args.priority ?? "Medium"}</p>
                                ${args.dueDate ? `<p><strong>Due Date:</strong> ${new Date(args.dueDate).toLocaleDateString()}</p>` : ""}
                                <p style="margin-top: 20px;">Please log in to the portal to view the details.</p>
                            </div>
                        `
                    });
                }
            }
        }

        return taskId;
    }
});

// Request task completion (staff only - includes document upload)
export const requestTaskCompletion = mutation({
    args: {
        taskId: v.id("tasks"),
        completionNotes: v.optional(v.string()),
        completionDocumentId: v.optional(v.id("_storage")),
        completionDocumentName: v.optional(v.string())
    },
    handler: async (ctx, { taskId, completionNotes, completionDocumentId, completionDocumentName }) => {
        const user = await getCurrentUserOrThrow(ctx);
        const task = await ctx.db.get(taskId);

        if (!task) {
            throw new Error("Task not found");
        }

        // Only assigned staff or staff in the assigned workstream can request completion
        const isAssignedUser = task.assignedTo === user._id;
        const isStreamMember =
            !!task.assignedStream && !!user.staffStream && task.assignedStream === user.staffStream;

        if (!isAssignedUser && !isStreamMember) {
            throw new Error("You can only request completion for tasks assigned to you or your workstream");
        }

        const updateData: any = {
            status: "in_progress", // Keep status as in_progress until approved
            completionRequestStatus: "pending",
            completionRequestedAt: Date.now(),
            completionRequestedBy: user._id,
            completionNotes: completionNotes,
            updatedAt: Date.now()
        };

        // Add document if provided
        if (completionDocumentId) {
            updateData.completionDocumentId = completionDocumentId;
            updateData.completionDocumentName = completionDocumentName;
        }

        // Send email to admin for new requests or resubmissions
        const adminEmail = "kingnixion@gmail.com";
        const adminMessage = task.completionRequestStatus === "rejected"
            ? `Task resubmitted: "${task.title}" - Awaiting your approval`
            : `Task completion request: "${task.title}" - Awaiting your approval`;

        // Create notification for the admin
        const admin = await ctx.db
            .query("users")
            .withIndex("byEmail", q => q.eq("email", adminEmail))
            .filter(q => q.eq(q.field("role"), "admin"))
            .first();

        if (admin) {
            await ctx.db.insert("notifications", {
                userId: admin._id,
                taskId,
                message: adminMessage,
                isRead: false,
                createdAt: Date.now(),
                type: "task_completion_request"
            });
        }

        // Send email to admin
        await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
            to: adminEmail,
            subject: task.completionRequestStatus === "rejected" ? `Task Resubmitted: ${task.title}` : `Task Completion Request: ${task.title}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2 style="color: #2563eb;">${task.completionRequestStatus === "rejected" ? "Task Resubmitted" : "Completion Request"}</h2>
                    <p>Hello Admin,</p>
                    <p>Staff member <strong>${user.firstName || ""} ${user.lastName || ""}</strong> has ${task.completionRequestStatus === "rejected" ? "resubmitted" : "requested completion approval for"} the task: <strong>"${task.title}"</strong></p>
                    ${completionNotes ? `<p><strong>Notes:</strong> ${completionNotes}</p>` : ""}
                    <p style="margin-top: 20px;">Please log in to the admin portal to review the request.</p>
                </div>
            `
        });

        return await ctx.db.patch(taskId, updateData);
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

        // Only assigned staff, staff in the assigned workstream, or admin can update status
        const isAssignedUser = task.assignedTo === user._id;
        const isStreamMember =
            !!task.assignedStream && !!user.staffStream && task.assignedStream === user.staffStream;
        const isAdmin = user.role === "admin";

        if (!isAssignedUser && !isStreamMember && !isAdmin) {
            throw new Error("You can only update tasks assigned to you or your workstream");
        }

        // If marking as done and not admin, redirect to completion request
        if (status === "done" && !isAdmin) {
            throw new Error("Please use the 'Request Completion' button to submit for approval");
        }

        const updateData: any = {
            status,
            updatedAt: Date.now()
        };

        if (status === "done" && isAdmin) {
            // Admins can directly mark as done
            if (!task.completedAt) {
                updateData.completedAt = Date.now();
            }
        }

        return await ctx.db.patch(taskId, updateData);
    }
});

// Confirm task completion (only specific admin can approve)
export const confirmTaskCompletion = mutation({
    args: {
        taskId: v.id("tasks"),
        approved: v.boolean(), // true to approve, false to reject
        adminComment: v.optional(v.string()) // Admin's comment/note
    },
    handler: async (ctx, { taskId, approved, adminComment }) => {
        const user = await getCurrentUserOrThrow(ctx);
        const task = await ctx.db.get(taskId);

        if (!task) {
            throw new Error("Task not found");
        }

        // Only the specific admin can confirm task completion
        const adminEmail = "kingnixion@gmail.com";
        if (user.email !== adminEmail || user.role !== "admin") {
            throw new Error("Only the designated admin can confirm task completion");
        }

        if (task.completionRequestStatus !== "pending") {
            throw new Error("This task does not have a pending completion request");
        }

        const updateData: any = {
            completionRequestStatus: approved ? "approved" : "rejected",
            completionApprovedBy: user._id,
            completionApprovedAt: Date.now(),
            updatedAt: Date.now()
        };

        // Store admin comment if provided
        if (adminComment) {
            updateData.completionAdminComment = adminComment.trim();
        }

        if (approved) {
            // Mark task as done
            updateData.status = "done";
            updateData.completedAt = Date.now();
        }

        // Notify and email the staff member
        if (task.completionRequestedBy) {
            const staff = await ctx.db.get(task.completionRequestedBy);
            const message = approved
                ? (adminComment ? `Your task completion request for "${task.title}" has been approved. Note: ${adminComment}` : `Your task completion request for "${task.title}" has been approved`)
                : (adminComment ? `Your task completion request for "${task.title}" has been rejected. Reason: ${adminComment}` : `Your task completion request for "${task.title}" has been rejected. Please review and resubmit.`);

            await ctx.db.insert("notifications", {
                userId: task.completionRequestedBy,
                taskId,
                message,
                isRead: false,
                createdAt: Date.now(),
                type: approved ? "task_completion_approved" : "task_completion_rejected"
            });

            // Send email to staff member
            if (staff?.email) {
                await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
                    to: staff.email,
                    subject: approved ? `Task Approved: ${task.title}` : `Task Rejected: ${task.title}`,
                    html: `
                        <div style="font-family: sans-serif; padding: 20px;">
                            <h2 style="color: ${approved ? "#059669" : "#dc2626"};">${approved ? "Task Approved" : "Task Rejected"}</h2>
                            <p>Hello ${staff.firstName || "Staff"},</p>
                            <p>Your completion request for the task <strong>"${task.title}"</strong> has been <strong>${approved ? "Approved" : "Rejected"}</strong>.</p>
                            ${adminComment ? `<p><strong>Admin Note:</strong> ${adminComment}</p>` : ""}
                            ${!approved ? `<p style="color: #6b7280; font-style: italic;">Please address the feedback and resubmit the task for approval.</p>` : ""}
                            <p style="margin-top: 20px;">View details in the staff portal.</p>
                        </div>
                    `
                });
            }
        }

        return await ctx.db.patch(taskId, updateData);
    }
});

// Get tasks pending completion approval (for admin)
export const getPendingCompletionRequests = query({
    handler: async (ctx) => {
        const user = await getCurrentUser(ctx);
        const adminEmail = "kingnixion@gmail.com";

        // Only the specific admin can view pending requests
        // Return empty array for unauthorized users instead of throwing error
        if (!user || user.email !== adminEmail || user.role !== "admin") {
            return [];
        }

        return await ctx.db
            .query("tasks")
            .withIndex("byCompletionRequestStatus", q => q.eq("completionRequestStatus", "pending"))
            .order("desc")
            .collect();
    }
});

// Get storage URL for completion document
export const getCompletionDocumentUrl = mutation({
    args: {
        storageId: v.id("_storage"),
        taskId: v.optional(v.id("tasks")) // Optional for admin-direct access or backwards compatibility
    },
    handler: async (ctx, { storageId, taskId }) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error("Unauthorized");

        const adminEmail = "kingnixion@gmail.com";
        const isAdmin = user.email === adminEmail && user.role === "admin";

        if (isAdmin) {
            return await ctx.storage.getUrl(storageId);
        }

        // If not admin, check if user is assigned to the task
        if (taskId) {
            const task = await ctx.db.get(taskId);
            if (task) {
                const isAssignedUser = task.assignedTo === user._id;
                const isStreamMember = !!task.assignedStream && !!user.staffStream && task.assignedStream === user.staffStream;

                if (isAssignedUser || isStreamMember) {
                    return await ctx.storage.getUrl(storageId);
                }
            }
        }

        throw new Error("You do not have permission to view this document");
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

// Add a new update/comment to a task
export const addTaskUpdate = mutation({
    args: {
        taskId: v.id("tasks"),
        content: v.string()
    },
    handler: async (ctx, { taskId, content }) => {
        const user = await getCurrentUserOrThrow(ctx);
        const task = await ctx.db.get(taskId);

        if (!task) {
            throw new Error("Task not found");
        }

        const authorName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;

        // Insert the update
        await ctx.db.insert("task_updates", {
            taskId,
            authorId: user._id,
            authorName,
            content: content.trim(),
            createdAt: Date.now()
        });

        // Update task's comment count and updatedAt
        const currentComments = task.comments || 0;
        await ctx.db.patch(taskId, {
            comments: currentComments + 1,
            updatedAt: Date.now()
        });

        // Notify the relevant person
        // If staff posts, notify the admin who created it
        // If admin posts, notify the assigned staff/stream
        if (user.role === "staff") {
            await ctx.db.insert("notifications", {
                userId: task.createdBy,
                taskId,
                message: `New update on task "${task.title}" by ${authorName}`,
                isRead: false,
                createdAt: Date.now(),
                type: "task_update"
            });
        } else if (user.role === "admin") {
            if (task.assignedTo) {
                await ctx.db.insert("notifications", {
                    userId: task.assignedTo,
                    taskId,
                    message: `Admin ${authorName} replied to your task: "${task.title}"`,
                    isRead: false,
                    createdAt: Date.now(),
                    type: "task_update"
                });
            } else if (task.assignedStream) {
                const streamUsers = await ctx.db
                    .query("users")
                    .withIndex("byRole", q => q.eq("role", "staff"))
                    .filter(q => q.eq(q.field("staffStream"), task.assignedStream))
                    .collect();

                for (const streamUser of streamUsers) {
                    await ctx.db.insert("notifications", {
                        userId: streamUser._id,
                        taskId,
                        message: `Admin ${authorName} replied to a task in your workstream: "${task.title}"`,
                        isRead: false,
                        createdAt: Date.now(),
                        type: "task_update"
                    });
                }
            }
        }

        return taskId;
    }
});

// Get all updates for a task
export const getTaskUpdates = query({
    args: {
        taskId: v.id("tasks")
    },
    handler: async (ctx, { taskId }) => {
        return await ctx.db
            .query("task_updates")
            .withIndex("byTask", q => q.eq("taskId", taskId))
            .order("asc") // Oldest first for thread feel
            .collect();
    }
});
