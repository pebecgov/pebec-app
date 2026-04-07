"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ClockIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

const reasonLabel: Record<string, string> = {
  sick: "Sick Leave",
  official_assignment: "Official Assignment",
  leave: "Holiday",
};

const actionLabel: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  ended: "Ended",
  deleted: "Deleted",
};

export default function HolidayActivityLog() {
  const currentUser = useQuery(api.users.current);
  const users = useQuery(api.users.getAllUsers) || [];

  const [reasonFilter, setReasonFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [startDateFrom, setStartDateFrom] = useState("");
  const [startDateTo, setStartDateTo] = useState("");
  const [userFilter, setUserFilter] = useState("all");

  const isAdmin = currentUser?.role === "admin";

  const logs = useQuery(api.holidayAnnouncements.getActivityLogs, {
    reason: reasonFilter === "all" ? undefined : (reasonFilter as "sick" | "official_assignment" | "leave"),
    action: actionFilter === "all" ? undefined : (actionFilter as "created" | "updated" | "ended" | "deleted"),
    startDateFrom: startDateFrom || undefined,
    startDateTo: startDateTo || undefined,
    userId: isAdmin && userFilter !== "all" ? (userFilter as any) : undefined,
  });

  const logUsers = useMemo(
    () =>
      users
        .filter((u) => u.role === "admin" || u.role === "staff")
        .sort((a, b) =>
          `${a.firstName || ""} ${a.lastName || ""}`.localeCompare(`${b.firstName || ""} ${b.lastName || ""}`)
        ),
    [users]
  );

  const exportRows = useMemo(() => {
    if (!logs) return [];

    return logs.map((log) => ({
      "Date/Time": new Date(log.createdAt).toLocaleString(),
      Staff: log.userName,
      Action: actionLabel[log.action] || log.action,
      Reason: reasonLabel[log.reason] || log.reason,
      "Start Date": new Date(log.startDate).toLocaleDateString(),
      "End Date": new Date(log.endDate).toLocaleDateString(),
      "Start Time": log.startTime || "",
      "End Time": log.endTime || "",
      "Performed By": log.performedByName,
    }));
  }, [logs]);

  const handleDownloadCsv = () => {
    if (!exportRows.length) return;
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `absence-activity-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadExcel = () => {
    if (!exportRows.length) return;
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Activity Log");
    XLSX.writeFile(workbook, `absence-activity-log-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <Card className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClockIcon className="w-5 h-5" />
          Absence Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className={`grid gap-3 ${isAdmin ? "grid-cols-1 md:grid-cols-5" : "grid-cols-1 md:grid-cols-4"}`}>
            <Select value={reasonFilter} onValueChange={setReasonFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reasons</SelectItem>
                <SelectItem value="sick">Sick Leave</SelectItem>
                <SelectItem value="official_assignment">Official Assignment</SelectItem>
                <SelectItem value="leave">Holiday</SelectItem>
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="ended">Ended</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
              </SelectContent>
            </Select>

            <Input type="date" value={startDateFrom} onChange={(e) => setStartDateFrom(e.target.value)} />
            <Input type="date" value={startDateTo} onChange={(e) => setStartDateTo(e.target.value)} />

            {isAdmin && (
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {logUsers.map((u) => (
                    <SelectItem key={u._id} value={u._id}>
                      {`${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleDownloadCsv} disabled={!exportRows.length}>
              Download CSV
            </Button>
            {/* <Button type="button" variant="outline" onClick={handleDownloadExcel} disabled={!exportRows.length}>
              Download Excel
            </Button> */}
          </div>

          {!logs ? (
            <div className="text-sm text-gray-500 py-8 text-center">Loading activity log...</div>
          ) : logs.length === 0 ? (
            <div className="text-sm text-gray-500 py-8 text-center">No activity log entries found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="text-left p-3">Date/Time</th>
                    <th className="text-left p-3">Staff</th>
                    <th className="text-left p-3">Action</th>
                    <th className="text-left p-3">Reason</th>
                    <th className="text-left p-3">Notice Period</th>
                    <th className="text-left p-3">Performed By</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id} className="border-b">
                      <td className="p-3 text-gray-700">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="p-3 font-medium text-gray-900">{log.userName}</td>
                      <td className="p-3">
                        <Badge variant="outline">{actionLabel[log.action] || log.action}</Badge>
                      </td>
                      <td className="p-3">{reasonLabel[log.reason] || log.reason}</td>
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span>
                            {new Date(log.startDate).toLocaleDateString()} - {new Date(log.endDate).toLocaleDateString()}
                          </span>
                          {log.startTime && log.endTime && (
                            <span className="text-xs text-blue-600">
                              {log.startTime} - {log.endTime}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-gray-700">{log.performedByName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
