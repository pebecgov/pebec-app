"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import LineChart from "@/components/ui/Linechart";

export default function SubNational() {
  const [activeTab, setActiveTab] = useState("reports");

  const user = useQuery(api.users.getCurrentUsers);
  const reports = useQuery(api.internal_reports.getSubmittedInternalReports, user?._id ? { submittedBy: user._id } : "skip");

  const thisMonthReports = reports?.filter((r) => {
    const date = new Date(r.submittedAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }) ?? [];

  return (
    <div className="mt-5 grid gap-6 max-w-6xl mx-auto px-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="text-sm text-gray-600">Total Reports Submitted</h3>
          <p className="text-2xl font-semibold">{reports?.length ?? 0}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm text-gray-600">Reports This Month</h3>
          <p className="text-2xl font-semibold">{thisMonthReports.length}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm text-gray-600">Last Submission</h3>
          <p className="text-md">
            {reports && reports.length > 0
              ? format(new Date(reports[0].submittedAt), "PPP")
              : "No reports yet"}
          </p>
        </Card>
      </div>

      {/* Chart Example */}
      <div className="bg-white p-6 rounded-xl shadow mt-4">
        <h2 className="text-lg font-semibold mb-4">Submission Trend</h2>
        <LineChart data={reports ?? []} />
      </div>
    </div>
  );
}
