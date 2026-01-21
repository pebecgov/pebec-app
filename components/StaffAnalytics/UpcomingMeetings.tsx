// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { CalendarDaysIcon, ClockIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { format, parseISO } from "date-fns";
import { formatWorkstream } from "@/lib/formatters";

export default function UpcomingMeetings() {
    const router = useRouter();
    const upcomingMeetings = useQuery(api.calendar.getUpcomingMeetings, { limit: 5 }) || [];

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <CalendarDaysIcon className="w-6 h-6 text-green-600" />
                    <h2 className="text-xl font-semibold text-gray-800">Upcoming Meetings</h2>
                </div>
                <button
                    onClick={() => router.push("/staff/meeting-calendar")}
                    className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                >
                    View All
                    <ArrowRightIcon className="w-4 h-4" />
                </button>
            </div>

            {upcomingMeetings.length === 0 ? (
                <div className="text-center py-8">
                    <CalendarDaysIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No upcoming meetings</p>
                    <button
                        onClick={() => router.push("/staff/meeting-calendar")}
                        className="mt-3 text-sm text-green-600 hover:text-green-700 font-medium"
                    >
                        Create a meeting
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {upcomingMeetings.map((meeting) => {
                        const meetingDate = parseISO(meeting.date);
                        const isToday = format(new Date(), "yyyy-MM-dd") === meeting.date;

                        return (
                            <div
                                key={meeting._id}
                                className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-r from-green-50 to-white"
                                onClick={() => router.push("/staff/meeting-calendar")}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-800 mb-1">
                                            {meeting.name}
                                        </h3>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <CalendarDaysIcon className="w-4 h-4" />
                                            <span>
                                                {isToday ? "Today" : format(meetingDate, "MMM d, yyyy")}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                            <ClockIcon className="w-4 h-4" />
                                            <span>
                                                {meeting.startTime} - {meeting.endTime}
                                            </span>
                                        </div>
                                        {meeting.description && (
                                            <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                                                {meeting.description}
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-500 mt-2">
                                            Created by {meeting.createdByName || "Unknown"}
                                            {meeting.createdByStaffStream && (
                                                <span className="ml-1 text-gray-400">
                                                    ({formatWorkstream(meeting.createdByStaffStream)})
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    {isToday && (
                                        <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                                            Today
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
