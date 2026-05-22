// @ts-nocheck

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { getCurrentUserOrThrow } from "./users";
import {
  ANNUAL_LEAVE_WORKING_DAYS,
  countWorkingDays,
  yearFromDate,
} from "../lib/leaveWorkingDays";
import { leaveAllowanceExceededMessage } from "../lib/leaveBalance";
import { isAuthorizedTaskAdmin } from "../lib/authorizedTaskAdmins";
import {
  LEAVE_APPROVER_DISPLAY_NAME,
  LEAVE_APPROVER_EMAIL,
  LEAVE_APPROVER_ROLE_LABEL,
} from "../lib/leaveApprover";

function assertCanReviewLeave(user: { email?: string; role?: string }) {
  if (!isAuthorizedTaskAdmin(user)) {
    throw new Error("Only designated approvers can review or record staff leave.");
  }
}

async function getLeaveApproverUserId(ctx: { db: any }) {
  const approver = await ctx.db
    .query("users")
    .withIndex("byEmail", (q: any) => q.eq("email", LEAVE_APPROVER_EMAIL))
    .first();
  if (!approver) {
    throw new Error(
      `Leave approver (${LEAVE_APPROVER_EMAIL}) was not found. Please ensure this user exists.`
    );
  }
  return approver._id;
}

function assertWithinAnnualAllowance(
  used: number,
  pending: number,
  requestedDays: number,
  year: number
) {
  if (used + pending + requestedDays > ANNUAL_LEAVE_WORKING_DAYS) {
    throw new Error(leaveAllowanceExceededMessage(requestedDays, used, pending, year));
  }
}

function displayName(user: { firstName?: string; lastName?: string; email: string }) {
  return `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const STAFF_LEAVE_URL = "https://www.pebec.gov.ng/staff/leave-requests";

function buildLeaveStatusEmailHtml(args: {
  firstName?: string;
  decision: "approved" | "rejected";
  subject: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  reviewedByName: string;
  reviewNote?: string;
  recordedByAdmin?: boolean;
}) {
  const isApproved = args.decision === "approved";
  const accent = isApproved ? "#059669" : "#dc2626";
  const headline = args.recordedByAdmin
    ? "Leave recorded for you"
    : isApproved
      ? "Leave request approved"
      : "Leave request not approved";
  const lead = args.recordedByAdmin
    ? "An administrator has recorded and approved leave on your behalf."
    : isApproved
      ? "Your leave request has been approved. An absence notice has been added automatically."
      : "Your leave request was reviewed and was not approved.";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: ${accent}; padding: 16px 20px; color: white;">
        <h2 style="margin: 0; font-size: 20px;">${headline}</h2>
      </div>
      <div style="padding: 20px; color: #333; line-height: 1.5;">
        <p>Hello ${escapeHtml(args.firstName || "Colleague")},</p>
        <p>${lead}</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #6b7280;">Subject</td><td style="padding: 8px 0;"><strong>${escapeHtml(args.subject)}</strong></td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Dates</td><td style="padding: 8px 0;">${escapeHtml(args.startDate)} – ${escapeHtml(args.endDate)}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Working days</td><td style="padding: 8px 0;">${args.workingDays}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Reviewed by</td><td style="padding: 8px 0;">${escapeHtml(args.reviewedByName)}</td></tr>
        </table>
        ${args.reviewNote ? `<p style="background: #f9fafb; padding: 12px; border-radius: 6px; font-size: 14px;"><strong>Note:</strong> ${escapeHtml(args.reviewNote)}</p>` : ""}
        <p style="margin-top: 20px;">
          <a href="${STAFF_LEAVE_URL}" style="background-color: ${accent}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View leave requests</a>
        </p>
        <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">PEBEC Staff Portal</p>
      </div>
    </div>
  `;
}

