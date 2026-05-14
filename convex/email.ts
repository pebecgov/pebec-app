// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
//@ts-nocheck

import { action } from "./_generated/server";
import { v } from "convex/values";
import { sendGridErrorMessage, sendGridHtmlEmail } from "./sendgridMail";

export const sendEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string()
  },
  handler: async (_ctx, { to, subject, html }) => {
    try {
      await sendGridHtmlEmail({ to, subject, html });
      return {
        success: true
      };
    } catch (error) {
      console.error("Failed to send email:", error);
      return {
        success: false,
        error: sendGridErrorMessage(error)
      };
    }
  }
});
