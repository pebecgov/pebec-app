// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { internalMutation } from "./_generated/server";

export const backfillUnreadCounts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const conversations = await ctx.db.query("conversations").collect();

    let patched = 0;
    for (const conversation of conversations) {
      // Skip rows already migrated.
      if (conversation.unreadCounts !== undefined) continue;

      const messages = await ctx.db
        .query("messages")
        .withIndex("byConversation", (q) => q.eq("conversationId", conversation._id))
        .collect();

      const unreadCounts: Record<string, number> = {};
      for (const participantId of conversation.participants) {
        unreadCounts[participantId.toString()] = 0;
      }

      for (const message of messages) {
        if (message.isRead) continue;

        for (const participantId of conversation.participants) {
          if (participantId === message.senderId) continue;
          const participantKey = participantId.toString();
          unreadCounts[participantKey] = (unreadCounts[participantKey] || 0) + 1;
        }
      }

      await ctx.db.patch(conversation._id, { unreadCounts });
      patched++;
    }

    console.log(`Migration complete: patched ${patched} conversations`);
    return { patched };
  },
});
