// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
export default function ActivitySummary() {
  const letters = useQuery(api.letters.getUserLetters) || [];
  const reports = useQuery(api.internal_reports.getReportsByUser) || [];
  const now = Date.now();
  const cutoff = now - 30 * 24 * 60 * 60 * 1000;
  const recentLetters = letters.filter(l => l.letterDate >= cutoff).length;
  const recentReports = reports.filter(r => r.submittedAt >= cutoff).length;
  return <div className="bg-white p-6 shadow rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-6">
      <div>
        <h3 className="text-md text-gray-600">Letters Sent (Last 30 Days)</h3>
        <p className="text-2xl font-bold text-blue-500">{recentLetters}</p>
      </div>
      <div>
        <h3 className="text-md text-gray-600">Reports Submitted (Last 30 Days)</h3>
        <p className="text-2xl font-bold text-green-500">{recentReports}</p>
      </div>
    </div>;
}