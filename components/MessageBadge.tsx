// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

// @ts-nocheck - Temporary suppression for new message edit/delete functionality

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChatBubbleLeftRightIcon, PaperAirplaneIcon, ArrowLeftIcon, MagnifyingGlassIcon, PaperClipIcon, ArrowDownTrayIcon, FunnelIcon, CheckIcon, ChevronDownIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { CheckIcon as CheckIconSolid } from "@heroicons/react/24/solid";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useConvex } from "convex/react";
import { useGlobalActivityTracker } from "@/lib/useGlobalActivityTracker";

interface Message {
  _id: Id<"messages">;
  conversationId: Id<"conversations">;
  senderId: Id<"users">;
  content: string;
  messageType: "text" | "image" | "file";
  fileId?: Id<"_storage">;
  fileName?: string;
  fileSize?: number;
  isRead: boolean;
  readAt?: number;
  createdAt: number;
  sender?: {
    _id: Id<"users">;
    firstName?: string;
    lastName?: string;
    email: string;
    role?: string;
    imageUrl?: string;
  };
}

// Optimistic message interface for pending messages
interface OptimisticMessage {
  tempId: string;
  conversationId: Id<"conversations">;
  senderId: Id<"users">;
  content: string;
  messageType: "text" | "image" | "file";
  fileId?: Id<"_storage">;
  fileName?: string;
  fileSize?: number;
  isRead: boolean;
  createdAt: number;
  status: 'pending' | 'sent' | 'failed';
  sender?: {
    _id: Id<"users">;
    firstName?: string;
    lastName?: string;
    email: string;
    role?: string;
    imageUrl?: string;
  };
}

interface User {
  _id: Id<"users">;
  firstName?: string;
  lastName?: string;
  email: string;
  role?: string;
  imageUrl?: string;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount?: number;
  isOnline?: boolean;
  state?: string;
  mdaName?: string;
  staffStream?: string;
}

