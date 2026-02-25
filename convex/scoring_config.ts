import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserOrThrow } from "./users";

// ============================================
// YEAR CONFIGURATION
// ============================================

export const getYearConfiguration = query({
    args: { year: v.number() },
    handler: async (ctx, { year }) => {
        const config = await ctx.db.query("scoring_configurations")
            .withIndex("byYear", q => q.eq("year", year))
            .first();

        return config;
    }
});

export const saveYearConfiguration = mutation({
    args: {
        year: v.number(),
        isActive: v.boolean(),
        isFullYear: v.boolean()
    },
    handler: async (ctx, { year, isActive, isFullYear }) => {
        const user = await getCurrentUserOrThrow(ctx);

        const existing = await ctx.db.query("scoring_configurations")
            .withIndex("byYear", q => q.eq("year", year))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                isActive,
                isFullYear,
                updatedAt: Date.now()
            });
        } else {
            await ctx.db.insert("scoring_configurations", {
                year,
                isActive,
                isFullYear,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                createdBy: user._id
            });
        }

        return { success: true };
    }
});

// ============================================
// EFFICIENCY PERIOD CONFIGURATION
// ============================================

export const getEfficiencyPeriod = query({
    args: { year: v.number() },
    handler: async (ctx, { year }) => {
        const period = await ctx.db.query("efficiency_periods")
            .withIndex("byYear", q => q.eq("year", year))
            .first();

        return period;
    }
});

// Force sync
export const saveEfficiencyPeriod = mutation({
    args: {
        year: v.number(),
        periodName: v.string(),
        startMonth: v.string(),
        startYear: v.number(),
        endMonth: v.string(),
        endYear: v.number(),
        totalMonths: v.number(),
        slaPoints: v.number(),
        reportSubmissionPoints: v.number(),
        reportGovPoints: v.number(),
        timelinessPoints: v.number()
    },
    handler: async (ctx, args) => {
        const user = await getCurrentUserOrThrow(ctx);

        const existing = await ctx.db.query("efficiency_periods")
            .withIndex("byYear", q => q.eq("year", args.year))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                periodName: args.periodName,
                startMonth: args.startMonth,
                startYear: args.startYear,
                endMonth: args.endMonth,
                endYear: args.endYear,
                totalMonths: args.totalMonths,
                slaPoints: args.slaPoints,
                reportSubmissionPoints: args.reportSubmissionPoints,
                reportGovPoints: args.reportGovPoints,
                timelinessPoints: args.timelinessPoints,
                updatedAt: Date.now()
            });
        } else {
            await ctx.db.insert("efficiency_periods", {
                ...args,
                isActive: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                createdBy: user._id
            });
        }

        return { success: true };
    }
});

// ============================================
// MYSTERY SHOPPING TYPES & QUESTIONS
// ============================================

export const getMysteryShoppingTypes = query({
    args: { year: v.number() },
    handler: async (ctx, { year }) => {
        const types = await ctx.db.query("mystery_shopping_types")
            .withIndex("byYearAndActive", q => q.eq("year", year).eq("isActive", true))
            .collect();

        return types.sort((a, b) => a.order - b.order);
    }
});

export const getMysteryShoppingTypesWithQuestions = query({
    args: { year: v.number() },
    handler: async (ctx, { year }) => {
        const types = await ctx.db.query("mystery_shopping_types")
            .withIndex("byYearAndActive", q => q.eq("year", year).eq("isActive", true))
            .collect();

        const typesWithQuestions = await Promise.all(
            types.map(async (type) => {
                const questions = await ctx.db.query("mystery_shopping_questions")
                    .withIndex("byYearTypeAndActive", q =>
                        q.eq("year", year).eq("typeId", type.typeId).eq("isActive", true)
                    )
                    .collect();

                return {
                    ...type,
                    questions: questions.sort((a, b) => a.order - b.order)
                };
            })
        );

        return typesWithQuestions.sort((a, b) => a.order - b.order);
    }
});

export const saveMysteryShoppingConfiguration = mutation({
    args: {
        year: v.number(),
        types: v.array(v.object({
            typeId: v.string(),
            typeName: v.string(),
            order: v.number(),
            questions: v.array(v.object({
                questionId: v.string(),
                questionText: v.string(),
                weight: v.number(),
                answerType: v.union(v.literal("yes_no"), v.literal("scale_1_10")),
                order: v.number()
            }))
        }))
    },
    handler: async (ctx, { year, types }) => {
        const user = await getCurrentUserOrThrow(ctx);

        // Deactivate all existing types and questions for this year
        const existingTypes = await ctx.db.query("mystery_shopping_types")
            .withIndex("byYear", q => q.eq("year", year))
            .collect();

        for (const existing of existingTypes) {
            await ctx.db.patch(existing._id, { isActive: false });
        }

        const existingQuestions = await ctx.db.query("mystery_shopping_questions")
            .withIndex("byYear", q => q.eq("year", year))
            .collect();

        for (const existing of existingQuestions) {
            await ctx.db.patch(existing._id, { isActive: false });
        }

        // Insert new types and their questions
        for (const type of types) {
            // Insert type
            await ctx.db.insert("mystery_shopping_types", {
                year,
                typeId: type.typeId,
                typeName: type.typeName,
                order: type.order,
                isActive: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                createdBy: user._id
            });

            // Insert questions for this type
            for (const question of type.questions) {
                await ctx.db.insert("mystery_shopping_questions", {
                    year,
                    typeId: type.typeId,
                    questionId: question.questionId,
                    questionText: question.questionText,
                    weight: question.weight,
                    answerType: question.answerType,
                    order: question.order,
                    isActive: true,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    createdBy: user._id
                });
            }
        }

        return { success: true };
    }
});

