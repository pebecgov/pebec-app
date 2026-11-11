import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import {
  filterAdminsForNotifications,
  isEmailNotificationBlacklisted,
} from "../users";
import { mdaNamesMatch } from "../lib/resolveMda";

const LANG_LABEL: Record<string, string> = {
  en: "English",
  ha: "Hausa",
  ig: "Igbo",
  yo: "Yoruba",
};

export const getTicketForTranslate = internalQuery({
  args: {
    ticketId: v.id("tickets"),
  },
  returns: v.union(
    v.object({
      title: v.string(),
      description: v.string(),
      citizenLanguage: v.optional(
        v.union(
          v.literal("en"),
          v.literal("ha"),
          v.literal("ig"),
          v.literal("yo"),
        ),
      ),
      titleEn: v.optional(v.string()),
      descriptionEn: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, { ticketId }) => {
    const ticket = await ctx.db.get(ticketId);
    if (!ticket) return null;
    return {
      title: ticket.title,
      description: ticket.description,
      citizenLanguage: ticket.citizenLanguage,
      titleEn: ticket.titleEn,
      descriptionEn: ticket.descriptionEn,
    };
  },
});

export const patchTicketTranslations = internalMutation({
  args: {
    ticketId: v.id("tickets"),
    titleEn: v.string(),
    descriptionEn: v.string(),
    /** Optional citizen-language overwrite when draft was stored in English. */
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    sendStaffEmail: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) return null;

    await ctx.db.patch(args.ticketId, {
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.description !== undefined
        ? { description: args.description }
        : {}),
      titleEn: args.titleEn,
      descriptionEn: args.descriptionEn,
      updatedAt: Date.now(),
    });

    if (!args.sendStaffEmail || ticket.source !== "whatsapp") {
      return null;
    }

    const mdaRecord = ticket.assignedMDA
      ? await ctx.db.get(ticket.assignedMDA)
      : null;
    const assignedLabel =
      mdaRecord?.name ?? "Unassigned";
    const needsAiReview = ticket.aiStatus === "needs_review";
    const incidentLabel = ticket.incidentDate
      ? new Date(ticket.incidentDate).toLocaleDateString("en-NG")
      : "";
    const langLabel =
      LANG_LABEL[ticket.citizenLanguage ?? "en"] ?? "English";
    const reviewBanner = needsAiReview
      ? `<p style="color:#b71c1c;"><strong>AI flagged for human review</strong> (status: ${ticket.aiStatus ?? "needs_review"}, confidence: ${ticket.aiConfidence ?? "n/a"}).</p>`
      : "";
    const originalTitle = args.title ?? ticket.title;
    const originalDescription = args.description ?? ticket.description;
    const originalBlock =
      ticket.citizenLanguage && ticket.citizenLanguage !== "en"
        ? `<p><strong>Citizen language:</strong> ${langLabel}</p>
            <p><strong>Original title:</strong> ${originalTitle}</p>
            <p><strong>Original description:</strong> ${originalDescription}</p>`
        : "";

    const adminHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <div style="background-color: #FF9800; padding: 15px; text-align: center; color: white; font-size: 20px; border-radius: 8px 8px 0 0;">
            <strong>${needsAiReview ? "WhatsApp AI — Review Required" : "New WhatsApp Report Created"}</strong>
          </div>
          <div style="padding: 20px; color: #333;">
            <p>A new report was submitted via WhatsApp.</p>
            ${reviewBanner}
            <p><strong>Report Number:</strong> ${ticket.ticketNumber}</p>
            <p><strong>Title (English):</strong> ${args.titleEn}</p>
            <p><strong>Description (English):</strong> ${args.descriptionEn}</p>
            ${originalBlock}
            <p><strong>MDA:</strong> ${assignedLabel}</p>
            <p><strong>Location:</strong> ${ticket.state ?? ""}</p>
            <p><strong>Incident Date:</strong> ${incidentLabel}</p>
            <p><strong>Phone:</strong> ${ticket.phoneNumber}</p>
            <p>Please review this ticket in the ReportGov dashboard.</p>
          </div>
        </div>
      `;
    const mdaHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <div style="background-color: #007bff; padding: 15px; text-align: center; color: white; font-size: 20px; border-radius: 8px 8px 0 0;">
            <strong>New Report Assigned to Your MDA</strong>
          </div>
          <div style="padding: 20px; color: #333;">
            <p>A new WhatsApp report has been assigned to ${assignedLabel}.</p>
            <p><strong>Report Number:</strong> ${ticket.ticketNumber}</p>
            <p><strong>Title (English):</strong> ${args.titleEn}</p>
            <p><strong>Description (English):</strong> ${args.descriptionEn}</p>
            ${originalBlock}
            <p><strong>Location:</strong> ${ticket.state ?? ""}</p>
            <p>Please log in to your dashboard to manage this report.</p>
          </div>
        </div>
      `;

    const allAdmins = await ctx.db
      .query("users")
      .withIndex("byRole", (q) => q.eq("role", "admin"))
      .collect();
    const admins = filterAdminsForNotifications(allAdmins);
    const emailed = new Set<string>();
    const queueEmail = async (to: string | undefined, subject: string, html: string) => {
      if (!to || isEmailNotificationBlacklisted(to) || emailed.has(to.toLowerCase())) {
        return;
      }
      emailed.add(to.toLowerCase());
      await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
        to,
        subject,
        html,
      });
    };

    for (const admin of admins) {
      await queueEmail(
        admin.email,
        needsAiReview
          ? `WhatsApp AI Review Required - ${ticket.ticketNumber}`
          : `New Ticket Created - ${ticket.ticketNumber}`,
        adminHtml,
      );
    }
    if (mdaRecord?.email) {
      await queueEmail(
        mdaRecord.email,
        `New Ticket Assigned to ${assignedLabel}`,
        mdaHtml,
      );
    }
    const assignedMDAId = ticket.assignedMDA;
    const mdaRoleUsers = (
      await ctx.db
        .query("users")
        .withIndex("byRole", (q) => q.eq("role", "mda"))
        .take(500)
    ).filter(
      (mdaUser) =>
        (assignedMDAId && mdaUser.mdaId === assignedMDAId) ||
        (mdaUser.mdaName &&
          (mdaNamesMatch(mdaUser.mdaName, assignedLabel) ||
            mdaNamesMatch(mdaUser.mdaName, assignedLabel))),
    );
    for (const mdaUser of mdaRoleUsers) {
      await queueEmail(
        mdaUser.email,
        `New Ticket Assigned to ${assignedLabel}`,
        mdaHtml,
      );
    }

    return null;
  },
});
