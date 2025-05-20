import { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { to, eventTitle, ticketPdfId } = req.body;

  if (!to || !eventTitle || !ticketPdfId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    console.log(`📧 Fetching ticket PDF URL for email to ${to}...`);

    // ✅ Generate the Convex storage URL for the ticket
    const ticketUrl = `process.${ticketPdfId}`; // Replace with actual logic

    console.log(`📧 Sending email with ticket link: ${ticketUrl}`);

    // ✅ Send Email using Resend
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
      `,
    });

    console.log(`✅ Email successfully sent to ${to}`, response);
    res.status(200).json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("❌ Error sending email:", error);
    res.status(500).json({ error: "Email sending failed" });
  }
}
