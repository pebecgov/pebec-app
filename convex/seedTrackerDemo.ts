import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { indicators, type IndicatorKey } from "./config/indicators";
import { VALID_NIGERIAN_STATES } from "./stateUtils";

const YEAR = 2026;
const PERIOD = "2026";
const DEMO_MARKER = "tracker-demo-2026";
const MONTH_KEYS = Array.from({ length: 12 }, (_, month) => `${YEAR}-${month}`);

const DEMO_MDAS: Array<{
  name: string;
  factor: number;
  bonusIds: string[];
  penaltyIds: string[];
  submittedMonths: number[];
}> = [
  { name: "Corporate Affairs Commission", factor: 0.98, bonusIds: ["bonus_reform", "bonus_digital"], penaltyIds: [], submittedMonths: [0, 1, 2, 3, 4, 5, 6] },
  { name: "Nigeria Revenue Service", factor: 0.93, bonusIds: ["bonus_digital"], penaltyIds: [], submittedMonths: [0, 1, 2, 3, 4, 5, 6] },
  { name: "Nigerian Investment Promotion Council", factor: 0.88, bonusIds: ["bonus_reform"], penaltyIds: [], submittedMonths: [0, 1, 2, 3, 4, 5, 6] },
  { name: "Nigeria Immigration Service", factor: 0.84, bonusIds: [], penaltyIds: [], submittedMonths: [0, 1, 2, 3, 4, 6] },
  { name: "Nigeria Customs Service", factor: 0.79, bonusIds: [], penaltyIds: [], submittedMonths: [0, 1, 2, 3, 5, 6] },
  { name: "Standards Organisation of Nigeria", factor: 0.74, bonusIds: [], penaltyIds: [], submittedMonths: [0, 1, 2, 4, 5] },
  { name: "Nigerian Ports Authority", factor: 0.70, bonusIds: [], penaltyIds: [], submittedMonths: [0, 2, 3, 5, 6] },
  { name: "National Agency for Food and Drug Administration and Control", factor: 0.66, bonusIds: [], penaltyIds: [], submittedMonths: [0, 1, 3, 6] },
  { name: "Nigerian Communications Commission", factor: 0.61, bonusIds: [], penaltyIds: [], submittedMonths: [1, 2, 4] },
  { name: "Bureau for Public Procurement", factor: 0.57, bonusIds: [], penaltyIds: [], submittedMonths: [0, 3, 5] },
  { name: "Nigerian Electricity Regulatory Commission", factor: 0.53, bonusIds: [], penaltyIds: ["penalty_late"], submittedMonths: [0, 2] },
  { name: "Federal Airports Authority of Nigeria", factor: 0.49, bonusIds: [], penaltyIds: ["penalty_late"], submittedMonths: [1, 4] },
  { name: "Federal Road Safety Corps", factor: 0.44, bonusIds: [], penaltyIds: ["penalty_noncompliance"], submittedMonths: [0] },
  { name: "National Identity Management Commission", factor: 0.40, bonusIds: [], penaltyIds: ["penalty_late"], submittedMonths: [2] },
  { name: "Nigeria Police Force", factor: 0.36, bonusIds: [], penaltyIds: ["penalty_late", "penalty_noncompliance"], submittedMonths: [] },
  { name: "Service Compact", factor: 0.32, bonusIds: [], penaltyIds: ["penalty_late", "penalty_noncompliance"], submittedMonths: [6] },
];

const STATE_OVERRIDES: Record<string, number> = {
  Lagos: 0.97,
  Rivers: 0.92,
  "Federal Capital Territory": 0.89,
  Kaduna: 0.84,
  Ogun: 0.81,
  Anambra: 0.78,
  Enugu: 0.74,
  Kano: 0.71,
  Edo: 0.67,
  Delta: 0.63,
  Plateau: 0.58,
  Borno: 0.42,
  Yobe: 0.39,
  Zamfara: 0.36,
};

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function stateFactor(state: string, index: number): number {
  if (STATE_OVERRIDES[state] !== undefined) return STATE_OVERRIDES[state];
  return Math.round((0.38 + ((index * 13) % 37) / 36 * 0.48) * 100) / 100;
}