// ============================================
// OTHERS ITEMS (Transparency, Innovation, Stakeholder, etc.)
// ============================================

export const getOthersItems = query({
    args: { year: v.number() },
    handler: async (ctx, { year }) => {
        const items = await ctx.db.query("transparency_items")
            .withIndex("byYearAndActive", q => q.eq("year", year).eq("isActive", true))
            .collect();

        return items.sort((a, b) => a.order - b.order);
    }
});

export const saveOthersItems = mutation({
    args: {
        year: v.number(),
        items: v.array(v.object({
            itemId: v.string(),
            itemName: v.string(),
            weight: v.number(),
            order: v.number(),
            answerType: v.optional(v.union(v.literal("yes_no"), v.literal("scale_1_10")))
        }))
    },
    handler: async (ctx, { year, items }) => {
        const user = await getCurrentUserOrThrow(ctx);

        // Deactivate existing
        const existingItems = await ctx.db.query("transparency_items")
            .withIndex("byYear", q => q.eq("year", year))
            .collect();

        for (const existing of existingItems) {
            await ctx.db.patch(existing._id, { isActive: false });
        }

        // Insert new
        for (const item of items) {
            await ctx.db.insert("transparency_items", {
                year,
                ...item,
                isActive: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                createdBy: user._id
            });
        }

        return { success: true };
    }
});

// ============================================
// PENALTY ITEMS
// ============================================

export const getPenaltyItems = query({
    args: { year: v.number() },
    handler: async (ctx, { year }) => {
        const items = await ctx.db.query("penalty_items")
            .withIndex("byYearAndActive", q => q.eq("year", year).eq("isActive", true))
            .collect();

        return items.sort((a, b) => a.order - b.order);
    }
});

export const savePenaltyItems = mutation({
    args: {
        year: v.number(),
        items: v.array(v.object({
            penaltyId: v.string(),
            penaltyName: v.string(),
            penaltyValue: v.number(),
            order: v.number()
        }))
    },
    handler: async (ctx, { year, items }) => {
        const user = await getCurrentUserOrThrow(ctx);

        // Deactivate existing
        const existingItems = await ctx.db.query("penalty_items")
            .withIndex("byYear", q => q.eq("year", year))
            .collect();

        for (const existing of existingItems) {
            await ctx.db.patch(existing._id, { isActive: false });
        }

        // Insert new
        for (const item of items) {
            await ctx.db.insert("penalty_items", {
                year,
                ...item,
                isActive: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                createdBy: user._id
            });
        }

        return { success: true };
    }
});

// ============================================
// INNOVATION & STAKEHOLDER ITEMS
// ============================================

export const getInnovationStakeholderItems = query({
    args: {
        year: v.number(),
        itemType: v.union(v.literal("innovation"), v.literal("stakeholder"))
    },
    handler: async (ctx, { year, itemType }) => {
        const items = await ctx.db.query("innovation_stakeholder_items")
            .withIndex("byYearTypeAndActive", q =>
                q.eq("year", year).eq("itemType", itemType).eq("isActive", true)
            )
            .collect();

        return items.sort((a, b) => a.order - b.order);
    }
});

export const saveInnovationStakeholderItems = mutation({
    args: {
        year: v.number(),
        itemType: v.union(v.literal("innovation"), v.literal("stakeholder")),
        items: v.array(v.object({
            itemId: v.string(),
            itemName: v.string(),
            weight: v.number(),
            inputType: v.union(v.literal("yes_no"), v.literal("scale_1_10")),
            order: v.number()
        }))
    },
    handler: async (ctx, { year, itemType, items }) => {
        const user = await getCurrentUserOrThrow(ctx);

        // Deactivate existing
        const existingItems = await ctx.db.query("innovation_stakeholder_items")
            .withIndex("byYearAndType", q => q.eq("year", year).eq("itemType", itemType))
            .collect();

        for (const existing of existingItems) {
            await ctx.db.patch(existing._id, { isActive: false });
        }

        // Insert new
        for (const item of items) {
            await ctx.db.insert("innovation_stakeholder_items", {
                year,
                itemType,
                ...item,
                isActive: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                createdBy: user._id
            });
        }

        return { success: true };
    }
});

