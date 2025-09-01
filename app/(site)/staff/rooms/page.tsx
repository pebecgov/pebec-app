// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { TimePicker } from "@/components/ui/time-picker";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type RoomKey = "staff_conference" | "dg_conference";

export default function StaffRoomsPage() {
  const { user } = useUser();
  const convexUser = useQuery(api.users.getUserByClerkId, user?.id ? { clerkUserId: user.id } : "skip");

  const [room, setRoom] = useState<RoomKey>("staff_conference");
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const dateStr = useMemo(() => (selectedDate ? selectedDate.toISOString().split("T")[0] : ""), [selectedDate]);
  const bookings = useQuery(api.meetings.listRoomBookingsByDate, dateStr ? { room, date: dateStr } : "skip") || [];

  const createBooking = useMutation(api.meetings.createRoomBooking);
  const deleteBooking = useMutation(api.meetings.deleteRoomBooking);

  const handleCreate = async () => {
    if (!convexUser?._id) return toast.error("User not loaded");
    if (!selectedDate || !startTime || !endTime) return toast.error("Select date, start, end");

    const s = new Date(selectedDate);
    s.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
    const e = new Date(selectedDate);
    e.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);
    if (e <= s) return toast.error("End must be after start");

    const fmt = (d: Date) => d.toTimeString().slice(0, 5);
    try {
      await createBooking({
        room,
        date: dateStr,
        startTime: fmt(s),
        endTime: fmt(e),
        title: title || undefined,
        description: description || undefined,
        createdBy: convexUser._id,
      });
      toast.success("Room booked");
      setTitle("");
      setDescription("");
      setStartTime(null);
      setEndTime(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to book room");
    }
  };

  const handleDelete = async (bookingId: string) => {
    if (!convexUser?._id) return;
    try {
      await deleteBooking({ bookingId: bookingId as any, requesterId: convexUser._id });
      toast.success("Booking deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Meeting Rooms</h1>

      <div className="bg-white p-4 rounded-lg shadow mb-6 grid gap-3 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">Room</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={room}
            onChange={(e) => setRoom(e.target.value as RoomKey)}
          >
            <option value="staff_conference">Staff Conference Room</option>
            <option value="dg_conference">DG Conference Room</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <DatePicker selected={selectedDate} onChange={(d) => setSelectedDate(d)} minDate={new Date()} className="w-full border rounded px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Start</label>
          <TimePicker value={startTime} onChange={setStartTime} placeholder="Select start time" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">End</label>
          <TimePicker value={endTime} onChange={setEndTime} placeholder="Select end time" />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Title (optional)</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Description (optional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded px-3 py-2" rows={3} />
        </div>

        <div className="md:col-span-2 flex justify-end">
          <Button onClick={handleCreate}>Book Room</Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Bookings for {dateStr}</h2>
        </div>
        {bookings.length === 0 ? (
          <p className="text-sm text-gray-600">No bookings yet.</p>
        ) : (
          <ul className="divide-y">
            {bookings.map((b: any) => (
              <li key={b._id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{b.startTime} - {b.endTime} ({b.room === "staff_conference" ? "Staff Room" : "DG Room"})</p>
                  {(b.title || b.description) && (
                    <p className="text-sm text-gray-600">{b.title || b.description}</p>
                  )}
                </div>
                {(convexUser?._id === b.createdBy || convexUser?.role === "admin") && (
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(b._id)}>Delete</Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