function jitter(factor: number, key: string): number {
  const delta = ((hashString(key) % 21) - 10) / 100;
  return Math.min(1, Math.max(0, factor + delta));
}

function pickOption(
  options: ReadonlyArray<{ value: string; label: string; score: number }>,
  factor: number
): { value: string; label: string; score: number } {
  const maxScore = options.reduce((max, option) => Math.max(max, option.score), 0);
  const target = factor * maxScore;
  return options.reduce((best, option) =>
    Math.abs(option.score - target) < Math.abs(best.score - target) ? option : best
  );
}

const configResultValidator = v.object({
  userId: v.union(v.id("users"), v.null()),
  createdConfig: v.boolean(),
  othersItems: v.array(v.object({ itemId: v.string(), weight: v.number() })),
  penaltyItems: v.array(v.object({ penaltyId: v.string(), penaltyValue: v.number() })),
  bonusItems: v.array(v.object({ bonusId: v.string(), bonusValue: v.number() })),
});

export const ensureConfig = internalMutation({
  args: {},
  returns: configResultValidator,
  handler: async (ctx) => {
    const user = await ctx.db.query("users").first();
    const now = Date.now();
    const createdBy = user?._id;

    const existingEfficiency = await ctx.db
      .query("efficiency_periods")
      .withIndex("byYear", (q) => q.eq("year", YEAR))
      .first();

    if (!createdBy && !existingEfficiency) {
      throw new Error("Need at least one user in the database to create 2026 scoring configuration.");
    }

    let createdConfig = false;
    if (createdBy) {
      if (!existingEfficiency) {
        createdConfig = true;
        const existingYearConfig = await ctx.db
          .query("scoring_configurations")
          .withIndex("byYear", (q) => q.eq("year", YEAR))
          .first();
        if (!existingYearConfig) {
          await ctx.db.insert("scoring_configurations", {
            year: YEAR,
            isActive: true,
            isFullYear: true,
            createdAt: now,
            updatedAt: now,
            createdBy,
          });
        }
        await ctx.db.insert("efficiency_periods", {
          year: YEAR,
          periodName: "Full Year 2026",
          startMonth: "January",
          startYear: YEAR,
          endMonth: "December",
          endYear: YEAR,
          totalMonths: 12,
          slaPoints: 5,
          reportSubmissionPoints: 2,
          reportGovPoints: 20,
          timelinessPoints: 3,
          isActive: true,
          createdAt: now,
          updatedAt: now,
          createdBy,
        });
      }

      const mysteryTypes = await ctx.db
        .query("mystery_shopping_types")
        .withIndex("byYearAndActive", (q) => q.eq("year", YEAR).eq("isActive", true))
        .collect();
      if (mysteryTypes.length === 0) {
        createdConfig = true;
        await ctx.db.insert("mystery_shopping_types", {
          year: YEAR,
          typeId: "physical",
          typeName: "Physical Visit",
          order: 1,
          isActive: true,
          createdAt: now,
          updatedAt: now,
          createdBy,
        });
        const questions = [
          { questionId: "q1", questionText: "Was staff professional and identifiable?", order: 1 },
          { questionId: "q2", questionText: "Was the service process clearly explained?", order: 2 },
          { questionId: "q3", questionText: "Was the service completed within the stated SLA?", order: 3 },
          { questionId: "q4", questionText: "Was the environment organized and customer-friendly?", order: 4 },
        ];
        for (const question of questions) {
          await ctx.db.insert("mystery_shopping_questions", {
            year: YEAR,
            typeId: "physical",
            questionId: question.questionId,
            questionText: question.questionText,
            weight: 10,
            answerType: "scale_1_10",
            order: question.order,
            isActive: true,
            createdAt: now,
            updatedAt: now,
            createdBy,
          });
        }
      }

      const existingTransparency = await ctx.db
        .query("transparency_items")
        .withIndex("byYearAndActive", (q) => q.eq("year", YEAR).eq("isActive", true))
        .collect();
      if (existingTransparency.length === 0) {
        createdConfig = true;
        const transparency = [
          { itemId: "others_transparency_1", itemName: "Service charter published", weight: 5, order: 1 },
          { itemId: "others_transparency_2", itemName: "Fees and procedures online", weight: 5, order: 2 },
        ];
        for (const item of transparency) {
          await ctx.db.insert("transparency_items", {
            year: YEAR,
            itemId: item.itemId,
            itemName: item.itemName,
            weight: item.weight,
            answerType: "yes_no",
            isActive: true,
            order: item.order,
            createdAt: now,
            updatedAt: now,
            createdBy,
          });
        }
      }

      const existingInnovation = await ctx.db
        .query("innovation_stakeholder_items")
        .withIndex("byYearTypeAndActive", (q) => q.eq("year", YEAR).eq("itemType", "innovation").eq("isActive", true))
        .collect();
      if (existingInnovation.length === 0) {
        createdConfig = true;
        await ctx.db.insert("innovation_stakeholder_items", {
          year: YEAR,
          itemId: "others_innovation_1",
          itemType: "innovation",
          itemName: "Process innovation / digitization",
          weight: 5,
          inputType: "yes_no",
          isActive: true,
          order: 1,
          createdAt: now,
          updatedAt: now,
          createdBy,
        });
      }

      const existingStakeholder = await ctx.db
        .query("innovation_stakeholder_items")
        .withIndex("byYearTypeAndActive", (q) => q.eq("year", YEAR).eq("itemType", "stakeholder").eq("isActive", true))
        .collect();
      if (existingStakeholder.length === 0) {
        createdConfig = true;
        await ctx.db.insert("innovation_stakeholder_items", {
          year: YEAR,
          itemId: "others_stakeholder_1",
          itemType: "stakeholder",
          itemName: "Stakeholder engagement sessions",
          weight: 5,
          inputType: "scale_1_10",
          isActive: true,
          order: 1,
          createdAt: now,
          updatedAt: now,
          createdBy,
        });
      }

      const existingPenalties = await ctx.db
        .query("penalty_items")
        .withIndex("byYearAndActive", (q) => q.eq("year", YEAR).eq("isActive", true))
        .collect();
      if (existingPenalties.length === 0) {
        createdConfig = true;
        await ctx.db.insert("penalty_items", {
          year: YEAR,
          penaltyId: "penalty_late",
          penaltyName: "Late response to PEBEC query",
          penaltyValue: -2,
          isActive: true,
          order: 1,
          createdAt: now,
          updatedAt: now,
          createdBy,
        });
        await ctx.db.insert("penalty_items", {
          year: YEAR,
          penaltyId: "penalty_noncompliance",
          penaltyName: "Non-compliance with reform directive",
          penaltyValue: -3,
          isActive: true,
          order: 2,
          createdAt: now,
          updatedAt: now,
          createdBy,
        });
      }

      const existingBonuses = await ctx.db
        .query("bonus_items")
        .withIndex("byYearAndActive", (q) => q.eq("year", YEAR).eq("isActive", true))
        .collect();
      if (existingBonuses.length === 0) {
        createdConfig = true;
        await ctx.db.insert("bonus_items", {
          year: YEAR,
          bonusId: "bonus_reform",
          bonusName: "Outstanding reform implementation",
          bonusValue: 2,
          isActive: true,
          order: 1,
          createdAt: now,
          updatedAt: now,
          createdBy,
        });
        await ctx.db.insert("bonus_items", {
          year: YEAR,
          bonusId: "bonus_digital",
          bonusName: "Digital service excellence",
          bonusValue: 3,
          isActive: true,
          order: 2,
          createdAt: now,
          updatedAt: now,
          createdBy,
        });
      }
    }

    const [transparencyItems, innovationItems, stakeholderItems, penaltyItems, bonusItems] = await Promise.all([
      ctx.db.query("transparency_items").withIndex("byYearAndActive", (q) => q.eq("year", YEAR).eq("isActive", true)).collect(),
      ctx.db.query("innovation_stakeholder_items").withIndex("byYearTypeAndActive", (q) => q.eq("year", YEAR).eq("itemType", "innovation").eq("isActive", true)).collect(),
      ctx.db.query("innovation_stakeholder_items").withIndex("byYearTypeAndActive", (q) => q.eq("year", YEAR).eq("itemType", "stakeholder").eq("isActive", true)).collect(),
      ctx.db.query("penalty_items").withIndex("byYearAndActive", (q) => q.eq("year", YEAR).eq("isActive", true)).collect(),
      ctx.db.query("bonus_items").withIndex("byYearAndActive", (q) => q.eq("year", YEAR).eq("isActive", true)).collect(),
    ]);

    return {
      userId: createdBy ?? null,
      createdConfig,
      othersItems: [
        ...transparencyItems.map((item) => ({ itemId: item.itemId, weight: item.weight })),
        ...innovationItems.map((item) => ({ itemId: item.itemId, weight: item.weight })),
        ...stakeholderItems.map((item) => ({ itemId: item.itemId, weight: item.weight })),
      ],
      penaltyItems: penaltyItems.map((item) => ({ penaltyId: item.penaltyId, penaltyValue: item.penaltyValue })),
      bonusItems: bonusItems.map((item) => ({ bonusId: item.bonusId, bonusValue: item.bonusValue })),
    };
  },
});

