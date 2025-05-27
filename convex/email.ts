// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
//@ts-nocheck

import { action } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";
export const sendEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string()
  },
  handler: async (ctx, {
    to,
    subject,
    html
  }) => {
    const resend = new Resend(process.env.RESEND_API_KEY);
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
      console.error("Failed to send email:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
});