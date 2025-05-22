// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow } from "./users";
import { api } from "./_generated/api";
export const createBusinessLetter = mutation({
  args: {
    title: v.string(),
    companyName: v.string(),
    contactName: v.string(),
    email: v.string(),
    phone: v.string(),
    letterFileId: v.id("_storage"),
    supportingFileIds: v.optional(v.array(v.id("_storage")))
  },
  handler: async (ctx, args) => {
    const letterId = await ctx.db.insert("business_letters", {
      title: args.title,
      companyName: args.companyName,
      contactName: args.contactName,
      email: args.email,
      phone: args.phone,
      letterFileId: args.letterFileId,
      supportingFileIds: args.supportingFileIds ?? [],
      createdAt: Date.now()
    });
    const admins = await ctx.db.query("users").withIndex("byRole", q => q.eq("role", "admin")).collect();
    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin._id,
        message: `📩 New letter submitted: ${args.title}`,
        isRead: false,
        createdAt: Date.now(),
        type: "business_letter"
      });
      await ctx.scheduler.runAfter(0, api.email.sendEmail, {
        to: admin.email,
        subject: `New Business Letter: ${args.title}`,
        html: `<p>A new letter titled <b>${args.title}</b> was submitted by <b>${args.companyName}</b>.</p>`
      });
    }
    const submissionDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "2-digit"
    });
    const autoReply = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #111;">
        <p style="text-align: right;">${submissionDate}</p>
        <p>
          ${args.contactName}<br/>
          ${args.companyName}
        </p>
        <p><strong>RE: ${args.title}</strong></p>
        <p>
          On behalf of the Presidential Enabling Business Environment Council (PEBEC), I acknowledge receipt of your letter dated <strong>${submissionDate}</strong>, highlighting <strong>${args.title}</strong>.
        </p>
        <p>
          <strong>PEBEC</strong> was established with a dual mandate to remove bureaucratic and legislative constraints to doing business and to improve the perception of Nigeria’s business climate.
        </p>
        <p>
          We understand the urgency of this matter and will keep you informed of any developments. If <strong>${args.companyName}</strong> wishes to make further inquiries or provide additional input, please send an email to <a href="mailto:infor@pebec.gov.ng">infor@pebec.gov.ng</a> or call 08075079164.
        </p>
        <p>Please accept the assurance of my best regards.</p>
        <p><strong>For: Presidential Enabling Business Environment Council (PEBEC)</strong></p>
      </div>
    `;
    await ctx.scheduler.runAfter(0, api.email.sendEmail, {
      to: args.email,
      subject: `Acknowledgement of Your Letter - ${args.title}`,
      html: autoReply
    });
    return {
      letterId
    };
  }
});
export const getAllBusinessLetters = query({
  args: {
    refreshKey: v.optional(v.number())
  },
  handler: async (ctx, _args) => {
    return await ctx.db.query("business_letters").order("desc").collect();
  }
});
export const deleteBusinessLetter = mutation({
  args: {
    letterId: v.id("business_letters")
  },
  handler: async (ctx, {
    letterId
  }) => {
    await ctx.db.delete(letterId);
  }
});
export const getFileUrl = mutation({
  args: {
    storageId: v.id("_storage")
  },
  handler: async (ctx, {
    storageId
  }) => {
    return await ctx.storage.getUrl(storageId);
  }
});
export const assignLettersToStaff = mutation({
  args: {
    letterIds: v.array(v.id("business_letters")),
    staffIds: v.array(v.id("users")),
    staffNames: v.array(v.string()),
    stream: v.string()
  },
  handler: async (ctx, {
    letterIds,
    staffIds,
    stream,
    staffNames
  }) => {
    for (const letterId of letterIds) {
      await ctx.db.patch(letterId, {
        assignedTo: staffIds,
        assignedToName: staffNames,
        assignedStream: stream,
        status: "pending"
      });
    }
    const staffUsers = await Promise.all(staffIds.map(async id => await ctx.db.get(id)));
    for (const staff of staffUsers) {
      if (!staff) continue;
      await ctx.db.insert("notifications", {
        userId: staff._id,
        message: `New letter(s) assigned to you. Please check your assigned letters section.`,
        isRead: false,
        createdAt: Date.now(),
        type: "business_letter_assignment"
      });
      await ctx.scheduler.runAfter(0, api.email.sendEmail, {
        to: staff.email,
        subject: `New Business Letter(s) Assigned`,
        html: `
            <p>Hi ${staff.firstName || "there"},</p>
            <p>New letter(s) assigned to you. Please check your assigned letters section.</p>
          `
      });
    }
  }
});
export const updateLetterStatus = mutation({
  args: {
    letterId: v.id("business_letters"),
    status: v.union(v.literal("acknowledged"), v.literal("in_progress"), v.literal("resolved"))
  },
  handler: async (ctx, {
    letterId,
    status
  }) => {
    const letter = await ctx.db.get(letterId);
    if (!letter) throw new Error("Letter not found");
    const allowedTransitions: Record<string, string[]> = {
      pending: ["acknowledged"],
      acknowledged: ["in_progress"],
      in_progress: ["resolved"],
      resolved: []
    };
    if (!allowedTransitions[letter.status || "pending"].includes(status)) {
      throw new Error("Invalid status transition");
    }
    await ctx.db.patch(letterId, {
      status
    });
    const staffUsers = await ctx.db.query("users").filter(q => q.or(...(letter.assignedTo ?? []).map(id => q.eq(q.field("_id"), id)))).collect();
    const allAdmins = await ctx.db.query("users").withIndex("byRole", q => q.eq("role", "admin")).collect();
    const notifyUsers = [...staffUsers, ...allAdmins];
    for (const user of notifyUsers) {
      await ctx.db.insert("notifications", {
        userId: user._id,
        message: `Letter "${letter.title}" status changed to ${status.replace("_", " ")}`,
        isRead: false,
        createdAt: Date.now(),
        type: "business_letter_status"
      });
      await ctx.scheduler.runAfter(0, api.email.sendEmail, {
        to: user.email,
        subject: `Letter Status Update - ${letter.title}`,
        html: `
            <p>Hi ${user.firstName || "there"},</p>
            <p>The status of the letter titled "<strong>${letter.title}</strong>" has been updated to <strong>${status.replace("_", " ").toUpperCase()}</strong>.</p>
            <p>View details in your dashboard.</p>
          `
      });
    }
  }
});