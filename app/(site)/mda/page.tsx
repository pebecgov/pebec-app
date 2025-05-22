// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState } from "react";
import AdminTicketsPage from "@/components/AdminTickets";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import CreateEventPage from "@/components/CreateEvents";
import { FaNewspaper, FaTools, FaCalendarAlt, FaChartPie } from "react-icons/fa";
import MDAStats from "@/components/MDAnalytics/Charts";
import MdaTicketsChart from "@/components/MDAnalytics/Overview";
import MdaMonthlyStatsCard from "@/components/MDAnalytics/MonthlyReportStats";
import MDAMeetingsAnalytics from "@/components/MDAnalytics/Meetings";
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("tickets");
  return <div className="mt-5">
        
        <div className="mt-5 mb-5">
          <MDAMeetingsAnalytics />
          </div>
          <div className="mt-5 mb-5">
          <MDAStats />
          </div>

          <div className="mt-5 mb-5">
          <MdaTicketsChart />
          </div>

          <div className="mt-5 mb-5">
          <MdaMonthlyStatsCard />
          </div>
          
          </div>;
}