"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  format,
  parseISO,
  isSameDay,
  isSameWeek,
  addDays,
  isFriday,
  isSaturday,
  isSunday,
} from "date-fns";
import { useMemo, JSX } from "react";
import { CalendarDaysIcon, ClockIcon } from "@heroicons/react/24/solid";

export default function StaffAnalytics() {
  const currentUser = useQuery(api.users.getCurrentUsers);
  const allSlots = useQuery(api.meetings.getAllAvailableSlots) || [];
  const users = useQuery(api.users.getAllUsers) || [];

  const staffStream = currentUser?.staffStream;
  const today = new Date();

  const filteredSlots = useMemo(
    () => allSlots.filter((slot) => slot.workstream === staffStream),
    [allSlots, staffStream]
  );

  const bookedSlots = filteredSlots.filter((slot) => slot.bookedBy);

  const getUserInfo = (id) => {
    const user = users.find((u) => u._id === id);
    if (!user)
      return {
        mdaName: "Unknown",
        fullName: "Unknown User",
        jobTitle: "",
        imageUrl: "/default-avatar.png",
      };

    return {
      mdaName: user.mdaName,
      fullName: `${user.firstName} ${user.lastName}`,
      jobTitle: user.jobTitle,
      imageUrl: user.imageUrl || "/default-avatar.png",
    };
  };

  const thisWeeksMeetings = bookedSlots.filter((slot) =>
    isSameWeek(parseISO(`${slot.date}T${slot.startTime}`), today, {
      weekStartsOn: 1,
    })
  );

  const totalThisWeekSlots = filteredSlots.filter((slot) =>
    isSameWeek(parseISO(`${slot.date}T${slot.startTime}`), today, {
      weekStartsOn: 1,
    })
  );

  const nextWeeksMeetings = bookedSlots.filter((slot) =>
    isSameWeek(parseISO(`${slot.date}T${slot.startTime}`), addDays(today, 7), {
      weekStartsOn: 1,
    })
  );

  const isEndOfWeek = isFriday(today) || isSaturday(today) || isSunday(today);

  const MeetingItem = ({ slot }) => {
    const start = parseISO(`${slot.date}T${slot.startTime}`);
    const user = getUserInfo(slot.bookedBy);

    let badge: JSX.Element | null = null;
    if (isSameDay(start, today)) {
      badge = (
        <span className="ml-2 px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-200 rounded-full">
          Today
        </span>
      );
    } else if (isSameDay(start, addDays(today, 1))) {
      badge = (
        <span className="ml-2 px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full">
          Tomorrow
        </span>
      );
    }

    return (
      <div className="flex items-start gap-4 border rounded-xl p-4 shadow-sm bg-white hover:shadow-md transition">
        <img
          src={user.imageUrl}
          alt="User Avatar"
          className="w-12 h-12 rounded-full object-cover border"
        />
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
      </div>
    );
  };

  if (!currentUser)
    return <div className="p-6 text-center text-gray-400">Loading user info...</div>;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-10">
      <h2 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3">
        <span role="img" aria-label="chart">
          🗓️
        </span>
        Upcoming Meetings
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-50 border rounded-2xl p-6 shadow-sm space-y-6">
            <h3 className="text-lg font-semibold text-gray-800">
              🗓️ This Week’s Meetings
            </h3>
            {thisWeeksMeetings.length > 0 ? (
              thisWeeksMeetings.map((slot) => (
                <MeetingItem key={slot._id} slot={slot} />
              ))
            ) : (
              <p className="text-sm text-gray-400">
                No meetings scheduled for this week.
              </p>
            )}
          </div>

          {isEndOfWeek && nextWeeksMeetings.length > 0 && (
            <div className="bg-gray-50 border rounded-2xl p-4 shadow-sm space-y-4">
              <h3 className="text-md font-semibold text-gray-800">
                🔜 Upcoming Next Week
              </h3>
              {nextWeeksMeetings.slice(0, 2).map((slot) => (
                <div
                  key={slot._id}
                  className="border rounded-lg p-3 bg-white shadow-sm"
                >
                  <p className="text-sm font-medium text-gray-700">
                    {format(parseISO(`${slot.date}T${slot.startTime}`), "PPP p")}
                  </p>
                  <p className="text-xs text-gray-500">
                    {getUserInfo(slot.bookedBy).fullName}
                  </p>
                </div>
              ))}
              <a
                href="/staff/meetings"
                className="block text-center text-sm font-semibold text-blue-600 hover:text-blue-800 transition"
              >
                ➕ View All Meetings
              </a>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <h3 className="text-md font-semibold text-gray-800 mb-4">
              📈 Weekly Slot Summary
            </h3>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                Total Slots:{" "}
                <span className="font-bold">{totalThisWeekSlots.length}</span>
              </p>
              <p>
                Booked Slots:{" "}
                <span className="font-bold">{thisWeeksMeetings.length}</span>
              </p>
              <p>
                Remaining Slots:{" "}
                <span className="font-bold">
                  {totalThisWeekSlots.length - thisWeeksMeetings.length}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
