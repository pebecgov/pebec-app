// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import UsersCard from "@/components/AnalyticsCharts/UsersChart";
import TicketsChart from "@/components/AnalyticsCharts/TicketsChart";
import MdaChart from "@/components/AnalyticsCharts/MdaChart";
import AdminMonthlyTicketsReport from "@/components/AnalyticsCharts/MonthlyResolved";
import MyPerformance from "@/components/StaffPerformance/MyPerformance";
import StaffLeaderboard from "@/components/StaffPerformance/StaffLeaderboard";
import UpcomingMeetings from "@/components/StaffAnalytics/UpcomingMeetings";
import RoomAvailabilityCardComponent from "@/components/RoomAvailabilityCard";
import HolidayAnnouncementsDisplay from "@/components/HolidayWhereabout/HolidayAnnouncementsDisplay";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import StaffAnalytics from "@/components/StaffAnalytics/Meetings";
export default function StaffPage() {
  const [showPerformanceAnalytics, setShowPerformanceAnalytics] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }
    const savedPreference = window.localStorage.getItem("staff-dashboard-show-performance-analytics");
    if (savedPreference === null) {
      return true;
    }
    return savedPreference === "true";
  });
  const {
    user,
    isLoaded
  } = useUser();
  const router = useRouter();

  useEffect(() => {
    window.localStorage.setItem(
      "staff-dashboard-show-performance-analytics",
      String(showPerformanceAnalytics)
    );
  }, [showPerformanceAnalytics]);


  if (!isLoaded) {
    return <div className="text-center mt-10">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Professional Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Staff Dashboard</h1>
          <p className="text-gray-500 mt-1 text-lg">
            Welcome back, {user?.firstName || "Member"}. Here's what's happening today.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-md">
          <CalendarDaysIcon className="w-6 h-6 text-green-600" />
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Today's Date</span>
            <span className="text-sm font-bold text-gray-800">{format(new Date(), "EEEE, MMMM do, yyyy")}</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="space-y-12">

        {/* Section 1: Performance & Analytics */}
        <section>
          <div className="mb-6 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="h-1 w-8 bg-green-500 rounded-full" />
              <h2 className="truncate text-[10px] font-bold text-gray-400 uppercase tracking-[0.16em] sm:text-xs sm:tracking-[0.2em]">
                Performance & Analytics
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowPerformanceAnalytics((prev) => !prev)}
              aria-pressed={showPerformanceAnalytics}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-800 sm:gap-2 sm:text-[11px]"
            >
              <span>Stats</span>
              <span
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  showPerformanceAnalytics ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    showPerformanceAnalytics ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </span>
            </button>
          </div>

          {showPerformanceAnalytics && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-stretch">
              <div className="h-full">
                <MyPerformance />
              </div>
              <div className="h-full">
                <StaffLeaderboard />
              </div>
            </div>
          )}
        </section>

        {/* Section 2: Schedule & Availability */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <div className="h-1 w-8 bg-blue-500 rounded-full" />
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Schedule & Resources</h2>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-start">
            <div className="xl:col-span-3 space-y-8">
              <div className="h-[24rem] overflow-hidden [&>*]:h-full">
                <UpcomingMeetings />
              </div>
              <div className="h-[24rem] overflow-hidden [&>*]:h-full">
                <HolidayAnnouncementsDisplay />
              </div>
            </div>
            <div className="xl:col-span-2 h-full">
              <div className="h-[24rem] w-full overflow-hidden xl:h-[48rem] [&>*]:h-full [&>*]:w-full">
                <RoomAvailabilityCardComponent
                  title="Staff Conference Room"
                  href="/staff/rooms"
                  room="staff_conference"
                  showBookButton={true}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Detailed Insights */}
        <div className="pt-4 border-t border-gray-100">
          <StaffAnalytics />
        </div>

      </div>
    </div>
  );
}