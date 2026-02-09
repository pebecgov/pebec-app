// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Existing cron jobs
crons.cron("dailyOrphanCleanup", "55 21 * * *", internal.cleanup.orphanUsersAndMdas);
crons.cron("monthlyAccessCodeGenerator", "0 1 1 * *", internal.users.generateMonthlyAccessCodeInternal);

// SABER deadline reminder processing - runs daily at 9:00 AM Nigeria time (8:00 AM UTC)
crons.cron("dailySaberReminderCheck", "0 8 * * *", internal.saber_deadlines.processPendingRemindersInternal);

// Overdue ticket reminders for report gov agents - runs daily at 10:00 AM Nigeria time (9:00 AM UTC)
crons.cron("dailyOverdueTicketReminders", "0 9 * * *", internal.tickets.processOverdueTicketRemindersInternal);

export default crons;