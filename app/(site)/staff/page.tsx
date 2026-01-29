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
  const {
    user,
    isLoaded
  } = useUser();
  const router = useRouter();
  const [isInvestmentStream, setIsInvestmentStream] = useState(false);
  useEffect(() => {
    if (isLoaded) {
      const stream = user?.publicMetadata?.stream;
      if (stream === "investments") {
        router.replace("/projects-board");
      } else {
        setIsInvestmentStream(false);
      }
    }
  }, [isLoaded, user, router]);
  if (!isLoaded) {
    return <div className="text-center mt-10">Loading...</div>;
  }
  if (isInvestmentStream) {
    return null;
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
          <div className="flex items-center gap-2 mb-6">
            <div className="h-1 w-8 bg-green-500 rounded-full" />
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Performance & Analytics</h2>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
            <div className="xl:col-span-2">
              <MyPerformance />
            </div>
            <div className="xl:col-span-1">
              <StaffLeaderboard />
            </div>
          </div>
        </section>

        {/* Section 2: Schedule & Availability */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <div className="h-1 w-8 bg-blue-500 rounded-full" />
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Schedule & Resources</h2>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
            <div className="xl:col-span-2">
              <UpcomingMeetings />
            </div>
            <div className="xl:col-span-1 space-y-8">
              <RoomAvailabilityCardComponent
                title="Staff Conference Room"
                href="/staff/rooms"
                room="staff_conference"
                showBookButton={true}
              />
              <HolidayAnnouncementsDisplay />
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