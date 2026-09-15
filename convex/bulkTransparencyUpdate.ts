import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users";
import { logAuditEvent } from "./utils/auditLog";

// MDAs that have Activity 1.8 (SLA Publication) at 100% - should get 5 points for Transparency
const MDAS_WITH_100_PERCENT_SLA_PUBLICATION = [
  "Corporate Affairs Commission",
  "Central Bank of Nigeria – National Collateral Agency", // CBN in your list
  "Environmental Health Council of Nigeria",
  "Federal Airports Authority of Nigeria",
  "Federal Road Safety Corps",
  "Galaxy Backbone Limited",
  "Industrial Training Fund",
  "National Insurance Commission",
  "Nigerian Airspace Management Agency",
  "Nigeria Agricultural Quarantine Service",
  "National Bureau of Statistics",
  "Nigeria Civil Aviation Authority", 
  "Nigerian Communications Commission",
  "Nigerian Content Development and Monitoring Board",
  "Nigeria Customs Service",
  "National Drug Law Enforcement Agency",
  "Nigerian Electricity Management Service Agency",
  "Nigeria Export Promotion Council",
  "Nigeria Export Processing Zone Authority",
  "National Environmental Standards and Regulations Enforcement Agency",
  "Nigerian Export-Import Bank",
  "Nigerian Maritime Administration and Safety Agency",
  "National Identity Management Commission",
  "Nigerian Investment Promotion Commission",
  "Nigerian Postal Service",
  "Nigeria Immigration Service",
  "National Information Technology Development Agency",
  "National Inland Waterways Authority",
  "Nigerian Ports Authority",
  "Nigerian Shippers Council",
  "Nigerian Upstream Petroleum Regulatory Commission",
  "Oil & Gas Free Zone Authority",
  "National Pension Commission",
  "Rural Electrification Agency",
  "EFCC – Special Control Unit for Money Laundering",
  "Securities and Exchange Commission",
  "Service Compact",
  "Standards Organisation of Nigeria"
];

