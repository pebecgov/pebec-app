// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import UsersCard from "@/components/AnalyticsCharts/UsersChart";
import TicketsChart from "@/components/AnalyticsCharts/TicketsChart";
import MdaChart from "@/components/AnalyticsCharts/MdaChart";
import AdminMonthlyTicketsReport from "@/components/AnalyticsCharts/MonthlyResolved";
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
  return <div className="mt-5">
      <div className="mt-5 mb-5">
        <StaffAnalytics />
      </div>
      <div className="mt-5 mb-5">
        <UsersCard />
      </div>
      <div className="mt-5 mb-5">
        <TicketsChart />
      </div>
      <div className="mt-5 mb-5">
        <MdaChart />
      </div>
      <div className="mt-5 mb-5">
        <AdminMonthlyTicketsReport />
      </div>
    </div>;
}