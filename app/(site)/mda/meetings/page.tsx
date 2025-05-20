"use client";

import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "@/app/calendar.css";
import { format, isSameDay, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Id } from "@/convex/_generated/dataModel";
import { toast, Toaster } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { X } from "lucide-react";

export default function MdaSlots() {
  const { user } = useUser();
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkUserId: user.id } : "skip"
  );
  const allSlots = useQuery(api.meetings.getAllAvailableSlots) || [];
  const staffUsers = useQuery(api.users.getAllUsers) || [];
  const bookSlot = useMutation(api.meetings.bookSlot);
  const cancelSlot = useMutation(api.meetings.cancelSlot);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedWorkstream, setSelectedWorkstream] = useState<string | null>(null);
  const [selectedStaffUser, setSelectedStaffUser] = useState<Id<"users"> | null>(null);
  const [showAvailabilityHint, setShowAvailabilityHint] = useState(true);
  const staffAvailableSlots = useQuery(
    api.meetings.getAvailableSlotsForStaff,
    selectedStaffUser ? { userId: selectedStaffUser } : "skip"
  ) || [];

  const selectedUserObj = useMemo(() => {
    return staffUsers.find((u) => u._id === selectedStaffUser) || null;
  }, [selectedStaffUser, staffUsers]);
  
  const [activeTab, setActiveTab] = useState<"available" | "upcoming">("upcoming");
  const [showAllMeetings, setShowAllMeetings] = useState(false);

  const displayNames: Record<string, string> = {
    innovation: "Innovation and Technology",
    regulatory: "Regulatory",
    communications: "Communications",
  };

  

  const staffWorkstreams = useMemo(() => {
    const workstreamSet = new Set(
      staffUsers.filter((u) => u.role === "staff" && u.staffStream).map((u) => u.staffStream!)
    );
    return Array.from(workstreamSet);
  }, [staffUsers]);

  const filteredSlots = useMemo(() => {
    if (!selectedStaffUser) return [];
    return allSlots.filter(
      (slot) => slot.userId === selectedStaffUser && !slot.deactivated
    );
  }, [allSlots, selectedStaffUser]);

  const bookedSlots = useMemo(() => {
    return allSlots
      .filter((slot) => slot.bookedBy === convexUser?._id && !slot.deactivated)
      .sort(
        (a, b) =>
          parseISO(`${a.date}T${a.startTime}`).getTime() -
          parseISO(`${b.date}T${b.startTime}`).getTime()
      );
  }, [allSlots, convexUser]);

  const slotsForDay = useMemo(() => {
    if (!selectedDate) return [];
    return filteredSlots.filter((slot) =>
      isSameDay(parseISO(`${slot.date}T${slot.startTime}`), selectedDate)
    );
  }, [selectedDate, filteredSlots]);


  const firstAvailableSlot = useMemo(() => {
    if (!selectedStaffUser) return null;
  
    const now = new Date();
  
    return filteredSlots
      .filter((slot) => {
        const slotDate = parseISO(`${slot.date}T${slot.startTime}`);
        return !slot.bookedBy && !slot.deactivated && slotDate > now;
      })
      .sort((a, b) =>
        parseISO(`${a.date}T${a.startTime}`).getTime() -
        parseISO(`${b.date}T${b.startTime}`).getTime()
      )[0] || null;
  }, [filteredSlots, selectedStaffUser]);
  
  
  

  useEffect(() => {
    if (activeTab === "upcoming" && bookedSlots.length > 0 && !selectedDate) {
      setSelectedDate(
        parseISO(`${bookedSlots[0].date}T${bookedSlots[0].startTime}`)
      );
    }
  }, [bookedSlots]);

  const handleBookSlot = async (slotId: Id<"availability">) => {
    try {
      await bookSlot({ slotId, mdaId: convexUser?._id! });
      toast.success("Slot successfully booked!");
    } catch {
      toast.error("Failed to book slot.");
    }
  };

  const handleCancel = async (slotId: Id<"availability">) => {
    try {
      await cancelSlot({ slotId });
      toast.success("Appointment cancelled.");
    } catch {
      toast.error("Failed to cancel appointment.");
    }
  };

  const tileContent = ({ date }: { date: Date }) => {
    const relevantSlots = selectedStaffUser
      ? filteredSlots.filter((slot) =>
          isSameDay(parseISO(`${slot.date}T${slot.startTime}`), date)
        )
      : bookedSlots.filter((slot) =>
          isSameDay(parseISO(`${slot.date}T${slot.startTime}`), date)
        );
  
    if (!relevantSlots.length) return null;
  
    const isRed = selectedStaffUser && relevantSlots.every((slot) => slot.bookedBy);
  
    return (
      <div className="dot" style={{ backgroundColor: isRed ? "#ef4444" : "#10b981" }} />
    );
  };
  

  const visibleSlots =
    activeTab === "available"
      ? slotsForDay
      : showAllMeetings
        ? bookedSlots
        : bookedSlots.filter((slot) =>
            selectedDate
              ? isSameDay(parseISO(`${slot.date}T${slot.startTime}`), selectedDate)
              : true
          );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        📅 My Appointments
      </h1>

