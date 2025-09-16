// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChatBubbleLeftRightIcon, PaperAirplaneIcon, ArrowLeftIcon, MagnifyingGlassIcon, PaperClipIcon, ArrowDownTrayIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useConvex } from "convex/react";

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
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'staff' | 'reform_champion' | 'saber_agent' | 'mda' | 'federal' | 'deputies' | 'magistrates' | 'state_governor' | 'president' | 'vice_president' | 'world_bank' | 'ngf' | 'dmo' | 'user'>('all');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<Id<"_storage"> | null>(null);
  const [showRoleFilters, setShowRoleFilters] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current user from Convex
  const currentUser = useQuery(api.users.current);
  
  // Get messageable users
  const messageableUsers = useQuery(
    api.messages.getMessageableUsers,
    currentUser ? { currentUserId: currentUser._id } : "skip"
  );

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
  }, [messages]);

  // Filter and sort users based on search query, role filter, and last message time
  const filteredUsers = (messageableUsers || [])
    .filter(user => {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      const matchesSearch = fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (user.role || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Apply role filter
      let matchesRole = true;
      if (currentUser?.role === 'admin' || currentUser?.role === 'staff') {
        if (roleFilter === 'admin') {
          matchesRole = user.role === 'admin';
        } else if (roleFilter === 'staff') {
          matchesRole = user.role === 'staff';
        } else if (roleFilter === 'reform_champion') {
          matchesRole = user.role === 'reform_champion';
        } else if (roleFilter === 'saber_agent') {
          matchesRole = user.role === 'saber_agent';
        } else if (roleFilter === 'mda') {
          matchesRole = user.role === 'mda';
        } else if (roleFilter === 'federal') {
          matchesRole = user.role === 'federal';
        } else if (roleFilter === 'deputies') {
          matchesRole = user.role === 'deputies';
        } else if (roleFilter === 'magistrates') {
          matchesRole = user.role === 'magistrates';
        } else if (roleFilter === 'state_governor') {
          matchesRole = user.role === 'state_governor';
        } else if (roleFilter === 'president') {
          matchesRole = user.role === 'president';
        } else if (roleFilter === 'vice_president') {
          matchesRole = user.role === 'vice_president';
        } else if (roleFilter === 'world_bank') {
          matchesRole = user.role === 'world_bank';
        } else if (roleFilter === 'ngf') {
          matchesRole = user.role === 'ngf';
        } else if (roleFilter === 'dmo') {
          matchesRole = user.role === 'dmo';
        } else if (roleFilter === 'user') {
          matchesRole = user.role === 'user';
        } 
        // 'all' shows all users for admin/staff
      } else {
        // Non-admin/staff users only see staff
        matchesRole = user.role === 'staff';
      }
      
      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {
      // Sort by last message time (most recent first)
      const aTime = a.lastMessageTime || 0;
      const bTime = b.lastMessageTime || 0;
      return bTime - aTime;
    });

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
      setIsSendingMessage(true);
      
      try {
        let fileId: Id<"_storage"> | undefined;
        let fileName: string | undefined;
        let fileSize: number | undefined;
      
      // Upload file if selected
      if (selectedFile) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": selectedFile.type },
          body: selectedFile,
        });
        const { storageId } = await result.json();
        fileId = storageId;
          fileName = selectedFile.name;
          fileSize = selectedFile.size;
      }

      await sendMessage({
        conversationId: currentConversationId,
        senderId: currentUser._id,
        content: newMessage.trim() || (selectedFile ? `📎 ${selectedFile.name}` : ''),
        messageType: selectedFile ? "file" : "text",
          fileId,
          fileName,
          fileSize
      });
      
      setNewMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Error sending message:', error);
      } finally {
        setIsSendingMessage(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return `${firstName} ${lastName}`.trim() || user.email;
  };

  const getUserInitials = (user: User) => {
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return user.email[0].toUpperCase();
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
      case 'federal':
        return 'bg-red-500';
      case 'deputies':
        return 'bg-red-400';
      case 'magistrates':
        return 'bg-red-500';
      case 'state_governor':
        return 'bg-red-600';
      case 'president':
        return 'bg-red-700';
      case 'vice_president':
        return 'bg-red-600';
      
      // Blue variants
      case 'saber_agent':
        return 'bg-blue-600';
      case 'world_bank':
        return 'bg-blue-500';
      case 'ngf':
        return 'bg-blue-400';
      case 'dmo':
        return 'bg-blue-500';
      case 'user':
        return 'bg-blue-400';
      
      // Default fallback
      default:
        return 'bg-gray-500';
    }
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
                      className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                        showRoleFilters 
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
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        roleFilter === 'all' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setRoleFilter('admin')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        roleFilter === 'admin' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Admins
                    </button>
                    <button
                      onClick={() => setRoleFilter('staff')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        roleFilter === 'staff' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Staff
                    </button>
                    <button
                      onClick={() => setRoleFilter('reform_champion')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        roleFilter === 'reform_champion' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Reform Champions
                    </button>
                    <button
                      onClick={() => setRoleFilter('saber_agent')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        roleFilter === 'saber_agent' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      SABER Agents
                    </button>
                    <button
                      onClick={() => setRoleFilter('mda')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        roleFilter === 'mda' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      ReportGov Agent
                    </button>
                    <button
                      onClick={() => setRoleFilter('federal')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        roleFilter === 'federal' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Federal
                    </button>
                    <button
                      onClick={() => setRoleFilter('deputies')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        roleFilter === 'deputies' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Deputies
                    </button>
                    <button
                      onClick={() => setRoleFilter('magistrates')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        roleFilter === 'magistrates' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Magistrates
                    </button>
                    <button
                      onClick={() => setRoleFilter('state_governor')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        roleFilter === 'state_governor' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      State Governor
                    </button>
                    <button
                      onClick={() => setRoleFilter('president')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        roleFilter === 'president' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      President
                    </button>
                    <button
                      onClick={() => setRoleFilter('vice_president')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        roleFilter === 'vice_president' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Vice President
                    </button>
                    <button
                      onClick={() => setRoleFilter('world_bank')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        roleFilter === 'world_bank' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      World Bank
                    </button>
                    <button
                      onClick={() => setRoleFilter('ngf')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        roleFilter === 'ngf' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      NGF
                    </button>
                    <button
                      onClick={() => setRoleFilter('dmo')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        roleFilter === 'dmo' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      DMO
                    </button>
                    <button
                      onClick={() => setRoleFilter('user')}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        roleFilter === 'user' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Users
                    </button>
                  </div>
                )}
              </div>

              {/* Users List */}
              <div className="h-80 overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No users found
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => handleUserClick(user)}
                      className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <div className={`w-10 h-10 ${getRoleColor(user.role)} rounded-full flex items-center justify-center text-white font-semibold`}>
                              {getUserInitials(user)}
                            </div>
                            {user.isOnline && (
                              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              {user.unreadCount !== undefined && user.unreadCount > 0 && (
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              )}
                              <span className="font-medium text-gray-900">{getUserDisplayName(user)}</span>
                              {user.role && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                  {user.role}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 truncate">
                              {user.lastMessage || 'No messages yet'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
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
                  ))
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
                      <div className="text-xs text-gray-500">{selectedUser?.role}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="h-80 overflow-y-auto p-4 space-y-3">
                {messages && messages.length > 0 ? (
                  messages.map((message) => {
                    const isCurrentUser = currentUser && message.senderId === currentUser._id;
                    return (
                      <div
                        key={message._id}
                        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs px-4 py-2 rounded-lg ${
                            isCurrentUser
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <div className="text-sm">
                            {message.messageType === 'file' ? (
                              <div className="space-y-2">
                                {/* File attachment at the top */}
                                <div className="flex items-center justify-between p-2 bg-white bg-opacity-10 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <PaperClipIcon className="w-4 h-4" />
                                    <div>
                                      <div className="font-medium">{message.fileName || 'File'}</div>
                                      {message.fileSize && (
                                        <div className="text-xs opacity-75">
                                          {(message.fileSize / 1024).toFixed(1)} KB
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {message.fileId && (
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
                                  <div className="mt-2">
                                    {message.content}
                                  </div>
                                )}
                              </div>
                            ) : (
                              message.content
                            )}
                          </div>
                          <div className={`text-xs mt-1 ${
                            isCurrentUser ? 'text-green-100' : 'text-gray-500'
                          }`}>
                            {new Date(message.createdAt).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No messages yet. Start the conversation!
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                {/* File attachment preview */}
                {selectedFile && (
                  <div className="mb-3 p-2 bg-gray-50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <PaperClipIcon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700">{selectedFile.name}</span>
                      <span className="text-xs text-gray-500">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
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
                    disabled={(!newMessage.trim() && !selectedFile) || !currentConversationId || isSendingMessage}
                    size="sm"
                    className="px-3"
                  >
                    {isSendingMessage ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                    <PaperAirplaneIcon className="w-4 h-4" />
                    )}
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
