// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.

"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, UserIcon, ClockIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { useMutation } from "convex/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { cn, htmlToPlainText } from "@/lib/utils";

interface HolidayAnnouncementsDisplayProps {
  type?: "active" | "past";
  className?: string;
}

function formatAnnouncementDescription(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  const plain = htmlToPlainText(raw, 280);
  return plain || null;
}

export default function HolidayAnnouncementsDisplay({
  type = "active",
  className,
}: HolidayAnnouncementsDisplayProps) {
  const announcements = useQuery(api.holidayAnnouncements.getAnnouncementsByType, { type });
  const currentUser = useQuery(api.users.current);
  const { toast } = useToast();
  const updateAnnouncement = useMutation(api.holidayAnnouncements.updateAnnouncement);
  const deleteAnnouncement = useMutation(api.holidayAnnouncements.deleteAnnouncement);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    reason: "",
    startDate: "",
    endDate: "",
    description: "",
    startTime: "",
    endTime: ""
  });

  const handleEditClick = (announcement: any) => {
    setEditingId(announcement._id);
    setEditForm({
      reason: announcement.reason,
      startDate: announcement.startDate,
      endDate: announcement.endDate,
      description: announcement.description || "",
      startTime: announcement.startTime || "",
      endTime: announcement.endTime || ""
    });
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    try {
      // @ts-ignore
      await updateAnnouncement({
        announcementId: editingId as any,
        reason: editForm.reason as any,
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        description: editForm.description,
        startTime: editForm.startTime || undefined,
        endTime: editForm.endTime || undefined
      });
      toast({ title: "Success", description: "Absence notice updated" });
      setEditingId(null);
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to update", variant: "destructive" });
    }
  };

  const handleDelete = async (id: any) => {
    const confirmed = window.confirm("Are you sure you want to delete this absence notice?");
    if (!confirmed) return;

    try {
      await deleteAnnouncement({ announcementId: id });
      toast({ title: "Success", description: "Absence notice deleted" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete notice", variant: "destructive" });
    }
  };

  const formatStaffStream = (staffStream: string | undefined, userRole: string) => {
    if (!staffStream) return userRole;

    const streamMap: Record<string, string> = {
      regulatory: "Regulatory",
      sub_national: "Sub National",
      innovation: "Innovation Technology",
      judiciary: "Judiciary",
      communications: "Strategic Communications",
      investments: "High-Impact Investments",
      receptionist: "Admin/Operations",
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
      <Card className="rounded-2xl border border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-gray-400" />
            Staff Absence
          </CardTitle>
          <CardDescription>Loading announcements...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (announcements.length === 0) {
    return (
      <Card className="rounded-2xl border border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-gray-400" />
            Staff Absence
          </CardTitle>
          <CardDescription>No staff members are currently absent</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            <UserIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm font-medium">No active holiday announcements</p>
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

    // Reset time parts for accurate date comparison if needed, 
    // but typically simple comparison works if start is 00:00 and end is 00:00 string parsed

    if (now < start) {
      return (
        <div className="flex items-center gap-2" title="Upcoming">
          <div className="h-3 w-3 rounded-full bg-yellow-400 ring-2 ring-yellow-100" />
        </div>
      );
    } else if (now >= start && now <= end) {
      return (
        <div className="flex items-center gap-2" title="Currently Away">
          <div className="h-3 w-3 rounded-full bg-green-500 ring-2 ring-green-100" />
        </div>
      );
    } else {
      return <Badge variant="outline" className="bg-gray-100 text-gray-800">Ended</Badge>;
    }
  };

  return (
    <Card
      className={cn(
        "flex h-full min-h-0 flex-col rounded-2xl border border-gray-100 shadow-sm overflow-hidden",
        className
      )}
    >
      <CardHeader className="shrink-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarIcon className="w-5 h-5" />
          {type === 'active' ? 'Current & Upcoming Absence Notices' : 'Past Absence History'}
        </CardTitle>
        {/* <CardDescription>
        Current Absence Notices
        </CardDescription> */}
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto pb-4">
        <div className="space-y-4 pr-1">
          {announcements?.map((announcement) => {
            const config = reasonConfig[announcement.reason as keyof typeof reasonConfig];
            const isOwner = currentUser?._id === announcement.userId;
            const descriptionText = formatAnnouncementDescription(announcement.description);

            return (
              <div
                key={announcement._id}
                className="flex flex-col gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="text-2xl shrink-0">{config?.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{announcement.userName}</h4>
                      <Badge className={`${config?.color} ${getHoverClasses(announcement.reason)}`}>
                        {config?.label}
                      </Badge>
                    </div>
                    {/* ... existing details ... */}
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
                    {descriptionText && (
                      <p
                        className="text-sm text-gray-700 mt-2 line-clamp-3 break-words"
                        title={htmlToPlainText(announcement.description || "")}
                      >
                        {descriptionText}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 sm:ml-2">
                  {getStatusBadge(announcement.startDate, announcement.endDate)}

                  {isOwner && type === 'active' && (
                    <div className="flex gap-1 ml-2">
                      <Dialog open={editingId === announcement._id} onOpenChange={(open) => !open && setEditingId(null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(announcement)}>
                            <PencilSquareIcon className="w-4 h-4 text-gray-500" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Absence Notice</DialogTitle>
                            <DialogDescription>Modify your absence details.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Reason</Label>
                              <Select value={editForm.reason} onValueChange={(val) => setEditForm({ ...editForm, reason: val })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="sick">Sick Leave</SelectItem>
                                  <SelectItem value="official_assignment">Official Assignment</SelectItem>
                                  <SelectItem value="leave">Holiday</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input type="date" value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} />
                              </div>
                              <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input type="date" value={editForm.endDate} onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })} />
                              </div>
                            </div>
                            {editForm.reason === 'official_assignment' && editForm.startDate === editForm.endDate && (
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Start Time</Label>
                                  <Input type="time" value={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                  <Label>End Time</Label>
                                  <Input type="time" value={editForm.endTime} onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })} />
                                </div>
                              </div>
                            )}
                            <div className="space-y-2">
                              <Label>Description</Label>
                              <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                            <Button onClick={handleUpdate}>Save Changes</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Button variant="ghost" size="icon" onClick={() => handleDelete(announcement._id)} className="text-red-500 hover:text-red-700">
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