// ============================================
// GET ALL CONFIGURATIONS FOR A YEAR
// ============================================

export const getAllConfigurationsForYear = query({
    args: { year: v.number() },
    handler: async (ctx, { year }) => {
        const [
            yearConfig,
            efficiencyPeriod,
            mysteryShoppingData,
            transparencyItems,
            penaltyItems,
            innovationItems,
            stakeholderItems
        ] = await Promise.all([
            ctx.db.query("scoring_configurations")
                .withIndex("byYear", q => q.eq("year", year))
                .first(),
            ctx.db.query("efficiency_periods")
                .withIndex("byYear", q => q.eq("year", year))
                .first(),
            // Get mystery shopping types with their questions
            (async () => {
                const types = await ctx.db.query("mystery_shopping_types")
                    .withIndex("byYearAndActive", q => q.eq("year", year).eq("isActive", true))
                    .collect();

                const typesWithQuestions = await Promise.all(
                    types.map(async (type) => {
                        const questions = await ctx.db.query("mystery_shopping_questions")
                            .withIndex("byYearTypeAndActive", q =>
                                q.eq("year", year).eq("typeId", type.typeId).eq("isActive", true)
                            )
                            .collect();

                        return {
                            ...type,
                            questions: questions.sort((a, b) => a.order - b.order)
                        };
                    })
                );

                return typesWithQuestions.sort((a, b) => a.order - b.order);
            })(),
            ctx.db.query("transparency_items")
                .withIndex("byYearAndActive", q => q.eq("year", year).eq("isActive", true))
                .collect(),
            ctx.db.query("penalty_items")
                .withIndex("byYearAndActive", q => q.eq("year", year).eq("isActive", true))
                .collect(),
            ctx.db.query("innovation_stakeholder_items")
                .withIndex("byYearTypeAndActive", q =>
                    q.eq("year", year).eq("itemType", "innovation").eq("isActive", true)
                )
                .collect(),
            ctx.db.query("innovation_stakeholder_items")
                .withIndex("byYearTypeAndActive", q =>
                    q.eq("year", year).eq("itemType", "stakeholder").eq("isActive", true)
                )
                .collect()
        ]);

        return {
            yearConfig,
            efficiencyPeriod,
            mysteryShoppingTypes: mysteryShoppingData,
            othersItems: transparencyItems.sort((a, b) => a.order - b.order),
            penaltyItems: penaltyItems.sort((a, b) => a.order - b.order),
            innovationItems: innovationItems.sort((a, b) => a.order - b.order),
            stakeholderItems: stakeholderItems.sort((a, b) => a.order - b.order)
        };
    }
});

export const debugConfigWeights = query({
    args: { year: v.number() },
    handler: async (ctx, { year }) => {
        const efficiencyConfig = await ctx.db.query("efficiency_periods")
            .withIndex("byYear", q => q.eq("year", year))
            .filter(q => q.eq(q.field("isActive"), true))
            .first();

        const mysteryQuestions = await ctx.db.query("mystery_shopping_questions")
            .withIndex("byYearAndActive", q => q.eq("year", year).eq("isActive", true))
            .collect();

        const transparencyItems = await ctx.db.query("transparency_items")
            .withIndex("byYearAndActive", q => q.eq("year", year).eq("isActive", true))
            .collect();

        const innovationStakeholderItems = await ctx.db.query("innovation_stakeholder_items")
            // NOTE: Mirroring exact query used in mda_scoring.ts
            .withIndex("byYear", q => q.eq("year", year))
            .filter(q => q.eq(q.field("isActive"), true))
            .collect();

        const efficiencyTotal = (efficiencyConfig?.slaPoints || 30) +
            (efficiencyConfig?.reportSubmissionPoints || 3) +
            (efficiencyConfig?.reportGovPoints || 15) +
            (efficiencyConfig?.timelinessPoints || 2);

        const mysteryTotal = mysteryQuestions.reduce((sum, q) => sum + (q.weight || 0), 0) || 20;

        const transparencySum = transparencyItems.reduce((sum, i) => sum + (i.weight || 0), 0);
        const innovationStakeholderSum = innovationStakeholderItems.reduce((sum, i) => sum + (i.weight || 0), 0);

        // The fallback logic in mda_scoring
        const othersTotal = (transparencySum + innovationStakeholderSum) || 25;

        return {
            efficiencyTotal,
            mysteryTotal,
            transparencySum,
            innovationStakeholderSum,
            othersTotal,
            grandTotal: efficiencyTotal + mysteryTotal + othersTotal,
            innovationStakeholderItemsCount: innovationStakeholderItems.length,
            transparencyItemsCount: transparencyItems.length
        };
    }
});
