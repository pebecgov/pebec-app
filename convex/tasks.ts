// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
//@ts-nocheck

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { getCurrentUserOrThrow, getCurrentUser } from "./users";
import { Id } from "./_generated/dataModel";

/** Task inbox / reception — keep in sync with `AUTHORIZED_TASK_ADMIN_EMAILS` in `AdminTasks.tsx`. */
const AUTHORIZED_TASK_ADMIN_EMAILS: readonly string[] = [
    "mickaelking2002@gmail.com",
    "zahrah.mustaphaaudu@pebec.gov.ng"
];

function isAuthorizedTaskAdmin(user: { email?: string; role?: string } | null): boolean {
    return (
        !!user &&
        user.role === "admin" &&
        !!user.email &&
        AUTHORIZED_TASK_ADMIN_EMAILS.includes(user.email)
    );
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

async function userHasJointAssignment(
    ctx: any,
    taskId: Id<"tasks">,
    userId: Id<"users">
): Promise<boolean> {
    const row = await ctx.db
        .query("task_assignments")
        .withIndex("byTaskId", (q: any) => q.eq("taskId", taskId))
        .filter((q: any) => q.eq(q.field("userId"), userId))
        .first();
    return !!row;
}

/** Staff access: direct assignee, whole-stream task, or joint assignment row. */
async function isUserTaskParticipant(
    ctx: any,
    task: { _id: Id<"tasks">; assignedTo?: Id<"users">; assignedStream?: string },
    user: { _id: Id<"users">; staffStream?: string }
): Promise<boolean> {
    if (task.assignedTo === user._id) return true;
    if (task.assignedStream && user.staffStream && task.assignedStream === user.staffStream) {
        return true;
    }
    return userHasJointAssignment(ctx, task._id, user._id);
}

async function getTaskConsensusParticipantIds(
    ctx: any,
    task: { _id: Id<"tasks">; assignedTo?: Id<"users"> }
): Promise<Id<"users">[]> {
    const links = await ctx.db
        .query("task_assignments")
        .withIndex("byTaskId", (q: any) => q.eq("taskId", task._id))
        .collect();

    const ids = new Set<Id<"users">>();
    for (const link of links) {
        ids.add(link.userId);
    }

    if (ids.size === 0 && task.assignedTo) {
        ids.add(task.assignedTo);
    }

    return [...ids];
}

async function upsertCompletionVote(
    ctx: any,
    taskId: Id<"tasks">,
    userId: Id<"users">,
    vote: "approved" | "rejected",
    comment?: string
) {
    const existing = await ctx.db
        .query("task_completion_votes")
        .withIndex("byTaskAndUser", (q: any) => q.eq("taskId", taskId).eq("userId", userId))
        .first();

    if (existing) {
        await ctx.db.patch(existing._id, {
            vote,
            comment: comment?.trim() || undefined,
            actedAt: Date.now()
        });
        return;
    }

    await ctx.db.insert("task_completion_votes", {
        taskId,
        userId,
        vote,
        comment: comment?.trim() || undefined,
        actedAt: Date.now()
    });
}

async function clearTaskCompletionVotes(ctx: any, taskId: Id<"tasks">) {
    const votes = await ctx.db
        .query("task_completion_votes")
        .withIndex("byTaskId", (q: any) => q.eq("taskId", taskId))
        .collect();

    for (const vote of votes) {
        await ctx.db.delete(vote._id);
    }
}

async function expandWorkstreamToUserIds(ctx: any, stream: string): Promise<Id<"users">[]> {
    const s = stream.trim();
    if (!s) return [];
    if (s === "admin") {
        return (await ctx.db.query("users").withIndex("byRole", (q: any) => q.eq("role", "admin")).collect()).map(
            (u: { _id: Id<"users"> }) => u._id
        );
    }
    return (
        await ctx.db
            .query("users")
            .withIndex("byRole", (q: any) => q.eq("role", "staff"))
            .filter((q: any) => q.eq(q.field("staffStream"), s))
            .collect()
    ).map((u: { _id: Id<"users"> }) => u._id);
}

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

        // Joint assignments (same task shared by multiple users)
        const jointLinks = await ctx.db
            .query("task_assignments")
            .withIndex("byUserId", (q) => q.eq("userId", user._id))
            .collect();
        const jointTasks: any[] = [];
        for (const link of jointLinks) {
            const t = await ctx.db.get(link.taskId);
            if (t) jointTasks.push(t);
        }

        // Combine and sort by creation time descending
        const allMyTasks = [...individualTasks, ...streamTasks, ...jointTasks];

        // Remove duplicates if any (a task shouldn't be assigned both ways normally, but safety first)
        const uniqueTasks = Array.from(new Map(allMyTasks.map(t => [t._id, t])).values());

        const sortedTasks = uniqueTasks.sort((a, b) => b.createdAt - a.createdAt);
        const enriched = [];

        for (const task of sortedTasks) {
            const participantIds = await getTaskConsensusParticipantIds(ctx, task);
            const votes = await ctx.db
                .query("task_completion_votes")
                .withIndex("byTaskId", (q: any) => q.eq("taskId", task._id))
                .collect();
            const approvedVotes = votes.filter((v: any) => v.vote === "approved");
            const hasCurrentUserApproved = approvedVotes.some((v: any) => v.userId === user._id);
            const requester = task.completionRequestedBy ? await ctx.db.get(task.completionRequestedBy) : null;
            const completionRequestedByName =
                requester
                    ? `${requester.firstName || ""} ${requester.lastName || ""}`.trim() || requester.email || "Staff"
                    : undefined;
            enriched.push({
                ...task,
                consensusTotalParticipants: participantIds.length,
                consensusApprovedCount: approvedVotes.length,
                consensusHasCurrentUserApproved: hasCurrentUserApproved,
                completionRequestedByName
            });
        }

        return enriched;
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

type TaskAssignmentSlot = {
    assignedStream?: string;
    assignedTo?: Id<"users">;
    assignedToName?: string;
};

async function resolveAssignmentDocuments(
    ctx: any,
    user: { role?: string; email?: string; firstName?: string; lastName?: string; _id: Id<"users"> },
    args: {
        receptionInboxId?: Id<"reception_admin_documents">;
        assignmentDocumentId?: Id<"_storage">;
        assignmentDocumentName?: string;
    }
): Promise<{
    assignmentDocumentId?: Id<"_storage">;
    assignmentDocumentName?: string;
    sourceReceptionDocumentId?: Id<"reception_admin_documents">;
    receptionInboxId?: Id<"reception_admin_documents">;
}> {
    let assignmentDocumentId: Id<"_storage"> | undefined;
    let assignmentDocumentName: string | undefined;
    let sourceReceptionDocumentId: Id<"reception_admin_documents"> | undefined;

    if (args.receptionInboxId) {
        if (!isAuthorizedTaskAdmin(user)) {
            throw new Error("Only the designated admin can assign tasks from the reception inbox");
        }
        const inbox = await ctx.db.get(args.receptionInboxId);
        if (
            !inbox ||
            inbox.status === "stashed" ||
            inbox.status === "linked" ||
            (inbox.status !== "pending" && inbox.status !== "acknowledged")
        ) {
            throw new Error("Reception document not found or cannot be assigned");
        }
        assignmentDocumentId = inbox.storageId;
        assignmentDocumentName = inbox.fileName;
        sourceReceptionDocumentId = inbox._id;
    } else if (args.assignmentDocumentId && args.assignmentDocumentName) {
        assignmentDocumentId = args.assignmentDocumentId;
        assignmentDocumentName = args.assignmentDocumentName;
    }

    return {
        assignmentDocumentId,
        assignmentDocumentName,
        sourceReceptionDocumentId,
        receptionInboxId: args.receptionInboxId
    };
}

function dedupeAssignmentSlots(slots: TaskAssignmentSlot[]): TaskAssignmentSlot[] {
    const seen = new Set<string>();
    const out: TaskAssignmentSlot[] = [];
    for (const s of slots) {
        const stream = (s.assignedStream ?? "").trim();
        const uid = s.assignedTo ? String(s.assignedTo) : "";
        const key = `${stream}\0${uid}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(s);
    }
    return out;
}

/** Inserts one task row and sends notifications for that assignment target. Does not patch reception inbox. */
async function insertTaskForAssignment(
    ctx: any,
    user: { role?: string; email?: string; firstName?: string; lastName?: string; _id: Id<"users"> },
    common: {
        customTaskId?: string;
        title: string;
        description?: string;
        dueDate?: number;
        assignmentDocumentId?: Id<"_storage">;
        assignmentDocumentName?: string;
        sourceReceptionDocumentId?: Id<"reception_admin_documents">;
    },
    slot: TaskAssignmentSlot
): Promise<Id<"tasks">> {
    let assignedRole = "staff";
    if (slot.assignedTo) {
        const assignedUser = await ctx.db.get(slot.assignedTo);
        if (!assignedUser) {
            throw new Error("Assigned user not found");
        }
        assignedRole = assignedUser.role || "staff";
    }

    const taskId = await ctx.db.insert("tasks", {
        customTaskId: common.customTaskId,
        title: common.title,
        description: common.description,
        status: "assigned",
        assignedTo: slot.assignedTo,
        assignedToName: slot.assignedToName,
        assignedStream: slot.assignedStream,
        assignedRole,
        progress: 0,
        comments: 0,
        attachments: common.assignmentDocumentId ? 1 : 0,
        dueDate: common.dueDate ?? undefined,
        createdBy: user._id,
        createdByName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Admin",
        assignmentDocumentId: common.assignmentDocumentId,
        assignmentDocumentName: common.assignmentDocumentName,
        sourceReceptionDocumentId: common.sourceReceptionDocumentId,
        createdAt: Date.now()
    });

    if (slot.assignedTo) {
        await ctx.db.insert("notifications", {
            userId: slot.assignedTo,
            taskId,
            message: `You have been assigned a new task: "${common.title}"`,
            isRead: false,
            createdAt: Date.now(),
            type: "task_assignment"
        });

        const assignedUser = await ctx.db.get(slot.assignedTo);
        if (assignedUser?.email) {
            await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
                to: assignedUser.email,
                subject: `The DG Has Assigned You a Task: ${common.title}`,
                html: `
                        <div style="font-family: sans-serif; padding: 20px;">
                            <h2 style="color: #059669;">New Task Assigned</h2>
                            <p>Hello ${assignedUser.firstName || "Staff"},</p>
                            <p>You have been assigned a new task: <strong>"${common.title}"</strong></p>
                            ${common.dueDate ? `<p><strong>Due Date:</strong> ${new Date(common.dueDate).toLocaleDateString()}</p>` : ""}
                            ${common.description ? `<p><strong>Description:</strong> ${common.description}</p>` : ""}
                            <p style="margin-top: 20px;">Please log in to the portal to view the details and start working on it.</p>
                            <div style="margin-top: 20px;">
                                <a href="https://www.pebec.gov.ng/staff/tasks" style="background-color: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Task</a>
                            </div>
                        </div>
                    `
            });
        }
    } else if (slot.assignedStream) {
        const streamUsers = await ctx.db
            .query("users")
            .withIndex("byRole", q => q.eq("role", "staff"))
            .filter(q => q.eq(q.field("staffStream"), slot.assignedStream))
            .collect();

        for (const streamUser of streamUsers) {
            await ctx.db.insert("notifications", {
                userId: streamUser._id,
                taskId,
                message: `New task for your workstream (${slot.assignedStream}): "${common.title}"`,
                isRead: false,
                createdAt: Date.now(),
                type: "task_assignment"
            });

            if (streamUser.email) {
                await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
                    to: streamUser.email,
                    subject: `New Task for ${slot.assignedStream} Stream: ${common.title}`,
                    html: `
                            <div style="font-family: sans-serif; padding: 20px;">
                                <h2 style="color: #059669;">New Workstream Task</h2>
                                <p>Hello ${streamUser.firstName || "Staff"},</p>
                                <p>A new task has been assigned to your workstream (<strong>${slot.assignedStream}</strong>): <strong>"${common.title}"</strong></p>
                                ${common.dueDate ? `<p><strong>Due Date:</strong> ${new Date(common.dueDate).toLocaleDateString()}</p>` : ""}
                                <p style="margin-top: 20px;">Please log in to the portal to view the details.</p>
                                <div style="margin-top: 20px;">
                                    <a href="https://www.pebec.gov.ng/staff/tasks" style="background-color: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Task</a>
                                </div>
                            </div>
                        `
                });
            }
        }
    }

    return taskId;
}

// Create a new task (admin only)
export const createTask = mutation({
    args: {
        customTaskId: v.optional(v.string()),
        title: v.string(),
        description: v.optional(v.string()),
        assignedStream: v.optional(v.string()),
        assignedTo: v.optional(v.id("users")),
        assignedToName: v.optional(v.string()),
        dueDate: v.optional(v.number()),
        receptionInboxId: v.optional(v.id("reception_admin_documents")),
        assignmentDocumentId: v.optional(v.id("_storage")),
        assignmentDocumentName: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUserOrThrow(ctx);

        if (user.role !== "admin") {
            throw new Error("Only admins can create tasks");
        }

        const docs = await resolveAssignmentDocuments(ctx, user, {
            receptionInboxId: args.receptionInboxId,
            assignmentDocumentId: args.assignmentDocumentId,
            assignmentDocumentName: args.assignmentDocumentName
        });

        const slot: TaskAssignmentSlot = {
            assignedStream: args.assignedStream,
            assignedTo: args.assignedTo,
            assignedToName: args.assignedToName
        };

        const taskId = await insertTaskForAssignment(ctx, user, {
            customTaskId: args.customTaskId,
            title: args.title,
            description: args.description,
            dueDate: args.dueDate,
            assignmentDocumentId: docs.assignmentDocumentId,
            assignmentDocumentName: docs.assignmentDocumentName,
            sourceReceptionDocumentId: docs.sourceReceptionDocumentId
        }, slot);

        if (args.receptionInboxId && docs.sourceReceptionDocumentId) {
            await ctx.db.patch(args.receptionInboxId, {
                status: "linked",
                linkedTaskId: taskId
            });
        }

        return taskId;
    }
});

/** Create one shared task for all selected workstreams (expanded to staff) and/or individual staff (admin only). */
export const createTasks = mutation({
    args: {
        customTaskId: v.optional(v.string()),
        title: v.string(),
        description: v.optional(v.string()),
        dueDate: v.optional(v.number()),
        receptionInboxId: v.optional(v.id("reception_admin_documents")),
        assignmentDocumentId: v.optional(v.id("_storage")),
        assignmentDocumentName: v.optional(v.string()),
        participants: v.array(
            v.union(
                v.object({ type: v.literal("workstream"), id: v.string() }),
                v.object({ type: v.literal("staff"), userId: v.id("users") })
            )
        )
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUserOrThrow(ctx);

        if (user.role !== "admin") {
            throw new Error("Only admins can create tasks");
        }

        if (args.participants.length === 0) {
            throw new Error("Add at least one participant");
        }
        if (args.participants.length > 60) {
            throw new Error("Too many participant entries in one request");
        }

        const docs = await resolveAssignmentDocuments(ctx, user, {
            receptionInboxId: args.receptionInboxId,
            assignmentDocumentId: args.assignmentDocumentId,
            assignmentDocumentName: args.assignmentDocumentName
        });

        const userIdSet = new Set<Id<"users">>();
        for (const p of args.participants) {
            if (p.type === "staff") {
                const u = await ctx.db.get(p.userId);
                if (!u) throw new Error("Selected staff user not found");
                userIdSet.add(p.userId);
            } else {
                const ids = await expandWorkstreamToUserIds(ctx, p.id);
                for (const id of ids) userIdSet.add(id);
            }
        }

        const userIds = [...userIdSet];
        if (userIds.length === 0) {
            throw new Error("No staff matched your selection (check workstreams or add individuals)");
        }
        if (userIds.length > 250) {
            throw new Error("Too many assignees in one task");
        }

        const nameParts: string[] = [];
        for (const uid of userIds) {
            const u = await ctx.db.get(uid);
            if (u) {
                nameParts.push(`${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email || String(uid));
            }
        }
        nameParts.sort((a, b) => a.localeCompare(b));
        let assignedToName = nameParts.join(", ");
        if (assignedToName.length > 500) {
            assignedToName = `${assignedToName.slice(0, 497)}...`;
        }

        const assignedTo: Id<"users"> | undefined = userIds.length === 1 ? userIds[0] : undefined;

        const taskId = await ctx.db.insert("tasks", {
            customTaskId: args.customTaskId,
            title: args.title,
            description: args.description,
            status: "assigned",
            assignedTo,
            assignedToName,
            assignedStream: undefined,
            assignedRole: "staff",
            progress: 0,
            comments: 0,
            attachments: docs.assignmentDocumentId ? 1 : 0,
            dueDate: args.dueDate ?? undefined,
            createdBy: user._id,
            createdByName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Admin",
            assignmentDocumentId: docs.assignmentDocumentId,
            assignmentDocumentName: docs.assignmentDocumentName,
            sourceReceptionDocumentId: docs.sourceReceptionDocumentId,
            createdAt: Date.now()
        });

        for (const uid of userIds) {
            await ctx.db.insert("task_assignments", {
                taskId,
                userId: uid
            });
        }

        for (const uid of userIds) {
            await ctx.db.insert("notifications", {
                userId: uid,
                taskId,
                message: `You have been assigned a shared task: "${args.title}"`,
                isRead: false,
                createdAt: Date.now(),
                type: "task_assignment"
            });

            const assignee = await ctx.db.get(uid);
            if (assignee?.email) {
                await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
                    to: assignee.email,
                    subject: `The DG Has Assigned You a Shared Task: ${args.title}`,
                    html: `
                        <div style="font-family: sans-serif; padding: 20px;">
                            <h2 style="color: #059669;">New Task Assigned</h2>
                            <p>Hello ${assignee.firstName || "Staff"},</p>
                            <p>You have been assigned a shared task with ${userIds.length} participant(s): <strong>"${args.title}"</strong></p>
                            ${args.dueDate ? `<p><strong>Due Date:</strong> ${new Date(args.dueDate).toLocaleDateString()}</p>` : ""}
                            ${args.description ? `<p><strong>Description:</strong> ${args.description}</p>` : ""}
                            <p style="margin-top: 20px;">Please log in to the portal to view the details and start working on it.</p>
                            <div style="margin-top: 20px;">
                                <a href="https://www.pebec.gov.ng/staff/tasks" style="background-color: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Task</a>
                            </div>
                        </div>
                    `
                });
            }
        }

        if (args.receptionInboxId && docs.sourceReceptionDocumentId) {
            await ctx.db.patch(args.receptionInboxId, {
                status: "linked",
                linkedTaskId: taskId
            });
        }

        return [taskId];
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

        const canComplete = await isUserTaskParticipant(ctx, task, user);
        if (!canComplete) {
            throw new Error("You can only request completion for tasks assigned to you or your workstream");
        }

        if (task.completionRequestStatus === "pending") {
            throw new Error("This task is already awaiting admin approval");
        }

        // Lock the original supporting document while consensus/admin review is ongoing.
        if (
            task.completionDocumentId &&
            (task.completionRequestStatus === "awaiting_consensus" || task.completionRequestStatus === "pending") &&
            completionDocumentId &&
            String(task.completionDocumentId) !== String(completionDocumentId)
        ) {
            throw new Error("Supporting document is locked until this request is rejected");
        }
        if (
            task.completionNotes &&
            (task.completionRequestStatus === "awaiting_consensus" || task.completionRequestStatus === "pending") &&
            typeof completionNotes === "string" &&
            completionNotes.trim() !== task.completionNotes.trim()
        ) {
            throw new Error("Completion notes are locked until this request is rejected");
        }

        // Admin rejection starts a new consensus round.
        if (task.completionRequestStatus === "rejected") {
            await clearTaskCompletionVotes(ctx, taskId);
        }

        const participantIds = await getTaskConsensusParticipantIds(ctx, task);
        const consensusRequired = participantIds.length > 1;

        const now = Date.now();
        const updateData: any = {
            status: "in_progress",
            completionRequestedAt: now,
            completionRequestedBy: user._id,
            completionNotes: completionNotes,
            updatedAt: now
        };

        // Add document if provided
        if (completionDocumentId) {
            updateData.completionDocumentId = completionDocumentId;
            updateData.completionDocumentName = completionDocumentName;
        }

        if (!consensusRequired) {
            updateData.completionRequestStatus = "pending";
            await ctx.db.patch(taskId, updateData);
        } else {
            await upsertCompletionVote(ctx, taskId, user._id, "approved");

            const votes = await ctx.db
                .query("task_completion_votes")
                .withIndex("byTaskId", (q: any) => q.eq("taskId", taskId))
                .collect();
            const approvedVoterIds = new Set(
                votes.filter((v: any) => v.vote === "approved").map((v: any) => String(v.userId))
            );

            const allApproved = participantIds.every(pid => approvedVoterIds.has(String(pid)));

            if (!allApproved) {
                updateData.completionRequestStatus = "awaiting_consensus";
                await ctx.db.patch(taskId, updateData);

                for (const participantId of participantIds) {
                    if (String(participantId) === String(user._id)) continue;
                    if (approvedVoterIds.has(String(participantId))) continue;
                    await ctx.db.insert("notifications", {
                        userId: participantId,
                        taskId,
                        message: `A teammate requested completion consensus for "${task.title}". Please review and approve.`,
                        isRead: false,
                        createdAt: now,
                        type: "task_completion_request"
                    });
                }

                return {
                    stage: "awaiting_consensus",
                    approvedCount: approvedVoterIds.size,
                    totalParticipants: participantIds.length
                };
            }

            updateData.completionRequestStatus = "pending";
            await ctx.db.patch(taskId, updateData);
        }

        // Send email to admins after consensus is complete (or for single-assignee tasks)
        const adminMessage = task.completionRequestStatus === "rejected"
            ? `Task resubmitted: "${task.title}" - Awaiting your approval`
            : `Task completion request: "${task.title}" - Awaiting your approval`;

        for (const adminEmail of AUTHORIZED_TASK_ADMIN_EMAILS) {
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
                    <div style="margin-top: 20px;">
                        <a href="https://www.pebec.gov.ng/admin/tasks" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Review Task</a>
                    </div>
                </div>
            `
            });
        }

        return {
            stage: "pending_admin",
            approvedCount: participantIds.length > 1 ? participantIds.length : 1,
            totalParticipants: participantIds.length > 0 ? participantIds.length : 1
        };
    }
});

// Reject a consensus request before it reaches admin review (staff participant only)
export const rejectTaskCompletionConsensus = mutation({
    args: {
        taskId: v.id("tasks"),
        reason: v.optional(v.string())
    },
    handler: async (ctx, { taskId, reason }) => {
        const user = await getCurrentUserOrThrow(ctx);
        const task = await ctx.db.get(taskId);

        if (!task) {
            throw new Error("Task not found");
        }

        const canReview = await isUserTaskParticipant(ctx, task, user);
        if (!canReview) {
            throw new Error("You can only review tasks assigned to you or your workstream");
        }

        if (task.completionRequestStatus !== "awaiting_consensus") {
            throw new Error("This task is not awaiting assignee consensus");
        }

        if (task.completionRequestedBy && String(task.completionRequestedBy) === String(user._id)) {
            throw new Error("You cannot reject your own completion submission");
        }

        const reasonText = reason?.trim();
        await clearTaskCompletionVotes(ctx, taskId);

        await ctx.db.patch(taskId, {
            completionRequestStatus: "rejected",
            completionAdminComment: reasonText
                ? `Rejected by an assignee during consensus: ${reasonText}`
                : "Rejected by an assignee during consensus. Please revise and resubmit.",
            updatedAt: Date.now()
        });

        if (task.completionRequestedBy) {
            await ctx.db.insert("notifications", {
                userId: task.completionRequestedBy,
                taskId,
                message: `Your completion request for "${task.title}" was rejected by a teammate during consensus.`,
                isRead: false,
                createdAt: Date.now(),
                type: "task_completion_rejected"
            });
        }

        return { ok: true };
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

        const isParticipant = await isUserTaskParticipant(ctx, task, user);
        const isAdmin = user.role === "admin";

        if (!isParticipant && !isAdmin) {
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
        if (!isAuthorizedTaskAdmin(user)) {
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

        // Close consensus round once admin takes action.
        await clearTaskCompletionVotes(ctx, taskId);

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
                            <div style="margin-top: 20px;">
                                <a href="https://www.pebec.gov.ng/staff/tasks" style="background-color: ${approved ? "#059669" : "#dc2626"}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Task</a>
                            </div>
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

        // Only the specific admin can view pending requests
        // Return empty array for unauthorized users instead of throwing error
        if (!isAuthorizedTaskAdmin(user)) {
            return [];
        }

        return await ctx.db
            .query("tasks")
            .withIndex("byCompletionRequestStatus", q => q.eq("completionRequestStatus", "pending"))
            .order("desc")
            .collect();
    }
});

// Get storage URL for completion / assignment document on a task
export const getCompletionDocumentUrl = mutation({
    args: {
        storageId: v.id("_storage"),
        taskId: v.optional(v.id("tasks")) // Optional for admin-direct access or backwards compatibility
    },
    handler: async (ctx, { storageId, taskId }) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error("Unauthorized");

        // Task-scoped access: any admin or assigned staff when storageId matches the task record
        if (taskId) {
            const task = await ctx.db.get(taskId);
            if (task) {
                const matchesCompletion = task.completionDocumentId === storageId;
                const matchesAssignment = task.assignmentDocumentId === storageId;
                if (matchesCompletion || matchesAssignment) {
                    if (user.role === "admin") {
                        return await ctx.storage.getUrl(storageId);
                    }
                    const canView = await isUserTaskParticipant(ctx, task, user);
                    if (canView) {
                        return await ctx.storage.getUrl(storageId);
                    }
                }
            }
        }

        if (isAuthorizedTaskAdmin(user)) {
            return await ctx.storage.getUrl(storageId);
        }

        throw new Error("You do not have permission to view this document");
    }
});

/** Convex upload URL for optional assignment attachment (any admin). */
export const generateTaskAssignmentUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        const user = await getCurrentUserOrThrow(ctx);
        if (user.role !== "admin") {
            throw new Error("Only admins can upload task assignment documents");
        }
        return await ctx.storage.generateUploadUrl();
    }
});

export const generateReceptionUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        const user = await getCurrentUserOrThrow(ctx);
        if (user.role !== "staff" || user.staffStream !== "receptionist") {
            throw new Error("Only receptionist staff can upload documents here");
        }
        return await ctx.storage.generateUploadUrl();
    }
});

export const submitReceptionDocument = mutation({
    args: {
        storageId: v.id("_storage"),
        fileName: v.string(),
        note: v.optional(v.string())
    },
    handler: async (ctx, { storageId, fileName, note }) => {
        const user = await getCurrentUserOrThrow(ctx);
        if (user.role !== "staff" || user.staffStream !== "receptionist") {
            throw new Error("Only receptionist staff can submit documents");
        }
        const docId = await ctx.db.insert("reception_admin_documents", {
            storageId,
            fileName,
            uploadedBy: user._id,
            note: note?.trim() || undefined,
            status: "pending",
            createdAt: Date.now()
        });

        const uploaderName =
            `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Reception";
        const safeFile = escapeHtml(fileName);
        const safeUploader = escapeHtml(uploaderName);
        const safeNote = note?.trim() ? escapeHtml(note.trim()) : "";
        const adminMessage = `New scanned letter uploaded: "${fileName}" (from ${uploaderName})`;

        for (const adminEmail of AUTHORIZED_TASK_ADMIN_EMAILS) {
            const taskAdmin = await ctx.db
                .query("users")
                .withIndex("byEmail", q => q.eq("email", adminEmail))
                .filter(q => q.eq(q.field("role"), "admin"))
                .first();

            if (taskAdmin) {
                await ctx.db.insert("notifications", {
                    userId: taskAdmin._id,
                    message: adminMessage,
                    isRead: false,
                    createdAt: Date.now(),
                    type: "reception_scanned_letter",
                    actionUrl: "/admin/tasks?tab=reception"
                });
            }

            await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
                to: adminEmail,
                subject: `New scanned letter: ${fileName}`,
                html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2 style="color: #0d9488;">New scanned letter</h2>
                    <p>Hello,</p>
                    <p><strong>${safeUploader}</strong> (Admin/Operations) uploaded a scanned letter for the inbox.</p>
                    <p><strong>File:</strong> ${safeFile}</p>
                    ${safeNote ? `<p><strong>Note:</strong> ${safeNote}</p>` : ""}
                    <p style="margin-top: 20px;">Open the admin portal to review it under <strong>Receive Scanned Letters</strong>.</p>
                    <div style="margin-top: 20px;">
                        <a href="https://www.pebec.gov.ng/admin/tasks?tab=reception" style="background-color: #0d9488; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View inbox</a>
                    </div>
                </div>
            `
            });
        }

        return docId;
    }
});

export const listReceptionInboxDocuments = query({
    handler: async (ctx) => {
        const user = await getCurrentUser(ctx);
        if (!isAuthorizedTaskAdmin(user)) {
            return [];
        }
        const rows = await ctx.db.query("reception_admin_documents").order("desc").collect();
        return await Promise.all(
            rows.map(async (row) => {
                const uploader = await ctx.db.get(row.uploadedBy);
                const uploaderName = uploader
                    ? `${uploader.firstName || ""} ${uploader.lastName || ""}`.trim() || uploader.email || "Unknown"
                    : "Unknown";
                const linkedTask = row.linkedTaskId ? await ctx.db.get(row.linkedTaskId) : null;
                return {
                    ...row,
                    uploaderName,
                    linkedTaskAssignedToName: linkedTask?.assignedToName,
                    linkedTaskAssignedStream: linkedTask?.assignedStream
                };
            })
        );
    }
});

export const acknowledgeReceptionDocument = mutation({
    args: {
        receptionDocumentId: v.id("reception_admin_documents")
    },
    handler: async (ctx, { receptionDocumentId }) => {
        const user = await getCurrentUser(ctx);
        if (!isAuthorizedTaskAdmin(user)) {
            throw new Error("Only the designated admin can acknowledge reception documents");
        }
        const doc = await ctx.db.get(receptionDocumentId);
        if (!doc) throw new Error("Document not found");
        if (doc.status === "stashed") {
            throw new Error("Stashed documents cannot be acknowledged");
        }
        if (doc.status === "linked") {
            throw new Error("Linked documents cannot be acknowledged");
        }
        if (doc.status === "acknowledged") return;
        await ctx.db.patch(receptionDocumentId, {
            status: "acknowledged"
        });
    }
});

export const stashReceptionDocument = mutation({
    args: {
        receptionDocumentId: v.id("reception_admin_documents")
    },
    handler: async (ctx, { receptionDocumentId }) => {
        const user = await getCurrentUser(ctx);
        if (!isAuthorizedTaskAdmin(user)) {
            throw new Error("Only the designated admin can stash reception documents");
        }
        const doc = await ctx.db.get(receptionDocumentId);
        if (!doc) throw new Error("Document not found");
        if (doc.status === "linked") {
            throw new Error("Cannot stash a document that is already assigned to a task");
        }
        if (doc.status === "stashed") return;
        if (doc.storageId) {
            await ctx.storage.delete(doc.storageId);
        }
        await ctx.db.patch(receptionDocumentId, {
            status: "stashed",
            storageId: undefined
        });
    }
});

export const markReceptionDocumentViewed = mutation({
    args: {
        receptionDocumentId: v.id("reception_admin_documents")
    },
    handler: async (ctx, { receptionDocumentId }) => {
        const user = await getCurrentUserOrThrow(ctx);
        if (!isAuthorizedTaskAdmin(user)) {
            throw new Error("Only the designated admin can mark reception documents as viewed");
        }
        const doc = await ctx.db.get(receptionDocumentId);
        if (!doc) throw new Error("Document not found");
        if (!doc.storageId) return;
        if (doc.viewedBy) return;
        const viewerName =
            `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Admin";
        await ctx.db.patch(receptionDocumentId, {
            viewedBy: user._id,
            viewedByName: viewerName,
            viewedAt: Date.now()
        });
    }
});

