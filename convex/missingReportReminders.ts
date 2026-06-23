// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { api } from "./_generated/api";
import { getCurrentUserOrThrow } from "./users";
import {
  computeMdaSubmissionMatrix,
  formatMonthLabel,
  getMissingSubmissionsByMda,
  mdaNamesMatch,
  monthValueToParts,
} from "../lib/mdaSubmissionMatrix";

const BATCH_SIZE = 15;
const BATCH_DELAY_MS = 2000;

type ReminderRecipient = {
  email: string;
  fullName: string;
  mdaName: string;
  missingMonthLabels: string[];
};

function buildMissingReportReminderEmail({
  fullName,
  mdaName,
  missingMonthLabels,
  rangeLabel,
}: {
  fullName: string;
  mdaName: string;
  missingMonthLabels: string[];
  rangeLabel: string;
}) {
  const monthsHtml = missingMonthLabels
    .map((month) => `<li style="margin: 4px 0;">${month}</li>`)
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <div style="background-color: #dc2626; padding: 15px; text-align: center; color: white; font-size: 20px; border-radius: 8px 8px 0 0;">
        <strong>Monthly Report Reminder</strong>
      </div>
      <div style="padding: 20px; color: #333;">
        <p style="font-size: 16px;">Dear <strong>${fullName}</strong>,</p>
        <p>This is a reminder from PEBEC regarding monthly report submissions for <strong>${mdaName}</strong>.</p>
        <p>Our records show that the following compliance report(s) for the period of <strong>${rangeLabel}</strong> have not been submitted yet:</p>
        <ul style="padding-left: 20px; margin: 16px 0;">${monthsHtml}</ul>
        <p>Please log in to your Reform Champion dashboard and upload the missing compliance report(s) as soon as possible.</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="https://www.pebec.gov.ng/reform_champion/reports"
             style="display: inline-block; padding: 12px 20px; background-color: #2D8B10; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Go to Reform Champion Dashboard
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">If you have already submitted, please disregard this message.</p>
      </div>
      <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
        <p>© ${new Date().getFullYear()} PEBEC Secretariat. | <a href="https://www.pebec.gov.ng" style="color: #2D8B10; text-decoration: none;">Visit Website</a></p>
      </div>
    </div>
  `;
}

async function assertAdmin(ctx: QueryCtx) {
  const user = await getCurrentUserOrThrow(ctx);
  if (user.role !== "admin") {
    throw new Error("Unauthorized: Only admins can send report reminders.");
  }
  return user;
}

async function loadReminderRecipients(
  ctx: QueryCtx,
  fromMonthValue: string,
  toMonthValue: string
): Promise<{ recipients: ReminderRecipient[]; rangeLabel: string; missingSlotCount: number }> {
  const fromParts = monthValueToParts(fromMonthValue);
  const toParts = monthValueToParts(toMonthValue);
  if (!fromParts || !toParts) {
    throw new Error("Invalid month range.");
  }

  const fromMs = new Date(fromParts.year, fromParts.monthIndex, 1).getTime();
  const toMs = new Date(toParts.year, toParts.monthIndex, 1).getTime();
  if (fromMs > toMs) {
    throw new Error("From month must be before or equal to To month.");
  }

  const submittedReports = await ctx.db.query("submitted_reports").collect();
  const matrix = computeMdaSubmissionMatrix(submittedReports, fromMonthValue, toMonthValue);
  const missingByMda = getMissingSubmissionsByMda(matrix);

  const reformChampions = await ctx.db
    .query("users")
    .withIndex("byRole", (q) => q.eq("role", "reform_champion"))
    .collect();

  const recipients: ReminderRecipient[] = [];
  let missingSlotCount = 0;

  for (const { mdaName, missingMonthLabels } of missingByMda) {
    missingSlotCount += missingMonthLabels.length;

    const champions = reformChampions.filter(
      (champion) => champion.mdaName && champion.email && mdaNamesMatch(champion.mdaName, mdaName)
    );

    for (const champion of champions) {
      const fullName = `${champion.firstName?.trim() ?? ""} ${champion.lastName?.trim() ?? ""}`.trim() || "Reform Champion";
      recipients.push({
        email: champion.email,
        fullName,
        mdaName,
        missingMonthLabels,
      });
    }
  }

  const rangeLabel = `${formatMonthLabel(fromParts.year, fromParts.monthIndex)} – ${formatMonthLabel(toParts.year, toParts.monthIndex)}`;

  return { recipients, rangeLabel, missingSlotCount };
}

export const previewMissingReportReminders = query({
  args: {
    fromMonthValue: v.string(),
    toMonthValue: v.string(),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    const { recipients, rangeLabel, missingSlotCount } = await loadReminderRecipients(
      ctx,
      args.fromMonthValue,
      args.toMonthValue
    );

    return {
      recipientCount: recipients.length,
      missingSlotCount,
      rangeLabel,
      preview: recipients.slice(0, 10).map((r) => ({
        email: r.email,
        mdaName: r.mdaName,
        missingMonths: r.missingMonthLabels,
      })),
    };
  },
});

export const startMissingReportReminders = mutation({
  args: {
    fromMonthValue: v.string(),
    toMonthValue: v.string(),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    const { recipients, rangeLabel, missingSlotCount } = await loadReminderRecipients(
      ctx,
      args.fromMonthValue,
      args.toMonthValue
    );

    if (recipients.length === 0) {
      return {
        success: false,
        reason: "no_recipients",
        recipientCount: 0,
        missingSlotCount,
        totalBatches: 0,
      };
    }

    const totalBatches = Math.ceil(recipients.length / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * BATCH_SIZE;
      const batch = recipients.slice(start, start + BATCH_SIZE);

      await ctx.scheduler.runAfter(batchIndex * BATCH_DELAY_MS, api.missingReportReminders.processMissingReportReminderBatch, {
        recipients: batch,
        rangeLabel,
        batchIndex: batchIndex + 1,
        totalBatches,
      });
    }

    console.log(
      `Queued ${recipients.length} missing-report reminder emails in ${totalBatches} batch(es) for ${rangeLabel}`
    );

    return {
      success: true,
      recipientCount: recipients.length,
      missingSlotCount,
      totalBatches,
      rangeLabel,
    };
  },
});

export const processMissingReportReminderBatch = mutation({
  args: {
    recipients: v.array(
      v.object({
        email: v.string(),
        fullName: v.string(),
        mdaName: v.string(),
        missingMonthLabels: v.array(v.string()),
      })
    ),
    rangeLabel: v.string(),
    batchIndex: v.number(),
    totalBatches: v.number(),
  },
  handler: async (ctx, args) => {
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of args.recipients) {
      try {
        await ctx.scheduler.runAfter(0, api.email.sendEmail, {
          to: recipient.email,
          subject: `PEBEC Reminder: Missing Monthly Report for ${recipient.mdaName}`,
          html: buildMissingReportReminderEmail({
            fullName: recipient.fullName,
            mdaName: recipient.mdaName,
            missingMonthLabels: recipient.missingMonthLabels,
            rangeLabel: args.rangeLabel,
          }),
        });
        sentCount++;
      } catch (error) {
        failedCount++;
        console.error(`Failed to queue reminder for ${recipient.email}:`, error);
      }
    }

    console.log(
      `Missing-report reminder batch ${args.batchIndex}/${args.totalBatches}: ${sentCount} queued, ${failedCount} failed`
    );

    return { sentCount, failedCount };
  },
});
