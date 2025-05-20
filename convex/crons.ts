import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.cron(
  "dailyOrphanCleanup",
  "55 21 * * *", // Runs daily at 00:41 Romania time (EEST = UTC+3)
  internal.cleanup.orphanUsersAndMdas
);


crons.cron(
  "monthlyAccessCodeGenerator",
  "0 1 1 * *", // 01:00 UTC on the 1st day of every month
  internal.users.generateMonthlyAccessCodeInternal
);

export default crons;
