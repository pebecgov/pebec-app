import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getSubIndicatorScore } from "../config/indicators";

/**
 * Remaps digitalizing_land_registration to spreadsheet columns:
 *   gis (Availability of GIS)
 *   full_automation (7)
 *   semi_automation (5)
 *   document_downloads (2)
 *
 * Legacy `automated` rows are expanded into the three YES/NO columns, then deleted.
 *
 * CLI:
 *   npx convex run migrations/migrateLandRegistrationAutomation:migrateLandRegistrationAutomation '{"dryRun":true,"year":2026}'
 *   npx convex run migrations/migrateLandRegistrationAutomation:migrateLandRegistrationAutomation '{"year":2026}'
 */
export const migrateLandRegistrationAutomation = mutation({
  args: {
    year: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, { year, dryRun }) => {
    const dry = !!dryRun;
    const rows = await ctx.db
      .query("state_scores")
      .withIndex("byIndicator", (q) =>
        q.eq("indicator", "digitalizing_land_registration"),
      )
      .collect();

    const scoped = rows.filter((row) => (year == null ? true : row.year === year));

    type Row = (typeof scoped)[number];
    const byStateYear = new Map<string, Row[]>();
    for (const row of scoped) {
      const key = `${row.state}::${row.year ?? "none"}`;
      const list = byStateYear.get(key) ?? [];
      list.push(row);
      byStateYear.set(key, list);
    }

    let gisUpdated = 0;
    let automationCreated = 0;
    let automatedDeleted = 0;
    let unchanged = 0;
    const samples: string[] = [];

    const mapGisValue = (value: string): string => {
      if (value === "yes" || value === "no") return value;
      if (value === "excellent" || value === "good" || value === "fair") return "yes";
      if (value === "none") return "no";
      return value;
    };

    const automationFromLegacy = (
      value: string
    ): {
      full: "yes" | "no";
      semi: "yes" | "no";
      doc: "yes" | "no";
    } => {
      if (value === "yes" || value === "fully-automated" || value === "full_automation") {
        return { full: "yes", semi: "no", doc: "no" };
      }
      if (value === "hybrid" || value === "semi_automation") {
        return { full: "no", semi: "yes", doc: "no" };
      }
      if (value === "document_downloads") {
        return { full: "no", semi: "no", doc: "yes" };
      }
      return { full: "no", semi: "no", doc: "no" };
    };

    for (const [, group] of byStateYear) {
      const assessmentYear = group[0]?.year ?? new Date().getFullYear();
      const state = group[0]!.state;
      const yearValue = group[0]!.year;

      const gis = group.find((r) => r.subIndicator === "gis");
      const automated = group.find((r) => r.subIndicator === "automated");
      const existingFull = group.find((r) => r.subIndicator === "full_automation");
      const existingSemi = group.find((r) => r.subIndicator === "semi_automation");
      const existingDoc = group.find((r) => r.subIndicator === "document_downloads");

      if (gis) {
        const nextValue = mapGisValue(gis.value ?? "");
        const nextScore = getSubIndicatorScore(
          "digitalizing_land_registration",
          "gis",
          nextValue,
          assessmentYear
        );
        if (nextValue !== (gis.value ?? "") || Number(gis.score) !== nextScore) {
          if (samples.length < 40) {
            samples.push(
              `${state} (${assessmentYear}) gis: ${gis.value}/${gis.score} → ${nextValue}/${nextScore}`
            );
          }
          if (!dry) {
            await ctx.db.patch(gis._id, { value: nextValue, score: nextScore });
          }
          gisUpdated += 1;
        } else {
          unchanged += 1;
        }
      }

      // Prefer already-split columns; otherwise expand legacy `automated`.
      if (!existingFull && !existingSemi && !existingDoc && automated) {
        const mapped = automationFromLegacy(automated.value ?? "");
        const specs: Array<{
          key: "full_automation" | "semi_automation" | "document_downloads";
          value: "yes" | "no";
        }> = [
          { key: "full_automation", value: mapped.full },
          { key: "semi_automation", value: mapped.semi },
          { key: "document_downloads", value: mapped.doc },
        ];
        for (const spec of specs) {
          const score = getSubIndicatorScore(
            "digitalizing_land_registration",
            spec.key,
            spec.value,
            assessmentYear
          );
          if (samples.length < 40) {
            samples.push(
              `${state} (${assessmentYear}) ${spec.key}: (create) ${spec.value}/${score}`
            );
          }
          if (!dry) {
            await ctx.db.insert("state_scores", {
              state,
              indicator: "digitalizing_land_registration",
              subIndicator: spec.key,
              value: spec.value,
              score,
              linkToSource: automated.linkToSource,
              year: yearValue,
              createdAt: Date.now(),
            });
          }
          automationCreated += 1;
        }
        if (!dry) {
          await ctx.db.delete(automated._id);
        }
        automatedDeleted += 1;
      } else if (automated) {
        // Split columns already exist — drop legacy automated to avoid confusion.
        if (!dry) {
          await ctx.db.delete(automated._id);
        }
        automatedDeleted += 1;
      } else {
        // Rescore any existing split columns from their values.
        for (const row of [existingFull, existingSemi, existingDoc]) {
          if (!row) continue;
          const computed = getSubIndicatorScore(
            "digitalizing_land_registration",
            row.subIndicator,
            row.value ?? "",
            assessmentYear
          );
          if (Number(row.score) === computed) {
            unchanged += 1;
            continue;
          }
          if (!dry) {
            await ctx.db.patch(row._id, { score: computed });
          }
          automationCreated += 1;
        }
      }
    }

    return {
      dryRun: dry,
      year: year ?? "all",
      statesTouched: byStateYear.size,
      gisUpdated,
      automationCreated,
      automatedDeleted,
      unchanged,
      samples,
      message: dry
        ? "Dry run only — re-run without dryRun to apply."
        : "Land registration spreadsheet columns migration applied.",
    };
  },
});
