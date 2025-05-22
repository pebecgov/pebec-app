// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import DLIStatusCard from "@/components/ReformChampionDashboard/DLIStatusCard";
import DLIProgressChart from "@/components/ReformChampionDashboard/DLIProgressChart";
import ActivitySummary from "@/components/ReformChampionDashboard/ActivitySummary";
import MaterialsCallout from "@/components/ReformChampionDashboard/MaterialsCallout";
export default function SubNational() {
  const user = useQuery(api.users.getCurrentUsers);
  const state = user?.state || "your state";
  return <div className="grid gap-6 mt-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <DLIStatusCard state={state} />
      <DLIProgressChart />
      <ActivitySummary />
      <MaterialsCallout />
    </div>;
}