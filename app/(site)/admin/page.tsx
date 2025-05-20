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

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("tickets");

  return (
    <div className="mt-5">
        <div className="mt-5 mb-5">
        <TicketSummary/>
        </div>
         <div className="mt-5 mb-5">
        <UsersCard/>
        </div>
        <div className="mt-5 mb-5">
        <LetterStatsDashboard/>
        </div>
      <div className="mt-5 mb-5">
        <TicketsChart/>
        </div>

       

     

        <div className="mt-5 mb-5">
        <MdaChart/>
        </div>

        <div className="mt-5 mb-5">
        <AdminMonthlyTicketsReport/>
        </div>

        <div className="mt-5 mb-5">
        <EventAnalyticsDashboard/>
        </div>
        
        </div>
    );
}
