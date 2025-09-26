// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Award, TrendingUp, Users, Activity, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { formatWorkstream } from "@/lib/formatters";

export default function StaffLeaderboard() {
  const [showAllStaff, setShowAllStaff] = useState(false);
  const staffMetrics = useQuery(api.users.getStaffUsageMetrics, { timeRange: "30d" });

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
  
  const displayedStaff = showAllStaff ? allStaffMembers : allStaffMembers.slice(0, 1);

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Staff Performance Leaderboard
        </CardTitle>
        <CardDescription>
          Top performing staff members in the last 30 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
            {allStaffMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No activity data available yet</p>
                <p className="text-sm">Start using the system to see performance metrics</p>
              </div>
            ) : (
              <>
                {displayedStaff.map((staff, index) => (
              <div
                key={`${staff.userId}-${staff.stream}`}
                className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                  index < 3 ? 'bg-gradient-to-r from-white to-gray-50' : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                    {getRankIcon(index)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">{staff.name}</h4>
                      <Badge className={`text-xs ${getStreamColor(staff.stream)}`}>
                        {formatWorkstream(staff.stream)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Last active: {new Date(staff.lastActive).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={getRankBadgeColor(index)}>
                      #{index + 1}
                    </Badge>
                    <span className="text-2xl font-bold text-gray-900">
                      {staff.activityCount}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">activities</p>
                </div>
              </div>
              ))}
              {allStaffMembers.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllStaff(!showAllStaff)}
                  className="w-full text-xs"
                >
                  {showAllStaff ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      See More ({allStaffMembers.length - 1} more)
                    </>
                  )}
                </Button>
                )}
              </>
            )}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {staffMetrics?.totalStaffUsers || 0}
              </div>
              <p className="text-xs text-muted-foreground">Total Staff</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {actualActiveStaff}
              </div>
              <p className="text-xs text-muted-foreground">Active Staff</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {Object.values(staffMetrics?.streamMetrics || {}).reduce((sum, stream) => sum + (stream?.totalActions || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">Total Actions</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
