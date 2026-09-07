import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { buildUserSearchText } from "../lib/userSearch";

const SEED_PREFIX = "seed_stress_";
const BATCH_SIZE = 50;

const FIRST_NAMES = [
  "Abdullahi",
  "Abdul",
  "Abubakar",
  "Ahmed",
  "Musa",
  "Ibrahim",
  "Yusuf",
  "Fatima",
  "Aisha",
  "Zainab",
  "Halima",
  "Chinedu",
  "Ngozi",
  "Emeka",
  "Adebayo",
  "Olumide",
  "Funke",
  "Tunde",
  "Kemi",
  "Biodun",
];

const LAST_NAMES = [
  "Garba",
  "Bello",
  "Sani",
  "Mohammed",
  "Aliyu",
  "Lawal",
  "Okonkwo",
  "Adeyemi",
  "Okafor",
  "Eze",
  "Nwankwo",
  "Balogun",
  "Ogunleye",
  "Danjuma",
  "Yakubu",
  "Suleiman",
  "Abdulkadir",
  "Mustapha",
  "Usman",
  "Haruna",
];

function pickFirstName(index: number): string {
  if (index % 17 === 0) return "Abdullahi";
  if (index % 13 === 0) return "Abdul";
  if (index % 11 === 0) return "Abdullahi";
  return FIRST_NAMES[index % FIRST_NAMES.length];
}

function pickLastName(index: number): string {
  return LAST_NAMES[(index * 7) % LAST_NAMES.length];
}

export const insertStressTestUserBatch = internalMutation({
  args: {
    startIndex: v.number(),
    count: v.number(),
    total: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (let offset = 0; offset < args.count; offset++) {
      const index = args.startIndex + offset;
      if (index >= args.total) break;

      const clerkUserId = `${SEED_PREFIX}${index}`;
      const existing = await ctx.db
        .query("users")
        .withIndex("byClerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
        .unique();
      if (existing) continue;

      const firstName = pickFirstName(index);
      const lastName = pickLastName(index);
      const email = `${SEED_PREFIX}${index}@stress-test.pebec.local`;
      const phoneNumber =
        index % 4 === 0 ? undefined : `+23480${String(10000000 + index).slice(-8)}`;

      const userFields = {
        email,
        clerkUserId,
        firstName,
        lastName,
        phoneNumber,
        role: "user" as const,
        searchText: buildUserSearchText({ firstName, lastName, email, phoneNumber }),
      };

      await ctx.db.insert("users", userFields);
    }

    const nextIndex = args.startIndex + args.count;
    if (nextIndex < args.total) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.seedUsersStressTest.insertStressTestUserBatch,
        {
          startIndex: nextIndex,
          count: args.count,
          total: args.total,
        }
      );
    } else {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.backfillUserSearchText.backfillUserSearchText,
        {}
      );
    }

    return null;
  },
});

export const deleteStressTestUsersBatch = internalMutation({
  args: {
    cursor: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const batch = await ctx.db.query("users").paginate({
      cursor: args.cursor ?? null,
      numItems: BATCH_SIZE,
    });

    for (const user of batch.page) {
      if (user.clerkUserId.startsWith(SEED_PREFIX)) {
        await ctx.db.delete(user._id);
      }
    }

    if (!batch.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.seedUsersStressTest.deleteStressTestUsersBatch,
        { cursor: batch.continueCursor }
      );
    }

    return null;
  },
});

/** Seed stress-test users for admin search/pagination testing. Dev only. */
export const start = mutation({
  args: {
    total: v.optional(v.number()),
  },
  returns: v.object({
    started: v.boolean(),
    total: v.number(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const total = args.total ?? 10_000;
    if (total < 1 || total > 20_000) {
      throw new Error("total must be between 1 and 20000");
    }

    await ctx.scheduler.runAfter(
      0,
      internal.migrations.seedUsersStressTest.insertStressTestUserBatch,
      { startIndex: 0, count: BATCH_SIZE, total }
    );

    return {
      started: true,
      total,
      message: `Seeding ${total} stress-test users in batches of ${BATCH_SIZE}. Refresh the admin users page in a few minutes.`,
    };
  },
});

/** Remove all stress-test seed users. */
export const cleanup = mutation({
  args: {},
  returns: v.object({
    started: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(
      0,
      internal.migrations.seedUsersStressTest.deleteStressTestUsersBatch,
      {}
    );

    return {
      started: true,
      message: "Deleting stress-test users in batches.",
    };
  },
});
