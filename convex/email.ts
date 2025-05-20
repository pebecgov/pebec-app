import { action } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

// Convex actions allow external network requests
export const sendEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
  },
  handler: async (ctx, { to, subject, html }) => {
    const resend = new Resend(process.env.RESEND_API_KEY); // ✅ Resend works inside action()

    try {
      await resend.emails.send({
        from: "support@pebecgov.com", // ✅ Change to your verified email
        to,
        subject,
        html,
      });
      return { success: true };
    } catch (error) {
      console.error("Failed to send email:", error);
      return { success: false, error: error.message };
    }
  },
});
