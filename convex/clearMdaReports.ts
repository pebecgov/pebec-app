import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { canonicalizeMdaName } from "../lib/mdaNameAliases";
import type { Id } from "./_generated/dataModel";

function normalizeKey(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/^[a-z0-9.&/ -]+ - /, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function namesMatch(target: string, candidate: string): boolean {
  const a = normalizeKey(canonicalizeMdaName(target));
  const b = normalizeKey(canonicalizeMdaName(candidate));
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  return false;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Recreate deleted NRS (or other MDA) submitted_reports from ingestion status rows.
 * Restores tracker Reports counts even if original file blobs are orphaned.
 */
export const restoreSubmittedReportsFromIngestion = internalMutation({
  args: {
    mdaName: v.string(),
  },
  returns: v.object({
    restored: v.number(),
    skippedExisting: v.number(),
    periods: v.array(v.string()),
    submittedBy: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const target = args.mdaName;

    // Prefer an NRS reform champion as submitter; fall back to any admin.
    const users = await ctx.db.query("users").collect();
    const champion =
      users.find(
        (user) =>
          user.role === "reform_champion" &&
          typeof user.mdaName === "string" &&
          namesMatch(target, user.mdaName)
      ) ||
      users.find((user) => user.role === "reform_champion") ||
      users.find((user) => user.role === "admin");

    if (!champion) {
      throw new Error("No user found to attribute restored submissions to");
    }

    const existingReports = await ctx.db.query("submitted_reports").collect();
    const existingPeriods = new Set(
      existingReports
        .filter((report) => report.mdaName && namesMatch(target, report.mdaName))
        .map((report) => `${report.reportPeriodYear}-${report.reportPeriodMonth}`)
    );

    const ingestionRows = await ctx.db.query("mda_report_ingestion_status").collect();
    const nrsRows = ingestionRows.filter((row) => namesMatch(target, row.mdaName));

    // Deduplicate by period (keep newest processedAt).
    const byPeriod = new Map<string, (typeof nrsRows)[number]>();
    for (const row of nrsRows) {
      const key = `${row.reportPeriodYear}-${row.reportPeriodMonth}`;
      const prev = byPeriod.get(key);
      if (!prev || (row.processedAt || 0) > (prev.processedAt || 0)) {
        byPeriod.set(key, row);
      }
    }

    let restored = 0;
    let skippedExisting = 0;
    const periods: string[] = [];

    for (const [periodKey, row] of byPeriod) {
      if (existingPeriods.has(periodKey)) {
        skippedExisting += 1;
        continue;
      }

      // If the old report id still exists, keep it.
      if (row.submittedReportId) {
        const stillThere = await ctx.db.get(row.submittedReportId);
        if (stillThere) {
          skippedExisting += 1;
          continue;
        }
      }

      const monthName = MONTHS[row.reportPeriodMonth] ?? `Month ${row.reportPeriodMonth}`;
      const fileName =
        row.processingMetadata &&
        typeof row.processingMetadata === "object" &&
        "fileName" in row.processingMetadata &&
        typeof row.processingMetadata.fileName === "string"
          ? row.processingMetadata.fileName
          : undefined;

      const newId = await ctx.db.insert("submitted_reports", {
        submittedBy: champion._id,
        role: "reform_champion",
        mdaName: row.mdaName,
        reportName: `BFA Report (${monthName} ${row.reportPeriodYear})`,
        fileName,
        reportPeriodMonth: row.reportPeriodMonth,
        reportPeriodYear: row.reportPeriodYear,
        submittedAt: row.processedAt || row.pendingStartedAt || Date.now(),
        isDraft: false,
      });

      // Point ingestion row at the restored report so processing links stay valid.
      await ctx.db.patch(row._id, {
        submittedReportId: newId as Id<"submitted_reports">,
      });

      restored += 1;
      periods.push(
        `${monthName} ${row.reportPeriodYear}${fileName ? ` (${fileName})` : ""}`
      );
    }

    return {
      restored,
      skippedExisting,
      periods,
      submittedBy:
        champion.email ||
        [champion.firstName, champion.lastName].filter(Boolean).join(" ") ||
        String(champion._id),
    };
  },
});

/**
 * Clears ONLY BFA Monthly Report Submission scoring rows for an MDA.
 * Does NOT touch submitted_reports (real uploads) or any other metric.
 */
export const clearMonthlyReportSubmissionScores = internalMutation({
  args: {
    mdaName: v.string(),
    scoringPeriod: v.optional(v.string()),
  },
  returns: v.object({
    deletedScoreRows: v.number(),
    matchedPeriods: v.array(v.string()),
    matchedNames: v.array(v.string()),
    submittedReportsLeftUntouched: v.number(),
  }),
  handler: async (ctx, args) => {
    const target = args.mdaName;
    const matchedNames = new Set<string>();
    const matchedPeriods: string[] = [];

    const scoreRows = await ctx.db.query("mda_monthly_report_data").collect();
    let deletedScoreRows = 0;
    for (const row of scoreRows) {
      if (!namesMatch(target, row.mdaName)) continue;
      if (args.scoringPeriod && row.scoringPeriod !== args.scoringPeriod) continue;
      matchedNames.add(row.mdaName);
      matchedPeriods.push(row.scoringPeriod);
      await ctx.db.delete(row._id);
      deletedScoreRows += 1;
    }

    // Count real submissions still present (sanity check — we never delete these here).
    const submissions = await ctx.db.query("submitted_reports").collect();
    const submittedReportsLeftUntouched = submissions.filter(
      (report) => report.mdaName && namesMatch(target, report.mdaName)
    ).length;

    return {
      deletedScoreRows,
      matchedPeriods,
      matchedNames: Array.from(matchedNames),
      submittedReportsLeftUntouched,
    };
  },
});