async function scheduleLeaveStatusEmail(
  ctx: { scheduler: any },
  applicant: { email: string; firstName?: string },
  leave: {
    subject: string;
    startDate: string;
    endDate: string;
    workingDays: number;
  },
  decision: "approved" | "rejected",
  reviewedByName: string,
  reviewNote?: string,
  options?: { recordedByAdmin?: boolean }
) {
  if (!applicant.email) return;

  const isApproved = decision === "approved";
  const emailSubject = options?.recordedByAdmin
    ? `Leave recorded: ${leave.subject}`
    : isApproved
      ? `Leave approved: ${leave.subject}`
      : `Leave not approved: ${leave.subject}`;

  await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
    to: applicant.email,
    subject: emailSubject,
    html: buildLeaveStatusEmailHtml({
      firstName: applicant.firstName,
      decision,
      subject: leave.subject,
      startDate: leave.startDate,
      endDate: leave.endDate,
      workingDays: leave.workingDays,
      reviewedByName,
      reviewNote,
      recordedByAdmin: options?.recordedByAdmin,
    }),
  });
}

async function sumWorkingDaysForYear(
  ctx: { db: any },
  applicantUserId: string,
  year: number,
  statuses: ("approved" | "pending")[]
) {
  const rows = await ctx.db
    .query("leaveRequests")
    .withIndex("by_applicant", (q: any) => q.eq("applicantUserId", applicantUserId))
    .collect();

  return rows
    .filter((r: any) => r.leaveYear === year && statuses.includes(r.status))
    .reduce((sum: number, r: any) => sum + r.workingDays, 0);
}

async function buildLeaveBalance(
  ctx: { db: any },
  userId: string,
  year: number
) {
  const used = await sumWorkingDaysForYear(ctx, userId, year, ["approved"]);
  const pending = await sumWorkingDaysForYear(ctx, userId, year, ["pending"]);
  return {
    year,
    annualAllowance: ANNUAL_LEAVE_WORKING_DAYS,
    used,
    pending,
    remaining: ANNUAL_LEAVE_WORKING_DAYS - used - pending,
  };
}

export const getLeaveBalance = query({
  args: { year: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const year = args.year ?? new Date().getFullYear();
    return await buildLeaveBalance(ctx, user._id, year);
  },
});

export const getLeaveBalanceForUser = query({
  args: {
    userId: v.id("users"),
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUserOrThrow(ctx);
    if (admin.role !== "admin") {
      throw new Error("Unauthorized");
    }
    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("Staff member not found");
    if (target.role !== "staff") {
      throw new Error("Leave balance applies to staff members only");
    }
    const year = args.year ?? new Date().getFullYear();
    const balance = await buildLeaveBalance(ctx, args.userId, year);
    return {
      ...balance,
      userName: displayName(target),
      userId: target._id,
    };
  },
});