export const listMyReceptionDocuments = query({
    handler: async (ctx) => {
        const user = await getCurrentUserOrThrow(ctx);
        if (user.role !== "staff" || user.staffStream !== "receptionist") {
            return [];
        }
        return await ctx.db
            .query("reception_admin_documents")
            .withIndex("byUploadedBy", q => q.eq("uploadedBy", user._id))
            .order("desc")
            .collect();
    }
});

export const getReceptionDocumentUrl = mutation({
    args: {
        receptionDocumentId: v.id("reception_admin_documents")
    },
    handler: async (ctx, { receptionDocumentId }) => {
        const user = await getCurrentUser(ctx);
        if (!user) throw new Error("Unauthorized");
        const row = await ctx.db.get(receptionDocumentId);
        if (!row) throw new Error("Document not found");
        if (!row.storageId) {
            throw new Error("File is no longer available");
        }
        if (isAuthorizedTaskAdmin(user)) {
            return await ctx.storage.getUrl(row.storageId);
        }
        const isOwnUpload =
            user.role === "staff" &&
            user.staffStream === "receptionist" &&
            row.uploadedBy === user._id;
        if (isOwnUpload) {
            return await ctx.storage.getUrl(row.storageId);
        }
        throw new Error("You do not have permission to open this document");
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

        const joint = await ctx.db
            .query("task_assignments")
            .withIndex("byTaskId", (q) => q.eq("taskId", taskId))
            .collect();
        for (const row of joint) {
            await ctx.db.delete(row._id);
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
            const joint = await ctx.db
                .query("task_assignments")
                .withIndex("byTaskId", (q) => q.eq("taskId", taskId))
                .collect();
            if (joint.length > 0) {
                for (const row of joint) {
                    await ctx.db.insert("notifications", {
                        userId: row.userId,
                        taskId,
                        message: `Admin ${authorName} replied to your task: "${task.title}"`,
                        isRead: false,
                        createdAt: Date.now(),
                        type: "task_update"
                    });
                }
            } else if (task.assignedTo) {
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
