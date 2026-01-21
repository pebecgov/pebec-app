// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "@/app/calendar.css";
import { format, isSameDay, parseISO } from "date-fns";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Id } from "@/convex/_generated/dataModel";
import { CalendarDaysIcon, ClockIcon, PencilIcon, TrashIcon, PlusIcon } from "@heroicons/react/24/outline";
import { formatWorkstream } from "@/lib/formatters";
import { TimePicker } from "@/components/ui/time-picker";

export default function AdminMeetingCalendarPage() {
    const { user } = useUser();
    const router = useRouter();
    const convexUser = useQuery(api.users.getUserByClerkId, user?.id ? { clerkUserId: user.id } : "skip");
    const allMeetings = useQuery(api.calendar.getCalendarMeetings, {}) || [];

    const createMeeting = useMutation(api.calendar.createCalendarMeeting);
    const updateMeeting = useMutation(api.calendar.updateCalendarMeeting);
    const deleteMeeting = useMutation(api.calendar.deleteCalendarMeeting);

    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingMeeting, setEditingMeeting] = useState<Id<"calendar_meetings"> | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [meetingToDelete, setMeetingToDelete] = useState<Id<"calendar_meetings"> | null>(null);

    // Form state
    const [meetingName, setMeetingName] = useState("");
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [endTime, setEndTime] = useState<Date | null>(null);
    const [description, setDescription] = useState("");

    // Get meetings for selected date
    const meetingsForDay = useMemo(() => {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        return allMeetings
            .filter((meeting) => meeting.date === dateStr)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [selectedDate, allMeetings]);

    // Get dates that have meetings
    const datesWithMeetings = useMemo(() => {
        return new Set(allMeetings.map((meeting) => meeting.date));
    }, [allMeetings]);

    const handleOpenCreateDialog = () => {
        setEditingMeeting(null);
        setMeetingName("");

        // Default to 9:00 AM - 10:00 AM
        const start = new Date();
        start.setHours(9, 0, 0, 0);
        const end = new Date();
        end.setHours(10, 0, 0, 0);

        setStartTime(start);
        setEndTime(end);
        setDescription("");
        setDialogOpen(true);
    };

    const handleOpenEditDialog = (meeting: any) => {
        setEditingMeeting(meeting._id);
        setMeetingName(meeting.name);

        // Convert HH:mm string to Date object
        const [sHour, sMin] = meeting.startTime.split(':').map(Number);
        const start = new Date();
        start.setHours(sHour, sMin, 0, 0);

        const [eHour, eMin] = meeting.endTime.split(':').map(Number);
        const end = new Date();
        end.setHours(eHour, eMin, 0, 0);

        setStartTime(start);
        setEndTime(end);
        setDescription(meeting.description || "");
        setDialogOpen(true);
    };

    const handleSaveMeeting = async () => {
        if (!meetingName.trim()) {
            toast.error("Please enter a meeting name");
            return;
        }

        if (!startTime || !endTime) {
            toast.error("Please select start and end times");
            return;
        }

        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const fmt = (d: Date) => {
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            return `${hours}:${minutes}`;
        };

        const startTimeStr = fmt(startTime);
        const endTimeStr = fmt(endTime);

        try {
            if (editingMeeting) {
                await updateMeeting({
                    meetingId: editingMeeting,
                    name: meetingName,
                    date: dateStr,
                    startTime: startTimeStr,
                    endTime: endTimeStr,
                    description: description || undefined,
                });
                toast.success("Meeting updated successfully");
            } else {
                await createMeeting({
                    name: meetingName,
                    date: dateStr,
                    startTime: startTimeStr,
                    endTime: endTimeStr,
                    description: description || undefined,
                });
                toast.success("Meeting created successfully");
            }
            setDialogOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to save meeting");
        }
    };

    const handleDeleteMeeting = async () => {
        if (!meetingToDelete) return;

        try {
            await deleteMeeting({ meetingId: meetingToDelete });
            toast.success("Meeting deleted successfully");
            setDeleteDialogOpen(false);
            setMeetingToDelete(null);
        } catch (error: any) {
            toast.error(error.message || "Failed to delete meeting");
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="mb-4">
                <Button variant="outline" onClick={() => router.push("/admin")}>
                    ← Back to Dashboard
                </Button>
            </div>

            <div className="flex items-center gap-3 mb-6">
                <CalendarDaysIcon className="w-8 h-8 text-green-600" />
                <h1 className="text-3xl font-bold text-gray-800">Meeting Calendar</h1>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Calendar Section */}
                <div className="bg-white rounded-xl shadow-lg w-full lg:w-1/3 p-6">
                    <div className="mb-4">
                        <Button className="w-full" onClick={handleOpenCreateDialog}>
                            <PlusIcon className="w-5 h-5 mr-2" />
                            Create Meeting
                        </Button>
                    </div>

                    <Calendar
                        onChange={(date) => setSelectedDate(date as Date)}
                        value={selectedDate}
                        tileContent={({ date }) => {
                            const dateStr = format(date, "yyyy-MM-dd");
                            if (datesWithMeetings.has(dateStr)) {
                                return (
                                    <div className="flex justify-center mt-1">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                    </div>
                                );
                            }
                            return null;
                        }}
                        className="border-0"
                    />
                </div>

                {/* Meetings List Section */}
                <div className="flex-1 bg-white p-6 rounded-xl shadow-lg">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">
                        Meetings for {format(selectedDate, "EEEE, MMMM d, yyyy")}
                    </h2>

                    {meetingsForDay.length === 0 ? (
                        <div className="text-center py-12">
                            <CalendarDaysIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">No meetings scheduled for this day</p>
                            <Button className="mt-4" onClick={handleOpenCreateDialog}>
                                Create First Meeting
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {meetingsForDay.map((meeting) => (
                                <div
                                    key={meeting._id}
                                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-gradient-to-r from-green-50 to-white"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg text-gray-800 mb-2">
                                                {meeting.name}
                                            </h3>
                                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                                <ClockIcon className="w-4 h-4" />
                                                <span>
                                                    {meeting.startTime} - {meeting.endTime}
                                                </span>
                                            </div>
                                            {meeting.description && (
                                                <p className="text-sm text-gray-600 mt-2">{meeting.description}</p>
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
                                        {meeting.createdBy === convexUser?._id && (
                                            <div className="flex gap-2 ml-4">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleOpenEditDialog(meeting)}
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => {
                                                        setMeetingToDelete(meeting._id);
                                                        setDeleteDialogOpen(true);
                                                    }}
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Create/Edit Meeting Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingMeeting ? "Edit Meeting" : "Create New Meeting"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Meeting Name *
                            </label>
                            <input
                                type="text"
                                value={meetingName}
                                onChange={(e) => setMeetingName(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="e.g., Team Standup"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Date
                            </label>
                            <input
                                type="text"
                                value={format(selectedDate, "MMMM d, yyyy")}
                                disabled
                                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Start Time *
                                </label>
                                <TimePicker value={startTime} onChange={setStartTime} placeholder="Start time" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    End Time *
                                </label>
                                <TimePicker value={endTime} onChange={setEndTime} placeholder="End time" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description (Optional)
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="Add meeting details..."
                            />
                        </div>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveMeeting}>
                            {editingMeeting ? "Update Meeting" : "Create Meeting"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Meeting</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600">
                        Are you sure you want to delete this meeting? This action cannot be undone.
                    </p>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteMeeting}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Toaster position="top-center" />
        </div>
    );
}
