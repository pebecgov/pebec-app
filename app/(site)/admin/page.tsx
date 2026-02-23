// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState } from "react";
import AdminTicketsPage from "@/components/AdminTickets";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import CreateEventPage from "@/components/CreateEvents";
import { FaNewspaper, FaTools, FaCalendarAlt, FaChartPie } from "react-icons/fa";
import TicketsChart from "@/components/AnalyticsCharts/TicketsChart";
import UsersCard from "@/components/AnalyticsCharts/UsersChart";
import MdaChart from "@/components/AnalyticsCharts/MdaChart";
import AdminMonthlyTicketsReport from "@/components/AnalyticsCharts/MonthlyResolved";
import LetterStatsDashboard from "@/components/AnalyticsCharts/AssignedLettersAnalytics";
import TicketSummary from "@/components/TicketsStats";
import EventAnalyticsDashboard from "@/components/EventsStats";
import HolidayAnnouncementsDisplay from "@/components/HolidayWhereabout/HolidayAnnouncementsDisplay";
import SeventyTwoHourResolutionDashboard from "@/components/SeventyTwoHourResolutionDashboard";
import UpcomingMeetings from "@/components/StaffAnalytics/UpcomingMeetings";
import { useUser } from "@clerk/nextjs";
import { format } from "date-fns";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";

export default function AdminDashboard() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState("tickets");

  if (!isLoaded) {
    return <div className="text-center mt-10">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Professional Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1 text-lg">
            Welcome back, Administrator {user?.firstName || ""}. Here's the performance overview.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-md">
          <CalendarDaysIcon className="w-6 h-6 text-indigo-600" />
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Today's Date</span>
            <span className="text-sm font-bold text-gray-800">{format(new Date(), "EEEE, MMMM do, yyyy")}</span>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {/* Section 1: Core Resolution Metrics */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <div className="h-1 w-8 bg-indigo-500 rounded-full" />
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Resolution & Core Metrics</h2>
          </div>
          <div className="space-y-8">
            <SeventyTwoHourResolutionDashboard />
            <UsersCard />
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
              <div className="xl:col-span-3">
                <TicketSummary />
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Operations & Communication */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <div className="h-1 w-8 bg-emerald-500 rounded-full" />
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Schedule & Operations</h2>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
            <div className="space-y-8">
              <UpcomingMeetings baseUrl="/admin/meeting-calendar" />
              <LetterStatsDashboard />
            </div>
            <div className="space-y-8">
              <HolidayAnnouncementsDisplay />
            </div>
          </div>
        </section>

        {/* Section 3: Detailed Analytics */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <div className="h-1 w-8 bg-amber-500 rounded-full" />
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Detailed Insights & Trends</h2>
          </div>
          <div className="space-y-8">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <TicketsChart />
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <MdaChart />
            </div>
            <AdminMonthlyTicketsReport />
            <EventAnalyticsDashboard />
          </div>
        </section>
      </div>
    </div>
  );
}