{showAvailabilityHint && selectedUserObj && firstAvailableSlot && (
  <div className="bg-yellow-100 text-yellow-900 border border-yellow-300 px-4 py-3 rounded-md shadow-md max-w-md ml-auto mb-4 relative">
    <button
      onClick={() => setShowAvailabilityHint(false)}
      className="absolute top-1 right-2 text-lg font-bold text-yellow-900 hover:text-yellow-700"
    >
      ×
    </button>
    <p className="text-sm">
      <strong>
        The first availability for {selectedUserObj.firstName} {selectedUserObj.lastName}
        {selectedUserObj.jobTitle ? `, ${selectedUserObj.jobTitle}` : ""}
      </strong>{" "}
      is{" "}
      <span className="font-medium">
        {format(parseISO(`${firstAvailableSlot.date}T${firstAvailableSlot.startTime}`), "PPP p")}
      </span>
    </p>
  </div>
)}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar + Dropdown Panel */}
        <div className="bg-white rounded-xl shadow w-full lg:w-1/3 p-4">
        <div className="mb-4">
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Select Department:
  </label>
  <div className="relative">
    <select
      className="block w-full appearance-none bg-white border border-gray-300 text-gray-900 text-sm rounded-md px-4 py-2 pr-10 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      value={selectedWorkstream || ""}
      onChange={(e) => {
        setSelectedWorkstream(e.target.value);
        setSelectedStaffUser(null);
      }}
    >
      <option value="">-- Select Department --</option>
      {staffWorkstreams.map((ws) => (
        <option key={ws} value={ws}>
          {displayNames[ws] || ws}
        </option>
      ))}
    </select>

    {/* Chevron icon */}
    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500">
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  </div>
</div>


          {/* Staff User Dropdown */}
          {selectedWorkstream && (
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Select Staff:</label>
              <select
  className="w-full p-2 border rounded"
  value={selectedStaffUser || ""}
  onChange={(e) => setSelectedStaffUser(e.target.value as Id<"users">)}
>
  <option value="">-- Select Staff --</option>
  {staffUsers
    .filter((u) => u.role === "staff" && u.staffStream === selectedWorkstream)
    .map((u) => (
      <option key={u._id} value={u._id}>
        {u.firstName} {u.lastName}
        {u.jobTitle ? ` — ${u.jobTitle}` : ""}
      </option>
    ))}
</select>

{selectedUserObj && (
  <div className="mt-4 border rounded-lg p-4 bg-gray-50 flex items-center gap-4">
    <img
      src={selectedUserObj.imageUrl || "/default-avatar.png"}
      alt="Staff Avatar"
      className="w-12 h-12 rounded-full object-cover border"
    />
    <div className="text-sm">
      <p className="font-medium text-gray-800">
        {selectedUserObj.firstName} {selectedUserObj.lastName}
      </p>
      <p className="text-gray-500">{selectedUserObj.jobTitle || "No job title provided"}</p>
      <p className="text-xs text-gray-600 mt-1 italic">
        You are currently looking at {selectedUserObj.firstName}'s - PEBEC Staff calendar.
      </p>
    </div>
  </div>
)}


            </div>
          )}

          <Calendar
           onChange={(date) => {
            setSelectedDate(date as Date);
            setShowAllMeetings(false);
            setActiveTab("available"); // ✅ this now opens the Available tab
          }}
          
            value={selectedDate}
            tileContent={tileContent}
          />
        </div>

        {/* Slot List Panel */}
        <div className="flex-1 bg-white p-4 rounded-xl shadow max-h-[600px] overflow-y-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
            <h2 className="text-lg font-semibold">
              {activeTab === "available"
                ? `Schedule for ${format(selectedDate ?? new Date(), "EEEE, MMM d")}`
                : showAllMeetings
                ? "📋 All Upcoming Appointments"
                : `📋 Appointments for ${format(selectedDate ?? new Date(), "EEEE, MMM d")}`}
            </h2>

            <div className="flex gap-2">
              <Button
                variant={activeTab === "available" ? "default" : "outline"}
                onClick={() => setActiveTab("available")}
              >
                Available Slots
              </Button>
              <Button
                variant={activeTab === "upcoming" ? "default" : "outline"}
                onClick={() => setActiveTab("upcoming")}
              >
                Upcoming Meetings
              </Button>
            </div>
          </div>

          <div className="space-y-3">
          {visibleSlots.map((slot) => {
  const start = parseISO(`${slot.date}T${slot.startTime}`);
  const end = new Date(start.getTime() + slot.duration * 60000);
  const isBookedByYou = slot.bookedBy === convexUser?._id;

  return (
    <div
      key={slot._id}
      className="border rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-50"
    >
      <div className="flex flex-col gap-1">
        <p className="font-medium">
          {format(start, "EEEE, MMM d")} | {format(start, "h:mm a")} - {format(end, "h:mm a")}
        </p>
        <p className="text-sm text-gray-500">
          Department: {displayNames[slot.workstream] || slot.workstream}
        </p>

        {activeTab === "upcoming" && (
          <p className="text-sm text-gray-700">
            Meeting with{" "}
            {(() => {
              const staff = staffUsers.find((u) => u._id === slot.userId);
              return staff
                ? `${staff.firstName} ${staff.lastName}${staff.jobTitle ? ` — ${staff.jobTitle}` : ""}`
                : "Unknown Staff";
            })()}
          </p>
        )}
      </div>

      {isBookedByYou ? (
        <Button
          variant="destructive"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => handleCancel(slot._id as Id<"availability">)}
        >
          Cancel
        </Button>
      ) : activeTab === "available" ? (
        (() => {
          const slotDate = parseISO(`${slot.date}T${slot.startTime}`);
          const now = new Date();
          const isPast = slotDate < now;

          const isDisabled = !!slot.bookedBy || isPast;

          return (
            <Button
              size="sm"
              disabled={isDisabled}
              onClick={() => handleBookSlot(slot._id as Id<"availability">)}
              className={isDisabled ? "opacity-50 cursor-not-allowed" : ""}
            >
              {slot.bookedBy
                ? "Booked"
                : isPast
                ? "Expired"
                : "Book"}
            </Button>
          );
        })()
      ) : (
        <span className="text-sm text-red-400">Booked</span>
      )}
    </div>
  );
})}


            {visibleSlots.length === 0 && (
              <p className="text-gray-500 text-sm">
                No{" "}
                {activeTab === "available"
                  ? "available slots. Make sure you selected department and staff."
                  : "appointments found."}
              </p>
            )}

            {activeTab === "upcoming" && bookedSlots.length > 0 && (
              <div className="text-right mt-4">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-blue-600 hover:underline"
                  onClick={() => setShowAllMeetings((prev) => !prev)}
                >
                  {showAllMeetings ? "Show Selected Date" : "See All"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Toaster position="top-center" />
    </div>
  );
}
