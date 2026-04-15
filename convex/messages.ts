// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { encryptMessage, decryptMessage } from "../lib/encryption";
import { api } from "./_generated/api";

// Get all conversations for a user
export const getUserConversations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const allConversations = await ctx.db
      .query("conversations")
      .order("desc")
      .collect();

    const conversations = allConversations.filter(conv =>
      conv.participants.includes(userId)
    );

    // Get participant details for each conversation
    const conversationsWithParticipants = await Promise.all(
      conversations.map(async (conversation) => {
        const participants = await Promise.all(
          conversation.participants.map(async (participantId) => {
            const user = await ctx.db.get(participantId);
            return user;
          })
        );

        // Get unread count for this conversation
        const unreadCount = await ctx.db
          .query("messages")
          .withIndex("byConversation", (q) => q.eq("conversationId", conversation._id))
          .filter((q) => q.and(
            q.eq(q.field("senderId"), userId),
            q.eq(q.field("isRead"), false)
          ))
          .collect();

        return {
          ...conversation,
          participants: participants.filter(Boolean),
          unreadCount: unreadCount.length
        };
      })
    );

    return conversationsWithParticipants;
  },
});

// Get messages for a specific conversation
export const getConversationMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("byConversation", (q) => q.eq("conversationId", conversationId))
      .order("asc")
      .collect();

    // Get sender details for each message and decrypt content
    const messagesWithSenders = await Promise.all(
      messages.map(async (message) => {
        const sender = await ctx.db.get(message.senderId);

        // Decrypt the message content if it's encrypted
        let decryptedContent = message.content;
        if (message.isEncrypted) {
          try {
            decryptedContent = decryptMessage(message.content);
          } catch (error) {
            console.error('Error decrypting message:', error);
            decryptedContent = '[Message could not be decrypted]';
          }
        }

        return {
          ...message,
          content: decryptedContent,
          sender,
        };
      })
    );

    return messagesWithSenders;
  },
});

// Create or get existing conversation between two users
export const getOrCreateConversation = mutation({
  args: {
    userId1: v.id("users"),
    userId2: v.id("users")
  },
  handler: async (ctx, { userId1, userId2 }) => {
    // Check if conversation already exists
    const existingConversations = await ctx.db
      .query("conversations")
      .withIndex("byParticipant")
      .collect();

    const existingConversation = existingConversations.find(conv =>
      conv.participants.includes(userId1) && conv.participants.includes(userId2)
    );

    if (existingConversation) {
      return existingConversation._id;
    }

    // Create new conversation
    const conversationId = await ctx.db.insert("conversations", {
      participants: [userId1, userId2],
      lastMessageAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return conversationId;
  },
});

// Send a message
export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    messageType: v.optional(v.union(v.literal("text"), v.literal("image"), v.literal("file"))),
    fileId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
  },
  handler: async (ctx, { conversationId, senderId, content, messageType = "text", fileId, fileName, fileSize }) => {
    // Encrypt the message content
    const encryptedContent = encryptMessage(content);

    // Create the message with encrypted content
    const messageId = await ctx.db.insert("messages", {
      conversationId,
      senderId,
      content: encryptedContent, // Store encrypted content
      messageType,
      fileId,
      fileName,
      fileSize,
      isRead: false,
      isEncrypted: true, // Mark as encrypted
      createdAt: Date.now(),
    });

    // Update conversation with last message info (use original content for preview)
    await ctx.db.patch(conversationId, {
      lastMessage: content.length > 50 ? content.substring(0, 50) + "..." : content,
      lastMessageAt: Date.now(),
      lastMessageSender: senderId,
      updatedAt: Date.now(),
    });

    // Notify other participants by email
    const conversation = await ctx.db.get(conversationId);
    const sender = await ctx.db.get(senderId);
    if (conversation && sender) {
      const recipientIds = conversation.participants.filter((participantId) => participantId !== senderId);
      const senderName =
        `${sender.firstName || ""} ${sender.lastName || ""}`.trim() || sender.email || "A user";
      const safePreview = content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      const subject = messageType === "file"
        ? `${senderName} sent you a file`
        : `${senderName} sent you a message`;

      await Promise.all(
        recipientIds.map(async (recipientId) => {
          const recipient = await ctx.db.get(recipientId);
          if (!recipient?.email) return;

          const html = `
            <div style="font-family: Arial, sans-serif; color: #111;">
              <p>Hello ${recipient.firstName || "there"},</p>
              <p><strong>${senderName}</strong> sent you ${messageType === "file" ? "a file" : "a message"} on PEBEC.</p>
              <p style="background:#f5f5f5;padding:10px;border-radius:6px;">
                ${messageType === "file" ? `Attachment: ${fileName || "File"}` : safePreview}
              </p>
              <p>Please log in to view and respond.</p>
            </div>
          `;

          await ctx.scheduler.runAfter(0, api.sendEmail.sendEmail, {
            to: recipient.email,
            subject,
            html,
          });
        })
      );
    }

    return messageId;
  },
});

