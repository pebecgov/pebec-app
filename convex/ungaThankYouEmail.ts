// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { getCurrentUserOrThrow } from "./users";

// Send thank you email to a single UNGA participant
export const sendThankYouEmail = action({
  args: {
    to: v.string(),
    firstName: v.string(),
  },
  handler: async (ctx, { to, firstName }): Promise<{ success: boolean; error?: string }> => {
    const sentAt = Date.now();
    const emailTemplate = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thank You for Joining PEBEC UNGA 80 Side Event</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #21C55E 0%, #16A34A 100%);
            padding: 20px;
            text-align: center;
            color: white;
          }
          .logo {
            max-width: 120px;
            height: auto;
            margin-bottom: 10px;
          }
          .company-name {
            font-size: 24px;
            font-weight: bold;
            margin: 10px 0 5px 0;
          }
          .tagline {
            font-size: 14px;
            opacity: 0.9;
          }
          .banner-section {
            position: relative;
            text-align: center;
            padding: 0;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          }
          .banner-image {
            width: 100%;
            height: 200px;
            object-fit: cover;
            display: block;
          }
          .banner-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(33, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.8) 100%);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
            text-align: center;
          }
          .banner-title {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 2px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
          }
          .banner-subtitle {
            font-size: 16px;
            opacity: 0.9;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
          }
          .content {
            padding: 30px 20px;
            line-height: 1.6;
            color: #333;
          }
          .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #21C55E;
          }
          .paragraph {
            margin-bottom: 20px;
            font-size: 16px;
          }
          .hero-image-section {
            position: relative;
            margin: 30px 0;
            text-align: center;
          }
          .hero-image {
            width: 100%;
            max-width: 500px;
            height: auto;
            object-fit: contain;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          }
          .image-overlay {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(33, 197, 94, 0.9);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            backdrop-filter: blur(10px);
          }
          .overlay-title {
            font-size: 16px;
            margin-bottom: 5px;
            font-weight: bold;
          }
          .overlay-main {
            font-size: 24px;
            font-weight: bold;
            margin: 10px 0;
          }
          .overlay-subtitle {
            font-size: 14px;
            opacity: 0.9;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #21C55E 0%, #16A34A 100%);
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 25px;
            font-weight: bold;
            font-size: 16px;
            margin: 20px 0;
            transition: transform 0.2s;
          }
          .cta-button:hover {
            transform: translateY(-2px);
          }
          .social-section {
            background-color: #f8f9fa;
            padding: 30px 20px;
            text-align: center;
          }
          .social-title {
            font-size: 20px;
            font-weight: bold;
            color: #21C55E;
            margin-bottom: 20px;
          }
          .social-links {
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
          }
          .social-link {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background-color: #21C55E;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 20px;
            font-size: 14px;
            transition: background-color 0.2s;
          }
          .social-link:hover {
            background-color: #16A34A;
          }
          .social-icon {
            width: 20px;
            height: 20px;
            object-fit: contain;
          }
          .footer {
            background-color: #21C55E;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 14px;
          }
          .signature {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
          }
          .signature-name {
            font-weight: bold;
            color: #21C55E;
            font-size: 18px;
          }
          .signature-title {
            color: #666;
            font-size: 14px;
            margin-top: 5px;
          }
          .event-highlights {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 30px 0;
          }
          .highlight-item {
            text-align: center;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #21C55E;
          }
          @media (max-width: 600px) {
            .banner-image {
              height: 150px;
            }
            .banner-title {
              font-size: 24px;
            }
          }
          .highlight-number {
            font-size: 24px;
            font-weight: bold;
            color: #21C55E;
          }
          .highlight-text {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
          }
          @media (max-width: 600px) {
            .email-container {
              margin: 0;
              border-radius: 0;
            }
            .banner-title {
              font-size: 24px;
            }
            .hero-image {
              height: 200px;
            }
            .social-links {
              flex-direction: column;
              align-items: center;
            }
            .event-highlights {
              grid-template-columns: 1fr;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <!-- Header -->
          

          <div class="banner-section">
            <img src="https://image2url.com/images/1759244584457-bdae15c4-830f-471c-ae3c-c8fbaeedfd8a.png" alt="UNGA Event Banner" class="banner-image">
          </div>

          <!-- Main Content -->
          <div class="content">
            <div>Dear ${firstName},</div>
            
            <div class="paragraph">
              On behalf of the Presidential Enabling Business Environment Council (PEBEC), in collaboration with the American Business Council and the U.S. Chamber of Commerce, I extend our heartfelt appreciation for your participation in our side event at the 80th United Nations General Assembly in New York.
            </div>

            <div class="paragraph">
              With the theme "A New Era of Economic Opportunities: Ease of Doing Business in Nigeria," the event created a unique platform for dialogue, networking, and exploration of new opportunities. Together, we showcased Nigeria's reform journey, highlighted the emerging investment landscape, and underscored the critical role of partnerships in unlocking the nation's vast business potential.
            </div>

            

            <div class="paragraph">
              Your engagement and contributions made the discussions richer and more impactful. We are confident that the connections built and insights shared will continue to fuel stronger collaborations for Nigeria's economic growth and global competitiveness.
            </div>

            <div class="paragraph">
              Thank you once again for joining us. We look forward to building on this momentum together.
            </div>

            <div class="signature">
              <div class="signature-name">Princess Zahrah Mustapha Audu</div>
              <div class="signature-title">Director-General</div>
              <div class="signature-title">Presidential Enabling Business Environment Council (PEBEC)</div>
            </div>

            <!-- Hero Image Section -->
            <div class="hero-image-section">
              <img src="https://image2url.com/images/1759244628102-230b4c8e-513f-491b-8275-0a9bbd22aed5.jpg" alt="UNGA Event Highlights" class="hero-image">
            
            </div>

            <!-- Call to Action -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://bit.ly/PEBEC-UNGA80-Photos" class="cta-button" target="_blank">
                📸 View Event Photos & Highlights
              </a>
            </div>

            <!-- Social Media Section -->
            <div class="social-section">
              <div class="social-title">Stay Connected with PEBEC</div>
              <p style="margin-bottom: 20px; color: #666;">Follow us for updates on ongoing reforms and upcoming engagements:</p>
              <div class="social-links">
                <a href="https://instagram.com/businessmadeeasy" class="social-link" target="_blank">
                  <img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram" class="social-icon">
                  Instagram
                </a>
                <a href="https://twitter.com/pebecgovng" class="social-link" target="_blank">
                  <img src="https://cdn-icons-png.flaticon.com/512/3256/3256013.png" alt="X (Twitter)" class="social-icon">
                  X (Twitter)
                </a>
                <a href="https://linkedin.com/company/pebecgovng" class="social-link" target="_blank">
                  <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn" class="social-icon">
                  LinkedIn
                </a>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} PEBEC. All rights reserved.</p>
            <p>Presidential Enabling Business Environment Council | Making Business Easy in Nigeria</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await ctx.runAction(api.email.sendEmail, {
        to,
        subject: "Thank You for Joining Us at the PEBEC UNGA 80 Side Event",
        html: emailTemplate
      });
      
      // Log successful email
      await ctx.runMutation(api.ungaThankYouEmail.logEmail, {
        type: "unga_thank_you",
        recipientEmail: to,
        subject: "Thank You for Joining Us at the PEBEC UNGA 80 Side Event",
        sentAt,
        status: "sent"
      });
      
      return { success: true };
    } catch (error) {
      console.error("Failed to send thank you email:", error);
      
      // Log failed email
      await ctx.runMutation(api.ungaThankYouEmail.logEmail, {
        type: "unga_thank_you",
        recipientEmail: to,
        subject: "Thank You for Joining Us at the PEBEC UNGA 80 Side Event",
        sentAt,
        status: "failed",
        error: error instanceof Error ? error.message : String(error)
      });
      
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
});

