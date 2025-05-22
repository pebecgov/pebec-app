// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
export default function MdaMonthlyStatsCard() {
  const stats = useQuery(api.tickets.getMdaMonthlySummaryStats);
  const ticketsThisMonth = stats?.ticketsThisMonth ?? 0;
  const resolvedIn48hrs = stats?.resolvedIn72hrs ?? 0;
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {}
      <div className="bg-white p-6 rounded-lg shadow text-center border">
        <h3 className="text-md font-semibold mb-2 text-gray-700">
          📅 Reports This Month
        </h3>
        <p className="text-3xl font-bold text-blue-600">{ticketsThisMonth}</p>
      </div>

      {}
      <div className="bg-white p-6 rounded-lg shadow text-center border">
        <h3 className="text-md font-semibold mb-2 text-gray-700">
          ⏱ Resolved Within 72h
        </h3>
        <p className="text-3xl font-bold text-green-600">{resolvedIn48hrs}</p>
      </div>
    </div>;
}