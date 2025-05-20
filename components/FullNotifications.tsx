"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useMemo } from "react";
import { toast } from "sonner";

export default function FullNotifications() {
  const { user } = useUser();
  const clerkUserId = user?.id || "";
  const notifications = useQuery(
    api.notifications.getNotifications,
    clerkUserId ? { clerkUserId } : "skip"
  ) || [];

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
        return role;
      default:
        return "user";
    }
  };

  const handleDelete = async (id: Id<"notifications">) => {
    try {
      await deleteNotification({ notificationId: id });
      toast.success("Notification deleted.");
    } catch (error) {
      toast.error("Failed to delete notification.");
    }
  };

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">All Notifications ({notifications.length})</h1>

      {notifications.length === 0 ? (
        <p className="text-gray-500">You have no notifications.</p>
      ) : (
        <ul className="space-y-4">
          {notifications.map((notification) => (
            <li
              key={notification._id as string}
              className="border rounded-md p-4 shadow-sm bg-white flex flex-col sm:flex-row justify-between sm:items-center"
            >
              <div>
                <div className="font-medium text-gray-800 mb-1">{notification.message}</div>
                <div className="text-xs text-gray-500 mb-2">{new Date(notification.createdAt).toLocaleString()}</div>
                {notification.ticketId && (
                  <Link
                    href={`/${getRolePath()}/tickets/${notification.ticketId}`}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    Go to Ticket →
                  </Link>
                )}
                {notification.postId && (
                  <Link
                    href={`/posts/${notification.postId}`}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    Go to Post →
                  </Link>
                )}
              </div>

              <div className="flex gap-2 mt-2 sm:mt-0">
                {!notification.isRead && (
                  <Button
                    size="sm"
                    onClick={() => markAsRead({ notificationId: notification._id })}
                  >
                    Mark as Read
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(notification._id)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
