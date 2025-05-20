"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridWeek from "@fullcalendar/timegrid";
import timeGridDay from "@fullcalendar/timegrid";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FaVideo } from "react-icons/fa"; // ✅ Video Camera Icon 🎥

const FullCalendar = dynamic(() => import("@fullcalendar/react"), { ssr: false });

interface Meeting {
  id: string;
  title: string;
  meetingDate: number;
  duration: number;
  createdBy: string;
  status: "pending" | "confirmed" | "cancelled" | "declined";
}

interface CalendarProps {
  meetings: Meeting[];
  onAddEvent: () => void;
  userId: string;
  userRole: string;
}

export default function Calendar({ meetings, onAddEvent, userId, userRole }: CalendarProps) {
  const router = useRouter();
  const calendarRef = useRef<any>(null);
  const [currentView, setCurrentView] = useState<"dayGridMonth" | "timeGridWeek" | "timeGridDay">("dayGridMonth");
  const [isMobile, setIsMobile] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<string>("");

  // ✅ Detect screen size & adjust layout
  useEffect(() => {
    const updateScreenSize = () => setIsMobile(window.innerWidth < 768);
    updateScreenSize();
    window.addEventListener("resize", updateScreenSize);
    return () => window.removeEventListener("resize", updateScreenSize);
  }, []);

  // ✅ Update displayed month name dynamically
  useEffect(() => {
    if (calendarRef.current) {
      const api = calendarRef.current.getApi();
      setCurrentMonth(api.getCurrentData().viewTitle);
    }
  }, [currentView]);

  // ✅ Change calendar view manually
  const handleViewChange = (newView: "dayGridMonth" | "timeGridWeek" | "timeGridDay") => {
    setCurrentView(newView);
    if (calendarRef.current) {
      calendarRef.current.getApi().changeView(newView);
      setCurrentMonth(calendarRef.current.getApi().getCurrentData().viewTitle);
    }
  };

  // ✅ Meetings formatted for FullCalendar
  const formattedMeetings = meetings.map((meeting) => ({
    id: meeting.id,
    title: meeting.title,
    start: new Date(meeting.meetingDate).toISOString(),
    end: new Date(meeting.meetingDate + meeting.duration * 60000).toISOString(),
    backgroundColor:
      meeting.status === "cancelled" ? "#D1D5DB"
      : meeting.status === "declined" ? "#EF4444"
      : meeting.status === "pending" ? "#FACC15"
      : "#3B82F6",
    textColor: "#ffffff",
  }));

  return (
    <div className="relative w-full max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      {/* Calendar Header */}
      <div className="flex justify-between items-center mb-4">
        <h5 className="text-lg sm:text-2xl font-semibold text-gray-900 dark:text-white">📅 My Calendar</h5>

        {/* View Toggle */}
        <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {["dayGridMonth", "timeGridWeek", "timeGridDay"].map((mode) => (
            <button
              key={mode}
              onClick={() => handleViewChange(mode as "dayGridMonth" | "timeGridWeek" | "timeGridDay")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                currentView === mode
                  ? "bg-green-600 text-white shadow-md"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {mode === "dayGridMonth" ? "Month" : mode === "timeGridWeek" ? "Week" : "Day"}
            </button>
          ))}
        </div>
      </div>

      {/* Month Title */}
      <div className="sticky top-0 bg-white dark:bg-gray-800 p-3 text-xl font-semibold text-center shadow-md z-10">
        {currentMonth} {/* ✅ Fixed: Shows Only One Month Name */}
      </div>

      {/* Calendar Wrapper */}
      <div className={`w-full ${currentView !== "dayGridMonth" ? "overflow-x-auto" : ""}`}>
        <div className={currentView !== "dayGridMonth" ? "min-w-[900px]" : ""}>
          {FullCalendar && (
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, timeGridWeek, timeGridDay]}
              initialView={currentView}
              events={formattedMeetings}
              height="auto"
              aspectRatio={isMobile ? 1.2 : 1.6}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "",
              }}
              eventClick={(event) => router.push(`/${userRole}/meetings/${event.event.id}`)}
              eventDisplay="block"
              dayMaxEventRows={isMobile ? 2 : 4}
              moreLinkClick="popover"
            />
          )}
        </div>
      </div>

      {/* ✅ Floating "New Meeting" Button - Premium Look 🎥 */}
      <Button
  onClick={onAddEvent}
  className="fixed bottom-6 right-6 bg-gradient-to-r from-green-600 to-green-800 text-white shadow-xl rounded-full p-5 flex items-center gap-3 text-lg font-semibold hover:scale-105 transition-all"
  style={{
    zIndex: 50, // ✅ Highest Z-Index to Stay on Top
    position: "fixed", // ✅ Fix it to the screen
    bottom: "20px", // ✅ Distance from Bottom
    right: "20px", // ✅ Distance from Right
    padding: "16px 24px", // ✅ Better Padding
    boxShadow: "0px 10px 20px rgba(0,0,0,0.3)", // ✅ Premium Look
  }}
>
  <FaVideo className="text-2xl" />
  New Meeting
</Button>

    </div>
  );
}
