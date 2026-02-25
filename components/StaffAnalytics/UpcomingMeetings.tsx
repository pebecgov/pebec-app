// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { CalendarDaysIcon, ClockIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { format, parseISO } from "date-fns";
import { formatWorkstream } from "@/lib/formatters";

interface UpcomingMeetingsProps {
    baseUrl?: string;
}

export default function UpcomingMeetings({ baseUrl = "/staff/meeting-calendar" }: UpcomingMeetingsProps) {
    const router = useRouter();
    const upcomingMeetings = useQuery(api.calendar.getUpcomingMeetings, { limit: 5 }) || [];

    return (
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <CalendarDaysIcon className="w-6 h-6 text-green-600" />
                    <h2 className="text-xl font-semibold text-gray-800">Events of the Week</h2>
                </div>
                <button
                    onClick={() => router.push(baseUrl)}
                    className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                >
                    View All
                    <ArrowRightIcon className="w-4 h-4" />
                </button>
            </div>

            {upcomingMeetings.length === 0 ? (
                <div className="text-center py-8">
                    <CalendarDaysIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No upcoming events</p>
                    <button
                        onClick={() => router.push(baseUrl)}
                        className="mt-3 text-sm text-green-600 hover:text-green-700 font-medium"
                    >
                        Create an event
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {upcomingMeetings.map((meeting) => {
                        const startDate = parseISO(meeting.date);
                        const endDate = meeting.endDate ? parseISO(meeting.endDate) : startDate;
                        const todayStr = format(new Date(), "yyyy-MM-dd");
                        const isToday = todayStr >= meeting.date && todayStr <= (meeting.endDate || meeting.date);
                        const isMultiDay = meeting.endDate && meeting.endDate !== meeting.date;

                        return (
                            <div
                                key={meeting._id}
                                className={`border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-r ${meeting.meetingType === "external" ? "from-green-50 border-l-4 border-l-green-500" : "from-blue-50 border-l-4 border-l-blue-500"} to-white`}
                                onClick={() => router.push(baseUrl)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-800 mb-1">
                                            {meeting.name}
                                        </h3>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <CalendarDaysIcon className="w-4 h-4" />
                                            <span>
                                                {isMultiDay ? (
                                                    `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`
                                                ) : (
                                                    isToday ? "Today" : format(startDate, "MMM d, yyyy")
                                                )}
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
                                        <p className="text-[10px] text-gray-500 mt-2">
                                            Created by {meeting.createdByName || "Unknown"}
                                            {meeting.createdByStaffStream && (
                                                <span className="ml-1 text-gray-400">
                                                    ({formatWorkstream(meeting.createdByStaffStream)})
                                                </span>
                                            )}
                                        </p>
                                        <div className="flex gap-1 mt-1">
                                            <span className={`text-[9px] font-bold uppercase tracking-tighter px-1 rounded ${meeting.meetingType === "external" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                                                {meeting.meetingType || "Internal"}
                                            </span>
                                        </div>
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