export const deleteDemoStateBatch = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    const scores = await ctx.db
      .query("state_scores")
      .withIndex("byYear", (q) => q.eq("year", YEAR))
      .collect();
    const demo = scores.filter((row) => row.linkToSource === DEMO_MARKER).slice(0, 200);
    for (const row of demo) {
      await ctx.db.delete(row._id);
    }
    return { deleted: demo.length };
  },
});

export const seedStateBatch = internalMutation({
  args: { states: v.array(v.string()) },
  returns: v.object({ inserted: v.number() }),
  handler: async (ctx, { states }) => {
    const now = Date.now();
    let inserted = 0;
    const allStates = Array.from(VALID_NIGERIAN_STATES);

    for (const state of states) {
      const index = allStates.indexOf(state);
      const factor = stateFactor(state, index < 0 ? 0 : index);
      for (const indicatorKey of Object.keys(indicators) as IndicatorKey[]) {
        const indicator = indicators[indicatorKey];
        for (const [subKey, sub] of Object.entries(indicator.subIndicators)) {
          const localFactor = jitter(factor, `${state}:${indicatorKey}:${subKey}`);
          const option = pickOption(sub.options, localFactor);
          await ctx.db.insert("state_scores", {
            state,
            indicator: indicatorKey,
            subIndicator: subKey,
            value: option.label,
            score: option.score,
            linkToSource: DEMO_MARKER,
            year: YEAR,
            createdAt: now,
          });
          inserted += 1;
        }
      }
    }

    return { inserted };
  },
});

