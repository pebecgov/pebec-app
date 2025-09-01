// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type RoomKey = "staff_conference" | "dg_conference";

export default function AdminRoomsPage() {
  const { user } = useUser();
  const convexUser = useQuery(api.users.getUserByClerkId, user?.id ? { clerkUserId: user.id } : "skip");

  const [room, setRoom] = useState<RoomKey>("staff_conference");
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const dateStr = useMemo(() => (selectedDate ? selectedDate.toISOString().split("T")[0] : ""), [selectedDate]);
  const bookings = useQuery(api.meetings.listRoomBookingsByDate, dateStr ? { room, date: dateStr } : "skip") || [];

  const deleteBooking = useMutation(api.meetings.deleteRoomBooking);

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
      <h1 className="text-2xl font-bold mb-4">Admin: Meeting Rooms</h1>

      <div className="bg-white p-4 rounded-lg shadow mb-6 grid gap-3 md:grid-cols-3">
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
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Date</label>
          <DatePicker selected={selectedDate} onChange={(d) => setSelectedDate(d)} className="w-full border rounded px-3 py-2" />
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
                <Button variant="destructive" size="sm" onClick={() => handleDelete(b._id)}>Delete</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


