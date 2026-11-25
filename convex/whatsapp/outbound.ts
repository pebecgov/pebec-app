import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

/** Max successful WhatsApp pushes per ticket in one hour. */
export const MAX_OUTBOUND_PER_TICKET_PER_HOUR = 5;
/** Max successful WhatsApp pushes per phone in one hour. */
export const MAX_OUTBOUND_PER_PHONE_PER_HOUR = 8;
const WINDOW_MS = 60 * 60 * 1000;

const kindValidator = v.union(
  v.literal("status"),
  v.literal("needs_info"),
  v.literal("rate_limited"),
  v.literal("skipped_policy"),
);

const channelValidator = v.union(
  v.literal("session"),
  v.literal("template"),
  v.literal("none"),
);

export const checkRateLimit = internalQuery({
  args: {
    phone: v.string(),
    ticketId: v.id("tickets"),
  },
  returns: v.object({
    allowed: v.boolean(),
    reason: v.optional(v.string()),
  }),
  handler: async (ctx, { phone, ticketId }) => {
    const since = Date.now() - WINDOW_MS;
    const byTicket = await ctx.db
      .query("whatsapp_outbound")
      .withIndex("byTicket_createdAt", (q) =>
        q.eq("ticketId", ticketId).gte("createdAt", since),
      )
      .collect();
    const ticketSent = byTicket.filter((row) => row.sent).length;
    if (ticketSent >= MAX_OUTBOUND_PER_TICKET_PER_HOUR) {
      return {
        allowed: false,
        reason: `Rate limit: max ${MAX_OUTBOUND_PER_TICKET_PER_HOUR} WhatsApp messages per ticket per hour. Citizen can still see updates via Follow Up.`,
      };
    }

    const byPhone = await ctx.db
      .query("whatsapp_outbound")
      .withIndex("byPhone_createdAt", (q) =>
        q.eq("phone", phone).gte("createdAt", since),
      )
      .collect();
    const phoneSent = byPhone.filter((row) => row.sent).length;
    if (phoneSent >= MAX_OUTBOUND_PER_PHONE_PER_HOUR) {
      return {
        allowed: false,
        reason: `Rate limit: max ${MAX_OUTBOUND_PER_PHONE_PER_HOUR} WhatsApp messages per number per hour. Citizen can still see updates via Follow Up.`,
      };
    }

    return { allowed: true };
  },
});

export const recordOutbound = internalMutation({
  args: {
    phone: v.string(),
    ticketId: v.optional(v.id("tickets")),
    kind: kindValidator,
    channel: channelValidator,
    sent: v.boolean(),
    error: v.optional(v.string()),
    bodyPreview: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("whatsapp_outbound", {
      phone: args.phone,
      ticketId: args.ticketId,
      kind: args.kind,
      channel: args.channel,
      sent: args.sent,
      error: args.error,
      bodyPreview: args.bodyPreview
        ? args.bodyPreview.slice(0, 280)
        : undefined,
      createdAt: Date.now(),
    });
    return null;
  },
});