export const clearDemoMdaData = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    const slaRows = await ctx.db
      .query("mda_sla_data")
      .withIndex("byPeriod", (q) => q.eq("scoringPeriod", PERIOD))
      .collect();
    const demoNames = new Set(
      slaRows
        .filter((row) => (row.monthlySlaData as { __demo?: boolean } | null)?.__demo === true)
        .map((row) => row.mdaName)
    );

    const tables = [
      "mda_sla_data",
      "mda_mystery_shopping_data",
      "mda_reportgov_data",
      "mda_monthly_report_data",
      "mda_timeliness_data",
      "saved_others_data",
      "saved_penalties_data",
      "saved_bonuses_data",
    ] as const;

    let deleted = 0;
    for (const table of tables) {
      const rows = await ctx.db
        .query(table)
        .withIndex("byPeriod", (q) => q.eq("scoringPeriod", PERIOD))
        .collect();
      for (const row of rows) {
        if (!demoNames.has(row.mdaName)) continue;
        await ctx.db.delete(row._id);
        deleted += 1;
      }
    }

    const reports = await ctx.db
      .query("submitted_reports")
      .withIndex("byDate", (q) => q.gte("submittedAt", Date.UTC(YEAR, 0, 1)))
      .collect();
    for (const report of reports) {
      if (report.fileName !== DEMO_MARKER) continue;
      await ctx.db.delete(report._id);
      deleted += 1;
    }

    return { deleted };
  },
});