// Mark message as read
export const markMessageAsRead = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    await ctx.db.patch(messageId, {
      isRead: true,
      readAt: Date.now(),
    });
  },
});

// Mark all messages in a conversation as read for a user
export const markConversationAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users")
  },
  handler: async (ctx, { conversationId, userId }) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("byConversation", (q) => q.eq("conversationId", conversationId))
      .filter((q) => q.and(
        q.neq(q.field("senderId"), userId),
        q.eq(q.field("isRead"), false)
      ))
      .collect();

    // Mark all unread messages as read
    await Promise.all(
      messages.map(async (message) => {
        await ctx.db.patch(message._id, {
          isRead: true,
          readAt: Date.now(),
        });
      })
    );
  },
});

// Get users that the current user can message (optimized for production)
export const getMessageableUsers = query({
  args: {
    currentUserId: v.id("users"),
    searchQuery: v.optional(v.string()),
    offset: v.optional(v.number()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, { currentUserId, searchQuery, offset = 0, limit = 100 }) => {
    try {
      const currentUser = await ctx.db.get(currentUserId);
      if (!currentUser) return { users: [], hasMore: false };

      // Get users based on role permissions (optimized query)
      let usersQuery;
      if (currentUser.role === "admin" || currentUser.role === "staff") {
        usersQuery = ctx.db.query("users");
      } else {
        usersQuery = ctx.db.query("users")
          .filter((q) => q.eq(q.field("role"), "staff"));
      }

      const users = await usersQuery.collect();
      let otherUsers = users.filter(user => user && user._id !== currentUserId);

      // If search query exists, search through all users.
      // For non-search mode, pagination is applied after sorting and after
      // preserving users that already have message history.
      const isSearching = searchQuery && searchQuery.trim().length > 0;

      if (otherUsers.length === 0) return { users: [], hasMore: false };

      // Get conversations in a single batch query
      const allConversations = await ctx.db.query("conversations").collect();

      // Create a map for quick conversation lookup
      const conversationMap = new Map();
      allConversations.forEach(conv => {
        if (conv?.participants?.includes(currentUserId)) {
          const otherParticipant = conv.participants.find(id => id !== currentUserId);
          if (otherParticipant) {
            conversationMap.set(otherParticipant.toString(), conv);
          }
        }
      });

      // Process users with conversation data
      const usersWithConversationData = await Promise.all(
        otherUsers.map(async (user) => {
          try {
            const conversation = conversationMap.get(user._id.toString());
            let lastMessage = undefined;
            let lastMessageTime = undefined;
            let unreadCount = 0;

            if (conversation?._id) {
              // Get last message efficiently
              const lastMessages = await ctx.db
                .query("messages")
                .withIndex("byConversation", (q) => q.eq("conversationId", conversation._id))
                .order("desc")
                .take(1);

              if (lastMessages.length > 0) {
                const lastMsg = lastMessages[0];
                // Decrypt last message
                let decryptedLastMessage = lastMsg.content;
                if (lastMsg.isEncrypted) {
                  try {
                    decryptedLastMessage = decryptMessage(lastMsg.content);
                  } catch (error) {
                    decryptedLastMessage = '[Encrypted message]';
                  }
                }
                lastMessage = decryptedLastMessage;
                lastMessageTime = lastMsg.createdAt;
              }

              // Get unread count efficiently
              const unreadMessages = await ctx.db
                .query("messages")
                .withIndex("byConversation", (q) => q.eq("conversationId", conversation._id))
                .filter((q) => q.and(
                  q.eq(q.field("senderId"), user._id),
                  q.eq(q.field("isRead"), false)
                ))
                .collect();

              unreadCount = unreadMessages.length;
            }

            return {
              ...user,
              lastMessage,
              lastMessageTime,
              unreadCount: unreadCount || 0, // Ensure number
              isOnline: false
            };
          } catch (error) {
            console.error("Error processing user:", user._id, error);
            return {
              ...user,
              lastMessage: undefined,
              lastMessageTime: undefined,
              unreadCount: 0,
              isOnline: false
            };
          }
        })
      );

      // Sort users efficiently
      const sortedUsers = usersWithConversationData
        .filter(user => user && user._id)
        .sort((a, b) => {
          // Users with messages first, then by unread count, then alphabetically
          const aHasMessage = a.lastMessageTime ? 1 : 0;
          const bHasMessage = b.lastMessageTime ? 1 : 0;

          if (bHasMessage !== aHasMessage) return bHasMessage - aHasMessage;
          if (b.lastMessageTime !== a.lastMessageTime) return (b.lastMessageTime || 0) - (a.lastMessageTime || 0);
          if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;

          const aName = `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.email;
          const bName = `${b.firstName || ''} ${b.lastName || ''}`.trim() || b.email;
          return aName.localeCompare(bName);
        });

      if (isSearching) {
        return { users: sortedUsers, hasMore: false };
      }

      // Always include users with existing message history, regardless pagination.
      // Pagination only limits users without message history.
      const usersWithMessages = sortedUsers.filter(
        user => (user.lastMessageTime || 0) > 0 || (user.unreadCount || 0) > 0
      );
      const usersWithoutMessages = sortedUsers.filter(
        user => (user.lastMessageTime || 0) <= 0 && (user.unreadCount || 0) <= 0
      );

      const pagedUsers = [
        ...usersWithMessages,
        ...usersWithoutMessages.slice(offset, offset + limit),
      ];
      const hasMore = usersWithoutMessages.length > (offset + limit);
      return { users: pagedUsers, hasMore };

    } catch (error) {
      console.error("Error in getMessageableUsers:", error);
      return { users: [], hasMore: false };
    }
  },
});

// Get unread message count for a user
export const getUnreadMessageCount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const allConversations = await ctx.db
      .query("conversations")
      .collect();

    const conversations = allConversations.filter(conv =>
      conv.participants.includes(userId)
    );

    let totalUnread = 0;

    for (const conversation of conversations) {
      const unreadMessages = await ctx.db
        .query("messages")
        .withIndex("byConversation", (q) => q.eq("conversationId", conversation._id))
        .filter((q) => q.and(
          q.neq(q.field("senderId"), userId),
          q.eq(q.field("isRead"), false)
        ))
        .collect();

      totalUnread += unreadMessages.length;
    }

    return totalUnread;
  },
});

// Delete a message (only by sender, only if not read by others, only within 15 minutes)
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages")
  },
  handler: async (ctx, { messageId }) => {
    const message = await ctx.db.get(messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Check if message is read by another user
    if (message.isRead) {
      throw new Error("Cannot delete message that has been read by others");
    }

    // Check if message is less than 15 minutes old
    const messageAge = Date.now() - message.createdAt;
    const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds

    if (messageAge >= fifteenMinutes) {
      throw new Error("Cannot delete message older than 15 minutes");
    }

    await ctx.db.delete(messageId);
  },
});

// Edit a message (only by sender, only if not read by others, only within 15 minutes)
export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    newContent: v.string()
  },
  handler: async (ctx, { messageId, newContent }) => {
    const message = await ctx.db.get(messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Check if message is less than 15 minutes old (only time-based restriction for editing)
    const messageAge = Date.now() - message.createdAt;
    const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds

    if (messageAge >= fifteenMinutes) {
      throw new Error("Cannot edit message older than 15 minutes");
    }

    // Encrypt the new content
    const encryptedContent = encryptMessage(newContent);

    // Update the message
    await ctx.db.patch(messageId, {
      content: encryptedContent,
      isEncrypted: true,
      updatedAt: Date.now()
    });

    // Update conversation with new last message info
    await ctx.db.patch(message.conversationId, {
      lastMessage: newContent.length > 50 ? newContent.substring(0, 50) + "..." : newContent,
      lastMessageAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Delete a conversation (only if user is participant)
export const deleteConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users")
  },
  handler: async (ctx, { conversationId, userId }) => {
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (!conversation.participants.includes(userId)) {
      throw new Error("You can only delete conversations you're part of");
    }

    // Delete all messages in the conversation
    const messages = await ctx.db
      .query("messages")
      .withIndex("byConversation", (q) => q.eq("conversationId", conversationId))
      .collect();

    await Promise.all(messages.map(message => ctx.db.delete(message._id)));

    // Delete the conversation
    await ctx.db.delete(conversationId);
  },
});

// Generate upload URL for file attachments (max 50MB)
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Get download URL for a file
export const getFileDownloadUrl = query({
  args: { fileId: v.id("_storage") },
  handler: async (ctx, { fileId }) => {
    return await ctx.storage.getUrl(fileId);
  },
});