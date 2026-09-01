import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { buildUserSearchText } from "../lib/userSearch";

const BATCH_SIZE = 100;

/** One-time backfill for users created before searchText was auto-maintained. */
export const backfillUserSearchText = internalMutation({
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
      const searchText = buildUserSearchText(user);
      if (user.searchText !== searchText) {
        await ctx.db.patch(user._id, { searchText });
      }
    }

    if (!batch.isDone) {
      await ctx.scheduler.runAfter(0, internal.migrations.backfillUserSearchText.backfillUserSearchText, {
        cursor: batch.continueCursor,
      });
    }

    return null;
  },
});