export const seedMdaDemo = internalMutation({
  args: {
    userId: v.id("users"),
    othersItems: v.array(v.object({ itemId: v.string(), weight: v.number() })),
    penaltyItems: v.array(v.object({ penaltyId: v.string(), penaltyValue: v.number() })),
    bonusItems: v.array(v.object({ bonusId: v.string(), bonusValue: v.number() })),
  },
  returns: v.object({ mdas: v.number(), reports: v.number() }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found for demo scoring records");

    let reports = 0;
    let seeded = 0;
    for (const mda of DEMO_MDAS) {
      const existingMda = await ctx.db
        .query("mdas")
        .withIndex("byName", (q) => q.eq("name", mda.name))
        .first();
      if (!existingMda) {
        await ctx.db.insert("mdas", {
          name: mda.name,
          description: DEMO_MARKER,
          assignedUsers: [],
          createdAt: now,
        });
      }

      const existingSla = await ctx.db
        .query("mda_sla_data")
        .withIndex("byMdaAndPeriod", (q) => q.eq("mdaName", mda.name).eq("scoringPeriod", PERIOD))
        .first();
      if (existingSla) continue;

      const monthScore = 5 * mda.factor;
      const rating = Math.max(1, Math.round(5 * mda.factor));
      const monthlySlaData: Record<string, unknown> = { __demo: true };
      for (const key of MONTH_KEYS) {
        monthlySlaData[key] = {
          method: "rating",
          rating,
          score: monthScore,
          overallPercentage: mda.factor * 100,
        };
      }

      await ctx.db.insert("mda_sla_data", {
        mdaName: mda.name,
        scoringPeriod: PERIOD,
        monthlySlaData,
        totalScore: monthScore * 12,
        monthsWithData: 12,
        totalMonths: 12,
        percentage: mda.factor * 100,
        createdAt: now,
        updatedAt: now,
        createdBy: args.userId,
        updatedBy: args.userId,
      });
      seeded += 1;

      await ctx.db.insert("mda_mystery_shopping_data", {
        mdaName: mda.name,
        scoringPeriod: PERIOD,
        mysteryType: "physical",
        ratings: { q1: Math.round(mda.factor * 10), q2: Math.round(mda.factor * 10) },
        totalScore: 40 * mda.factor,
        maxPossibleScore: 40,
        percentage: mda.factor * 100,
        createdAt: now,
        updatedAt: now,
        createdBy: args.userId,
        updatedBy: args.userId,
      });

      await ctx.db.insert("mda_reportgov_data", {
        mdaName: mda.name,
        scoringPeriod: PERIOD,
        totalTickets: 40,
        resolvedTickets: Math.round(40 * mda.factor),
        averageResponseTime: 12,
        averageResolutionTime: 36,
        resolutionRate: mda.factor * 100,
        score: 20 * mda.factor,
        isManual: true,
        isSkipped: false,
        createdAt: now,
        updatedAt: now,
        createdBy: args.userId,
        updatedBy: args.userId,
      });

      const monthlyFlags: Record<string, boolean> = {};
      const timelinessFlags: Record<string, boolean> = {};
      for (const key of MONTH_KEYS) {
        const monthIndex = Number(key.split("-")[1] || 0);
        monthlyFlags[key] = mda.submittedMonths.includes(monthIndex);
        timelinessFlags[key] = mda.submittedMonths.includes(monthIndex);
      }
      await ctx.db.insert("mda_monthly_report_data", {
        mdaName: mda.name,
        scoringPeriod: PERIOD,
        manualMonthlyReports: monthlyFlags,
        useManual: true,
        score: (2 / 12) * mda.submittedMonths.length,
        createdAt: now,
        updatedAt: now,
        createdBy: args.userId,
        updatedBy: args.userId,
      });
      await ctx.db.insert("mda_timeliness_data", {
        mdaName: mda.name,
        scoringPeriod: PERIOD,
        manualTimeliness: timelinessFlags,
        useManual: true,
        score: (3 / 12) * mda.submittedMonths.length,
        createdAt: now,
        updatedAt: now,
        createdBy: args.userId,
        updatedBy: args.userId,
      });

      const othersValues: Record<string, boolean | number> = {};
      const othersScores: Record<string, number> = {};
      let othersTotal = 0;
      for (const item of args.othersItems) {
        const awarded = item.weight * mda.factor;
        othersValues[item.itemId] = mda.factor >= 0.6;
        othersScores[item.itemId] = awarded;
        othersTotal += awarded;
      }
      await ctx.db.insert("saved_others_data", {
        mdaName: mda.name,
        scoringPeriod: PERIOD,
        values: othersValues,
        scores: othersScores,
        totalScore: othersTotal,
        updatedAt: now,
      });

      const penaltyIds = mda.penaltyIds.filter((id) =>
        args.penaltyItems.some((item) => item.penaltyId === id)
      );
      const resolvedPenaltyIds =
        penaltyIds.length > 0
          ? penaltyIds
          : args.penaltyItems.slice(0, mda.penaltyIds.length).map((item) => item.penaltyId);
      const penaltyValues: Record<string, boolean> = {};
      let totalPenalty = 0;
      for (const item of args.penaltyItems) {
        const applied = resolvedPenaltyIds.includes(item.penaltyId);
        penaltyValues[item.penaltyId] = applied;
        if (applied) totalPenalty += item.penaltyValue;
      }
      await ctx.db.insert("saved_penalties_data", {
        mdaName: mda.name,
        scoringPeriod: PERIOD,
        values: penaltyValues,
        totalPenalty,
        updatedAt: now,
      });

      const bonusIds = mda.bonusIds.filter((id) =>
        args.bonusItems.some((item) => item.bonusId === id)
      );
      const resolvedBonusIds =
        bonusIds.length > 0
          ? bonusIds
          : args.bonusItems.slice(0, mda.bonusIds.length).map((item) => item.bonusId);
      const bonusValues: Record<string, boolean> = {};
      let totalBonus = 0;
      for (const item of args.bonusItems) {
        const applied = resolvedBonusIds.includes(item.bonusId);
        bonusValues[item.bonusId] = applied;
        if (applied) totalBonus += item.bonusValue;
      }
      await ctx.db.insert("saved_bonuses_data", {
        mdaName: mda.name,
        scoringPeriod: PERIOD,
        values: bonusValues,
        totalBonus,
        updatedAt: now,
      });

      for (const monthIndex of mda.submittedMonths) {
        const submittedAt = Date.UTC(YEAR, monthIndex, 12, 10, 0, 0);
        await ctx.db.insert("submitted_reports", {
          submittedBy: args.userId,
          role: "reform_champion",
          submittedAt,
          fileName: DEMO_MARKER,
          reportName: `BFA Report (${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][monthIndex]} ${YEAR})`,
          mdaName: mda.name,
          isDraft: false,
          reportPeriodMonth: monthIndex,
          reportPeriodYear: YEAR,
        });
        reports += 1;
      }
    }

    return { mdas: seeded, reports };
  },
});

