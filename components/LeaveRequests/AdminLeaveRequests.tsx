"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EyeIcon, PlusIcon } from "@heroicons/react/24/outline";
import {
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  UserMinusIcon,
} from "@heroicons/react/24/outline";
import { LeaveRequestDetailDialog } from "./LeaveRequestDetailDialog";
import { AdminRecordLeaveDialog } from "./AdminRecordLeaveDialog";
import {
  LeaveOverviewStaffDialog,
  OverviewModalKey,
} from "./LeaveOverviewStaffDialog";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

function statusBadge(status: string) {
  if (status === "approved")
    return (
      <Badge className="border-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
        Approved
      </Badge>
    );
  if (status === "rejected")
    return (
      <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100">
        Rejected
      </Badge>
    );
  return (
    <Badge className="border-0 bg-amber-100 text-amber-900 hover:bg-amber-100">
      Pending
    </Badge>
  );
}

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const MODAL_TITLES: Record<Exclude<OverviewModalKey, null>, string> = {
  onLeaveNow: "Staff on leave now",
  upcomingLeave: "Staff with upcoming leave",
  pendingReview: "Staff awaiting review",
  notOnLeave: "Staff not on leave",
};

export default function AdminLeaveRequests() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const overview = useQuery(api.leaveRequests.getAdminLeaveOverview, {});
  const allRequests = useQuery(api.leaveRequests.listAllLeaveRequests, {});
  const [detailId, setDetailId] = useState<Id<"leaveRequests"> | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [overviewModal, setOverviewModal] = useState<OverviewModalKey>(null);

  const requests = useMemo(() => {
    if (!allRequests) return undefined;
    if (statusFilter === "all") return allRequests;
    return allRequests.filter((r) => r.status === statusFilter);
  }, [allRequests, statusFilter]);

  const counts = useMemo(() => {
    if (!allRequests) return { all: 0, pending: 0, approved: 0, rejected: 0 };
    return {
      all: allRequests.length,
      pending: allRequests.filter((r) => r.status === "pending").length,
      approved: allRequests.filter((r) => r.status === "approved").length,
      rejected: allRequests.filter((r) => r.status === "rejected").length,
    };
  }, [allRequests]);

  const statCards = useMemo(
    () => [
      {
        key: "onLeaveNow" as const,
        title: "On leave now",
        value: overview?.onLeaveNow ?? "—",
        desc: "Unique staff on approved leave today",
        icon: UserGroupIcon,
        className: "border-emerald-200 bg-emerald-50/80",
        iconClass: "text-emerald-600",
      },
      {
        key: "upcomingLeave" as const,
        title: "Upcoming leave",
        value: overview?.upcomingLeave ?? "—",
        desc: "Unique staff with future approved leave",
        icon: CalendarDaysIcon,
        className: "border-blue-200 bg-blue-50/80",
        iconClass: "text-blue-600",
      },
      {
        key: "pendingReview" as const,
        title: "Awaiting review",
        value: overview?.pendingReview ?? "—",
        desc:
          overview?.pendingRequestCount != null && overview.pendingRequestCount > overview.pendingReview
            ? `${overview.pendingRequestCount} request(s) from ${overview.pendingReview} staff`
            : "Unique staff with pending requests",
        icon: ClockIcon,
        className: "border-amber-200 bg-amber-50/80",
        iconClass: "text-amber-600",
      },
      {
        key: "notOnLeave" as const,
        title: "Not on leave",
        value: overview?.notOnLeave ?? "—",
        desc: `Of ${overview?.totalStaff ?? "—"} staff — no current, upcoming, or pending leave`,
        icon: UserMinusIcon,
        className: "border-slate-200 bg-slate-50/80",
        iconClass: "text-slate-600",
      },
    ],
    [overview]
  );

  const modalProps = useMemo(() => {
    if (!overview || !overviewModal) return null;
    switch (overviewModal) {
      case "onLeaveNow":
        return {
          staffWithLeaves: overview.onLeaveNowStaff,
          staffSimple: undefined,
        };
      case "upcomingLeave":
        return {
          staffWithLeaves: overview.upcomingStaff,
          staffSimple: undefined,
        };
      case "pendingReview":
        return {
          staffWithLeaves: overview.pendingStaff,
          staffSimple: undefined,
        };
      case "notOnLeave":
        return {
          staffWithLeaves: undefined,
          staffSimple: overview.notOnLeaveStaff,
        };
      default:
        return null;
    }
  }, [overview, overviewModal]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Leave management</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Review requests, record leave for staff, and track who is away. Counts are by unique
            staff, not number of leave records.
          </p>
        </div>
        <Button
          className="shrink-0 bg-green-600 hover:bg-green-700"
          onClick={() => setRecordOpen(true)}
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          Record staff leave
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.key} className={cn("border shadow-sm", card.className)}>
            <CardContent className="flex gap-3 p-5">
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm",
                  card.iconClass
                )}
              >
                <card.icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-gray-500 hover:text-gray-900"
                    title={`View ${card.title.toLowerCase()}`}
                    onClick={() => setOverviewModal(card.key)}
                    disabled={overview === undefined}
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-3xl font-bold tabular-nums text-gray-900">{card.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{card.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="border-b bg-gray-50/50 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Leave requests</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setStatusFilter(f.value)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                    statusFilter === f.value
                      ? "bg-green-600 text-white shadow-sm"
                      : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                  )}
                >
                  {f.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                      statusFilter === f.value
                        ? "bg-green-700 text-white"
                        : "bg-gray-100 text-gray-600"
                    )}
                  >
                    {counts[f.value]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                <TableHead className="font-semibold">Applicant</TableHead>
                <TableHead className="font-semibold">Subject</TableHead>
                <TableHead className="font-semibold">Dates</TableHead>
                <TableHead className="font-semibold">Days</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Source</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests === undefined && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {requests?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No requests match this filter
                  </TableCell>
                </TableRow>
              )}
              {requests?.map((r) => (
                <TableRow
                  key={r._id}
                  className={cn(
                    "transition-colors",
                    r.status === "pending" && "bg-amber-50/40 hover:bg-amber-50/70"
                  )}
                >
                  <TableCell className="font-medium">{r.applicantName}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{r.subject}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-gray-600">
                    {r.startDate} → {r.endDate}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium tabular-nums">{r.workingDays}</span>
                  </TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {r.source === "admin" ? "Admin" : "Staff"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-green-700 hover:bg-green-50 hover:text-green-800"
                      onClick={() => setDetailId(r._id)}
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {overviewModal && (
        <LeaveOverviewStaffDialog
          open={!!overviewModal}
          onClose={() => setOverviewModal(null)}
          title={MODAL_TITLES[overviewModal]}
          staffWithLeaves={modalProps?.staffWithLeaves}
          staffSimple={modalProps?.staffSimple}
        />
      )}

      <LeaveRequestDetailDialog
        leaveRequestId={detailId}
        open={!!detailId}
        onClose={() => setDetailId(null)}
        isAdmin
        onReviewed={() => setDetailId(null)}
      />
      <AdminRecordLeaveDialog
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        onSuccess={() => setRecordOpen(false)}
      />
    </div>
  );
}