export default function MessageBadge() {
  const { user } = useUser();
  const convex = useConvex();
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'users' | 'chat'>('users');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState<Id<"conversations"> | null>(null);
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'staff' | 'reform_champion' | 'saber_agent' | 'mda'>('all');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<Id<"_storage"> | null>(null);
  const [showRoleFilters, setShowRoleFilters] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<Id<"messages"> | string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [showMessageMenu, setShowMessageMenu] = useState<Id<"messages"> | string | null>(null);
  const [userLimit] = useState(100);
  const [userOffset, setUserOffset] = useState(0);
  const [loadedUsers, setLoadedUsers] = useState<User[]>([]);
  const [isLoadingMoreUsers, setIsLoadingMoreUsers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isFetchingMore = useRef(false);

  // Activity tracking for messages
  const { trackUserAction } = useGlobalActivityTracker();

  // Get current user from Convex
  const currentUser = useQuery(api.users.current);

  // Get messageable users with search support
  const messageableUsers = useQuery(
    api.messages.getMessageableUsers,
    currentUser ? {
      currentUserId: currentUser._id,
      searchQuery: searchQuery,
      roleFilter,
      offset: userOffset,
      limit: userLimit
    } : "skip"
  );
  const queryUsers = Array.isArray(messageableUsers)
    ? messageableUsers
    : (messageableUsers?.users || []);
  const responseOffset = Array.isArray(messageableUsers)
    ? 0
    : (messageableUsers?.offset ?? 0);
  const hasMoreFromServer = Array.isArray(messageableUsers)
    ? (queryUsers.length >= userLimit)
    : !!messageableUsers?.hasMore;

  useEffect(() => {
    if (messageableUsers === undefined) return;

    // For search mode or first response page, replace.
    // For subsequent pages, append with de-dup so current users stay visible.
    if (searchQuery || responseOffset === 0) {
      setLoadedUsers(queryUsers);
      setIsLoadingMoreUsers(false);
      isFetchingMore.current = false;
      return;
    }

    // Subsequent pages: silently append, de-duped, never replacing existing users.
    setLoadedUsers((prev) => {
      const userMap = new Map<string, User>();
      prev.forEach((user) => {
        if (user?._id) userMap.set(String(user._id), user);
      });
      queryUsers.forEach((user: User) => {
        if (user?._id) userMap.set(String(user._id), user);
      });
      return Array.from(userMap.values());
    });
    setIsLoadingMoreUsers(false);
    isFetchingMore.current = false;
  }, [messageableUsers, queryUsers, searchQuery, responseOffset]);

  useEffect(() => {
    // Reset paging when server-side filters change.
    setUserOffset(0);
    setIsLoadingMoreUsers(false);
    isFetchingMore.current = false;
  }, [searchQuery, roleFilter]);

  // Get conversations for current user
  const conversations = useQuery(
    api.messages.getUserConversations,
    currentUser ? { userId: currentUser._id } : "skip"
  );

  // Get messages for current conversation
  const messages = useQuery(
    api.messages.getConversationMessages,
    currentConversationId ? { conversationId: currentConversationId } : "skip"
  );

  // Get unread message count
  const unreadCount = useQuery(
    api.messages.getUnreadMessageCount,
    currentUser ? { userId: currentUser._id } : "skip"
  );



  // Mutations
  const getOrCreateConversation = useMutation(api.messages.getOrCreateConversation);
  const sendMessage = useMutation(api.messages.sendMessage);
  const markConversationAsRead = useMutation(api.messages.markConversationAsRead);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  // @ts-ignore - New mutations not yet in generated types
  const editMessage = useMutation(api.messages.editMessage);
  // @ts-ignore - New mutations not yet in generated types  
  const deleteMessage = useMutation(api.messages.deleteMessage);

  const toggleMessages = () => {
    setMessagesOpen(!messagesOpen);
    if (!messagesOpen) {
      setCurrentView('users');
      setSelectedUser(null);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, optimisticMessages]);

  // Cleanup old optimistic messages
  useEffect(() => {
    const cleanup = setInterval(() => {
      setOptimisticMessages(prev =>
        prev.filter(msg => {
          // Remove messages older than 30 seconds or that are sent
          const age = Date.now() - msg.createdAt;
          return age < 30000 && msg.status !== 'sent';
        })
      );
    }, 5000);

    return () => clearInterval(cleanup);
  }, []);

  const hasMoreUsers = !searchQuery && hasMoreFromServer;
  const isInitialUsersLoading = messageableUsers === undefined && loadedUsers.length === 0;
  const handleUsersListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMoreUsers || isLoadingMoreUsers || isFetchingMore.current) return;

    const el = e.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom <= 32) {
      isFetchingMore.current = true;
      setIsLoadingMoreUsers(true);
      setUserOffset((prev) => prev + userLimit);
    }
  };



  // Backend now owns role/search/exclusion filters and sorting.
  const filteredUsers = loadedUsers.filter((user: User) => !!user && !!user._id);

  const handleUserClick = async (selectedUser: User) => {
    if (!currentUser) return;

    setSelectedUser(selectedUser);
    setCurrentView('chat');

    // Get or create conversation
    const conversationId = await getOrCreateConversation({
      userId1: currentUser._id,
      userId2: selectedUser._id
    });

    setCurrentConversationId(conversationId);

    // Mark conversation as read
    await markConversationAsRead({
      conversationId,
      userId: currentUser._id
    });
  };

  const handleBackToUsers = () => {
    setCurrentView('users');
    setSelectedUser(null);
    setCurrentConversationId(null);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSendMessage = async () => {
    if ((newMessage.trim() || selectedFile) && currentConversationId && currentUser) {
      const attachedFile = selectedFile;
      const messageContent = newMessage.trim() || (selectedFile ? `📎 ${selectedFile.name}` : '');
      const messageType = selectedFile ? "file" : "text";

      // Create optimistic message
      const tempId = `temp_${Date.now()}_${Math.random()}`;
      const optimisticMessage: OptimisticMessage = {
        tempId,
        conversationId: currentConversationId,
        senderId: currentUser._id,
        content: messageContent,
        messageType,
        fileName: selectedFile?.name,
        fileSize: selectedFile?.size,
        isRead: false,
        createdAt: Date.now(),
        status: 'pending',
        sender: {
          _id: currentUser._id,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          email: currentUser.email,
          role: currentUser.role,
          imageUrl: currentUser.imageUrl,
        }
      };

      // Add optimistic message to UI immediately
      setOptimisticMessages(prev => [...prev, optimisticMessage]);


      // Clear input immediately for better UX
      setNewMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Send message asynchronously without blocking UI
      sendMessageAsync(tempId, optimisticMessage, attachedFile);
    }
  };

  const sendMessageAsync = async (
    tempId: string,
    optimisticMessage: OptimisticMessage,
    attachedFile?: File | null
  ) => {
    if (!currentUser) return;

    try {
      let fileId: Id<"_storage"> | undefined;
      let fileName: string | undefined;
      let fileSize: number | undefined;

      // Upload attachment to Convex storage before sending message
      if (optimisticMessage.messageType === 'file' && attachedFile) {
        const uploadUrl = await generateUploadUrl({});
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": attachedFile.type || "application/octet-stream" },
          body: attachedFile
        });

        if (!uploadResponse.ok) {
          throw new Error(`File upload failed with status ${uploadResponse.status}`);
        }

        const uploadResult = await uploadResponse.json();
        const storageId = uploadResult.storageId || uploadResult.id;

        if (!storageId) {
          throw new Error("File upload succeeded but no storage ID was returned.");
        }

        fileId = storageId as Id<"_storage">;
        fileName = attachedFile.name;
        fileSize = attachedFile.size;
      }

      // Track message activity (only once per day)
      trackUserAction("daily_message", {
        messageType: optimisticMessage.messageType,
        hasFile: optimisticMessage.messageType === 'file'
      });

      // Send message to server
      await sendMessage({
        conversationId: optimisticMessage.conversationId,
        senderId: currentUser._id,
        content: optimisticMessage.content,
        messageType: optimisticMessage.messageType,
        fileId,
        fileName,
        fileSize
      });

      // Mark optimistic message as sent
      setOptimisticMessages(prev =>
        prev.map(msg =>
          msg.tempId === tempId
            ? { ...msg, status: 'sent' as const }
            : msg
        )
      );

      // Remove optimistic message after a short delay to let real message appear
      setTimeout(() => {
        setOptimisticMessages(prev => prev.filter(msg => msg.tempId !== tempId));
      }, 1000);

    } catch (error) {
      console.error('Error sending message:', error);

      // Mark optimistic message as failed
      setOptimisticMessages(prev =>
        prev.map(msg =>
          msg.tempId === tempId
            ? { ...msg, status: 'failed' as const }
            : msg
        )
      );

    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRetryMessage = async (optimisticMessage: OptimisticMessage) => {
    if (!currentUser) return;

    // Create a new temp ID for retry
    const newTempId = `retry_${Date.now()}_${Math.random()}`;

    // Update the optimistic message with new temp ID and pending status
    setOptimisticMessages(prev =>
      prev.map(msg =>
        msg.tempId === optimisticMessage.tempId
          ? { ...msg, tempId: newTempId, status: 'pending' as const }
          : msg
      )
    );


    // Retry sending
    await sendMessageAsync(newTempId, { ...optimisticMessage, tempId: newTempId, status: 'pending' }, null);
  };

  const handleDownloadFile = async (fileId: Id<"_storage">, fileName: string) => {
    setDownloadingFileId(fileId);

    try {
      // Get the download URL using Convex client
      const downloadUrl = await convex.query(api.messages.getFileDownloadUrl, { fileId });
      if (downloadUrl) {
        // Fetch the file as a blob to force download
        const response = await fetch(downloadUrl);
        const blob = await response.blob();

        // Create a blob URL and download
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the blob URL
        window.URL.revokeObjectURL(blobUrl);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
    } finally {
      setDownloadingFileId(null);
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getUserDisplayName = (user: User) => {
    if (!user) return 'Unknown User';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return `${firstName} ${lastName}`.trim() || user.email || 'Unknown User';
  };

  const getUserInitials = (user: User) => {
    if (!user) return 'U';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return (user.email || 'U')[0].toUpperCase();
  };

  const getFormattedRole = (user: User) => {
    if (!user.role) return 'Unknown';

    switch (user.role) {
      case 'saber_agent':
        return user.state || 'SABER Agent';
      case 'mda':
        if (user.mdaName) {
          const mdaAcronym = user.mdaName.split(' - ')[0];
          return mdaAcronym;
        }
        return 'MDA';
      case 'reform_champion':
        if (user.mdaName) {
          const mdaAcronym = user.mdaName.split(' - ')[0];
          return `RC_${mdaAcronym}`;
        }
        return 'Reform Champion';
      case 'staff':
        return user.staffStream || 'Staff';
      default:
        return user.role;
    }
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      // Green variants
      case 'admin':
        return 'bg-green-600';
      case 'staff':
        return 'bg-green-500';
      case 'reform_champion':
        return 'bg-green-400';

      // Red variants
      case 'mda':
        return 'bg-red-600';

      // Blue variants
      case 'saber_agent':
        return 'bg-blue-600';

      // Default fallback
      default:
        return 'bg-gray-500';
    }
  };

  // Check if message can be edited (only time-based)
  const canEditMessage = (message: any) => {
    if (!currentUser) return false;

    // Only the sender can edit their own messages
    if (message.senderId !== currentUser._id) return false;

    // Check if message is less than 15 minutes old
    const messageAge = Date.now() - message.createdAt;
    const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds

    return messageAge < fifteenMinutes;
  };

  // Check if message can be deleted (only read status-based)
  const canDeleteMessage = (message: any) => {
    if (!currentUser) return false;

    // Only the sender can delete their own messages
    if (message.senderId !== currentUser._id) return false;

    // Check if message is read by another user
    if ('isRead' in message && message.isRead) return false;

    return true;
  };

  // Handle edit message
  const handleEditMessage = (message: any) => {
    setEditingMessageId('tempId' in message ? message.tempId : message._id);
    setEditingContent(message.content);
    setShowMessageMenu(null);
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editingMessageId || !editingContent.trim()) return;

    try {
      if (typeof editingMessageId === 'string' && editingMessageId.startsWith('temp_')) {
        // Handle optimistic message edit
        setOptimisticMessages(prev =>
          prev.map(msg =>
            msg.tempId === editingMessageId
              ? { ...msg, content: editingContent.trim() }
              : msg
          )
        );
      } else {
        // Handle real message edit
        await (editMessage as any)({
          messageId: editingMessageId as Id<"messages">,
          newContent: editingContent.trim()
        });
      }

      setEditingMessageId(null);
      setEditingContent('');
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  // Handle delete message
  const handleDeleteMessage = async (message: any) => {
    if (!canDeleteMessage(message)) return;

    try {
      if ('tempId' in message) {
        // Handle optimistic message deletion
        setOptimisticMessages(prev => prev.filter(msg => msg.tempId !== message.tempId));
      } else {
        // Handle real message deletion
        await (deleteMessage as any)({
          messageId: message._id
        });
      }

      setShowMessageMenu(null);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const pulseAnimation = unreadCount && unreadCount > 0 ? "animate-pulse" : "";

  return (
    <div className="relative">
      <Popover open={messagesOpen} onOpenChange={toggleMessages}>
        <PopoverTrigger asChild>
          <button className="relative p-3 rounded-full bg-white shadow-md border border-gray-300 hover:bg-gray-100 transition duration-200">
            <ChatBubbleLeftRightIcon className="w-6 h-6 text-green-600" />
            {unreadCount !== undefined && unreadCount > 0 && (
              <div className={`absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-md z-10 ${pulseAnimation}`}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </div>
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-96 p-0 bg-white rounded-lg shadow-xl">
          {currentView === 'users' ? (
            <>
              {/* Users List View */}
              <div className="p-4 border-b border-gray-200">
                <div className="text-lg font-semibold text-gray-700">Messages</div>
              </div>

              {/* Search Bar and Role Filter */}
              <div className="p-4 border-b border-gray-200 space-y-3">
                {/* Filter Button - Only show for admin and staff */}
                {(currentUser?.role === 'admin' || currentUser?.role === 'staff') && (
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => setShowRoleFilters(!showRoleFilters)}
                      className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-lg transition-colors ${showRoleFilters
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      <FunnelIcon className="w-4 h-4" />
                      <span>Filter by Role</span>
                    </button>
                    {roleFilter !== 'all' && (
                      <button
                        onClick={() => setRoleFilter('all')}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Clear Filter
                      </button>
                    )}
                  </div>
                )}

                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users..."
                    className="pl-10"
                  />
                </div>

                {/* Role Filter Buttons - Only show when toggled and for admin/staff */}
                {(currentUser?.role === 'admin' || currentUser?.role === 'staff') && showRoleFilters && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setRoleFilter('all')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${roleFilter === 'all'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setRoleFilter('admin')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${roleFilter === 'admin'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      Admins
                    </button>
                    <button
                      onClick={() => setRoleFilter('staff')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${roleFilter === 'staff'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      Staff
                    </button>
                    <button
                      onClick={() => setRoleFilter('reform_champion')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${roleFilter === 'reform_champion'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      Reform Champions
                    </button>
                    <button
                      onClick={() => setRoleFilter('saber_agent')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${roleFilter === 'saber_agent'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      SABER Agents
                    </button>
                    <button
                      onClick={() => setRoleFilter('mda')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${roleFilter === 'mda'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      ReportGov Agent
                    </button>
                  </div>
                )}
              </div>

              {/* Users List */}
              <div className="h-80 overflow-y-auto" onScroll={handleUsersListScroll}>
                {isInitialUsersLoading ? (
                  <div className="p-4 text-center text-gray-500">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin"></div>
                      <span>Loading users...</span>
                    </div>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No users found
                  </div>
                ) : (
                  <>
                    {filteredUsers.map((user) => (
                      <div
                        key={user._id}
                        onClick={() => handleUserClick(user)}
                        className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div className="relative">
                              <div className={`w-10 h-10 ${getRoleColor(user.role)} rounded-full flex items-center justify-center text-white font-semibold`}>
                                {getUserInitials(user)}
                              </div>
                              {user.isOnline && (
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div className="flex items-center gap-2 min-w-0">
                                {user.unreadCount !== undefined && user.unreadCount > 0 && (
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                )}
                                <span className="font-medium text-gray-900 truncate flex-1 min-w-0">
                                  {getUserDisplayName(user)}
                                </span>
                                {user.role && (
                                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full shrink-0 max-w-[120px] truncate">
                                    {getFormattedRole(user)}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 truncate w-full max-w-full">
                                {user.lastMessage || 'No messages yet'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs text-gray-400">
                              {user.lastMessageTime && formatTime(user.lastMessageTime)}
                            </div>
                            {user.unreadCount !== undefined && user.unreadCount > 0 && (
                              <div className="mt-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                {user.unreadCount}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Infinite loader */}
                    {isLoadingMoreUsers && (
                      <div className="px-4 py-1">
                        <div className="h-0.5 w-full bg-gray-100 rounded overflow-hidden">
                          <div className="h-full w-1/3 bg-green-400 rounded animate-pulse" />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Chat View */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleBackToUsers}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                  </button>
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 ${selectedUser ? getRoleColor(selectedUser.role) : 'bg-gray-500'} rounded-full flex items-center justify-center text-white font-semibold text-sm`}>
                      {selectedUser && getUserInitials(selectedUser)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{selectedUser && getUserDisplayName(selectedUser)}</div>
                      <div className="text-xs text-gray-500">{selectedUser ? getFormattedRole(selectedUser) : ''}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="h-80 overflow-y-auto p-4 space-y-3">
                {(() => {
                  // Combine real messages with optimistic messages
                  const allMessages = [
                    ...(messages || []),
                    ...optimisticMessages.filter(optMsg => optMsg.conversationId === currentConversationId)
                  ].sort((a, b) => a.createdAt - b.createdAt);

                  if (allMessages.length > 0) {
                    return allMessages.map((message) => {
                      const isOptimistic = 'tempId' in message;
                      const isCurrentUser = currentUser && message.senderId === currentUser._id;
                      const messageKey = isOptimistic ? message.tempId : message._id;

                      return (
                        <div
                          key={messageKey}
                          className={`flex items-start gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          {/* Action buttons for current user - positioned beside the bubble */}
                          {isCurrentUser && (canEditMessage(message as any) || canDeleteMessage(message as any)) && (
                            <div className="flex flex-col gap-1 mt-1">
                              {/* Edit button */}
                              {canEditMessage(message as any) && (
                                /* @ts-ignore - Type compatibility issues */
                                <button
                                  onClick={() => handleEditMessage(message as any)}
                                  className="p-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                                  title="Edit message"
                                >
                                  <PencilIcon className="w-3 h-3 text-gray-600" />
                                </button>
                              )}
                              {/* Delete button */}
                              {canDeleteMessage(message as any) && (
                                /* @ts-ignore - Type compatibility issues */
                                <button
                                  onClick={() => handleDeleteMessage(message as any)}
                                  className="p-1 bg-red-200 hover:bg-red-300 rounded transition-colors"
                                  title="Delete message"
                                >
                                  <TrashIcon className="w-3 h-3 text-red-600" />
                                </button>
                              )}
                            </div>
                          )}

                          <div
                            className={`max-w-xs px-4 py-2 rounded-lg ${isCurrentUser
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-100 text-gray-800'
                              } ${isOptimistic && message.status === 'failed' ? 'opacity-60' : ''}`}
                          >
                            <div className="text-sm">
                              {editingMessageId === messageKey ? (
                                // Edit mode
                                <div className="space-y-2">
                                  <Input
                                    value={editingContent}
                                    onChange={(e) => setEditingContent(e.target.value)}
                                    className="w-full text-black"
                                    autoFocus
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSaveEdit();
                                      }
                                      if (e.key === 'Escape') {
                                        handleCancelEdit();
                                      }
                                    }}
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={handleSaveEdit}
                                      size="sm"
                                      className="px-2 py-1 text-xs"
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      onClick={handleCancelEdit}

                                      size="sm"
                                      className="px-2 py-1 text-xs bg-red-500 text-white hover:bg-red-600"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                // Normal message display
                                <>
                                  {message.messageType === 'file' ? (
                                    <div className="space-y-2">
                                      {/* File attachment at the top */}
                                      <div className="flex items-center justify-between gap-2 p-2 bg-white bg-opacity-10 rounded-lg min-w-0">
                                        <div className="flex items-center space-x-2 min-w-0">
                                          <PaperClipIcon className="w-4 h-4" />
                                          <div className="min-w-0">
                                            <div className="font-medium truncate max-w-[140px]">
                                              {message.fileName || 'File'}
                                            </div>
                                            {message.fileSize && (
                                              <div className="text-xs opacity-75">
                                                {(message.fileSize / 1024).toFixed(1)} KB
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        {message.fileId && !isOptimistic && (
                                          <button
                                            onClick={() => handleDownloadFile(message.fileId!, message.fileName || 'download')}
                                            disabled={downloadingFileId === message.fileId}
                                            className="p-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Download file"
                                          >
                                            {downloadingFileId === message.fileId ? (
                                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                              <ArrowDownTrayIcon className="w-4 h-4" />
                                            )}
                                          </button>
                                        )}
                                      </div>
                                      {/* Content below the file */}
                                      {message.content && message.content !== `📎 ${message.fileName}` && (
                                        <div className="mt-2 break-words">
                                          {message.content}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="break-words">{message.content}</span>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Message status and timestamp */}
                            <div className={`text-xs mt-1 flex items-center justify-between ${isCurrentUser ? 'text-green-100' : 'text-gray-500'
                              }`}>
                              <span>
                                {new Date(message.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>

                              {/* Status indicators for messages */}
                              {isCurrentUser && (
                                <div className="flex items-center space-x-1">
                                  {isOptimistic ? (
                                    // Optimistic message status
                                    <>
                                      {message.status === 'pending' && (
                                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                                      )}
                                      {message.status === 'sent' && (
                                        <CheckIcon className="w-3 h-3 text-white" />
                                      )}
                                      {message.status === 'failed' && (
                                        <button
                                          onClick={() => handleRetryMessage(message)}
                                          className="w-3 h-3 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                                          title="Retry sending message"
                                        >
                                          <span className="text-white text-xs">!</span>
                                        </button>
                                      )}
                                    </>
                                  ) : (
                                    // Real message status - show delivered/seen
                                    <>
                                      {message.isRead ? (
                                        // Message has been read (double tick)
                                        <div className="flex items-center">
                                          <CheckIconSolid className="w-3 h-3 text-white" />
                                          <CheckIconSolid className="w-3 h-3 text-white -ml-1" />
                                        </div>
                                      ) : (
                                        // Message delivered but not read (single tick)
                                        <CheckIcon className="w-3 h-3 text-white" />
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  } else {
                    return (
                      <div className="text-center text-gray-500 py-8">
                        No messages yet. Start the conversation!
                      </div>
                    );
                  }
                })()}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">

                {/* File attachment preview */}
                {selectedFile && (
                  <div className="mb-3 p-2 bg-gray-50 rounded-lg flex items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center space-x-2 min-w-0">
                      <PaperClipIcon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700 truncate max-w-[180px]">{selectedFile.name}</span>
                      <span className="text-xs text-gray-500 shrink-0">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="text-gray-400 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                  />

                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    size="sm"
                    className="px-3"
                  >
                    <PaperClipIcon className="w-4 h-4" />
                  </Button>

                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={(!newMessage.trim() && !selectedFile) || !currentConversationId}
                    size="sm"
                    className="px-3"
                  >
                    <PaperAirplaneIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
