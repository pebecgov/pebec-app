// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import * as XLSX from "xlsx";
import { Clock, Download, TrendingUp, Building2 } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";

export default function SeventyTwoHourResolutionDashboard() {
  const { isSignedIn } = useAuth();
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const stats = isSignedIn
    ? useQuery(api.tickets.get72HourResolutionStats, {
        fromDate: fromDate?.getTime() ?? undefined,
        toDate: toDate?.getTime() ?? undefined,
      })
    : null;

  const handleExportToExcel = () => {
    if (!stats) {
      toast.error("No data available to export");
      return;
    }

    const workbook = XLSX.utils.book_new();

    // System-wide summary sheet
    const systemSummary = [
      { Metric: "Total Resolved (All Time)", Value: stats.systemWide.totalResolved },
      { Metric: "Resolved Within 72 Hours", Value: stats.systemWide.resolvedWithin72h },
      { Metric: "Total Closed (All Time)", Value: stats.systemWide.totalClosed },
      { Metric: "Closed Within 72 Hours", Value: stats.systemWide.closedWithin72h },
      { Metric: "Total Resolved/Closed Within 72 Hours", Value: stats.systemWide.totalResolvedWithin72h },
      { Metric: "Total Resolved + Closed", Value: stats.systemWide.totalResolvedAndClosed },
      { Metric: "72-Hour Resolution Rate (%)", Value: stats.systemWide.totalResolvedAndClosed > 0 
        ? ((stats.systemWide.totalResolvedWithin72h / stats.systemWide.totalResolvedAndClosed) * 100).toFixed(2)
        : "0.00"
      },
      {},
      { Metric: "Date Range", Value: "" },
      { Metric: "From", Value: stats.dateRange.from ? new Date(stats.dateRange.from).toLocaleDateString() : "All Time" },
      { Metric: "To", Value: stats.dateRange.to ? new Date(stats.dateRange.to).toLocaleDateString() : "All Time" }
    ];

    const summarySheet = XLSX.utils.json_to_sheet(systemSummary);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "System Summary");

    // Per-MDA breakdown sheet
    const mdaData = stats.perMda.map((mda, index) => ({
      Rank: index + 1,
      "MDA Name": mda.mdaName,
      "Total Tickets": mda.totalTickets,
      "Total Resolved": mda.totalResolved,
      "Resolved Within 72h": mda.resolvedWithin72h,
      "Total Closed": mda.totalClosed,
      "Closed Within 72h": mda.closedWithin72h,
      "Total Resolved/Closed Within 72h": mda.resolvedWithin72h + mda.closedWithin72h,
      "Total Resolved + Closed": mda.totalResolved + mda.totalClosed,
      "72-Hour Resolution Rate (%)": (mda.totalResolved + mda.totalClosed) > 0
        ? (((mda.resolvedWithin72h + mda.closedWithin72h) / (mda.totalResolved + mda.totalClosed)) * 100).toFixed(2)
        : "0.00"
    }));

    const mdaSheet = XLSX.utils.json_to_sheet(mdaData);
    XLSX.utils.book_append_sheet(workbook, mdaSheet, "Per MDA Breakdown");

    // Generate filename
    const dateStr = fromDate && toDate
      ? `${fromDate.toISOString().split('T')[0]}_to_${toDate.toISOString().split('T')[0]}`
      : "all_time";
    const fileName = `72hour_resolution_stats_${dateStr}.xlsx`;

    XLSX.writeFile(workbook, fileName);
    toast.success("Excel file downloaded successfully!");
  };

  if (!isSignedIn) {
    return null;
  }

  if (stats === undefined) {
    return <div className="text-center mt-10">Loading 72-hour resolution statistics...</div>;
  }

  if (stats === null) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Unable to load 72-hour resolution statistics. Please ensure you have admin access.
          </p>
        </div>
      </div>
    );
  }

  const systemResolutionRate = stats.systemWide.totalResolvedAndClosed > 0
    ? ((stats.systemWide.totalResolvedWithin72h / stats.systemWide.totalResolvedAndClosed) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Clock className="w-6 h-6 text-blue-600" />
              72-Hour Resolution Dashboard
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Track tickets resolved within 72 hours (excluding weekends)
            </p>
          </div>
        </div>

        {/* Date Range Filters */}
        <div className="flex flex-wrap gap-4 items-end mb-4 pb-4 border-b">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">From Date</label>
            <DatePicker
              selected={fromDate}
              onChange={setFromDate}
              className="border px-3 py-2 rounded-md w-40"
              placeholderText="Start date"
              dateFormat="MMM dd, yyyy"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">To Date</label>
            <DatePicker
              selected={toDate}
              onChange={setToDate}
              className="border px-3 py-2 rounded-md w-40"
              placeholderText="End date"
              dateFormat="MMM dd, yyyy"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setFromDate(null);
                setToDate(null);
              }}
              className="flex items-center gap-2"
            >
              ♻️ Reset
            </Button>
            <Button
              onClick={handleExportToExcel}
              className="bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export to Excel
            </Button>
          </div>
        </div>

        {/* System-Wide Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-600">Resolved ≤ 72h</span>
            </div>
            <p className="text-2xl font-bold text-blue-800">
              {stats.systemWide.resolvedWithin72h}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              of {stats.systemWide.totalResolved} resolved
            </p>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-600">Closed ≤ 72h</span>
            </div>
            <p className="text-2xl font-bold text-green-800">
              {stats.systemWide.closedWithin72h}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              of {stats.systemWide.totalClosed} closed
            </p>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-gray-600">Total ≤ 72h</span>
            </div>
            <p className="text-2xl font-bold text-purple-800">
              {stats.systemWide.totalResolvedWithin72h}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              of {stats.systemWide.totalResolvedAndClosed} total
            </p>
          </div>

          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              <span className="text-sm text-gray-600">Resolution Rate</span>
            </div>
            <p className="text-2xl font-bold text-orange-800">
              {systemResolutionRate}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              72-hour target achievement
            </p>
          </div>
        </div>
      </div>

      {/* Per-MDA Breakdown Table */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-600" />
            Per-MDA Breakdown
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Showing {stats.perMda.length} MDAs with ticket data
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  MDA Name
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Tickets
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resolved ≤ 72h
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Closed ≤ 72h
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total ≤ 72h
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Resolved + Closed
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resolution Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.perMda.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No MDA data available for the selected time period
                  </td>
                </tr>
              ) : (
                stats.perMda.map((mda, index) => {
                  const totalResolvedClosed = mda.totalResolved + mda.totalClosed;
                  const totalWithin72h = mda.resolvedWithin72h + mda.closedWithin72h;
                  const resolutionRate = totalResolvedClosed > 0
                    ? ((totalWithin72h / totalResolvedClosed) * 100).toFixed(1)
                    : "0.0";

                  return (
                    <tr key={mda.mdaId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {mda.mdaName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {mda.totalTickets}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {mda.resolvedWithin72h}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {mda.closedWithin72h}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                        {totalWithin72h}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {totalResolvedClosed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            parseFloat(resolutionRate) >= 80
                              ? "bg-green-100 text-green-800"
                              : parseFloat(resolutionRate) >= 50
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {resolutionRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

