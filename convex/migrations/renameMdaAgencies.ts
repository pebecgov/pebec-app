import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { canonicalizeMdaName } from "../../lib/mdaNameAliases";

const MDA_NAME_TABLES = [
  "mda_scoring_history",
  "mda_scorecard_entries",
  "saved_others_data",
  "saved_penalties_data",
  "mda_metric_exclusions",
  "mda_monthly_reports",
  "report_templates",
  "submitted_reports",
  "mda_sla_data",
  "mda_reportgov_data",
  "mda_mystery_shopping_data",
  "mda_controversial_data",
  "mda_innovation_data",
  "mda_stakeholder_data",
  "mda_transparency_data",
  "mda_monthly_report_data",
  "mda_timeliness_data",
  "mda_touting_rentseeking_data",
] as const;

function needsRename(name: string | undefined): name is string {
  if (!name) return false;
  return canonicalizeMdaName(name) !== name;
}

export const renameFirsAndJtb = mutation({
  args: {},
  returns: v.object({
    mdasRenamed: v.number(),
    mdasMerged: v.number(),
    recordsPatched: v.number(),
    usersPatched: v.number(),
  }),
  handler: async (ctx) => {
    let mdasRenamed = 0;
    let mdasMerged = 0;
    let recordsPatched = 0;
    let usersPatched = 0;

    const mdas = await ctx.db.query("mdas").collect();
    for (const mda of mdas) {
      const canonical = canonicalizeMdaName(mda.name);
      if (canonical === mda.name) continue;

      const existingCanonical = await ctx.db
        .query("mdas")
        .withIndex("byName", (q) => q.eq("name", canonical))
        .first();

      if (existingCanonical && existingCanonical._id !== mda._id) {
        const mergedUsers = [...new Set([...existingCanonical.assignedUsers, ...mda.assignedUsers])];
        await ctx.db.patch(existingCanonical._id, { assignedUsers: mergedUsers });
        await ctx.db.delete(mda._id);
        mdasMerged += 1;
      } else {
        await ctx.db.patch(mda._id, { name: canonical });
        mdasRenamed += 1;
      }
    }

    for (const table of MDA_NAME_TABLES) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        const currentName = "mdaName" in doc ? doc.mdaName : undefined;
        if (!needsRename(currentName)) continue;
        await ctx.db.patch(doc._id, { mdaName: canonicalizeMdaName(currentName) });
        recordsPatched += 1;
      }
    }

    const users = await ctx.db.query("users").collect();
    for (const user of users) {
      const patch: {
        mdaName?: string;
        roleRequest?: typeof user.roleRequest;
        roleApprovalHistory?: typeof user.roleApprovalHistory;
      } = {};

      if (needsRename(user.mdaName)) {
        patch.mdaName = canonicalizeMdaName(user.mdaName);
      }

      if (user.roleRequest && needsRename(user.roleRequest.mdaName)) {
        patch.roleRequest = {
          ...user.roleRequest,
          mdaName: canonicalizeMdaName(user.roleRequest.mdaName),
        };
      }

      if (user.roleApprovalHistory?.some((entry) => needsRename(entry.mdaName))) {
        patch.roleApprovalHistory = user.roleApprovalHistory.map((entry) =>
          needsRename(entry.mdaName)
            ? { ...entry, mdaName: canonicalizeMdaName(entry.mdaName) }
            : entry
        );
      }

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(user._id, patch);
        usersPatched += 1;
      }
    }

    return { mdasRenamed, mdasMerged, recordsPatched, usersPatched };
  },
});
