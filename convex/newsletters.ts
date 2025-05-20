// convex/newsletter.ts

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { getCurrentUserOrThrow } from "./users";

export const subscribeToNewsletter = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, { email }) => {
    const existing = await ctx.db
      .query("newsletter_subscribers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    const now = new Date().toISOString();

    if (existing) {
      if (!existing.isSubscribed) {
        await ctx.db.patch(existing._id, {
          isSubscribed: true,
          subscribedAt: now,
          unsubscribedAt: undefined,
        });
      } else {
        return { success: true, message: "Already subscribed." };
      }
    } else {
      await ctx.db.insert("newsletter_subscribers", {
        email,
        isSubscribed: true,
        subscribedAt: now,
      });
    }

    // ✅ Notify staff + admin
    const staff = await ctx.db
      .query("users")
      .withIndex("byRole", (q) => q.eq("role", "staff"))
      .collect();

    const targetUsers = staff.filter((u) => u.staffStream === "Strategic Communications Work Stream");
    const admins = await ctx.db.query("users").withIndex("byRole", (q) => q.eq("role", "admin")).collect();
    const notifyUsers = [...admins, ...targetUsers];

    for (const user of notifyUsers) {
      await ctx.db.insert("notifications", {
        userId: user._id,
        message: `New newsletter subscription: ${email}`,
        isRead: false,
        createdAt: Date.now(),
        type: "newsletter_subscribed",
      });
    }

    // ✅ Send welcome email
    const unsubscribeLink = `https://www.localhost:3000/unsubscribe?email=${encodeURIComponent(email)}`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ccc; border-radius: 8px;">
        <div style="background-color: #0047AB; color: white; padding: 16px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2>Welcome to the PEBEC Newsletter</h2>
        </div>
        <div style="padding: 20px;">
          <p>Hello,</p>
          <p>You’ve successfully subscribed to the <strong>PEBEC Newsletter</strong>. We’ll keep you updated with the latest reports, reforms, and updates that matter to ease of doing business in Nigeria.</p>
          <p>If you ever change your mind, you can unsubscribe by email us at info@pebec.gov.ng.</p>
          
        </div>
        <div style="text-align: center; padding: 10px; font-size: 12px; background-color: #f5f5f5; border-radius: 0 0 8px 8px;">
          &copy; ${new Date().getFullYear()} PEBEC. All rights reserved.
        </div>
      </div>
    `;

    await ctx.scheduler.runAfter(0, api.email.sendEmail, {
      to: email,
      subject: "Welcome to PEBEC Newsletter 🎉",
      html,
    });

    return { success: true };
  },
});



export const unsubscribeFromNewsletter = mutation({
    args: {
      email: v.string(),
    },
    handler: async (ctx, { email }) => {
      const subscriber = await ctx.db
        .query("newsletter_subscribers")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
  
      if (!subscriber || !subscriber.isSubscribed) {
        return { success: false, message: "Email not subscribed." };
      }
  
      await ctx.db.patch(subscriber._id, {
        isSubscribed: false,
        unsubscribedAt: new Date().toISOString(),
      });
  
      // ✅ Notify admins + staff
      const staff = await ctx.db
        .query("users")
        .withIndex("byRole", (q) => q.eq("role", "staff"))
        .collect();
  
      const targetUsers = staff.filter((u) => u.staffStream === "Strategic Communications Work Stream");
      const admins = await ctx.db.query("users").withIndex("byRole", (q) => q.eq("role", "admin")).collect();
      const notifyUsers = [...admins, ...targetUsers];
  
      for (const user of notifyUsers) {
        await ctx.db.insert("notifications", {
          userId: user._id,
          message: `Unsubscribed from newsletter: ${email}`,
          isRead: false,
          createdAt: Date.now(),
          type: "newsletter_unsubscribed",
        });
      }
  
      return { success: true };
    },
  });


  export const createNewsletter = mutation({
    args: {
      subject: v.string(),
      message: v.string(),
      attachmentId: v.optional(v.id("_storage")),
    },
    handler: async (ctx, { subject, message, attachmentId }) => {
      const user = await getCurrentUserOrThrow(ctx);
      const allowed = ["admin", "staff"];
      if (!allowed.includes(user.role ?? "")) {
        throw new Error("Unauthorized");
      }
  
      const now = new Date().toISOString();
  
      const newsletterId = await ctx.db.insert("newsletters", {
        subject,
        message,
        attachmentId,
        createdAt: now,
      });
  
      const subscribers = await ctx.db
        .query("newsletter_subscribers")
        .filter((q) => q.eq(q.field("isSubscribed"), true))
        .collect();
  
      const fileUrl = attachmentId
        ? await ctx.storage.getUrl(attachmentId)
        : undefined;
  
      for (const sub of subscribers) {
        await ctx.scheduler.runAfter(0, api.email.sendEmail, {
          to: sub.email,
          subject,
          html: `
            <div style="font-family: Arial; line-height: 1.6;">
              <h2>${subject}</h2>
              <p>${message}</p>
              ${fileUrl ? `<p><a href="${fileUrl}" target="_blank">Download Attachment</a></p>` : ""}
              <p style="font-size:12px; margin-top:20px;">If you want to unsubscribe from PEBEC Newsletter, you can email us at info@pebec.gov.ng</a>.</p>
            </div>
          `,
        });
      }
  
      return { success: true, newsletterId };
    },
  });



  export const getNewsletters = query({
    args: {
      page: v.number(),
      subjectFilter: v.optional(v.string()),
      fromDate: v.optional(v.string()),
      toDate: v.optional(v.string()),
    },
    handler: async (ctx, { page, subjectFilter, fromDate, toDate }) => {
      const newsletters = await ctx.db.query("newsletters").order("desc").collect();
      let filtered = newsletters;
  
      if (subjectFilter) {
        filtered = filtered.filter((n) =>
          n.subject.toLowerCase().includes(subjectFilter.toLowerCase())
        );
      }
  
      if (fromDate) {
        filtered = filtered.filter((n) => new Date(n.createdAt) >= new Date(fromDate));
      }
  
      if (toDate) {
        filtered = filtered.filter((n) => new Date(n.createdAt) <= new Date(toDate));
      }
  
      const pageSize = 20;
      const start = page * pageSize;
      const paginated = filtered.slice(start, start + pageSize);
  
      return {
        total: filtered.length,
        newsletters: paginated,
      };
    },
  });
  

  export const generateUploadUrl = mutation({
    handler: async (ctx) => {
      const url = await ctx.storage.generateUploadUrl();
      return { url };
    },
  });



  export const getSubscribers = query({
    args: {
      page: v.number(),
      status: v.string(),
      fromDate: v.optional(v.string()),
      toDate: v.optional(v.string()),
      emailSearch: v.optional(v.string()), // 👈 ADD THIS LINE
    },
    handler: async (ctx, { page, status, fromDate, toDate, emailSearch }) => {
      let q = ctx.db.query("newsletter_subscribers");
  
      if (status === "subscribed") {
        q = q.filter((q) => q.eq(q.field("isSubscribed"), true));
      } else if (status === "unsubscribed") {
        q = q.filter((q) => q.eq(q.field("isSubscribed"), false));
      }
  
      let results = await q.collect();
  
      if (fromDate) {
        results = results.filter((s) => new Date(s.subscribedAt) >= new Date(fromDate));
      }
  
      if (toDate) {
        results = results.filter((s) => new Date(s.subscribedAt) <= new Date(toDate));
      }
  
      if (emailSearch) {
        results = results.filter((s) =>
          s.email.toLowerCase().includes(emailSearch.toLowerCase())
        );
      }
  
      const pageSize = 20;
      const start = page * pageSize;
  
      return {
        total: results.length,
        list: results.slice(start, start + pageSize),
      };
    },
  });
  

  
  export const addSubscriber = mutation({
    args: { email: v.string() },
    handler: async (ctx, { email }) => {
      const user = await getCurrentUserOrThrow(ctx);
      if (!["admin", "staff"].includes(user.role ?? "")) throw new Error("Unauthorized");
  
      const existing = await ctx.db
        .query("newsletter_subscribers")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
  
      const now = new Date().toISOString();
  
      if (existing) {
        if (!existing.isSubscribed) {
          await ctx.db.patch(existing._id, {
            isSubscribed: true,
            subscribedAt: now,
            unsubscribedAt: undefined,
          });
        }
      } else {
        await ctx.db.insert("newsletter_subscribers", {
          email,
          isSubscribed: true,
          subscribedAt: now,
        });
      }
    },
  });

  
  export const batchAddSubscribers = mutation({
    args: {
      emails: v.array(v.string()),
    },
    handler: async (ctx, { emails }) => {
      const user = await getCurrentUserOrThrow(ctx);
      if (!["admin", "staff"].includes(user.role ?? "")) throw new Error("Unauthorized");
  
      const now = new Date().toISOString();
  
      const uniqueEmails = [...new Set(emails.map((e) => e.trim().toLowerCase()))];
  
      const existing = await ctx.db
        .query("newsletter_subscribers")
        .collect();
  
      const alreadyInDb = new Set(existing.map((e) => e.email.toLowerCase()));
  
      for (const email of uniqueEmails) {
        if (alreadyInDb.has(email)) continue;
  
        await ctx.db.insert("newsletter_subscribers", {
          email,
          isSubscribed: true,
          subscribedAt: now,
        });
      }
    },
  });

  
  export const deleteSubscriber = mutation({
    args: {
      email: v.string(),
    },
    handler: async (ctx, { email }) => {
      const user = await getCurrentUserOrThrow(ctx);
      if (!["admin", "staff"].includes(user.role ?? "")) throw new Error("Unauthorized");
  
      const subscriber = await ctx.db
        .query("newsletter_subscribers")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
  
      if (subscriber) {
        await ctx.db.delete(subscriber._id);
      }
    },
  });
  

  export const getMonthlyReportData = query({
    handler: async (ctx) => {
      // no args here!
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
      const subscribers = await ctx.db.query("newsletter_subscribers").collect();
  
      return subscribers.filter((s) => {
        const subDate = new Date(s.subscribedAt);
        return subDate >= start && subDate <= end;
      });
    },
  });
  

  export const getAllNewsletters = query(async (ctx) => {
    return await ctx.db.query("newsletters").order("desc").collect();
  });

  export const getCustomReportData = query({
    args: {
      fromDate: v.string(),
      toDate: v.string(),
      status: v.string(), // "all" | "subscribed" | "unsubscribed"
    },
    handler: async (ctx, { fromDate, toDate, status }) => {
      const from = new Date(fromDate);
      const to = new Date(toDate);
  
      const subscribers = await ctx.db.query("newsletter_subscribers").collect();
  
      return subscribers.filter((s) => {
        const subDate = new Date(s.subscribedAt);
        const withinRange = subDate >= from && subDate <= to;
        const matchesStatus =
          status === "all" ||
          (status === "subscribed" && s.isSubscribed) ||
          (status === "unsubscribed" && !s.isSubscribed);
        return withinRange && matchesStatus;
      });
    },
  });
  