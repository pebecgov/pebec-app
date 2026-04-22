// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Award, Activity, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { formatWorkstream } from "@/lib/formatters";

export default function StaffLeaderboard() {
  const [showAllStaff, setShowAllStaff] = useState(false);
  const staffMetrics = useQuery(api.users.getStaffUsageMetrics, { timeRange: "all" });

  // Handle loading state
  if (staffMetrics === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Staff Performance Leaderboard
          </CardTitle>
          <CardDescription>Loading performance data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle error state
  if (staffMetrics === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-red-500" />
            Staff Performance Leaderboard
          </CardTitle>
          <CardDescription>Error loading performance data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="text-sm text-red-600 mb-2">Failed to load leaderboard data</div>
              <div className="text-xs text-muted-foreground">
                Please check your permissions or try refreshing the page
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get all staff members with their activity counts (with error handling)
  const allStaffMembers = Object.entries(staffMetrics?.streamMetrics || {})
    .flatMap(([stream, metrics]) => 
      (metrics?.mostActiveUsers || []).map(user => ({ 
        ...user, 
        stream,
        streamTotalUsers: metrics?.totalUsers || 0,
        streamActiveUsers: metrics?.activeUsers || 0
      }))
    )
    .sort((a, b) => b.activityCount - a.activityCount);

  // Calculate actual active staff count from stream metrics (frontend filtering)
  const actualActiveStaff = Object.values(staffMetrics?.streamMetrics || {})
    .reduce((total, stream) => total + (stream?.activeUsers || 0), 0);
  
  const displayedStaff = showAllStaff ? allStaffMembers : allStaffMembers.slice(0, 5);
  const totalActions = Object.values(staffMetrics?.streamMetrics || {}).reduce(
    (sum, stream) => sum + (stream?.totalActions || 0),
    0
  );

  const getStreamColor = (stream: string) => {
    const colors: Record<string, string> = {
      regulatory: "bg-blue-100 text-blue-800 border-blue-200",
      innovation: "bg-green-100 text-green-800 border-green-200",
      judiciary: "bg-purple-100 text-purple-800 border-purple-200",
      communications: "bg-pink-100 text-pink-800 border-pink-200",
      investments: "bg-yellow-100 text-yellow-800 border-yellow-200",
      receptionist: "bg-indigo-100 text-indigo-800 border-indigo-200",
      account: "bg-red-100 text-red-800 border-red-200",
      auditor: "bg-gray-100 text-gray-800 border-gray-200"
    };
    return colors[stream] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <div className="h-5 w-5 flex items-center justify-center text-sm font-bold text-muted-foreground">
          {index + 1}
        </div>;
    }
  };

  const getRankBadgeColor = (index: number) => {
    switch (index) {
      case 0:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 1:
        return "bg-gray-100 text-gray-800 border-gray-200";
      case 2:
        return "bg-amber-100 text-amber-800 border-amber-200";
      default:
        return "bg-gray-50 text-gray-600 border-gray-100";
    }
  };

  return (
    <Card className="flex h-[38rem] flex-col overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Staff Performance Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-3">
        <div className="flex min-h-0 flex-1 flex-col rounded-lg border bg-muted/20 p-2.5 sm:p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Ranking
            </p>
            <p className="text-xs text-muted-foreground">
              Showing {displayedStaff.length} of {allStaffMembers.length}
            </p>
          </div>

          {allStaffMembers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Activity className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>No activity data available yet</p>
              <p className="text-sm">Start using the system to see performance metrics</p>
            </div>
          ) : (
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
              {displayedStaff.map((staff, index) => (
                <div
                  key={`${staff.userId}-${staff.stream}`}
                  className={`flex items-start justify-between gap-2.5 rounded-lg border px-2.5 py-2 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:gap-3 sm:px-3 ${
                    index < 3
                      ? "border-emerald-100 bg-gradient-to-r from-white via-emerald-50/70 to-green-50/60"
                      : "border-slate-200 bg-gradient-to-r from-white to-slate-50/40"
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/90 ring-1 ring-slate-200 sm:h-8 sm:w-8">
                      {getRankIcon(index)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <h4 className="text-xs font-semibold text-slate-900 break-words sm:text-sm">
                          {staff.name}
                        </h4>
                        <Badge
                          className={`max-w-full text-[10px] font-medium ${getStreamColor(staff.stream)}`}
                          title={formatWorkstream(staff.stream)}
                        >
                          {formatWorkstream(staff.stream)}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 sm:text-xs">
                        Last active: {new Date(staff.lastActive).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 pt-0.5 text-right">
                    <div className="mb-1 flex items-center justify-end gap-2">
                      <Badge className={`text-[10px] ${getRankBadgeColor(index)}`}>#{index + 1}</Badge>
                      <span className="text-base font-bold text-slate-900 sm:text-lg">
                        {staff.activityCount}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 sm:text-xs">activities</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {allStaffMembers.length > 5 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAllStaff(!showAllStaff)}
            className="w-full"
          >
            {showAllStaff ? (
              <>
                <ChevronUp className="mr-1 h-3 w-3" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="mr-1 h-3 w-3" />
                See More ({allStaffMembers.length - 5} more)
              </>
            )}
          </Button>
        )}

        <div className="border-t pt-3">
          <div className="grid grid-cols-3 gap-1.5 text-center sm:gap-2">
            <div>
              <div className="text-lg font-bold text-blue-600 sm:text-2xl">
                {staffMetrics?.totalStaffUsers || 0}
              </div>
              <p className="text-[10px] text-muted-foreground sm:text-xs">Total Staff</p>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600 sm:text-2xl">
                {actualActiveStaff}
              </div>
              <p className="text-[10px] text-muted-foreground sm:text-xs">Active Staff</p>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-600 sm:text-2xl">
                {totalActions}
              </div>
              <p className="text-[10px] text-muted-foreground sm:text-xs">Total Actions</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
