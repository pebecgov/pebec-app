// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

export const createConversation = mutation({
  args: {
    memberIds: v.array(v.id("users")),
    createdBy: v.id("users")
  },
  handler: async (ctx, { memberIds, createdBy }) => {
    // Ensure creator is in the members list
    const uniqueMembers = Array.from(new Set([...memberIds, createdBy]));
    const now = Date.now();
    const conversationId = await ctx.db.insert("conversations", {
      participants: uniqueMembers,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now
    });
    return { conversationId };
  }
});

export const listMyConversations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const allConversations = await ctx.db
      .query("conversations")
      .order("desc")
      .collect();
    const mine = allConversations.filter(c => c.participants.includes(userId));

    const withLast = await Promise.all(mine.map(async c => {
      const lastMsg = await ctx.db
        .query("messages")
        .withIndex("byConversation", q => q.eq("conversationId", c._id))
        .order("desc")
        .first();
      return { ...c, lastMessageAt: lastMsg?.createdAt ?? c.lastMessageAt ?? c.createdAt };
    }));

    return withLast.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
  }
});

export const listMessages = query({
  args: { conversationId: v.id("conversations"), limit: v.optional(v.number()) },
  handler: async (ctx, { conversationId, limit }) => {
    const msgs = await ctx.db
      .query("messages")
      .withIndex("byConversation", q => q.eq("conversationId", conversationId))
      .order("desc")
      .collect();
    const sliced = limit ? msgs.slice(0, limit) : msgs;
    return sliced.reverse();
  }
});

export const generateUploadUrl = mutation(async ctx => {
  return await ctx.storage.generateUploadUrl();
});

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    text: v.optional(v.string()),
    fileId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    contentType: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    if (!args.text && !args.fileId) {
      throw new Error("Message must have text or a file");
    }
    const createdAt = Date.now();
    const isFile = !!args.fileId;
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: args.senderId,
      content: args.text || args.fileName || "",
      messageType: isFile ? "file" : "text",
      fileId: args.fileId,
      fileName: args.fileName,
      isRead: false,
      createdAt
    });

    // Notify all members except sender
    const conversation = await ctx.db.get(args.conversationId);
    const sender = await ctx.db.get(args.senderId);
    if (conversation && Array.isArray(conversation.participants)) {
      const senderName =
        `${sender?.firstName || ""} ${sender?.lastName || ""}`.trim() || sender?.email || "A user";
      const rawPreview = args.text || args.fileName || "";
      const safePreview = rawPreview
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      const subject = args.fileId
        ? `${senderName} sent you a file`
        : `${senderName} sent you a message`;

      for (const userId of conversation.participants) {
        if (userId === args.senderId) continue;
        const recipient = await ctx.db.get(userId);

        await ctx.db.insert("notifications", {
          userId,
          message: `${senderName} sent you ${args.fileId ? "a file" : "a message"}`,
          isRead: false,
          createdAt,
          type: "chat_message"
        });

        if (recipient?.email) {
          await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
            to: recipient.email,
            subject,
            html: `
              <div style="font-family: Arial, sans-serif; color: #111;">
                <p>Hello ${recipient.firstName || "there"},</p>
                <p><strong>${senderName}</strong> sent you ${args.fileId ? "a file" : "a message"} on PEBEC.</p>
                <p style="background:#f5f5f5;padding:10px;border-radius:6px;">
                  ${args.fileId ? `Attachment: ${args.fileName || "File"}` : safePreview}
                </p>
                <p>Please log in to view and respond.</p>
              </div>
            `
          });
        }
      }
      await ctx.db.patch(args.conversationId, {
        lastMessage: args.text || args.fileName || "",
        lastMessageSender: args.senderId,
        lastMessageAt: createdAt,
        updatedAt: createdAt
      } as any);
    }
    return { messageId };
  }
});

export const markRead = mutation({
  args: { conversationId: v.id("conversations"), userId: v.id("users") },
  handler: async (ctx, { conversationId, userId }) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("byConversation", q => q.eq("conversationId", conversationId))
      .filter(q => q.neq(q.field("senderId"), userId))
      .collect();

    const now = Date.now();
    for (const m of messages) {
      if (!m.isRead) {
        await ctx.db.patch(m._id, { isRead: true, readAt: now } as any);
      }
    }
  }
});


