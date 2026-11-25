import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getSubIndicatorScore } from "../config/indicators";

/**
 * Align stored electricity scores with the spreadsheet model:
 *   Law (Transfer Order) 3 + Agency 3 + Licence 1 + Generation 4 + Transmission 5
 *
 * - Merges old Law (2) + NERC transfer request (2) into Law / Transfer Order (3)
 * - Bumps Agency yes from 2 → 3
 * - Deletes obsolete nerc_transfer_request rows
 * - Remaps metric_justifications keys for the removed sub-indicator
 *
 * Law mapping (preserve credit):
 *   issued if old nerc_transfer_request === "yes" OR old state_electricity_law === "yes"
 *
 * CLI:
 *   npx convex run migrations/migrateElectricityToSpreadsheetModel:migrateElectricityToSpreadsheetModel '{"dryRun":true}'
 *   npx convex run migrations/migrateElectricityToSpreadsheetModel:migrateElectricityToSpreadsheetModel '{}'
 */
export const migrateElectricityToSpreadsheetModel = mutation({
  args: {
    year: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { year, dryRun }) => {
    const dry = !!dryRun;
    const allScores = await ctx.db.query("state_scores").collect();
    const electricityRows = allScores.filter((row) => {
      if (row.indicator !== "electricity") return false;
      if (year != null && row.year !== year) return false;
      return true;
    });

    type Row = (typeof electricityRows)[number];
    const byStateYear = new Map<string, Row[]>();
    for (const row of electricityRows) {
      const key = `${row.state}::${row.year ?? "none"}`;
      const list = byStateYear.get(key) ?? [];
      list.push(row);
      byStateYear.set(key, list);
    }

    let lawUpdated = 0;
    let lawCreated = 0;
    let agencyUpdated = 0;
    let nercDeleted = 0;
    let unchanged = 0;
    const samples: string[] = [];

    for (const [, rows] of byStateYear) {
      const assessmentYear = rows[0]?.year ?? new Date().getFullYear();
      const law = rows.find((r) => r.subIndicator === "state_electricity_law");
      const nerc = rows.find((r) => r.subIndicator === "nerc_transfer_request");
      const agency = rows.find(
        (r) => r.subIndicator === "electricity_regulatory_commission"
      );

      const hadTransfer = nerc?.value === "yes";
      const hadLaw =
        law?.value === "yes" || law?.value === "transfer_order_issued";
      const issued = hadTransfer || hadLaw;
      const newLawValue = issued ? "transfer_order_issued" : "no_transfer_order";
      const newLawScore = getSubIndicatorScore(
        "electricity",
        "state_electricity_law",
        newLawValue,
        assessmentYear
      );
      const mergedLink =
        (hadTransfer ? nerc?.linkToSource : undefined) ||
        law?.linkToSource ||
        nerc?.linkToSource;

      if (law) {
        const needsPatch =
          law.value !== newLawValue ||
          Number(law.score) !== newLawScore ||
          (mergedLink && law.linkToSource !== mergedLink);
        if (needsPatch) {
          if (samples.length < 30) {
            samples.push(
              `${law.state} (${assessmentYear}) Law: ${law.value}/${law.score} → ${newLawValue}/${newLawScore}`
            );
          }
          if (!dry) {
            await ctx.db.patch(law._id, {
              value: newLawValue,
              score: newLawScore,
              ...(mergedLink ? { linkToSource: mergedLink } : {}),
            });
          }
          lawUpdated += 1;
        } else {
          unchanged += 1;
        }
      } else if (nerc || issued) {
        // Only NERC existed — create Law row from it.
        if (samples.length < 30) {
          samples.push(
            `${rows[0].state} (${assessmentYear}) Law: (create) ${newLawValue}/${newLawScore}`
          );
        }
        if (!dry) {
          await ctx.db.insert("state_scores", {
            state: rows[0].state,
            indicator: "electricity",
            subIndicator: "state_electricity_law",
            value: newLawValue,
            score: newLawScore,
            linkToSource: mergedLink,
            year: rows[0].year,
            createdAt: Date.now(),
          });
        }
        lawCreated += 1;
      }

      if (agency) {
        const agencyScore = getSubIndicatorScore(
          "electricity",
          "electricity_regulatory_commission",
          agency.value ?? "",
          assessmentYear
        );
        if (Number(agency.score) !== agencyScore) {
          if (samples.length < 30) {
            samples.push(
              `${agency.state} (${assessmentYear}) Agency: ${agency.score} → ${agencyScore}`
            );
          }
          if (!dry) {
            await ctx.db.patch(agency._id, { score: agencyScore });
          }
          agencyUpdated += 1;
        }
      }

      if (nerc) {
        if (!dry) {
          await ctx.db.delete(nerc._id);
        }
        nercDeleted += 1;
      }
    }

    // Drop / remap justifications for removed NERC transfer sub-indicator.
    let justificationsUpdated = 0;
    const justifications = await ctx.db.query("metric_justifications").collect();
    for (const row of justifications) {
      if (row.metricKey !== "electricity:nerc_transfer_request") continue;
      const existingLaw = justifications.find(
        (j) => j.metricKey === "electricity:state_electricity_law"
      );
      if (!dry) {
        if (!existingLaw && row.justification) {
          await ctx.db.patch(row._id, {
            metricKey: "electricity:state_electricity_law",
          });
        } else {
          await ctx.db.delete(row._id);
        }
      }
      justificationsUpdated += 1;
    }

    // Rescore remaining electricity rows (licence/gen/trans unchanged; agency/law already patched).
    let rescored = 0;
    for (const row of electricityRows) {
      if (row.subIndicator === "nerc_transfer_request") continue;
      if (row.subIndicator === "state_electricity_law") continue;
      if (row.subIndicator === "electricity_regulatory_commission") continue;
      const computed = getSubIndicatorScore(
        row.indicator,
        row.subIndicator,
        row.value ?? "",
        row.year ?? new Date().getFullYear()
      );
      if (Number(row.score) === computed) continue;
      if (!dry) {
        await ctx.db.patch(row._id, { score: computed });
      }
      rescored += 1;
    }

    return {
      dryRun: dry,
      year: year ?? "all",
      statesTouched: byStateYear.size,
      lawUpdated,
      lawCreated,
      agencyUpdated,
      nercDeleted,
      justificationsUpdated,
      rescored,
      unchanged,
      samples,
      message: dry
        ? "Dry run only — re-run without dryRun to apply."
        : "Electricity spreadsheet model migration applied.",
    };
  },
});
