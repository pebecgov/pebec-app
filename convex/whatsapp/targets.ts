import { internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { followUpCopy } from "./i18n";

export const getCitizenNotifyTarget = internalQuery({
  args: {
    ticketId: v.id("tickets"),
  },
  returns: v.union(
    v.object({
      phone: v.string(),
      ticketId: v.id("tickets"),
      ticketNumber: v.string(),
      status: v.string(),
      resolutionNote: v.optional(v.string()),
      language: v.optional(
        v.union(
          v.literal("en"),
          v.literal("ha"),
          v.literal("ig"),
          v.literal("yo"),
        ),
      ),
      replyTitle: v.string(),
      menuTitle: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, { ticketId }) => {
    const ticket = await ctx.db.get(ticketId);
    if (!ticket?.whatsappPhone) {
      return null;
    }
    const session = await ctx.db
      .query("whatsapp_sessions")
      .withIndex("byPhone", (q) => q.eq("phone", ticket.whatsappPhone!))
      .first();
    const fu = followUpCopy(session?.language);
    return {
      phone: ticket.whatsappPhone,
      ticketId: ticket._id,
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
      resolutionNote: ticket.resolutionNote,
      language: session?.language,
      replyTitle: fu.reply,
      menuTitle: fu.menuButton,
    };
  },
});
