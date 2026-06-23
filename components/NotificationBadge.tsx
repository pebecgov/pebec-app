// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { BellIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotificationBadge() {
  const {
    user
  } = useUser();
  const router = useRouter();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const clerkUserId = user?.id;
  const getRolePath = () => {
    const role = user?.publicMetadata?.role;
    switch (role) {
      case "admin":
      case "staff":
      case "mda":
      case "president":
      case "vice_president":
      case "dmo":
      case "saber_agent":
        return role;
      default:
        return "user";
    }
  };
  const notificationsQuery = useQuery(api.notifications.getNotifications, clerkUserId ? {
    clerkUserId,
    limit: 20,
  } : "skip");
  const unreadCountQuery = useQuery(api.notifications.getUnreadNotificationCount, clerkUserId ? {
    clerkUserId
  } : "skip");
  const markAsReadMutation = useMutation(api.notifications.updateNotificationStatus);
  const deleteNotificationMutation = useMutation(api.notifications.deleteNotification);
  const clearAllMutation = useMutation(api.notifications.clearAllNotifications);
  const toggleNotifications = () => setNotificationsOpen(!notificationsOpen);
  const notifications = notificationsQuery || [];
  const unreadCount = unreadCountQuery ?? 0;
  
  // Function to get navigation URL based on notification type
  const getNotificationUrl = (notification: any): string | null => {
    const rolePath = getRolePath();
    
    if (notification.ticketId) {
      return `/${rolePath}/tickets/${notification.ticketId}`;
    }
    if (notification.postId) {
      return `/posts/${notification.postId}`;
    }
    if (notification.dmoReportId) {
      return `/dmo/reports`;
    }
    if (notification.taskId) {
      return `/${rolePath}/tasks`;
    }
    if (notification.meetingId) {
      return `/${rolePath}/meetings/${notification.meetingId}`;
    }
    if (notification.businessLetterId) {
      return `/${rolePath}/business-letters`;
    }
    if (notification.eventId) {
      return `/events/${notification.eventId}`;
    }
    if (notification.actionUrl) {
      return notification.actionUrl;
    }
    return null;
  };

  const handleNotificationClick = async (notification: any) => {
    const url = getNotificationUrl(notification);
    
    if (url) {
      // Mark as read if unread
      if (!notification.isRead) {
        try {
          await markAsReadMutation({
            notificationId: notification._id as Id<"notifications">
          });
        } catch (error) {
          console.error("Failed to mark notification as read:", error);
        }
      }
      
      // Close popover and navigate
      setNotificationsOpen(false);
      router.push(url);
    }
  };

  const handleDeleteNotification = async (notificationId: Id<"notifications">, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent triggering the notification click
    try {
      const exists = notifications.some(n => n._id === notificationId);
      if (!exists) return;
      await deleteNotificationMutation({
        notificationId
      });
      toast.success("Notification deleted.");
    } catch (error) {
      toast.error("Failed to delete notification.");
    }
  };

  const handleMarkAsRead = async (notificationId: Id<"notifications">, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent triggering the notification click
    try {
      await markAsReadMutation({
        notificationId
      });
    } catch (error) {
      toast.error("Failed to mark notification as read.");
    }
  };

  const pulseAnimation = unreadCount > 0 ? "animate-pulse" : "";
  return <div className="relative">
    { }
    <Popover open={notificationsOpen} onOpenChange={toggleNotifications}>
      <PopoverTrigger asChild>
        <button className="relative p-3 rounded-full bg-white shadow-md border border-gray-300 hover:bg-gray-100 transition duration-200">
          <BellIcon className="w-6 h-6 text-yellow-500" />
          {unreadCount > 0 && <div className={`absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-md ${pulseAnimation}`}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </div>}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-4 bg-white rounded-lg shadow-xl overflow-y-auto max-h-80">
        <div className="text-lg font-semibold mb-3 text-gray-700">Notifications</div>

        {notifications.length === 0 ? <div className="text-gray-500 text-sm text-center py-4">No new notifications</div> : notifications.slice(0, 7).map(notification => {
          const hasUrl = getNotificationUrl(notification) !== null;
          return (
            <div 
              key={notification._id as string} 
              className={`flex justify-between items-center p-3 border-b border-gray-200 rounded-md ${
                hasUrl ? "cursor-pointer hover:bg-blue-50" : "hover:bg-gray-50"
              } ${!notification.isRead ? "bg-blue-50/50" : ""}`}
              onClick={() => hasUrl && handleNotificationClick(notification)}
            >
              <div className="flex-1">
                <div className={`text-sm font-medium ${!notification.isRead ? "text-gray-900 font-semibold" : "text-gray-700"}`}>
                  {notification.message}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(notification.createdAt).toLocaleString()}
                </div>
                {hasUrl && (
                  <div className="text-xs text-blue-600 mt-1">
                    Click to view →
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 ml-2" onClick={(e) => e.stopPropagation()}>
                {!notification.isRead && (
                  <button 
                    onClick={(e) => handleMarkAsRead(notification._id as Id<"notifications">, e)} 
                    className="text-gray-400 hover:text-green-600 transition duration-200"
                    title="Mark as read"
                  >
                    ✓
                  </button>
                )}

                <button 
                  onClick={(e) => handleDeleteNotification(notification._id as Id<"notifications">, e)} 
                  className="text-gray-400 hover:text-red-500 transition duration-200"
                  title="Delete notification"
                >
                  ✖
                </button>
              </div>
            </div>
          );
        })}

        { }
        <Link href="/notifications">
          <Button variant="outline" className="w-full mt-4 text-sm font-medium text-blue-600 border-blue-600 hover:bg-blue-50 hover:text-blue-800">
            View All Notifications →
          </Button>
        </Link>

        { }
        {notifications.length > 0 && <button onClick={async () => {
          if (!clerkUserId) return;
          try {
            await clearAllMutation({ clerkUserId });
            toast.success("Clearing notifications...");
          } catch {
            toast.error("Failed to clear notifications.");
          }
        }} className="mt-2 w-full text-sm font-semibold text-red-600 border border-red-600 rounded-md py-2 hover:bg-red-600 hover:text-white transition duration-200">
          Clear All Notifications
        </button>}
      </PopoverContent>

    </Popover>
  </div>;
}
