// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.

"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, UserIcon, ClockIcon } from "@heroicons/react/24/outline";

export default function HolidayAnnouncementsDisplay() {
  const announcements = useQuery(api.holidayAnnouncements.getActiveAnnouncements);

  const formatStaffStream = (staffStream: string | undefined, userRole: string) => {
    if (!staffStream) return userRole;
    
    const streamMap: Record<string, string> = {
      regulatory: "Regulatory",
      sub_national: "Sub National", 
      innovation: "Innovation Technology",
      judiciary: "Judiciary",
      communications: "Strategic Communications",
      investments: "High-Impact Investments",
      receptionist: "Admin",
      account: "Account",
      auditor: "Audit"
    };
    
    return streamMap[staffStream] || staffStream.replace('_', ' ');
  };

  const getHoverClasses = (reason: string) => {
    switch (reason) {
      case 'sick':
        return 'hover:bg-red-300 hover:text-red-900';
      case 'official_assignment':
        return 'hover:bg-blue-300 hover:text-blue-900';
      case 'leave':
        return 'hover:bg-green-300 hover:text-green-900';
      default:
        return '';
    }
  };

  if (!announcements) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Staff Absence
          </CardTitle>
          <CardDescription>Loading announcements...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (announcements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Staff Absensce
          </CardTitle>
          <CardDescription>No staff members are currently absent</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <UserIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No active holiday announcements</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const reasonConfig = {
    sick: { label: "Sick Leave", icon: "🤒", color: "bg-red-100 text-red-800", hover: "bg-red-300 text-red-900" },
    official_assignment: { label: "Official Assignment", icon: "📋", color: "bg-blue-100 text-blue-800", hover: "bg-blue-300 text-blue-900" },
    leave: { label: "Holiday", icon: "🏖️", color: "bg-green-100 text-green-800", hover: "bg-green-300 text-green-900" },
  };

  const getStatusBadge = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Upcoming</Badge>;
    } else if (now >= start && now <= end) {
      return <Badge variant="outline" className="bg-red-100 text-red-800">Currently Away</Badge>;
    } else {
      return <Badge variant="outline" className="bg-gray-100 text-gray-800">Ended</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarIcon className="w-5 h-5" />
          Current Absence Notices
        </CardTitle>
        {/* <CardDescription>
        Current Absence Notices
        </CardDescription> */}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {announcements.map((announcement) => {
            const config = reasonConfig[announcement.reason];
            return (
              <div
                key={announcement._id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="text-2xl">{config.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{announcement.userName}</h4>
                      <Badge className={`${config.color} ${getHoverClasses(announcement.reason)}`}>
                        {config.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4" />
                        <span>
                          {new Date(announcement.startDate).toLocaleDateString()} - {new Date(announcement.endDate).toLocaleDateString()}
                          {announcement.reason === "official_assignment" && announcement.startTime && announcement.endTime && (
                            <span className="ml-2 text-blue-600 font-medium">
                              ({announcement.startTime} - {announcement.endTime})
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <UserIcon className="w-4 h-4" />
                        <span>
                          {formatStaffStream(announcement.staffStream, announcement.userRole)}
                        </span>
                      </div>
                    </div>
                    {announcement.description && (
                      <p className="text-sm text-gray-700 mt-2">{announcement.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(announcement.startDate, announcement.endDate)}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
