// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { X } from "lucide-react";
import UsersCard from "@/components/AnalyticsCharts/UsersChart";
import TicketsChart from "@/components/AnalyticsCharts/TicketsChart";
import MdaChart from "@/components/AnalyticsCharts/MdaChart";
import AdminMonthlyTicketsReport from "@/components/AnalyticsCharts/MonthlyResolved";
export default function AdminDashboard() {
  const {
    user
  } = useUser();
  const fullName = user?.fullName ?? "Valued Leader";
  const [firstName, lastName] = fullName.split(" ");
  const [isWelcomeVisible, setIsWelcomeVisible] = useState(true);
  return <div className="mt-5 max-w-7xl mx-auto px-4">
      {}
      {isWelcomeVisible && <div className="bg-white shadow rounded-lg p-6 mb-6 relative">
          <button onClick={() => setIsWelcomeVisible(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700" title="Dismiss">
            <X className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            Welcome, Mr. Vice President {firstName} {lastName}
          </h1>
          <p className="text-gray-600 mt-1">Please use the left side bar navigation to discover ReportGov Analytics, Saber Program Overview, Submitted Reports & Resource Materials.</p>
        </div>}

      {}
      <div className="space-y-6">
        <UsersCard />
        <TicketsChart />
        <MdaChart />
        <AdminMonthlyTicketsReport />
      </div>
    </div>;
}