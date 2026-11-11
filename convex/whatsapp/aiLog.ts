import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const recordAiLog = internalMutation({
  args: {
    phoneHash: v.string(),
    messageSid: v.optional(v.string()),
    kind: v.union(
      v.literal("off_script"),
      v.literal("extract"),
      v.literal("fallback"),
      v.literal("out_of_scope"),
      v.literal("error"),
    ),
    intent: v.optional(v.string()),
    textPreview: v.optional(v.string()),
    overallConfidence: v.optional(v.number()),
    needsReview: v.optional(v.boolean()),
    error: v.optional(v.string()),
    meta: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("whatsapp_ai_logs", {
      phoneHash: args.phoneHash,
      messageSid: args.messageSid,
      kind: args.kind,
      intent: args.intent,
      textPreview: args.textPreview,
      overallConfidence: args.overallConfidence,
      needsReview: args.needsReview,
      error: args.error,
      meta: args.meta,
      createdAt: Date.now(),
    });
    return null;
  },
});
