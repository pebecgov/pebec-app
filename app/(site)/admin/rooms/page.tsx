// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { TimePicker } from "@/components/ui/time-picker";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Clock, Users, Building2, Edit } from "lucide-react";
import { useRouter } from "next/navigation";
import StaffMemberSelector from "@/components/StaffMemberSelector";
import EditMeetingModal from "@/components/EditMeetingModal";
import RoomAvailabilityCard from "@/components/RoomAvailabilityCard";
import { isWorkingDay } from "@/lib/dateUtils";

type RoomKey = "staff_conference" | "dg_conference";

export default function AdminRoomsPage() {
  const { user } = useUser();
  const router = useRouter();
  const convexUser = useQuery(api.users.getUserByClerkId, user?.id ? { clerkUserId: user.id } : "skip");

  const [activeTab, setActiveTab] = useState<"admin" | "weekly" | "booking">("admin");
  const [room, setRoom] = useState<RoomKey>("staff_conference");
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    const today = new Date();
    // If today is weekend, set to next Monday
    if (!isWorkingDay(today)) {
      const nextMonday = new Date(today);
      nextMonday.setDate(today.getDate() + (1 + 7 - today.getDay()) % 7);
      return nextMonday;
    }
    return today;
  });
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingType, setMeetingType] = useState<"internal" | "external">("internal");
  const [attendees, setAttendees] = useState<Id<"users">[]>([]);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const dateStr = useMemo(() => (selectedDate ? selectedDate.toISOString().split("T")[0] : ""), [selectedDate]);
  
  // Get bookings for both rooms
  const staffBookings = useQuery(api.meetings.listRoomBookingsByDate, dateStr ? { room: "staff_conference", date: dateStr } : "skip") || [];
  const dgBookings = useQuery(api.meetings.listRoomBookingsByDate, dateStr ? { room: "dg_conference", date: dateStr } : "skip") || [];
  
  // Get all unique attendee IDs from all bookings
  const allAttendeeIds = useMemo(() => {
    return [...staffBookings, ...dgBookings]
      .filter(b => b.attendees && b.attendees.length > 0)
      .flatMap(b => b.attendees)
      .filter((id): id is Id<"users"> => id !== undefined)
      .filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates
  }, [staffBookings, dgBookings]);
  
  const attendeeUsers = useQuery(
    api.meetings.getUsersByIds, 
    allAttendeeIds.length > 0 ? { userIds: allAttendeeIds } : "skip"
  ) || [];
  
  const getAttendeeNames = (attendeeIds: string[]) => {
    if (!attendeeIds || attendeeIds.length === 0) return [];
    return attendeeIds.map(id => {
      const user = attendeeUsers.find(u => u && u._id === id);
      return user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email : "Unknown";
    });
  };
  
  const createBooking = useMutation(api.meetings.createRoomBooking);
  const deleteBooking = useMutation(api.meetings.deleteRoomBooking);

  // Check for booking conflicts
  const hasConflict = useMemo(() => {
    if (!startTime || !endTime || !selectedDate) return false;
    
    const s = new Date(selectedDate);
    s.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
    const e = new Date(selectedDate);
    e.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);
    
    const currentBookings = room === "staff_conference" ? staffBookings : dgBookings;
    
    return currentBookings.some((booking: any) => {
      const bookingStart = new Date(selectedDate);
      const [startHour, startMin] = booking.startTime.split(':').map(Number);
      bookingStart.setHours(startHour, startMin, 0, 0);
      
      const bookingEnd = new Date(selectedDate);
      const [endHour, endMin] = booking.endTime.split(':').map(Number);
      bookingEnd.setHours(endHour, endMin, 0, 0);
      
      // Check if there's any overlap
      return (s < bookingEnd && e > bookingStart);
    });
  }, [startTime, endTime, selectedDate, room, staffBookings, dgBookings]);

  const handleCreate = async () => {
    if (!convexUser?._id) return toast.error("User not loaded");
    if (!selectedDate || !startTime || !endTime) return toast.error("Please select date, start time, and end time");

    const s = new Date(selectedDate);
    s.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
    const e = new Date(selectedDate);
    e.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);
    if (e <= s) return toast.error("End time must be after start time");

    if (hasConflict) {
      toast.error("This time slot conflicts with an existing booking. Please choose a different time.");
      return;
    }

    const fmt = (d: Date) => d.toTimeString().slice(0, 5);
    try {
      await createBooking({
        room,
        date: dateStr,
        startTime: fmt(s),
        endTime: fmt(e),
        title: title || undefined,
        description: description || undefined,
        meetingType: meetingType,
        attendees: meetingType === "internal" && attendees.length > 0 ? attendees : undefined,
        createdBy: convexUser._id,
      });
      toast.success("Room booked successfully!");
      setTitle("");
      setDescription("");
      setMeetingType("internal");
      setAttendees([]);
      setStartTime(null);
      setEndTime(null);
    } catch (e: any) {
      if (e.message?.includes("conflict") || e.message?.includes("overlap")) {
        toast.error("This time slot conflicts with an existing booking. Please choose a different time.");
      } else {
        toast.error("Failed to book room. Please try again.");
      }
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

  const handleBack = () => {
    router.back();
  };

  const formatTime = (timeStr: string) => {
    return timeStr;
  };

  const handleEdit = (booking: any) => {
    setEditingBooking(booking);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingBooking(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={handleBack}
        className="mb-4 flex items-center gap-2 hover:bg-gray-100"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      <h1 className="text-2xl font-bold mb-4">Conference Room Management</h1>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
        <button
          onClick={() => setActiveTab("admin")}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === "admin"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Daily View
        </button>
        <button
          onClick={() => setActiveTab("weekly")}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === "weekly"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Weekly View
        </button>
        <button
          onClick={() => setActiveTab("booking")}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === "booking"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Book Room
        </button>
      </div>

      {/* Admin View Tab */}
      {activeTab === "admin" && (
        <div className="space-y-6">
          {/* Date Selector */}
          <div className="bg-white p-4 rounded-lg shadow">
            <label className="block text-sm font-medium mb-2">Select Date</label>
            <DatePicker 
              selected={selectedDate} 
              onChange={(d) => setSelectedDate(d)} 
              minDate={new Date()} 
              filterDate={(date) => isWorkingDay(date)}
              className="w-full max-w-xs border rounded px-3 py-2" 
            />
          </div>

          {/* Staff Conference Room Card */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-green-50 px-6 py-4 border-b border-green-200">
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-semibold text-green-900">Staff Conference Room</h2>
              </div>
            </div>
            <div className="p-6">
              {staffBookings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No bookings for {dateStr}</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {staffBookings.map((booking: any) => (
                    <div key={booking._id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-sm">
                            {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEdit(booking)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleDelete(booking._id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 capitalize mb-1">{booking.meetingType || "internal"} meeting</p>
                      {booking.title && (
                        <p className="font-medium text-gray-900 mb-1">{booking.title}</p>
                      )}
                      {booking.description && (
                        <p className="text-sm text-gray-600">{booking.description}</p>
                      )}
                      {booking.attendees && booking.attendees.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">Attendees ({booking.attendees.length}):</p>
                          <div className="flex flex-wrap gap-1">
                            {attendeeUsers.length > 0 ? (
                              getAttendeeNames(booking.attendees).map((name, index) => (
                                <span key={index} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  {name}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">Loading...</span>
                            )}
                          </div>
                        </div>
                      )}
                      {booking.creatorName && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500">
                            Booked by: <span className="font-medium text-gray-700">{booking.creatorName}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* DG Conference Room Card */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-green-50 px-6 py-4 border-b border-green-200">
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-semibold text-green-900">DG Conference Room</h2>
              </div>
            </div>
            <div className="p-6">
              {dgBookings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No bookings for {dateStr}</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {dgBookings.map((booking: any) => (
                    <div key={booking._id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-green-600" />
                          <span className="text-sm">
                            {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEdit(booking)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleDelete(booking._id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 capitalize mb-1">{booking.meetingType || "internal"} meeting</p>
                      {booking.title && (
                        <p className="font-medium text-gray-900 mb-1">{booking.title}</p>
                      )}
                      {booking.description && (
                        <p className="text-sm text-gray-600">{booking.description}</p>
                      )}
                      {booking.attendees && booking.attendees.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">Attendees ({booking.attendees.length}):</p>
                          <div className="flex flex-wrap gap-1">
                            {attendeeUsers.length > 0 ? (
                              getAttendeeNames(booking.attendees).map((name, index) => (
                                <span key={index} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  {name}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">Loading...</span>
                            )}
                          </div>
                        </div>
                      )}
                      {booking.creatorName && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500">
                            Booked by: <span className="font-medium text-gray-700">{booking.creatorName}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Weekly View Tab */}
      {activeTab === "weekly" && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Weekly Room Availability</h2>
            <p className="text-sm text-gray-600 mb-4">
              View and manage room bookings for the next 5 working days. Use the navigation buttons to browse through different weeks.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RoomAvailabilityCard 
              title="Staff Conference Room" 
              href="/admin/rooms" 
              room="staff_conference"
            />
            <RoomAvailabilityCard 
              title="DG Conference Room" 
              href="/admin/rooms" 
              room="dg_conference"
            />
          </div>
        </div>
      )}

      {/* Booking Tab */}
      {activeTab === "booking" && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-6">Book a Conference Room</h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">Room</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={room}
                onChange={(e) => setRoom(e.target.value as RoomKey)}
              >
                <option value="staff_conference">Staff Conference Room</option>
                <option value="dg_conference">DG Conference Room</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Meeting Type</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value as "internal" | "external")}
              >
                <option value="internal">Internal Meeting</option>
                <option value="external">External Meeting</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Date</label>
              <DatePicker 
                selected={selectedDate} 
                onChange={(d) => setSelectedDate(d)} 
                minDate={new Date()} 
                filterDate={(date) => isWorkingDay(date)}
                className="w-full border rounded-lg px-3 py-2" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Start Time</label>
              <TimePicker value={startTime} onChange={setStartTime} placeholder="Select start time" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">End Time</label>
              <TimePicker value={endTime} onChange={setEndTime} placeholder="Select end time" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Title (optional)</label>
              <input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                className="w-full border rounded-lg px-3 py-2" 
                placeholder="Meeting title"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Description (optional)</label>
              <textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                className="w-full border rounded-lg px-3 py-2" 
                rows={3}
                placeholder="Meeting description"
              />
            </div>

            {/* Staff Member Selection - Only show for internal meetings */}
            {meetingType === "internal" && (
              <div className="md:col-span-2">
                <StaffMemberSelector
                  selectedStaff={attendees}
                  onStaffChange={setAttendees}
                  disabled={hasConflict}
                />
              </div>
            )}

            {/* Conflict Warning */}
            {hasConflict && (
              <div className="md:col-span-2">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">
                    ⚠️ This time slot conflicts with an existing booking. Please choose a different time.
                  </p>
                </div>
              </div>
            )}

            <div className="md:col-span-2 flex justify-end">
              <Button 
                onClick={handleCreate}
                disabled={hasConflict}
                className={hasConflict ? "opacity-50 cursor-not-allowed" : ""}
                size="lg"
              >
                Book Conference Room
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingBooking && (
        <EditMeetingModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          booking={editingBooking}
          requesterId={convexUser?._id!}
        />
      )}
    </div>
  );
}