export const awardTransparencyForSLAPublication = mutation({
  args: {
    year: v.optional(v.number()),
    scoringPeriod: v.optional(v.string()),
    transparencyScore: v.optional(v.number()),
    dryRun: v.optional(v.boolean())
  },
  returns: v.object({
    year: v.number(),
    scoringPeriod: v.string(),
    transparencyScore: v.number(),
    processed: v.number(),
    updated: v.number(),
    created: v.number(),
    skipped: v.number(),
    errors: v.array(v.string()),
    dryRun: v.boolean(),
    mdaResults: v.array(v.object({
      mdaName: v.string(),
      status: v.string(),
      previousScore: v.number(),
      newScore: v.number()
    }))
  }),
  handler: async (ctx, args) => {
    // Check authentication and authorization
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("clerkUserId"), identity.subject))
      .first();

    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      throw new Error("Unauthorized: Only admins and staff can award bulk transparency points");
    }

    const year = args.year ?? 2026;
    const scoringPeriod = args.scoringPeriod ?? String(year);
    const transparencyScore = args.transparencyScore ?? 5;
    const dryRun = args.dryRun ?? false;

    let updated = 0;
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];
    const mdaResults: Array<{
      mdaName: string;
      status: string;
      previousScore: number;
      newScore: number;
    }> = [];

    // Check if we have Others configuration or use legacy transparency
    const transparencyItems = await ctx.db.query("transparency_items")
      .withIndex("byYearAndActive", q => q.eq("year", year).eq("isActive", true))
      .collect();

    let useOthersConfig = false;
    let transparencyItem: any = null;

    if (transparencyItems.length > 0) {
      // Use Others configuration if available
      transparencyItem = transparencyItems.find(item => 
        item.itemName.toLowerCase().includes("transparency") || 
        item.itemId === "transparency"
      );
      if (transparencyItem) {
        useOthersConfig = true;
        console.log(`Using Others config - Found transparency item: ${transparencyItem.itemName} (${transparencyItem.itemId}) - ${transparencyItem.weight} points`);
      }
    }

    if (!useOthersConfig) {
      // Fall back to legacy transparency scoring
      console.log(`No Others config found for ${year}, using legacy transparency scoring (5 points)`);
    }

    for (const mdaName of MDAS_WITH_100_PERCENT_SLA_PUBLICATION) {
      try {
        let previousScore = 0;
        let newScore = transparencyScore;

        if (useOthersConfig && transparencyItem) {
          // Use Others configuration approach
          const existingData = await ctx.db.query("saved_others_data")
            .withIndex("byMdaPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
            .first();

          const values = existingData?.values || {};
          const scores = existingData?.scores || {};
          
          previousScore = scores[transparencyItem.itemId] || 0;

          // Set transparency to true (for yes/no type) or max score (for scale type)
          if (transparencyItem.answerType === "yes_no") {
            values[transparencyItem.itemId] = true;
            scores[transparencyItem.itemId] = transparencyItem.weight;
            newScore = transparencyItem.weight;
          } else {
            // Scale 1-10 type
            values[transparencyItem.itemId] = 10; // Max scale
            scores[transparencyItem.itemId] = transparencyItem.weight;
            newScore = transparencyItem.weight;
          }

          // Calculate new total score
          const totalScore = Object.values(scores).reduce((sum: number, score) => sum + (score as number), 0);

          if (!dryRun) {
            if (existingData) {
              await ctx.db.patch(existingData._id, {
                values,
                scores,
                totalScore,
                updatedAt: Date.now()
              });
              updated++;
            } else {
              await ctx.db.insert("saved_others_data", {
                mdaName,
                scoringPeriod,
                values,
                scores,
                totalScore,
                updatedAt: Date.now()
              });
              created++;
            }
          } else {
            if (existingData) {
              updated++;
            } else {
              created++;
            }
          }
        } else {
          // Use legacy transparency scoring
          const existingData = await ctx.db.query("mda_transparency_data")
            .withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod))
            .first();

          previousScore = existingData?.score || 0;
          newScore = transparencyScore;

          if (!dryRun) {
            // Try to get any user for createdBy/updatedBy
            let systemUser = await ctx.db.query("users").first();
            
            if (!systemUser) {
              // Create a system user record if none exist
              const systemUserId = await ctx.db.insert("users", {
                firstName: "System",
                lastName: "Admin", 
                email: "system@pebec.gov.ng",
                role: "admin",
                clerkUserId: "system_user"
              });
              systemUser = await ctx.db.get(systemUserId);
              if (!systemUser) {
                throw new Error("Failed to create system user");
              }
            }

            if (existingData) {
              await ctx.db.patch(existingData._id, {
                responses: { serviceLevelPublishing: true },
                score: transparencyScore,
                isSkipped: false,
                updatedAt: Date.now(),
                updatedBy: systemUser._id
              });
              updated++;
            } else {
              await ctx.db.insert("mda_transparency_data", {
                mdaName,
                scoringPeriod,
                responses: { serviceLevelPublishing: true },
                score: transparencyScore,
                isSkipped: false,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                createdBy: systemUser._id,
                updatedBy: systemUser._id
              });
              created++;
            }
          } else {
            if (existingData) {
              updated++;
            } else {
              created++;
            }
          }
        }

        mdaResults.push({
          mdaName,
          status: useOthersConfig ? 
            (await ctx.db.query("saved_others_data").withIndex("byMdaPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod)).first() ? "updated" : "created") :
            (await ctx.db.query("mda_transparency_data").withIndex("byMdaAndPeriod", q => q.eq("mdaName", mdaName).eq("scoringPeriod", scoringPeriod)).first() ? "updated" : "created"),
          previousScore,
          newScore
        });
      } catch (error) {
        const errorMsg = `${mdaName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return {
      year,
      scoringPeriod,
      transparencyScore,
      processed: MDAS_WITH_100_PERCENT_SLA_PUBLICATION.length,
      updated,
      created,
      skipped,
      errors,
      dryRun,
      mdaResults
    };
  }
});