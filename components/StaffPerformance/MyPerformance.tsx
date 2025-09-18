// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Activity, Target, Award, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export default function MyPerformance() {
  const [showAllPages, setShowAllPages] = useState(false);
  const [showAllActions, setShowAllActions] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [showDetailedView, setShowDetailedView] = useState(false);
  
  const myActivity = useQuery(api.users.getStaffUserActivity, { timeRange: "30d" });
  const staffMetrics = useQuery(api.users.getStaffUsageMetrics, { timeRange: "30d" });

  // Handle loading state
  if (myActivity === undefined || staffMetrics === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            My Performance
          </CardTitle>
          <CardDescription>Loading your performance data...</CardDescription>
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
  if (myActivity === null || staffMetrics === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-red-500" />
            My Performance
          </CardTitle>
          <CardDescription>Error loading performance data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="text-sm text-red-600 mb-2">Failed to load performance data</div>
              <div className="text-xs text-muted-foreground">
                Please check your permissions or try refreshing the page
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate my rank among all staff (with error handling)
  const allStaffMembers = Object.entries(staffMetrics?.streamMetrics || {})
    .flatMap(([stream, metrics]) => 
      (metrics?.mostActiveUsers || []).map(user => ({ 
        ...user, 
        stream
      }))
    )
    .sort((a, b) => b.activityCount - a.activityCount);

  const myRank = allStaffMembers.findIndex(staff => staff.userId === myActivity?.user?.id) + 1;
  const totalStaff = allStaffMembers.length;

  // Calculate my performance vs stream average (with error handling)
  const myStream = myActivity?.user?.staffStream;
  const streamMetrics = staffMetrics?.streamMetrics?.[myStream || ""];
  const streamAverage = streamMetrics && streamMetrics.totalUsers > 0 
    ? streamMetrics.totalActions / streamMetrics.totalUsers 
    : 0;
  const myPerformance = myActivity?.totalActivities || 0;
  const performanceRatio = streamAverage > 0 ? (myPerformance / streamAverage) * 100 : 0;

  // Get most visited pages (with error handling)
  const allPages = Object.entries(myActivity?.pageViews || {})
    .sort(([,a], [,b]) => b - a);
  const topPages = showAllPages ? allPages : allPages.slice(0, 3);

  // Get most performed actions (with error handling)
  const allActions = Object.entries(myActivity?.actions || {})
    .sort(([,a], [,b]) => b - a);
  const topActions = showAllActions ? allActions : allActions.slice(0, 3);

  // Calculate daily activity trend (with error handling)
  const dailyActivityEntries = Object.entries(myActivity?.dailyActivity || {});
  const recentDays = dailyActivityEntries.slice(-7);
  const previousDays = dailyActivityEntries.slice(-14, -7);
  
  const recentAverage = recentDays.length > 0 
    ? recentDays.reduce((sum, [, count]) => sum + count, 0) / recentDays.length 
    : 0;
  const previousAverage = previousDays.length > 0 
    ? previousDays.reduce((sum, [, count]) => sum + count, 0) / previousDays.length 
    : 0;
  const trendPercentage = previousAverage > 0 ? ((recentAverage - previousAverage) / previousAverage) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-500" />
          My Performance
        </CardTitle>
        <CardDescription>
          Your activity and performance metrics,
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Performance Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{myActivity.totalActivities}</div>
            <p className="text-xs text-muted-foreground">Total Activities</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">#{myRank || "N/A"}</div>
            <p className="text-xs text-muted-foreground">Overall Rank</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(performanceRatio)}%
            </div>
            <p className="text-xs text-muted-foreground">vs Stream Avg</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {Object.keys(myActivity?.dailyActivity || {}).length}
            </div>
            <p className="text-xs text-muted-foreground">Active Days</p>
          </div>
        </div>

        {/* Performance vs Stream Average */}
        {streamMetrics && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Performance vs Stream Average</span>
              <span className="text-sm text-muted-foreground">
                {myPerformance} / {Math.round(streamAverage)} avg
              </span>
            </div>
            <Progress 
              value={Math.min(performanceRatio, 200)} 
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span>100%</span>
              <span>200%</span>
            </div>
          </div>
        )}

        {/* Activity Trend */}
        <div className="flex items-center gap-2">
          {trendPercentage > 0 ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          <span className="text-sm">
            {trendPercentage > 0 ? "Up" : "Down"} {Math.abs(Math.round(trendPercentage))}% 
            from last week
          </span>
        </div>

        {/* See More Button for Detailed View */}
        {!showDetailedView && (
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetailedView(true)}
              className="w-full"
            >
              <ChevronDown className="h-4 w-4 mr-2" />
              See More Details
            </Button>
          </div>
        )}

        {/* Detailed Sections - Only show when expanded */}
        {showDetailedView && (
          <>
            {/* Top Pages and Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Most Visited Pages
            </h4>
            <div className="space-y-2">
              {topPages.length > 0 ? (
                <>
                  {topPages.map(([page, count]) => (
                    <div key={page} className="flex justify-between items-center text-sm">
                      <span className="truncate">{page}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                  {allPages.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllPages(!showAllPages)}
                      className="w-full text-xs"
                    >
                      {showAllPages ? (
                        <>
                          <ChevronUp className="h-3 w-3 mr-1" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 mr-1" />
                          See More ({allPages.length - 3} more)
                        </>
                      )}
                    </Button>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No page data available</p>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Award className="h-4 w-4" />
              Most Performed Actions
            </h4>
            <div className="space-y-2">
              {topActions.length > 0 ? (
                <>
                  {topActions.map(([action, count]) => (
                    <div key={action} className="flex justify-between items-center text-sm">
                      <span className="truncate">{action.replace('click_', '').replace('submit_', '')}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                  {allActions.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllActions(!showAllActions)}
                      className="w-full text-xs"
                    >
                      {showAllActions ? (
                        <>
                          <ChevronUp className="h-3 w-3 mr-1" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 mr-1" />
                          See More ({allActions.length - 3} more)
                        </>
                      )}
                    </Button>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No action data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Recent Activity
          </h4>
          <div className="space-y-2">
            {(showAllActivities ? myActivity?.recentActivities || [] : (myActivity?.recentActivities || []).slice(0, 5)).map((activity, index) => (
              <div key={index} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {activity.type}
                  </Badge>
                  <span className="truncate">
                    {activity.action || activity.page}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(activity.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
            {(myActivity?.recentActivities || []).length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllActivities(!showAllActivities)}
                className="w-full text-xs"
              >
                {showAllActivities ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                      See More ({(myActivity?.recentActivities || []).length - 5} more)
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Show Less Button */}
        <div className="mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetailedView(false)}
            className="w-full text-xs"
          >
            <ChevronUp className="h-3 w-3 mr-1" />
            Show Less
          </Button>
        </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
