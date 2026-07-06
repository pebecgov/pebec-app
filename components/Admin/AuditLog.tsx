"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

const PAGE_SIZE = 25;

const categoryLabel: Record<string, string> = {
  user: "User",
  task: "Task",
  leave: "Leave",
  bfa: "BFA / Scoring",
};

const actionLabel: Record<string, string> = {
  "user.role_changed": "Role changed",
  "user.deleted": "User deleted",
  "user.role_request_approved": "Role request approved",
  "user.role_request_rejected": "Role request rejected",
  "task.completion_reviewed": "Task completion reviewed",
  "leave.reviewed": "Leave reviewed",
  "leave.admin_recorded": "Leave recorded by admin",
  "bfa.mda_score_saved": "MDA score saved",
  "bfa.state_score_saved": "State score saved",
};

const categoryBadgeClass: Record<string, string> = {
  user: "bg-blue-100 text-blue-800",
  task: "bg-purple-100 text-purple-800",
  leave: "bg-amber-100 text-amber-800",
  bfa: "bg-green-100 text-green-800",
};

function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

function buildFilterArgs(
  categoryFilter: string,
  actionFilter: string,
  startDate: string,
  endDate: string,
  search: string
) {
  return {
    category:
      categoryFilter === "all"
        ? undefined
        : (categoryFilter as "user" | "task" | "leave" | "bfa"),
    action: actionFilter === "all" ? undefined : (actionFilter as any),
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    search: search.trim() || undefined,
  };
}

function rowsFromLogs(logs: Array<any>) {
  return logs.map((log) => ({
    "Date/Time": new Date(log.createdAt).toLocaleString(),
    Category: categoryLabel[log.category] || log.category,
    Action: actionLabel[log.action] || log.action,
    Summary: log.summary,
    "Performed By": log.actorName,
    "Actor Email": log.actorEmail || "",
    Target: log.targetLabel || "",
    Details: log.metadata ? JSON.stringify(log.metadata) : "",
  }));
}

export default function AuditLog() {
  const currentUser = useQuery(api.users.getCurrentUsers);

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const isAdmin = currentUser?.role === "admin";

  const filterArgs = useMemo(
    () =>
      buildFilterArgs(
        categoryFilter,
        actionFilter,
        startDate,
        endDate,
        debouncedSearch
      ),
    [categoryFilter, actionFilter, startDate, endDate, debouncedSearch]
  );

  useEffect(() => {
    setPage(0);
    setExpandedId(null);
  }, [categoryFilter, actionFilter, startDate, endDate, debouncedSearch]);

  const listResult = useQuery(
    api.auditLogs.list,
    isAdmin
      ? {
          page,
          pageSize: PAGE_SIZE,
          ...filterArgs,
        }
      : "skip"
  );

  useEffect(() => {
    if (listResult && listResult.page !== page) {
      setPage(listResult.page);
    }
  }, [listResult?.page, listResult, page]);

  const exportResult = useQuery(
    api.auditLogs.listForExport,
    isAdmin ? filterArgs : "skip"
  );

  const logs = listResult?.logs;
  const total = listResult?.total ?? 0;
  const totalPages = listResult?.totalPages ?? 1;
  const currentPage = listResult?.page ?? 0;

  const handleDownloadCsv = () => {
    const exportLogs = exportResult?.logs;
    if (!exportLogs?.length) return;

    const exportRows = rowsFromLogs(exportLogs);
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (currentUser === undefined) {
    return (
      <div className="text-sm text-gray-500 py-8 text-center">Loading...</div>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="rounded-2xl border border-gray-100 shadow-sm">
        <CardContent className="py-12 text-center text-gray-600">
          You do not have permission to view the audit log.
        </CardContent>
      </Card>
    );
  }

  const showingFrom = total === 0 ? 0 : currentPage * PAGE_SIZE + 1;
  const showingTo = Math.min((currentPage + 1) * PAGE_SIZE, total);

  return (
    <Card className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheckIcon className="w-5 h-5" />
          Audit Log
        </CardTitle>
        <p className="text-sm text-gray-500">
          Key admin actions: role changes, user deletions, task approvals, leave reviews, and BFA scoring.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-5">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="leave">Leave</SelectItem>
                <SelectItem value="bfa">BFA / Scoring</SelectItem>
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {Object.entries(actionLabel).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-label="Start date"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-label="End date"
            />
            <Input
              placeholder="Search summary or names..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600">
              {listResult === undefined ? (
                "Loading..."
              ) : total === 0 ? (
                "No entries"
              ) : (
                <>
                  Showing{" "}
                  <span className="font-medium text-gray-900">
                    {showingFrom}–{showingTo}
                  </span>{" "}
                  of <span className="font-medium text-gray-900">{total}</span>
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadCsv}
                disabled={!exportResult?.logs?.length}
              >
                Download CSV
                {exportResult?.truncated ? " (first 5,000)" : ""}
              </Button>
            </div>
          </div>

          {listResult === undefined ? (
            <div className="text-sm text-gray-500 py-8 text-center">
              Loading audit log...
            </div>
          ) : logs?.length === 0 ? (
            <div className="text-sm text-gray-500 py-8 text-center">
              No audit log entries found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="text-left p-3">Date/Time</th>
                    <th className="text-left p-3">Category</th>
                    <th className="text-left p-3">Action</th>
                    <th className="text-left p-3">Summary</th>
                    <th className="text-left p-3">Performed By</th>
                    <th className="text-left p-3">Target</th>
                    <th className="text-left p-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id} className="border-t border-gray-100 align-top">
                      <td className="p-3 whitespace-nowrap text-gray-600">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <Badge className={categoryBadgeClass[log.category] || ""}>
                          {categoryLabel[log.category] || log.category}
                        </Badge>
                      </td>
                      <td className="p-3 text-gray-700">
                        {actionLabel[log.action] || log.action}
                      </td>
                      <td className="p-3 text-gray-900 max-w-xs">{log.summary}</td>
                      <td className="p-3">
                        <div className="font-medium text-gray-900">{log.actorName}</div>
                        {log.actorEmail && (
                          <div className="text-xs text-gray-500">{log.actorEmail}</div>
                        )}
                      </td>
                      <td className="p-3 text-gray-700">{log.targetLabel || "—"}</td>
                      <td className="p-3">
                        {log.metadata ? (
                          <button
                            type="button"
                            className="text-green-700 hover:underline text-xs"
                            onClick={() =>
                              setExpandedId(expandedId === log._id ? null : log._id)
                            }
                          >
                            {expandedId === log._id ? "Hide" : "View"}
                          </button>
                        ) : (
                          "—"
                        )}
                        {expandedId === log._id && log.metadata && (
                          <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto max-w-xs">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {total > PAGE_SIZE && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
              <span className="text-sm text-gray-600">
                Page {currentPage + 1} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 0}
                  onClick={() => {
                    setPage((p) => Math.max(0, p - 1));
                    setExpandedId(null);
                  }}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => {
                    setPage((p) => p + 1);
                    setExpandedId(null);
                  }}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
