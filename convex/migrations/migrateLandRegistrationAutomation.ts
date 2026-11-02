import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getSubIndicatorScore } from "../config/indicators";

/**
 * Collapses land-registration automation into one dropdown:
 *   full_automation (7) / semi_automation (5) / document_downloads (2) / none (0)
 * plus Availability of GIS (yes/no 3).
 *
 * Merges legacy split columns (full_automation / semi_automation / document_downloads
 * as yes/no) into the highest tier on `automated`, then deletes the split rows.
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
    let automatedUpserted = 0;
    let splitDeleted = 0;
    let unchanged = 0;
    const samples: string[] = [];

    const mapGis = (value: string): string => {
      if (value === "yes" || value === "no") return value;
      if (value === "excellent" || value === "good" || value === "fair") return "yes";
      if (value === "none") return "no";
      return value;
    };

    const mapAutomatedValue = (value: string): string => {
      if (
        value === "full_automation" ||
        value === "semi_automation" ||
        value === "document_downloads" ||
        value === "none"
      ) {
        return value;
      }
      if (value === "yes" || value === "fully-automated") return "full_automation";
      if (value === "hybrid") return "semi_automation";
      if (value === "no" || value === "manual") return "none";
      return value;
    };

    const highestFromSplit = (
      full?: Row,
      semi?: Row,
      doc?: Row
    ): "full_automation" | "semi_automation" | "document_downloads" | "none" => {
      if (full?.value === "yes") return "full_automation";
      if (semi?.value === "yes") return "semi_automation";
      if (doc?.value === "yes") return "document_downloads";
      return "none";
    };

    for (const [, group] of byStateYear) {
      const assessmentYear = group[0]?.year ?? new Date().getFullYear();
      const state = group[0]!.state;
      const yearValue = group[0]!.year;

      const gis = group.find((r) => r.subIndicator === "gis");
      const automated = group.find((r) => r.subIndicator === "automated");
      const full = group.find((r) => r.subIndicator === "full_automation");
      const semi = group.find((r) => r.subIndicator === "semi_automation");
      const doc = group.find((r) => r.subIndicator === "document_downloads");

      if (gis) {
        const nextValue = mapGis(gis.value ?? "");
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

      const hasSplit = !!(full || semi || doc);
      let nextAutomated = automated
        ? mapAutomatedValue(automated.value ?? "")
        : "none";
      if (hasSplit) {
        const fromSplit = highestFromSplit(full, semi, doc);
        // Prefer higher of existing automated vs split columns.
        const rank = (v: string) =>
          v === "full_automation" ? 3 : v === "semi_automation" ? 2 : v === "document_downloads" ? 1 : 0;
        nextAutomated = rank(fromSplit) >= rank(nextAutomated) ? fromSplit : nextAutomated;
      }

      if (hasSplit || automated) {
        const nextScore = getSubIndicatorScore(
          "digitalizing_land_registration",
          "automated",
          nextAutomated,
          assessmentYear
        );
        const link =
          automated?.linkToSource ||
          full?.linkToSource ||
          semi?.linkToSource ||
          doc?.linkToSource;

        if (automated) {
          if (
            automated.value !== nextAutomated ||
            Number(automated.score) !== nextScore
          ) {
            if (samples.length < 40) {
              samples.push(
                `${state} (${assessmentYear}) automated: ${automated.value}/${automated.score} → ${nextAutomated}/${nextScore}`
              );
            }
            if (!dry) {
              await ctx.db.patch(automated._id, {
                value: nextAutomated,
                score: nextScore,
                ...(link ? { linkToSource: link } : {}),
              });
            }
            automatedUpserted += 1;
          } else {
            unchanged += 1;
          }
        } else if (hasSplit) {
          if (samples.length < 40) {
            samples.push(
              `${state} (${assessmentYear}) automated: (create) ${nextAutomated}/${nextScore}`
            );
          }
          if (!dry) {
            await ctx.db.insert("state_scores", {
              state,
              indicator: "digitalizing_land_registration",
              subIndicator: "automated",
              value: nextAutomated,
              score: nextScore,
              linkToSource: link,
              year: yearValue,
              createdAt: Date.now(),
            });
          }
          automatedUpserted += 1;
        }
      }

      for (const legacy of [full, semi, doc]) {
        if (!legacy) continue;
        if (!dry) {
          await ctx.db.delete(legacy._id);
        }
        splitDeleted += 1;
      }
    }

    return {
      dryRun: dry,
      year: year ?? "all",
      statesTouched: byStateYear.size,
      gisUpdated,
      automatedUpserted,
      splitDeleted,
      unchanged,
      samples,
      message: dry
        ? "Dry run only — re-run without dryRun to apply."
        : "Land registration automation collapsed to one dropdown.",
    };
  },
});