export const demoStatus = internalQuery({
  args: {},
  returns: v.object({
    hasDemoStates: v.boolean(),
    hasRealStates: v.boolean(),
    hasDemoMdas: v.boolean(),
  }),
  handler: async (ctx) => {
    const yearScores = await ctx.db
      .query("state_scores")
      .withIndex("byYear", (q) => q.eq("year", YEAR))
      .collect();
    const hasDemoStates = yearScores.some((row) => row.linkToSource === DEMO_MARKER);
    const hasRealStates = yearScores.some((row) => row.linkToSource !== DEMO_MARKER);
    const slaRows = await ctx.db
      .query("mda_sla_data")
      .withIndex("byPeriod", (q) => q.eq("scoringPeriod", PERIOD))
      .collect();
    const hasDemoMdas = slaRows.some((row) => {
      const data = row.monthlySlaData as { __demo?: boolean } | null;
      return data?.__demo === true;
    });
    return { hasDemoStates, hasRealStates, hasDemoMdas };
  },
});

const populateResult = v.object({
  createdConfig: v.boolean(),
  statesInserted: v.number(),
  mdasSeeded: v.number(),
  reportsInserted: v.number(),
  replaced: v.boolean(),
  message: v.string(),
});

export const populate = action({
  args: {
    replaceExisting: v.optional(v.boolean()),
  },
  returns: populateResult,
  handler: async (ctx, args): Promise<{
    createdConfig: boolean;
    statesInserted: number;
    mdasSeeded: number;
    reportsInserted: number;
    replaced: boolean;
    message: string;
  }> => {
    const replaceExisting = args.replaceExisting === true;
    const status = await ctx.runQuery(internal.seedTrackerDemo.demoStatus, {});

    if (!replaceExisting && (status.hasDemoStates || status.hasDemoMdas)) {
      return {
        createdConfig: false,
        statesInserted: 0,
        mdasSeeded: 0,
        reportsInserted: 0,
        replaced: false,
        message: "Tracker demo data already exists. Re-run with { replaceExisting: true } to refresh it.",
      };
    }

    if (replaceExisting) {
      for (let i = 0; i < 12; i++) {
        const batch = await ctx.runMutation(internal.seedTrackerDemo.deleteDemoStateBatch, {});
        if (batch.deleted === 0) break;
      }
      await ctx.runMutation(internal.seedTrackerDemo.clearDemoMdaData, {});
    }

    const config = await ctx.runMutation(internal.seedTrackerDemo.ensureConfig, {});
    const skipStates = status.hasRealStates;
    const states = Array.from(VALID_NIGERIAN_STATES);
    let statesInserted = 0;
    if (!skipStates) {
      for (let i = 0; i < states.length; i += 4) {
        const slice = states.slice(i, i + 4);
        const result = await ctx.runMutation(internal.seedTrackerDemo.seedStateBatch, { states: slice });
        statesInserted += result.inserted;
      }
    }

    let mdasSeeded = 0;
    let reportsInserted = 0;
    if (config.userId) {
      const mdaResult = await ctx.runMutation(internal.seedTrackerDemo.seedMdaDemo, {
        userId: config.userId,
        othersItems: config.othersItems,
        penaltyItems: config.penaltyItems,
        bonusItems: config.bonusItems,
      });
      mdasSeeded = mdaResult.mdas;
      reportsInserted = mdaResult.reports;
    }

    return {
      createdConfig: config.createdConfig,
      statesInserted,
      mdasSeeded,
      reportsInserted,
      replaced: replaceExisting,
      message: [
        config.userId
          ? `Seeded ${statesInserted} state indicator rows and ${mdasSeeded} MDAs.`
          : "State rows were seeded, but MDA scoring needs at least one user in the database.",
        skipStates ? "Existing real 2026 state scores were left unchanged." : "",
        "Open /scores then click States or MDAs.",
      ]
        .filter(Boolean)
        .join(" "),
    };
  },
});
