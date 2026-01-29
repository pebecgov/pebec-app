// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { format, parseISO, isSameDay, isSameWeek, addDays, isFriday, isSaturday, isSunday } from "date-fns";
import { useRouter } from "next/navigation";
import { useMemo, JSX } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { CalendarDaysIcon, ClockIcon } from "@heroicons/react/24/solid";
import RoomAvailabilityCardComponent from "@/components/RoomAvailabilityCard";
import HolidayAnnouncementsDisplay from "@/components/HolidayWhereabout/HolidayAnnouncementsDisplay";
import { formatWorkstream } from "@/lib/formatters";
export default function StaffAnalytics() {
  const router = useRouter();
  const { user } = useUser();
  const currentUser = useQuery(api.users.getCurrentUsers);
  const convexUser = useQuery(api.users.getUserByClerkId, user?.id ? { clerkUserId: user.id } : "skip");
  const todayStr = new Date().toISOString().split("T")[0];
  const todayRoomStaff = useQuery(api.meetings.listRoomBookingsByDate, { room: "staff_conference", date: todayStr });
  const todayRoomDG = useQuery(api.meetings.listRoomBookingsByDate, { room: "dg_conference", date: todayStr });
  const allSlots = useQuery(api.meetings.getAllAvailableSlots) || [];
  const users = useQuery(api.users.getAllUsers) || [];
  const staffStream = currentUser?.staffStream;
  const today = new Date();
  const filteredSlots = useMemo(() => allSlots.filter(slot => slot.workstream === staffStream), [allSlots, staffStream]);
  const bookedSlots = filteredSlots.filter(slot => slot.bookedBy);
  const getUserInfo = id => {
    const user = users.find(u => u._id === id);
    if (!user) return {
      mdaName: "Unknown",
      fullName: "Unknown User",
      jobTitle: "",
      imageUrl: "/default-avatar.png"
    };
    return {
      mdaName: user.mdaName,
      fullName: `${user.firstName} ${user.lastName}`,
      jobTitle: user.jobTitle,
      imageUrl: user.imageUrl || "/default-avatar.png"
    };
  };
  const thisWeeksMeetings = bookedSlots.filter(slot => isSameWeek(parseISO(`${slot.date}T${slot.startTime}`), today, {
    weekStartsOn: 1
  }));
  const totalThisWeekSlots = filteredSlots.filter(slot => isSameWeek(parseISO(`${slot.date}T${slot.startTime}`), today, {
    weekStartsOn: 1
  }));
  const nextWeeksMeetings = bookedSlots.filter(slot => isSameWeek(parseISO(`${slot.date}T${slot.startTime}`), addDays(today, 7), {
    weekStartsOn: 1
  }));
  const isEndOfWeek = isFriday(today) || isSaturday(today) || isSunday(today);
  const MeetingItem = ({
    slot
  }) => {
    const start = parseISO(`${slot.date}T${slot.startTime}`);
    const user = getUserInfo(slot.bookedBy);
    let badge: JSX.Element | null = null;
    if (isSameDay(start, today)) {
      badge = <span className="ml-2 px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-200 rounded-full">
        Today
      </span>;
    } else if (isSameDay(start, addDays(today, 1))) {
      badge = <span className="ml-2 px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full">
        Tomorrow
      </span>;
    }
    return <div className="flex items-start gap-4 border rounded-xl p-4 shadow-sm bg-white hover:shadow-md transition">
      <img src={user.imageUrl} alt="User Avatar" className="w-12 h-12 rounded-full object-cover border" />
      <div className="flex-1">
        <p className="text-sm font-bold text-gray-800">{user.mdaName}</p>
        <p className="text-sm text-gray-600">
          {user.fullName} — {user.jobTitle}
        </p>
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-2">
          <div className="flex items-center gap-1">
            <CalendarDaysIcon className="h-4 w-4 text-blue-500" />
            {format(start, "PPP")}
          </div>
          <div className="flex items-center gap-1">
            <ClockIcon className="h-4 w-4 text-rose-500" />
            {format(start, "p")}
          </div>
          {badge}
        </div>
      </div>
    </div>;
  };
  if (!currentUser) return <div className="p-6 text-center text-gray-400">Loading user info...</div>;
  return (
    <div className="w-full">
      <div className="p-6 border-b border-gray-100 bg-gray-50/50">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
          <span className="p-2 bg-white rounded-lg shadow-sm">🗓️</span>
          Upcoming Meetings
        </h2>
        <p className="text-sm text-gray-500 mt-1">Detailed view of your stream's conference room bookings and availability.</p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                This Week’s Meeting
              </h3>
              {thisWeeksMeetings.length > 0 ? (
                <div className="space-y-4">
                  {thisWeeksMeetings.map(slot => <MeetingItem key={slot._id} slot={slot} />)}
                </div>
              ) : (
                <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-sm text-gray-400 font-medium">No meetings scheduled for this week.</p>
                </div>
              )}
            </div>

            {isEndOfWeek && nextWeeksMeetings.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  Upcoming Next Week
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {nextWeeksMeetings.slice(0, 2).map(slot => (
                    <div key={slot._id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 transition-hover hover:bg-white hover:shadow-sm">
                      <p className="text-sm font-bold text-gray-700 mb-1">
                        {format(parseISO(`${slot.date}T${slot.startTime}`), "MMM d, yyyy")}
                      </p>
                      <p className="text-xs text-blue-600 font-semibold mb-2">
                        {format(parseISO(`${slot.date}T${slot.startTime}`), "p")}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                        {getUserInfo(slot.bookedBy).fullName}
                      </p>
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs font-bold uppercase tracking-wider mt-2"
                  onClick={() => router.push("/staff/meetings")}
                >
                  View All Appointments
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                Slot Summary
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-xl bg-gray-50 transition-all">
                  <span className="text-sm text-gray-600">Total Slots</span>
                  <span className="text-lg font-bold text-gray-800">{totalThisWeekSlots.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-green-50/50 transition-all border border-green-100/50">
                  <span className="text-sm text-green-700">Booked</span>
                  <span className="text-lg font-bold text-green-800">{thisWeeksMeetings.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-blue-50/50 transition-all border border-blue-100/50">
                  <span className="text-sm text-blue-700">Remaining</span>
                  <span className="text-lg font-bold text-blue-800">
                    {totalThisWeekSlots.length - thisWeeksMeetings.length}
                  </span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest text-center">
                  Stream: {formatWorkstream(staffStream || "N/A")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
