// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { getNextWorkingDays, formatDateForDisplay, formatDateForAPI, isWorkingDay } from "@/lib/dateUtils";
import { format } from "date-fns";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface RoomAvailabilityCardProps {
  title: string;
  bookings?: any[]; // Keep for backward compatibility
  href: string;
  room?: "staff_conference" | "dg_conference"; // Make optional for backward compatibility
  showBookButton?: boolean; // Make book button optional
}

export default function RoomAvailabilityCard({ title, bookings, href, room, showBookButton = true }: RoomAvailabilityCardProps) {
  const { user } = useUser();
  const convexUser = useQuery(api.users.getUserByClerkId, user?.id ? { clerkUserId: user.id } : "skip");
  const deleteBooking = useMutation(api.meetings.deleteRoomBooking);
  const [selectedDay, setSelectedDay] = useState(new Date());

  // Get next 5 working days from today
  const workingDays = useMemo(() => {
    return getNextWorkingDays(new Date(), 5);
  }, []);

  // Get bookings for the selected day
  const selectedDateStr = formatDateForAPI(selectedDay);
  const dayBookings = useQuery(
    api.meetings.listRoomBookingsByDate,
    room && selectedDateStr ? { room, date: selectedDateStr } : "skip"
  ) || [];

  // Fallback to provided bookings if no room specified (for backward compatibility)
  const displayBookings = room ? dayBookings : (bookings || []);
  const isLoading = room ? dayBookings === undefined : false;


  const formatRange = (b: any) => `${b.startTime} - ${b.endTime}`;

  // Get all unique attendee IDs from all bookings
  const allAttendeeIds = useMemo(() => {
    return displayBookings
      .filter(b => b.attendees && b.attendees.length > 0)
      .flatMap(b => b.attendees)
      .filter((id): id is Id<"users"> => id !== undefined)
      .filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates
  }, [displayBookings]);

  const attendeeUsers = useQuery(
    api.meetings.getUsersByIds,
    allAttendeeIds.length > 0 ? { userIds: allAttendeeIds as Id<"users">[] } : "skip"
  ) || [];

  const getAttendeeNames = (attendeeIds: string[]) => {
    if (!attendeeIds || attendeeIds.length === 0) return [];
    return attendeeIds.map(id => {
      const user = attendeeUsers.find(u => u && u._id === id);
      return user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email : "Unknown";
    });
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDay);
    if (direction === 'prev') {
      // Go back 1 working day
      do {
        newDate.setDate(newDate.getDate() - 1);
      } while (!isWorkingDay(newDate));
    } else {
      // Go forward 1 working day
      do {
        newDate.setDate(newDate.getDate() + 1);
      } while (!isWorkingDay(newDate));
    }
    setSelectedDay(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    // If today is weekend, go to next Monday
    if (!isWorkingDay(today)) {
      const nextMonday = new Date(today);
      nextMonday.setDate(today.getDate() + (1 + 7 - today.getDay()) % 7);
      setSelectedDay(nextMonday);
    } else {
      setSelectedDay(today);
    }
  };

  const handleDelete = async (bookingId: string) => {
    if (!convexUser?._id) return;
    try {
      await deleteBooking({ bookingId: bookingId as any, requesterId: convexUser._id });
      toast.success("Booking deleted successfully");
    } catch (e: any) {
      toast.error("Failed to delete booking. Please try again.");
    }
  };

  const isToday = selectedDay.toDateString() === new Date().toDateString();

  return (
    <div className="w-full bg-white border rounded-2xl p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-gray-800">{title}</h3>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm text-gray-500">{formatDateForDisplay(selectedDay)}</p>
            {isToday && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-800">
                Today
              </span>
            )}
          </div>
        </div>
        {showBookButton && (
          <a
            href={href}
            className="shrink-0 rounded-md border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
          >
            Book
          </a>
        )}
      </div>

      {/* Day Navigation */}
      <div className="mb-4 rounded-lg border bg-gray-50 p-2.5">
        <div className="grid grid-cols-[auto,1fr,auto] items-center gap-2">
          <button
            onClick={() => navigateDay('prev')}
            className="flex items-center justify-center gap-1 rounded-md border bg-white px-2 py-1 text-xs text-gray-700 transition-colors hover:bg-gray-100"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Previous</span>
          </button>
          <div className="text-center">
            <span className="text-xs font-semibold text-gray-700 sm:text-sm">
              {formatDateForDisplay(selectedDay)}
            </span>
          </div>
          <button
            onClick={() => navigateDay('next')}
            className="flex items-center justify-center gap-1 rounded-md border bg-white px-2 py-1 text-xs text-gray-700 transition-colors hover:bg-gray-100"
          >
            <span>Next</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Day's Bookings */}
      <div>
        {isLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Loading bookings...</p>
          </div>
        ) : displayBookings.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">Available all day</p>
            <p className="text-xs text-gray-400 mt-1">10:00 AM - 5:00 PM</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {displayBookings.map((b) => (
              <li key={b._id} className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{formatRange(b)}</span>
                  <span
                    className={`text-xs font-medium capitalize px-2 py-1 rounded-full ${(b.meetingType || "internal") === "internal"
                      ? "bg-white text-gray-700"
                      : "bg-black text-white"
                      }`}
                  >
                    {(b.meetingType || "internal") === "internal" ? "Internal" : "External"}
                  </span>
                </div>
                {b.title && (
                  <p className="text-gray-600 mb-1">{b.title}</p>
                )}
                {b.description && (
                  <p className="text-xs text-gray-500 mb-1">{b.description}</p>
                )}
                {b.attendees && b.attendees.length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs text-gray-500">
                      Attendees ({b.attendees.length}): {
                        attendeeUsers.length > 0
                          ? getAttendeeNames(b.attendees).join(", ")
                          : "Loading..."
                      }
                    </span>
                  </div>
                )}
                {b.creatorName && (
                  <div className="mt-2">
                    <span className="text-xs text-gray-500">
                      Booked by: <span className="font-medium text-gray-700">{b.creatorName}</span>
                    </span>
                  </div>
                )}
                {b.createdAt && (
                  <div className="mt-2 text-xs text-gray-400 flex items-center justify-between">
                    <span>Booked on {format(new Date(b.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
                    {(convexUser?._id === b.createdBy || convexUser?.role === "admin") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(b._id)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div >
  );
}
