// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { TimePicker } from "@/components/ui/time-picker";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { X, Save, Calendar, Clock, Users, Building2 } from "lucide-react";
import StaffMemberSelector from "@/components/StaffMemberSelector";
import { isWorkingDay } from "@/lib/dateUtils";

type RoomKey = "staff_conference" | "dg_conference";

interface EditMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  requesterId: Id<"users">;
}

export default function EditMeetingModal({ isOpen, onClose, booking, requesterId }: EditMeetingModalProps) {
  const [room, setRoom] = useState<RoomKey>("staff_conference");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingType, setMeetingType] = useState<"internal" | "external">("internal");
  const [attendees, setAttendees] = useState<Id<"users">[]>([]);

  const updateBooking = useMutation(api.meetings.updateRoomBooking);

  // Initialize form with booking data
  useEffect(() => {
    if (booking && isOpen) {
      setRoom(booking.room);
      setSelectedDate(new Date(booking.date));
      
      // Parse time strings to Date objects
      const [startHour, startMin] = booking.startTime.split(':').map(Number);
      const [endHour, endMin] = booking.endTime.split(':').map(Number);
      
      const startDate = new Date();
      startDate.setHours(startHour, startMin, 0, 0);
      setStartTime(startDate);
      
      const endDate = new Date();
      endDate.setHours(endHour, endMin, 0, 0);
      setEndTime(endDate);
      
      setTitle(booking.title || "");
      setDescription(booking.description || "");
      setMeetingType(booking.meetingType || "internal");
      setAttendees(booking.attendees || []);
    }
  }, [booking, isOpen]);

  const handleSave = async () => {
    if (!selectedDate || !startTime || !endTime) {
      toast.error("Please select date, start time, and end time");
      return;
    }

    const s = new Date(selectedDate);
    s.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
    const e = new Date(selectedDate);
    e.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);
    
    if (e <= s) {
      toast.error("End time must be after start time");
      return;
    }

    const fmt = (d: Date) => d.toTimeString().slice(0, 5);
    const dateStr = selectedDate.toISOString().split("T")[0];

    try {
      await updateBooking({
        bookingId: booking._id,
        requesterId,
        room,
        date: dateStr,
        startTime: fmt(s),
        endTime: fmt(e),
        title: title || undefined,
        description: description || undefined,
        meetingType: meetingType,
        attendees: meetingType === "internal" && attendees.length > 0 ? attendees : undefined,
      });
      toast.success("Meeting updated successfully!");
      onClose();
    } catch (e: any) {
      if (e.message?.includes("conflict") || e.message?.includes("overlap")) {
        toast.error("This time slot conflicts with an existing booking. Please choose a different time.");
      } else {
        toast.error("Failed to update meeting. Please try again.");
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Edit Meeting</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
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
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
