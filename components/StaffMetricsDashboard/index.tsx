// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from "chart.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Activity, Clock, TrendingUp, Eye, MousePointer } from "lucide-react";
import { toast } from "sonner";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

export default function StaffMetricsDashboard() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");
  const [selectedStream, setSelectedStream] = useState<string>("all");
  
  const staffMetrics = useQuery(api.users.getStaffUsageMetrics, { timeRange });

  if (!staffMetrics) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading staff metrics...</div>
        </div>
      </div>
    );
  }

  const streams = Object.keys(staffMetrics.streamMetrics);
  const selectedStreamData = selectedStream === "all" 
    ? staffMetrics.streamMetrics 
    : { [selectedStream]: staffMetrics.streamMetrics[selectedStream] };

  // Prepare chart data
  const streamLabels = Object.keys(selectedStreamData);
  const activeUsersData = streamLabels.map(stream => 
    staffMetrics.streamMetrics[stream]?.activeUsers || 0
  );
  const totalUsersData = streamLabels.map(stream => 
    staffMetrics.streamMetrics[stream]?.totalUsers || 0
  );
  const pageViewsData = streamLabels.map(stream => 
    staffMetrics.streamMetrics[stream]?.totalPageViews || 0
  );
  const actionsData = streamLabels.map(stream => 
    staffMetrics.streamMetrics[stream]?.totalActions || 0
  );

  const streamActivityData = {
    labels: streamLabels.map(stream => stream.charAt(0).toUpperCase() + stream.slice(1)),
    datasets: [
      {
        label: "Active Users",
        data: activeUsersData,
        backgroundColor: "#3B82F6",
        borderColor: "#1D4ED8",
        borderWidth: 1
      },
      {
        label: "Total Users",
        data: totalUsersData,
        backgroundColor: "#10B981",
        borderColor: "#059669",
        borderWidth: 1
      }
    ]
  };

  const usageData = {
    labels: streamLabels.map(stream => stream.charAt(0).toUpperCase() + stream.slice(1)),
    datasets: [
      {
        label: "Page Views",
        data: pageViewsData,
        backgroundColor: "#8B5CF6",
        borderColor: "#7C3AED",
        borderWidth: 1
      },
      {
        label: "Actions",
        data: actionsData,
        backgroundColor: "#F59E0B",
        borderColor: "#D97706",
        borderWidth: 1
      }
    ]
  };

  const getStreamColor = (stream: string) => {
    const colors: Record<string, string> = {
      regulatory: "bg-blue-100 text-blue-800",
      innovation: "bg-green-100 text-green-800",
      judiciary: "bg-purple-100 text-purple-800",
      communications: "bg-pink-100 text-pink-800",
      investments: "bg-yellow-100 text-yellow-800",
      receptionist: "bg-indigo-100 text-indigo-800",
      account: "bg-red-100 text-red-800",
      auditor: "bg-gray-100 text-gray-800"
    };
    return colors[stream] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="container mx-auto p-8 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-800">Staff Usage Metrics</h1>
          <p className="text-gray-600 mt-2">
            Track staff activity and website usage across different streams
          </p>
        </div>
        
        <div className="flex gap-4">
          <Select value={timeRange} onValueChange={(value: "7d" | "30d" | "90d" | "1y") => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedStream} onValueChange={setSelectedStream}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Streams</SelectItem>
              {streams.map(stream => (
                <SelectItem key={stream} value={stream}>
                  {stream.charAt(0).toUpperCase() + stream.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffMetrics.totalStaffUsers}</div>
            <p className="text-xs text-muted-foreground">
              Across all streams
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffMetrics.totalActiveStaff}</div>
            <p className="text-xs text-muted-foreground">
              In the last {timeRange}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(staffMetrics.streamMetrics).reduce((sum, stream) => sum + stream.totalPageViews, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all streams
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(staffMetrics.streamMetrics).reduce((sum, stream) => sum + stream.totalActions, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              User interactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Staff Activity by Stream</CardTitle>
            <CardDescription>
              Active vs Total users across different staff streams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Bar data={streamActivityData} options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top' as const,
                },
                title: {
                  display: true,
                  text: 'Staff Activity Overview'
                }
              }
            }} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage Metrics by Stream</CardTitle>
            <CardDescription>
              Page views and actions across staff streams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Bar data={usageData} options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top' as const,
                },
                title: {
                  display: true,
                  text: 'Usage Overview'
                }
              }
            }} />
          </CardContent>
        </Card>
      </div>

      {/* Stream Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {Object.entries(selectedStreamData).map(([stream, metrics]) => (
          <Card key={stream}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {stream.charAt(0).toUpperCase() + stream.slice(1)}
                </CardTitle>
                <Badge className={getStreamColor(stream)}>
                  {metrics.totalUsers} {metrics.totalUsers === 1 ? 'user' : 'users'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold text-green-600">{metrics.activeUsers}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Page Views</p>
                  <p className="text-2xl font-bold text-blue-600">{metrics.totalPageViews}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Actions</p>
                  <p className="text-2xl font-bold text-purple-600">{metrics.totalActions}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Session</p>
                  <p className="text-2xl font-bold text-orange-600">{metrics.averageSessionDuration}m</p>
                </div>
              </div>
              
              {metrics.mostActiveUsers.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Most Active Users</p>
                  <div className="space-y-1">
                    {metrics.mostActiveUsers.slice(0, 3).map((user, index) => (
                      <div key={user.userId} className="flex justify-between text-sm">
                        <span className="truncate">{user.name}</span>
                        <span className="text-muted-foreground">{user.activityCount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Most Active Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Most Active Staff Members</CardTitle>
          <CardDescription>
            Top performing staff members across all streams
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Stream</TableHead>
                <TableHead>Activity Count</TableHead>
                <TableHead>Last Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(staffMetrics.streamMetrics)
                .flatMap(([stream, metrics]) => 
                  metrics.mostActiveUsers.map(user => ({ ...user, stream }))
                )
                .sort((a, b) => b.activityCount - a.activityCount)
                .slice(0, 10)
                .map((user) => (
                  <TableRow key={`${user.userId}-${user.stream}`}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>
                      <Badge className={getStreamColor(user.stream)}>
                        {user.stream}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.activityCount}</TableCell>
                    <TableCell>
                      {new Date(user.lastActive).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