export const listStaffMembersForLeave = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentUserOrThrow(ctx);
    if (admin.role !== "admin") {
      throw new Error("Unauthorized");
    }
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => u.role === "staff")
      .map((u) => ({
        _id: u._id,
        name: displayName(u),
        email: u.email,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const listStaffAndAdminsForLeave = query({
  args: {},
  handler: async (ctx) => {
    await getCurrentUserOrThrow(ctx);
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => u.role === "admin" || u.role === "staff")
      .map((u) => ({
        _id: u._id,
        name: displayName(u),
        email: u.email,
        role: u.role,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const listMyLeaveRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    const rows = await ctx.db
      .query("leaveRequests")
      .withIndex("by_applicant", (q) => q.eq("applicantUserId", user._id))
      .collect();

    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getLeaveApproverDisplay = query({
  args: {},
  handler: async (ctx) => {
    await getCurrentUserOrThrow(ctx);
    const approver = await ctx.db
      .query("users")
      .withIndex("byEmail", (q: any) => q.eq("email", LEAVE_APPROVER_EMAIL))
      .first();

    return {
      roleLabel: LEAVE_APPROVER_ROLE_LABEL,
      name: approver ? displayName(approver) : LEAVE_APPROVER_DISPLAY_NAME,
      email: approver?.email ?? LEAVE_APPROVER_EMAIL,
    };
  },
});

export const getPendingLeaveRequestCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin") {
      return 0;
    }
    const rows = await ctx.db.query("leaveRequests").collect();
    return rows.filter((r) => r.status === "pending").length;
  },
});

function groupLeaveRequestsByStaff(
  requests: Array<{
    applicantUserId: string;
    applicantName: string;
    subject: string;
    startDate: string;
    endDate: string;
    workingDays: number;
  }>,
  emailByUserId: Map<string, string | undefined>
) {
  const map = new Map<
    string,
    {
      userId: string;
      name: string;
      email?: string;
      leaves: Array<{
        subject: string;
        startDate: string;
        endDate: string;
        workingDays: number;
      }>;
    }
  >();

  for (const r of requests) {
    if (!map.has(r.applicantUserId)) {
      map.set(r.applicantUserId, {
        userId: r.applicantUserId,
        name: r.applicantName,
        email: emailByUserId.get(r.applicantUserId),
        leaves: [],
      });
    }
    map.get(r.applicantUserId)!.leaves.push({
      subject: r.subject,
      startDate: r.startDate,
      endDate: r.endDate,
      workingDays: r.workingDays,
    });
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export const getAdminLeaveOverview = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const today = new Date().toISOString().split("T")[0];
    const allRequests = await ctx.db.query("leaveRequests").collect();
    const staffUsers = (await ctx.db.query("users").collect()).filter(
      (u) => u.role === "staff"
    );
    const emailByUserId = new Map(
      staffUsers.map((s) => [s._id, s.email] as const)
    );

    const approved = allRequests.filter((r) => r.status === "approved");
    const pending = allRequests.filter((r) => r.status === "pending");

    const onLeaveNowRequests = approved.filter(
      (r) => r.startDate <= today && r.endDate >= today
    );
    const upcomingLeaveRequests = approved.filter((r) => r.startDate > today);

    const onLeaveNowStaff = groupLeaveRequestsByStaff(
      onLeaveNowRequests,
      emailByUserId
    );
    const upcomingStaff = groupLeaveRequestsByStaff(
      upcomingLeaveRequests,
      emailByUserId
    );
    const pendingStaff = groupLeaveRequestsByStaff(pending, emailByUserId);

    const staffWithPending = new Set(pending.map((r) => r.applicantUserId));
    const staffOnLeaveOrUpcoming = new Set([
      ...onLeaveNowStaff.map((s) => s.userId),
      ...upcomingStaff.map((s) => s.userId),
    ]);

    const notOnLeaveStaff = staffUsers
      .filter(
        (s) =>
          !staffWithPending.has(s._id) && !staffOnLeaveOrUpcoming.has(s._id)
      )
      .map((s) => ({
        userId: s._id,
        name: displayName(s),
        email: s.email,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      totalStaff: staffUsers.length,
      onLeaveNow: onLeaveNowStaff.length,
      upcomingLeave: upcomingStaff.length,
      pendingReview: pendingStaff.length,
      pendingRequestCount: pending.length,
      notOnLeave: notOnLeaveStaff.length,
      onLeaveNowStaff,
      upcomingStaff,
      pendingStaff,
      notOnLeaveStaff,
    };
  },
});

export const listAllLeaveRequests = query({
  args: {
    status: v.optional(
      v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    let rows = await ctx.db.query("leaveRequests").collect();
    if (args.status) {
      rows = rows.filter((r) => r.status === args.status);
    }
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getLeaveRequest = query({
  args: { leaveRequestId: v.id("leaveRequests") },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const row = await ctx.db.get(args.leaveRequestId);
    if (!row) return null;

    if (user.role !== "admin" && row.applicantUserId !== user._id) {
      throw new Error("Unauthorized");
    }

    const toUsers = await Promise.all(row.toUserIds.map((id) => ctx.db.get(id)));
    const ccUsers = await Promise.all(row.ccUserIds.map((id) => ctx.db.get(id)));

    const attachments = [];
    if (row.attachmentIds?.length) {
      for (let i = 0; i < row.attachmentIds.length; i++) {
        const id = row.attachmentIds[i];
        const url = await ctx.storage.getUrl(id);
        attachments.push({
          storageId: id,
          name: row.attachmentNames?.[i] ?? "Attachment",
          url,
        });
      }
    }

    return {
      ...row,
      toUsers: toUsers.filter(Boolean).map((u) => ({
        _id: u!._id,
        name: displayName(u!),
        email: u!.email,
      })),
      ccUsers: ccUsers.filter(Boolean).map((u) => ({
        _id: u!._id,
        name: displayName(u!),
        email: u!.email,
      })),
      attachments,
    };
  },
});

export const submitLeaveRequest = mutation({
  args: {
    subject: v.string(),
    bodyHtml: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    attachmentIds: v.optional(v.array(v.id("_storage"))),
    attachmentNames: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "staff" && user.role !== "admin") {
      throw new Error("Only staff can submit leave requests");
    }

    const subject = args.subject.trim();
    if (!subject) throw new Error("Subject is required");

    if (args.endDate < args.startDate) {
      throw new Error("End date must be on or after start date");
    }

    const todayStr = new Date().toISOString().split("T")[0];
    if (args.startDate < todayStr) {
      throw new Error("You cannot select a past start date");
    }

    const workingDays = countWorkingDays(args.startDate, args.endDate);
    if (workingDays < 1) {
      throw new Error("Leave must include at least one working day");
    }

    const leaveYear = yearFromDate(args.startDate);
    const used = await sumWorkingDaysForYear(ctx, user._id, leaveYear, ["approved"]);
    const pending = await sumWorkingDaysForYear(ctx, user._id, leaveYear, ["pending"]);

    assertWithinAnnualAllowance(used, pending, workingDays, leaveYear);

    const approverId = await getLeaveApproverUserId(ctx);
    const now = Date.now();
    return await ctx.db.insert("leaveRequests", {
      subject,
      bodyHtml: args.bodyHtml,
      applicantUserId: user._id,
      applicantName: displayName(user),
      toUserIds: [approverId],
      ccUserIds: [],
      startDate: args.startDate,
      endDate: args.endDate,
      workingDays,
      leaveYear,
      status: "pending",
      source: "staff",
      attachmentIds: args.attachmentIds,
      attachmentNames: args.attachmentNames,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const adminRecordStaffLeave = mutation({
  args: {
    staffUserId: v.id("users"),
    subject: v.string(),
    bodyHtml: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    reviewNote: v.optional(v.string()),
    attachmentIds: v.optional(v.array(v.id("_storage"))),
    attachmentNames: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUserOrThrow(ctx);
    assertCanReviewLeave(admin);

    const staff = await ctx.db.get(args.staffUserId);
    if (!staff) throw new Error("Staff member not found");
    if (staff.role !== "staff") {
      throw new Error("Leave can only be recorded for staff accounts");
    }

    const subject = args.subject.trim();
    if (!subject) throw new Error("Subject is required");
    if (args.endDate < args.startDate) {
      throw new Error("End date must be on or after start date");
    }

    const workingDays = countWorkingDays(args.startDate, args.endDate);
    if (workingDays < 1) {
      throw new Error("Leave must include at least one working day");
    }

    const leaveYear = yearFromDate(args.startDate);
    const used = await sumWorkingDaysForYear(ctx, staff._id, leaveYear, ["approved"]);
    const pending = await sumWorkingDaysForYear(ctx, staff._id, leaveYear, ["pending"]);
    assertWithinAnnualAllowance(used, pending, workingDays, leaveYear);

    const bodyHtml = args.bodyHtml?.trim() || "<p>Leave recorded by admin.</p>";

    const holidayAnnouncementId = await ctx.runMutation(
      internal.holidayAnnouncements.createFromApprovedLeaveRequest,
      {
        applicantUserId: staff._id,
        startDate: args.startDate,
        endDate: args.endDate,
        description: undefined,
        performedBy: admin._id,
        performedByName: displayName(admin),
        performedByRole: admin.role,
      }
    );

    const now = Date.now();
    const leaveRequestId = await ctx.db.insert("leaveRequests", {
      subject,
      bodyHtml,
      applicantUserId: staff._id,
      applicantName: displayName(staff),
      toUserIds: [admin._id],
      ccUserIds: [],
      startDate: args.startDate,
      endDate: args.endDate,
      workingDays,
      leaveYear,
      status: "approved",
      source: "admin",
      attachmentIds: args.attachmentIds,
      attachmentNames: args.attachmentNames,
      holidayAnnouncementId,
      reviewedBy: admin._id,
      reviewedByName: displayName(admin),
      reviewedAt: now,
      reviewNote: args.reviewNote?.trim() || "Recorded by admin",
      createdAt: now,
      updatedAt: now,
    });

    await scheduleLeaveStatusEmail(
      ctx,
      staff,
      {
        subject,
        startDate: args.startDate,
        endDate: args.endDate,
        workingDays,
      },
      "approved",
      displayName(admin),
      args.reviewNote?.trim() || "Recorded by admin",
      { recordedByAdmin: true }
    );

    return leaveRequestId;
  },
});

export const reviewLeaveRequest = mutation({
  args: {
    leaveRequestId: v.id("leaveRequests"),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    reviewNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUserOrThrow(ctx);
    assertCanReviewLeave(admin);

    const row = await ctx.db.get(args.leaveRequestId);
    if (!row) throw new Error("Leave request not found");
    if (row.status !== "pending") {
      throw new Error("This request has already been reviewed");
    }

    const now = Date.now();
    let holidayAnnouncementId = row.holidayAnnouncementId;

    if (args.decision === "approved") {
      const used = await sumWorkingDaysForYear(
        ctx,
        row.applicantUserId,
        row.leaveYear,
        ["approved"]
      );
      assertWithinAnnualAllowance(used, 0, row.workingDays, row.leaveYear);

      holidayAnnouncementId = await ctx.runMutation(
        internal.holidayAnnouncements.createFromApprovedLeaveRequest,
        {
          applicantUserId: row.applicantUserId,
          startDate: row.startDate,
          endDate: row.endDate,
          description: undefined,
          performedBy: admin._id,
          performedByName: displayName(admin),
          performedByRole: admin.role,
        }
      );
    }

    await ctx.db.patch(args.leaveRequestId, {
      status: args.decision,
      reviewedBy: admin._id,
      reviewedByName: displayName(admin),
      reviewedAt: now,
      reviewNote: args.reviewNote?.trim() || undefined,
      holidayAnnouncementId,
      updatedAt: now,
    });

    const applicant = await ctx.db.get(row.applicantUserId);
    if (applicant?.email) {
      await scheduleLeaveStatusEmail(
        ctx,
        applicant,
        {
          subject: row.subject,
          startDate: row.startDate,
          endDate: row.endDate,
          workingDays: row.workingDays,
        },
        args.decision,
        displayName(admin),
        args.reviewNote?.trim()
      );
    }

    return args.leaveRequestId;
  },
});

/** Recompute workingDays from dates (weekends + public holidays excluded). Run once after holiday rules change. */
export const recalculateLeaveWorkingDays = mutation({
  args: {
    leaveRequestId: v.optional(v.id("leaveRequests")),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUserOrThrow(ctx);
    assertCanReviewLeave(admin);

    const rows = args.leaveRequestId
      ? [await ctx.db.get(args.leaveRequestId)].filter(Boolean)
      : await ctx.db.query("leaveRequests").collect();

    if (args.leaveRequestId && rows.length === 0) {
      throw new Error("Leave request not found");
    }

    const changes: Array<{
      id: string;
      applicantName: string;
      subject: string;
      previous: number;
      next: number;
    }> = [];

    for (const row of rows) {
      const next = countWorkingDays(row.startDate, row.endDate);
      if (next !== row.workingDays) {
        await ctx.db.patch(row._id, {
          workingDays: next,
          updatedAt: Date.now(),
        });
        changes.push({
          id: row._id,
          applicantName: row.applicantName,
          subject: row.subject,
          previous: row.workingDays,
          next,
        });
      }
    }

    return {
      totalChecked: rows.length,
      updatedCount: changes.length,
      changes,
    };
  },
});
