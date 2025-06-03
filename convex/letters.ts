// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow } from "./users";
import { api } from "./_generated/api";
export const submitLetter = mutation({
  args: {
    letterName: v.string(),
    description: v.optional(v.string()),
    letterUploadId: v.optional(v.id("_storage")),
    sentTo: v.optional(v.id("users"))
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const letterId = await ctx.db.insert("letters", {
      userId: user._id,
      userFullName: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
      userRole: user.role ?? "user",
      letterName: args.letterName,
      description: args.description,
      letterDate: Date.now(),
      letterUploadId: args.letterUploadId,
      sentTo: args.sentTo,
      status: "sent"
    });
    if (args.sentTo) {
      const recipient = await ctx.db.get(args.sentTo);
      if (recipient && recipient.email) {
        await ctx.scheduler.runAfter(0, api.email.sendEmail, {
          to: recipient.email,
          subject: "📥 New Letter Sent to You",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
              <h2 style="color: #28a745;">You've Received a New Letter</h2>
              <p><strong>Letter Subject:</strong> ${args.letterName}</p>
              <p><strong>Sent By:</strong> ${user.firstName} ${user.lastName}</p>
              <p><strong>Role:</strong> ${user.role}</p>
              <p><strong>Job Title:</strong> ${user.jobTitle || "N/A"}</p>
              ${args.description ? `
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p><strong>Message:</strong></p>
                <p style="white-space: pre-wrap;">${args.description}</p>
              </div>
              ` : ''}
              <p>Please check your dashboard to view the full letter${args.letterUploadId ? ' and any attachments' : ''}.</p>
            </div>
          `
        });
        await ctx.db.insert("notifications", {
          userId: recipient._id,
          message: `You have received a new letter from ${user.firstName} ${user.lastName}`,
          isRead: false,
          createdAt: Date.now(),
          type: "new_letter"
        });
      }
    }
    await ctx.db.insert("notifications", {
      userId: user._id,
      message: `Your letter has been successfully sent to ${args.sentTo ? (await ctx.db.get(args.sentTo))?.firstName + " " + (await ctx.db.get(args.sentTo))?.lastName : "User"}`,
      isRead: false,
      createdAt: Date.now(),
      type: "letter_sent"
    });
    return letterId;
  }
});
export const getUserLetters = query({
  handler: async ctx => {
    const user = await getCurrentUserOrThrow(ctx);
    return await ctx.db.query("letters").filter(q => q.eq(q.field("userId"), user._id)).collect();
  }
});
export const getLetterFileUrl = mutation({
  args: {
    storageId: v.id("_storage")
  },
  handler: async (ctx, {
    storageId
  }) => {
    const url = await ctx.storage.getUrl(storageId);
    if (!url) return null;
    const fileRecord = await ctx.db.query("uploaded_files").filter(q => q.eq(q.field("storageId"), storageId)).first();
    return {
      url,
      fileName: fileRecord?.fileName || "downloaded_file"
    };
  }
});
export const getAllSubmittedLetters = query({
  args: {
    role: v.optional(v.union(v.literal("user"), v.literal("admin"), v.literal("mda"), v.literal("staff"), v.literal("reform_champion"), v.literal("federal"), v.literal("saber_agent"), v.literal("deputies"), v.literal("magistrates"), v.literal("state_governor"), v.literal("president"), v.literal("vice_president"))),
    mdaName: v.optional(v.string()),
    staffStream: v.optional(v.string()),
    state: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("letters");
    if (args.role) {
      query = query.filter(q => q.eq(q.field("userRole"), args.role));
    }
    if (args.startDate) {
      query = query.filter(q => q.gte(q.field("letterDate"), args.startDate!));
    }
    if (args.endDate) {
      query = query.filter(q => q.lte(q.field("letterDate"), args.endDate!));
    }
    const users = await ctx.db.query("users").collect();
    let matchingUsers = users;
    if (args.mdaName) {
      matchingUsers = matchingUsers.filter(user => user.mdaName === args.mdaName);
    }
    if (args.staffStream) {
      matchingUsers = matchingUsers.filter(user => user.staffStream === args.staffStream);
    }
    if (args.state) {
      matchingUsers = matchingUsers.filter(user => user.state === args.state);
    }
    if (args.mdaName || args.staffStream || args.state) {
      const userIds = matchingUsers.map(u => u._id);
      if (userIds.length > 0) {
        query = query.filter(q => q.or(...userIds.map(userId => q.eq(q.field("userId"), userId))));
      } else {
        return [];
      }
    }
    const letters = await query.collect();
    const userMap = new Map(users.map(user => [user._id, user]));
    return letters.map(letter => {
      const user = userMap.get(letter.userId) ?? {
        firstName: "Unknown",
        lastName: "User",
        role: "user",
        mdaName: "",
        staffStream: "",
        state: ""
      };
      return {
        ...letter,
        userFullName: `${user.firstName} ${user.lastName}`.trim(),
        userRole: user.role,
        mdaName: user.mdaName,
        staffStream: user.staffStream,
        state: user.state
      };
    });
  }
});
export const getAllMdaNames = query({
  handler: async ctx => {
    const mdas = await ctx.db.query("users").withIndex("byRole", q => q.eq("role", "mda")).collect();
    const uniqueMdas = [...new Set(mdas.map(user => user.mdaName))].filter(Boolean);
    return uniqueMdas;
  }
});
export const getAllStaffStreams = query({
  handler: async ctx => {
    const staff = await ctx.db.query("users").withIndex("byRole", q => q.eq("role", "staff")).collect();
    const uniqueStreams = [...new Set(staff.map(user => user.staffStream))].filter(Boolean);
    return uniqueStreams;
  }
});
export const getAllStates = query({
  handler: async ctx => {
    const stateUsers = await ctx.db.query("users").filter(q => q.neq(q.field("state"), undefined)).collect();
    const uniqueStates = [...new Set(stateUsers.map(user => user.state))].filter(Boolean);
    return uniqueStates;
  }
});
export const updateLetterStatus = mutation({
  args: {
    letterId: v.id("letters"),
    status: v.union(v.literal("acknowledged"), v.literal("in_progress"), v.literal("resolved"))
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const letter = await ctx.db.get(args.letterId);
    if (!letter || letter.sentTo !== user._id && letter.assignedTo !== user._id) {
      throw new Error("Unauthorized or invalid letter.");
    }
    await ctx.db.patch(args.letterId, {
      status: args.status
    });
  }
});
export const getLettersReceivedByUser = query({
  handler: async ctx => {
    const user = await getCurrentUserOrThrow(ctx);
    const letters = await ctx.db.query("letters").filter(q => q.eq(q.field("sentTo"), user._id)).collect();
    return letters.map(letter => ({
      ...letter,
      status: letter.status ?? "sent"
    }));
  }
});
export const getBusinessLetterStats = query({
  handler: async ctx => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const letters = await ctx.db.query("business_letters").filter(q => q.gte(q.field("createdAt"), thirtyDaysAgo)).collect();
    const total = letters.length;
    const statusCounts = letters.reduce((acc, letter) => {
      acc[letter.status || "pending"] += 1;
      return acc;
    }, {
      pending: 0,
      acknowledged: 0,
      in_progress: 0,
      resolved: 0
    });
    const userBreakdown: Record<string, {
      streams: Record<string, number>;
    }> = {};
    for (const letter of letters) {
      if (!letter.assignedToName || letter.assignedToName.length === 0) continue;
      letter.assignedToName.forEach(name => {
        if (!userBreakdown[name]) {
          userBreakdown[name] = {
            streams: {}
          };
        }
        const stream = letter.assignedStream || "Unknown Stream";
        userBreakdown[name].streams[stream] = (userBreakdown[name].streams[stream] || 0) + 1;
      });
    }
    return {
      total,
      ...statusCounts,
      userBreakdown
    };
  }
});
export const assignLetterToAuditor = mutation({
  args: {
    letterIds: v.array(v.id("letters")),
    auditorId: v.id("users")
  },
  handler: async (ctx, {
    letterIds,
    auditorId
  }) => {
    for (const letterId of letterIds) {
      await ctx.db.patch(letterId, {
        assignedTo: auditorId,
        status: "sent"
      });
    }
  }
});
export const getAssignedLetters = query({
  handler: async ctx => {
    const user = await getCurrentUserOrThrow(ctx);
    return await ctx.db.query("letters").filter(q => q.eq(q.field("assignedTo"), user._id)).collect();
  }
});
export const getAssignedLettersForAuditor = query({
  handler: async ctx => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "staff" || user.staffStream !== "auditor") {
      throw new Error("Unauthorized");
    }
    const letters = await ctx.db.query("letters").filter(q => q.eq(q.field("assignedTo"), user._id)).collect();
    return letters.map(letter => ({
      ...letter,
      status: letter.status ?? "sent"
    }));
  }
});