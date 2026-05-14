// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
//@ts-nocheck

import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { sendGridErrorMessage, sendGridHtmlEmail } from "./sendgridMail";

export const sendEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string()
  },
  handler: async (_, { to, subject, html }) => {
    try {
      const { messageId } = await sendGridHtmlEmail({ to, subject, html });
      console.log("Email accepted by SendGrid:", {
        to,
        subject,
        id: messageId
      });
      return {
        success: true,
        id: messageId
      };
    } catch (error) {
      console.error("Email send failed:", error);
      return {
        success: false,
        error: sendGridErrorMessage(error)
      };
    }
  }
});

export const deleteVerificationCode = mutation({
  args: {
    email: v.string()
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("email_verifications").withIndex("byEmail", q => q.eq("email", args.email)).collect();
    for (const item of existing) {
      await ctx.db.delete(item._id);
    }
    return true;
  }
});

export const sendVerificationCode = action({
  args: {
    email: v.string()
  },
  handler: async (ctx, args) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await ctx.runMutation(api.sendEmail.storeVerificationCode, {
      email: args.email,
      code
    });
    const result = await sendGridHtmlEmail({
      to: args.email,
      subject: "Your Verification Code",
      html: `<p>Your verification code is: <strong>${code}</strong></p>`
    });
    console.log("📨 Verification code email result:", result);
    return true;
  }
});

export const verifyEmailCode = action({
  args: {
    email: v.string(),
    code: v.string()
  },
  handler: async (ctx, args) => {
    const result = await ctx.runQuery(api.sendEmail.getVerificationCode, {
      email: args.email
    });
    if (!result || result.code !== args.code) {
      return {
        verified: false
      };
    }
    await ctx.runMutation(api.sendEmail.deleteVerificationCode, {
      email: args.email
    });
    return {
      verified: true
    };
  }
});

export const storeVerificationCode = mutation({
  args: {
    email: v.string(),
    code: v.string()
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("email_verifications", {
      email: args.email,
      code: args.code,
      createdAt: Date.now()
    });
  }
});

export const getVerificationCode = query({
  args: {
    email: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db.query("email_verifications").withIndex("byEmail", q => q.eq("email", args.email)).order("desc").first();
  }
});
