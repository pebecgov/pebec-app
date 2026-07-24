// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "@/app/calendar.css";
import { format, isSameDay, parseISO } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Id } from "@/convex/_generated/dataModel";
import { CalendarDaysIcon, ClockIcon, PencilIcon, TrashIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { formatWorkstream } from "@/lib/formatters";
import { TimePicker } from "@/components/ui/time-picker";

export default function StaffMeetingCalendarPage() {
    const { user } = useUser();
    const router = useRouter();
    const convexUser = useQuery(api.users.getUserByClerkId, user?.id ? { clerkUserId: user.id } : "skip");
    const allMeetings = useQuery(api.calendar.getCalendarMeetings, {}) || [];
    const allUsers = useQuery(api.users.getAllUsers) || [];
    const staffMembers = useMemo(() =>
        allUsers
            .filter(u => u.role === "staff" || u.role === "admin")
            .sort((a, b) => {
                const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
                const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
                return nameA.localeCompare(nameB);
            }),
        [allUsers]
    );

    const createMeeting = useMutation(api.calendar.createCalendarMeeting);
    const updateMeeting = useMutation(api.calendar.updateCalendarMeeting);
    const deleteMeeting = useMutation(api.calendar.deleteCalendarMeeting);

    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [meetingDate, setMeetingDate] = useState<Date>(new Date());
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingMeeting, setEditingMeeting] = useState<Id<"calendar_meetings"> | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [meetingToDelete, setMeetingToDelete] = useState<Id<"calendar_meetings"> | null>(null);

    const [meetingName, setMeetingName] = useState("");
    const [meetingEndDate, setMeetingEndDate] = useState<Date | null>(null);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [endTime, setEndTime] = useState<Date | null>(null);
    const [description, setDescription] = useState("");
    const [meetingType, setMeetingType] = useState<"internal" | "external">("external");
    const [internalParticipants, setInternalParticipants] = useState<{ type: "staff" | "workstream", id: string, name: string }[]>([]);
    const [externalParticipants, setExternalParticipants] = useState<string[]>([]);
    const [newExternalParticipant, setNewExternalParticipant] = useState("");

    const WORKSTREAMS = [
        "account",
        "receptionist",
        "auditor",
        "communications",
        "investments",
        "innovation",
        "judiciary",
        "regulatory",
        "sub_national",
        "logistics"
    ];

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
        setMeetingDate(selectedDate);

        // Default to 10:00 AM - 11:00 AM
        const start = new Date();
        start.setHours(10, 0, 0, 0);
        const end = new Date();
        end.setHours(11, 0, 0, 0);

        setStartTime(start);
        setEndTime(end);
        setMeetingEndDate(selectedDate);
        setDescription("");
        setMeetingType("external");
        setInternalParticipants([]);
        setExternalParticipants([]);
        setNewExternalParticipant("");
        setDialogOpen(true);
    };

    const handleOpenEditDialog = (meeting: any) => {
        setEditingMeeting(meeting._id);
        setMeetingName(meeting.name);
        setMeetingDate(parseISO(meeting.date));

        // Convert HH:mm string to Date object
        const [sHour, sMin] = meeting.startTime.split(':').map(Number);
        const start = new Date();
        start.setHours(sHour, sMin, 0, 0);

        const [eHour, eMin] = meeting.endTime.split(':').map(Number);
        const end = new Date();
        end.setHours(eHour, eMin, 0, 0);

        setStartTime(start);
        setEndTime(end);
        setMeetingEndDate(meeting.endDate ? parseISO(meeting.endDate) : parseISO(meeting.date));
        setDescription(meeting.description || "");
        setMeetingType(meeting.meetingType || "external");
        setInternalParticipants(meeting.internalParticipants || []);
        setExternalParticipants(meeting.externalParticipants || []);
        setNewExternalParticipant("");
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

        const fmt = (d: Date) => {
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            return `${hours}:${minutes}`;
        };

        const dateStr = format(meetingDate, "yyyy-MM-dd");
        const endDateStr = meetingEndDate ? format(meetingEndDate, "yyyy-MM-dd") : dateStr;
        const startTimeStr = fmt(startTime);
        const endTimeStr = fmt(endTime);

        try {
            if (editingMeeting) {
                await updateMeeting({
                    meetingId: editingMeeting,
                    name: meetingName,
                    date: dateStr,
                    endDate: endDateStr,
                    startTime: startTimeStr,
                    endTime: endTimeStr,
                    description: description || undefined,
                    meetingType,
                    internalParticipants: internalParticipants.length > 0 ? internalParticipants : undefined,
                    externalParticipants: externalParticipants.length > 0 ? externalParticipants : undefined,
                });
                toast.success("Meeting updated successfully");
            } else {
                await createMeeting({
                    name: meetingName,
                    date: dateStr,
                    endDate: endDateStr,
                    startTime: startTimeStr,
                    endTime: endTimeStr,
                    description: description || undefined,
                    meetingType,
                    internalParticipants: internalParticipants.length > 0 ? internalParticipants : undefined,
                    externalParticipants: externalParticipants.length > 0 ? externalParticipants : undefined,
                });
                toast.success("Meeting created successfully");
            }
            setSelectedDate(meetingDate);
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

    const showTimePickers = !meetingEndDate || isSameDay(meetingDate, meetingEndDate);

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center gap-3 mb-6">
                <CalendarDaysIcon className="w-8 h-8 text-green-600" />
                <h1 className="text-3xl font-bold text-gray-800">Calendar</h1>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Calendar Section */}
                <div className="bg-white rounded-xl shadow-lg w-full lg:w-1/3 p-6">
                    <div className="mb-4">
                        <Button className="w-full" onClick={handleOpenCreateDialog}>
                            <PlusIcon className="w-5 h-5 mr-2" />
                            Create Event
                        </Button>
                    </div>

                    <Calendar
                        onChange={(date) => setSelectedDate(date as Date)}
                        value={selectedDate}
                        tileContent={({ date }) => {
                            const dateStr = format(date, "yyyy-MM-dd");
                            if (datesWithMeetings.has(dateStr)) {
                                const dayMeetings = allMeetings.filter(m => m.date === dateStr);
                                const hasExternal = dayMeetings.some(m => m.meetingType === "external");
                                const hasInternal = dayMeetings.some(m => m.meetingType === "internal");

                                return (
                                    <div className="flex justify-center mt-1 gap-1">
                                        {hasInternal && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                        {hasExternal && <div className="w-2 h-2 rounded-full bg-green-500" />}
                                        {!hasInternal && !hasExternal && <div className="w-2 h-2 rounded-full bg-green-500" />}
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
                        Events for {format(selectedDate, "EEEE, MMMM d, yyyy")}
                    </h2>

                    {meetingsForDay.length === 0 ? (
                        <div className="text-center py-12">
                            <CalendarDaysIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">No events scheduled for this day</p>
                            <Button className="mt-4" onClick={handleOpenCreateDialog}>
                                <PlusIcon className="w-5 h-5 mr-2" />New
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {meetingsForDay.map((meeting) => (
                                <div
                                    key={meeting._id}
                                    className={`border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-gradient-to-r ${meeting.meetingType === "external" ? "from-green-50 border-l-4 border-l-green-500" : "from-blue-50 border-l-4 border-l-blue-500"} to-white`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg text-gray-800 mb-2">
                                                {meeting.name}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-1">
                                                <div className="flex items-center gap-2">
                                                    <ClockIcon className="w-4 h-4" />
                                                    <span>
                                                        {meeting.startTime} - {meeting.endTime}
                                                    </span>
                                                </div>
                                                {meeting.endDate && meeting.endDate !== meeting.date && (
                                                    <div className="flex items-center gap-2 bg-white/50 px-2 py-0.5 rounded border border-gray-100 font-medium text-xs">
                                                        <CalendarDaysIcon className="w-3.5 h-3.5 text-green-600" />
                                                        <span>Ends: {format(parseISO(meeting.endDate), "MMM d, yyyy")}</span>
                                                    </div>
                                                )}
                                            </div>
                                            {meeting.description && (
                                                <p className="text-sm text-gray-600 mt-2">{meeting.description}</p>
                                            )}

                                            <div className="mt-2 text-xs text-gray-500">
                                                <span>Created by {meeting.createdByName || "Unknown"}</span>
                                                {meeting.createdByStaffStream && (
                                                    <span className="ml-1 text-gray-400">
                                                        ({formatWorkstream(meeting.createdByStaffStream)})
                                                    </span>
                                                )}
                                            </div>

                                            {(meeting.internalParticipants?.length || meeting.externalParticipants?.length) && (
                                                <div className="mt-3 space-y-2">
                                                    {meeting.internalParticipants && meeting.internalParticipants.length > 0 && (
                                                        <div className="flex flex-wrap gap-2">
                                                            {meeting.internalParticipants.map((p: any, i: number) => (
                                                                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 uppercase tracking-tighter">
                                                                    {p.type === "workstream" ? `${formatWorkstream(p.name)}` : p.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {meeting.externalParticipants && meeting.externalParticipants.length > 0 && (
                                                        <div className="flex flex-wrap gap-2">
                                                            {meeting.externalParticipants.map((p: string, i: number) => (
                                                                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800 uppercase tracking-tighter">
                                                                    Ext: {p}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
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
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingMeeting ? "Edit Event" : "Create New Event"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Event Name *
                            </label>
                            <input
                                type="text"
                                value={meetingName}
                                onChange={(e) => setMeetingName(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="e.g., IN-Tech Meeting "
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Start Date *
                                </label>
                                <DatePicker
                                    selected={meetingDate}
                                    onChange={(date) => {
                                        setMeetingDate(date || new Date());
                                        if (meetingEndDate && date && date > meetingEndDate) {
                                            setMeetingEndDate(date);
                                        }
                                    }}
                                    dateFormat="MMMM d, yyyy"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    End Date *
                                </label>
                                <DatePicker
                                    selected={meetingEndDate}
                                    onChange={(date) => setMeetingEndDate(date)}
                                    selectsEnd
                                    startDate={meetingDate}
                                    endDate={meetingEndDate}
                                    minDate={meetingDate}
                                    dateFormat="MMMM d, yyyy"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                    placeholderText="Optional end date"
                                />
                            </div>
                        </div>

                        {showTimePickers && (
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
                        )}


                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Participants
                            </label>
                            <div className="space-y-3 border border-gray-200 rounded-md p-3">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Internal (Workstreams & Staff)</p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3">
                                        {WORKSTREAMS.map((ws) => (
                                            <label key={ws} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer hover:text-blue-600 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={internalParticipants.some(p => p.type === "workstream" && p.id === ws)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setInternalParticipants([...internalParticipants, { type: "workstream", id: ws, name: ws }]);
                                                        } else {
                                                            setInternalParticipants(internalParticipants.filter(p => !(p.type === "workstream" && p.id === ws)));
                                                        }
                                                    }}
                                                    className="h-3 w-3 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                />
                                                <span className="truncate">{formatWorkstream(ws)}</span>
                                            </label>
                                        ))}
                                    </div>

                                    <div className="space-y-2">
                                        <select
                                            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none"
                                            onChange={(e) => {
                                                const staffId = e.target.value;
                                                if (!staffId) return;
                                                const staff = staffMembers.find(s => s._id === staffId);
                                                if (staff && !internalParticipants.some(p => p.type === "staff" && p.id === staffId)) {
                                                    setInternalParticipants([...internalParticipants, {
                                                        type: "staff",
                                                        id: staffId,
                                                        name: `${staff.firstName} ${staff.lastName}`
                                                    }]);
                                                }
                                                e.target.value = "";
                                            }}
                                        >
                                            <option value="">Select individual staff...</option>
                                            {staffMembers
                                                .filter(s => !internalParticipants.some(p => p.type === "staff" && p.id === s._id))
                                                .map(s => (
                                                    <option key={s._id} value={s._id}>{s.firstName} {s.lastName}</option>
                                                ))
                                            }
                                        </select>

                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {internalParticipants.map((p, i) => (
                                                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-tighter">
                                                    {p.type === "workstream" ? `${formatWorkstream(p.name)}` : p.name}
                                                    <button type="button" onClick={() => setInternalParticipants(internalParticipants.filter((_, idx) => idx !== i))} className="hover:text-red-500">
                                                        <XMarkIcon className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-3 border-t border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">External Participants</p>
                                    <div className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={newExternalParticipant}
                                            onChange={(e) => setNewExternalParticipant(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (newExternalParticipant.trim()) {
                                                        setExternalParticipants([...externalParticipants, newExternalParticipant.trim()]);
                                                        setNewExternalParticipant("");
                                                    }
                                                }
                                            }}
                                            className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-xs focus:ring-1 focus:ring-red-500 outline-none"
                                            placeholder="Enter full name..."
                                        />
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="secondary"
                                            className="h-8 text-xs"
                                            onClick={() => {
                                                if (newExternalParticipant.trim()) {
                                                    setExternalParticipants([...externalParticipants, newExternalParticipant.trim()]);
                                                    setNewExternalParticipant("");
                                                }
                                            }}
                                        >
                                            Add
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {externalParticipants.map((p, i) => (
                                            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-100 uppercase tracking-tighter">
                                                {p}
                                                <button type="button" onClick={() => setExternalParticipants(externalParticipants.filter((_, idx) => idx !== i))} className="hover:text-red-500">
                                                    <XMarkIcon className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
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
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="Add meeting details..."
                            />
                        </div>
                    </div>

                    <DialogFooter className="mt-6 flex gap-2">
                        <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                            Cancel
                        </Button>
                        <Button onClick={handleSaveMeeting} className="flex-1">
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
        </div>
    );
}
