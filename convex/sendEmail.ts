// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";
import { api } from "./_generated/api";
export const sendEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string()
  },
  handler: async (_, {
    to,
    subject,
    html
  }) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new Error("Missing RESEND_API_KEY in Convex environment.");
    }
    const resend = new Resend(resendApiKey);
    try {
      await resend.emails.send({
        from: "support@pebecgov.com",
        to,
        subject,
        html
      });
      return {
        success: true
      };
    } catch (error) {
      console.error("Email send failed:", error);
      return {
        success: false,
        error: error.message
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
    const resend = new Resend(process.env.RESEND_API_KEY!);
    const result = await resend.emails.send({
      from: "support@pebecgov.com",
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