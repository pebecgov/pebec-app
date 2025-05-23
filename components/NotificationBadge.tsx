// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { BellIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import Link from "next/link";
export default function NotificationBadge() {
  const {
    user
  } = useUser();
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
        return role;
      default:
        return "user";
    }
  };
  const notificationsQuery = useQuery(api.notifications.getNotifications, clerkUserId ? {
    clerkUserId
  } : "skip") || [];
  const markAsReadMutation = useMutation(api.notifications.updateNotificationStatus);
  const deleteNotificationMutation = useMutation(api.notifications.deleteNotification);
  const toggleNotifications = () => setNotificationsOpen(!notificationsOpen);
  const notifications = notificationsQuery || [];
  const unreadCount = useMemo(() => {
    return notifications.filter(notification => !notification.isRead).length;
  }, [notifications]);
  const handleDeleteNotification = async (notificationId: Id<"notifications">) => {
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
  const pulseAnimation = unreadCount > 0 ? "animate-pulse" : "";
  return <div className="relative">
      {}
      <Popover open={notificationsOpen} onOpenChange={toggleNotifications}>
        <PopoverTrigger asChild>
          <button className="relative p-3 rounded-full bg-white shadow-md border border-gray-300 hover:bg-gray-100 transition duration-200">
            <BellIcon className="w-6 h-6 text-gray-700" />
            {unreadCount > 0 && <div className={`absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-md ${pulseAnimation}`}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </div>}
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-96 p-4 bg-white rounded-lg shadow-xl overflow-y-auto max-h-80">
  <div className="text-lg font-semibold mb-3 text-gray-700">Notifications</div>

  {notifications.length === 0 ? <div className="text-gray-500 text-sm text-center py-4">No new notifications</div> : notifications.slice(0, 7).map(notification => <div key={notification._id as string} className="flex justify-between items-center p-3 border-b border-gray-200 hover:bg-gray-50 rounded-md">
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-700">{notification.message}</div>
          <div className="text-xs text-gray-500">
            {new Date(notification.createdAt).toLocaleString()}
          </div>

          {notification.ticketId && <Link href={`/${getRolePath()}/tickets/${notification.ticketId}`} passHref>
              <Button variant="link" className="text-blue-600 text-xs hover:underline">
                Go to Ticket →
              </Button>
            </Link>}

          {notification.postId && <Link href={`/posts/${notification.postId}`} passHref>
              <Button variant="link" className="text-blue-600 text-xs hover:underline">
                Go to Post →
              </Button>
            </Link>}
        </div>

        {}
        <button onClick={() => markAsReadMutation({
            notificationId: notification._id as Id<"notifications">
          })} className="text-gray-400 hover:text-green-600 transition duration-200">
          ✓
        </button>

        {}
        <button onClick={() => handleDeleteNotification(notification._id as Id<"notifications">)} className="text-gray-400 hover:text-red-500 transition duration-200 ml-2">
          ✖
        </button>
      </div>)}

  {}
  <Link href="/notifications">
    <Button variant="outline" className="w-full mt-4 text-sm font-medium text-blue-600 border-blue-600 hover:bg-blue-50 hover:text-blue-800">
      View All Notifications →
    </Button>
  </Link>

  {}
  {notifications.length > 0 && <button onClick={() => {
          notifications.forEach(async notification => {
            await handleDeleteNotification(notification._id as Id<"notifications">);
          });
        }} className="mt-2 w-full text-sm font-semibold text-red-600 border border-red-600 rounded-md py-2 hover:bg-red-600 hover:text-white transition duration-200">
      Clear All Notifications
    </button>}
      </PopoverContent>

      </Popover>
    </div>;
}
