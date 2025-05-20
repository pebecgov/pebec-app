"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function MdaMonthlyStatsCard() {
  const stats = useQuery(api.tickets.getMdaMonthlySummaryStats);

  // Optional fallback values if query returns undefined
  const ticketsThisMonth = stats?.ticketsThisMonth ?? 0;
  const resolvedIn48hrs = stats?.resolvedIn72hrs ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* 📅 Reports This Month */}
      <div className="bg-white p-6 rounded-lg shadow text-center border">
        <h3 className="text-md font-semibold mb-2 text-gray-700">
          📅 Reports This Month
        </h3>
        <p className="text-3xl font-bold text-blue-600">{ticketsThisMonth}</p>
      </div>

      {/* ⏱ Resolved Within 48h */}
      <div className="bg-white p-6 rounded-lg shadow text-center border">
        <h3 className="text-md font-semibold mb-2 text-gray-700">
          ⏱ Resolved Within 72h
        </h3>
        <p className="text-3xl font-bold text-green-600">{resolvedIn48hrs}</p>
      </div>
    </div>
  );
}
