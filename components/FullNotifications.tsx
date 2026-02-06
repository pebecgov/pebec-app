// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function FullNotifications() {
  const {
    user
  } = useUser();
  const router = useRouter();
  const clerkUserId = user?.id || "";
  const notifications = useQuery(api.notifications.getNotifications, clerkUserId ? {
    clerkUserId
  } : "skip") || [];
  const markAsRead = useMutation(api.notifications.updateNotificationStatus);
  const deleteNotification = useMutation(api.notifications.deleteNotification);
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
          await markAsRead({
            notificationId: notification._id
          });
        } catch (error) {
          console.error("Failed to mark notification as read:", error);
        }
      }
      
      // Navigate to the page
      router.push(url);
    }
  };

  const handleDelete = async (id: Id<"notifications">, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent triggering the notification click
    try {
      await deleteNotification({
        notificationId: id
      });
      toast.success("Notification deleted.");
    } catch (error) {
      toast.error("Failed to delete notification.");
    }
  };

  const handleMarkAsRead = async (id: Id<"notifications">, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent triggering the notification click
    try {
      await markAsRead({
        notificationId: id
      });
    } catch (error) {
      toast.error("Failed to mark notification as read.");
    }
  };

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);
  return <div className="max-w-4xl mx-auto px-4 py-8">
    <h1 className="text-2xl font-bold mb-6">All Notifications ({notifications.length})</h1>

    {notifications.length === 0 ? <p className="text-gray-500">You have no notifications.</p> : <ul className="space-y-4">
      {notifications.map(notification => {
        const hasUrl = getNotificationUrl(notification) !== null;
        return (
          <li 
            key={notification._id as string} 
            className={`border rounded-md p-4 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center ${
              hasUrl ? "cursor-pointer hover:bg-blue-50 transition-colors" : "bg-white"
            } ${!notification.isRead ? "bg-blue-50/50 border-blue-200" : "bg-white"}`}
            onClick={() => hasUrl && handleNotificationClick(notification)}
          >
            <div className="flex-1">
              <div className={`font-medium mb-1 ${!notification.isRead ? "text-gray-900 font-semibold" : "text-gray-800"}`}>
                {notification.message}
              </div>
              <div className="text-xs text-gray-500 mb-2">
                {new Date(notification.createdAt).toLocaleString()}
              </div>
              {hasUrl && (
                <div className="text-sm text-blue-600 font-medium">
                  Click to view →
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-2 sm:mt-0" onClick={(e) => e.stopPropagation()}>
              {!notification.isRead && (
                <Button 
                  size="sm" 
                  onClick={(e) => handleMarkAsRead(notification._id, e)}
                >
                  Mark as Read
                </Button>
              )}
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={(e) => handleDelete(notification._id, e)}
              >
                Delete
              </Button>
            </div>
          </li>
        );
      })}
    </ul>}
  </div>;
}