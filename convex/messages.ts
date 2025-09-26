// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { encryptMessage, decryptMessage } from "../lib/encryption";

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
  args: { currentUserId: v.id("users") },
  handler: async (ctx, { currentUserId }) => {
    try {
      const currentUser = await ctx.db.get(currentUserId);
      if (!currentUser) return [];

      // Get users based on role permissions (optimized query)
      let usersQuery;
      if (currentUser.role === "admin" || currentUser.role === "staff") {
        usersQuery = ctx.db.query("users");
      } else {
        usersQuery = ctx.db.query("users")
          .filter((q) => q.eq(q.field("role"), "staff"));
      }
      
      const users = await usersQuery.collect();
      const otherUsers = users.filter(user => user && user._id !== currentUserId);

      if (otherUsers.length === 0) return [];

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
        otherUsers.slice(0, 100).map(async (user) => { // Limit to 100 users for performance
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
      return usersWithConversationData
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

    } catch (error) {
      console.error("Error in getMessageableUsers:", error);
      return [];
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

// Delete a message (only by sender)
export const deleteMessage = mutation({
  args: { 
    messageId: v.id("messages"), 
    userId: v.id("users") 
  },
  handler: async (ctx, { messageId, userId }) => {
    const message = await ctx.db.get(messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    if (message.senderId !== userId) {
      throw new Error("You can only delete your own messages");
    }

    await ctx.db.delete(messageId);
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