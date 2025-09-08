// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getNextWorkingDays, formatDateForDisplay, formatDateForAPI, isWorkingDay } from "@/lib/dateUtils";

interface RoomAvailabilityCardProps {
  title: string;
  bookings?: any[]; // Keep for backward compatibility
  href: string;
  room?: "staff_conference" | "dg_conference"; // Make optional for backward compatibility
}

export default function RoomAvailabilityCard({ title, bookings, href, room }: RoomAvailabilityCardProps) {
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

  const isToday = selectedDay.toDateString() === new Date().toDateString();
  
  return (
    <div className="bg-white border rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-md font-semibold text-gray-800">
          {title} — {formatDateForDisplay(selectedDay)}
          {isToday && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Today</span>}
        </h3>
        <a href={href} className="text-sm cursor-pointer text-green-600 hover:underline">Book</a>
      </div>

      {/* Day Navigation */}
      <div className="bg-gray-50 p-3 rounded-lg mb-4">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => navigateDay('prev')}
            className="flex items-center gap-1 px-3 py-1 bg-white border rounded-md hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Previous day</span>
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1 bg-green-100 text-green-700 border border-green-200 rounded-md hover:bg-green-200 transition-colors text-sm font-medium"
          >
            Today
          </button>
          <button
            onClick={() => navigateDay('next')}
            className="flex items-center gap-1 px-3 py-1 bg-white border rounded-md hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm">Next day</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="text-center">
          <span className="text-sm font-medium text-gray-700">
            {formatDateForDisplay(selectedDay)}
          </span>
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
            <p className="text-xs text-gray-400 mt-1">8:00 AM - 5:00 PM</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {displayBookings.map((b) => (
              <li key={b._id} className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{formatRange(b)}</span>
                  <span 
                    className={`text-xs font-medium capitalize px-2 py-1 rounded-full ${
                      (b.meetingType || "internal") === "internal" 
                        ? "bg-green-100 text-green-800" 
                        : "bg-red-100 text-red-800"
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