// Log email to database
export const logEmail = mutation({
  args: {
    type: v.string(),
    recipientEmail: v.string(),
    subject: v.string(),
    sentAt: v.number(),
    status: v.string(),
    error: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("email_logs", {
      type: args.type,
      recipientEmail: args.recipientEmail,
      subject: args.subject,
      sentAt: args.sentAt,
      status: args.status,
      error: args.error
    });
  }
});

// Send thank you emails to all UNGA participants
export const sendThankYouEmailsToAll = action({
  args: {},
  handler: async (ctx): Promise<{
    success: boolean;
    totalSent?: number;
    totalFailed?: number;
    results?: Array<{ email: string; status: string; error?: string }>;
    error?: string;
  }> => {
    try {
      // Get all UNGA registrations
      const registrations = await ctx.runQuery(api.unga.listRegistrations);
      
      if (!registrations || registrations.length === 0) {
        return { success: false, error: "No registrations found" };
      }

      const results: Array<{ email: string; status: string; error?: string }> = [];
      let successCount = 0;
      let failureCount = 0;

      // Additional email addresses to receive thank you emails
      const additionalEmails = [
        { email: "Ajukadavid883@gmail.com", firstName: "Ajuka" },
        { email: "abdullahibbtwd@gmail.com", firstName: "Abdullahi" }
      ];

      // Send emails to all participants
      for (const registration of registrations) {
        try {
          // Extract first name from full name
          const firstName = registration.name.split(' ')[0];
          
          const result = await ctx.runAction(api.ungaThankYouEmail.sendThankYouEmail, {
            to: registration.email,
            firstName
          });

          if (result.success) {
            successCount++;
            results.push({ email: registration.email, status: 'success' });
          } else {
            failureCount++;
            results.push({ email: registration.email, status: 'failed', error: result.error });
          }

          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          failureCount++;
          results.push({ 
            email: registration.email, 
            status: 'failed', 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }

      // Send emails to additional recipients
      for (const recipient of additionalEmails) {
        try {
          const result = await ctx.runAction(api.ungaThankYouEmail.sendThankYouEmail, {
            to: recipient.email,
            firstName: recipient.firstName
          });

          if (result.success) {
            successCount++;
            results.push({ email: recipient.email, status: 'success' });
          } else {
            failureCount++;
            results.push({ email: recipient.email, status: 'failed', error: result.error });
          }

          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          failureCount++;
          results.push({ 
            email: recipient.email, 
            status: 'failed', 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }

      return {
        success: true,
        totalSent: successCount,
        totalFailed: failureCount,
        results
      };
    } catch (error) {
      console.error("Failed to send thank you emails:", error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
});

// Get email sending status
export const getEmailStatus = query({
  args: {},
  handler: async (ctx): Promise<{
    totalRegistrations: number;
    lastChecked: string;
  }> => {
    const registrations = await ctx.runQuery(api.unga.listRegistrations);
    return {
      totalRegistrations: registrations?.length || 0,
      lastChecked: new Date().toISOString()
    };
  }
});

// Get list of UNGA thank you email recipients
export const getUngaEmailRecipients = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    if (user.role !== "admin") {
      throw new Error("Only admins can view email recipients");
    }

    // Get all sent emails for UNGA thank you
    const emailLogs = await ctx.db.query("email_logs")
      .withIndex("byType", q => q.eq("type", "unga_thank_you"))
      .collect();

    // Get recipient details
    const recipients = await Promise.all(
      emailLogs.map(async (log) => {
        // Try to find the registration
        const registration = await ctx.db.query("unga_registrations")
          .filter(q => q.eq(q.field("email"), log.recipientEmail))
          .first();

        return {
          logId: log._id,
          email: log.recipientEmail,
          name: registration?.name || "Unknown",
          organization: registration?.org || "Unknown",
          sentAt: log.sentAt,
          status: log.status,
          error: log.error || null
        };
      })
    );

    // Sort by sent date (most recent first)
    recipients.sort((a, b) => (b.sentAt || 0) - (a.sentAt || 0));

    return {
      totalRecipients: recipients.length,
      recipients: recipients
    };
  }
});
