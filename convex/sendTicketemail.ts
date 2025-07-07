// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { action, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";
import { internal } from './_generated/api';
import { Id } from './_generated/dataModel';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendTicketEmail = action({
  args: {
    to: v.string(),
    eventTitle: v.string(),
    ticketPdfId: v.id("_storage")
  },
  handler: async (ctx, {
    to,
    eventTitle,
    ticketPdfId
  }) => {
    try {
      console.log(`📧 Fetching ticket PDF URL for email to ${to}...`);
      const ticketUrl = await ctx.storage.getUrl(ticketPdfId);
      if (!ticketUrl) {
        console.error("❌ Failed to retrieve ticket PDF URL.");
        throw new Error("Failed to fetch ticket PDF.");
      }
      console.log(`📧 Sending email to ${to} with ticket link: ${ticketUrl}`);
      const response = await resend.emails.send({
        from: "support@pebecgov.com",
        to,
        subject: `Your Ticket for ${eventTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>🎟️ Your Ticket for <strong>${eventTitle}</strong></h2>
            <p>Thank you for registering for <strong>${eventTitle}</strong>!</p>
            <p>You can download your ticket using the link below:</p>
            <p>
              <a href="${ticketUrl}" target="_blank"
                style="display: inline-block; padding: 10px 20px; background-color: #007BFF; color: white; text-decoration: none; border-radius: 5px;">
                📄 Download Your Ticket
              </a>
            </p>
            <p>If you have any questions, feel free to reply to this email.</p>
            <p>Best regards,</p>
            <p><strong>PEBEC Team</strong></p>
          </div>
        `
      });
      console.log(`✅ Email successfully sent to ${to}`, response);
    } catch (error) {
      console.error("❌ Error sending email:", error);
      throw new Error("Email sending failed.");
    }
  }
});