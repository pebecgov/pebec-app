// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.

"use client";

import React, { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, UserIcon, ClockIcon } from "@heroicons/react/24/outline";
import { Id } from "@/convex/_generated/dataModel";
import { TimePicker } from "@/components/ui/time-picker";

interface HolidayWhereaboutFormProps {
  onSuccess?: () => void;
}

export default function HolidayWhereaboutForm({ onSuccess }: HolidayWhereaboutFormProps) {
  const [reason, setReason] = useState<"sick" | "official_assignment" | "leave" | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);

  // Clear time fields when dates change and they're no longer the same day
  React.useEffect(() => {
    if (startDate && endDate && startDate !== endDate) {
      setStartTime(null);
      setEndTime(null);
    }
  }, [startDate, endDate]);

  const { toast } = useToast();
  const createAnnouncement = useMutation(api.holidayAnnouncements.createAnnouncement);
  const userAnnouncements = useQuery(api.holidayAnnouncements.getUserAnnouncements);

  const reasonOptions = [
    { value: "sick", label: "Sick Leave", icon: "🤒" },
    { value: "official_assignment", label: "Official Assignment", icon: "📋" },
    { value: "leave", label: "Holiday", icon: "🏖️" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason || !startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate time fields for official assignment - only required when start date equals end date
    const isSameDay = startDate === endDate;
    if (reason === "official_assignment" && isSameDay && (!startTime || !endTime)) {
      toast({
        title: "Error",
        description: "Please select start and end time for same-day official assignment",
        variant: "destructive",
      });
      return;
    }

    if (reason === "official_assignment" && startTime && endTime && endTime <= startTime) {
      toast({
        title: "Error",
        description: "End time must be after start time",
        variant: "destructive",
      });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast({
        title: "Error",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Format time as HH:mm string for official assignments
      const formatTime = (time: Date | null) => {
        if (!time) return undefined;
        return time.toTimeString().slice(0, 5); // HH:mm format
      };

      await createAnnouncement({
        reason: reason as "sick" | "official_assignment" | "leave",
        startDate,
        endDate,
        startTime: reason === "official_assignment" && isSameDay ? formatTime(startTime) : undefined,
        endTime: reason === "official_assignment" && isSameDay ? formatTime(endTime) : undefined,
        description: description || undefined,
      });

      toast({
        title: "Success",
        description: "Your absence notice has been created successfully",
      });

      // Reset form
      setReason("");
      setStartDate("");
      setEndDate("");
      setDescription("");
      setStartTime(null);
      setEndTime(null);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create Absence notice",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeAnnouncement = userAnnouncements?.find(announcement => announcement.isActive);

  if (activeAnnouncement) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserIcon className="w-5 h-5" />
            Current Absence Notice
          </CardTitle>
          <CardDescription>
            You currently have an active Absence Notice
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">
                {reasonOptions.find(opt => opt.value === activeAnnouncement.reason)?.icon}
              </span>
              <div>
                <p className="font-medium">
                  {reasonOptions.find(opt => opt.value === activeAnnouncement.reason)?.label}
                </p>
                <p className="text-sm text-gray-600">
                  {new Date(activeAnnouncement.startDate).toLocaleDateString()} - {new Date(activeAnnouncement.endDate).toLocaleDateString()}
                  {activeAnnouncement.reason === "official_assignment" && activeAnnouncement.startTime && activeAnnouncement.endTime && (
                    <span className="ml-2 text-blue-600">
                      ({activeAnnouncement.startTime} - {activeAnnouncement.endTime})
                    </span>
                  )}
                </p>
              </div>
            </div>
            {activeAnnouncement.description && (
              <p className="text-sm text-gray-700">{activeAnnouncement.description}</p>
            )}
            <EndAnnouncementButton announcementId={activeAnnouncement._id} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarIcon className="w-5 h-5" />
          Absence Notice
        </CardTitle>
        {/* <CardDescription>
          Announce to your team when you will not be available for work
        </CardDescription> */}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Absence *</Label>
            <Select value={reason} onValueChange={(value) => setReason(value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {reasonOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Time pickers for official assignment - only show when start date equals end date */}
          {reason === "official_assignment" && startDate && endDate && startDate === endDate && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Same-day assignment:</strong> Please specify the start and end times for your official assignment.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time *</Label>
                  <TimePicker
                    value={startTime}
                    onChange={setStartTime}
                    placeholder="Select start time"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time *</Label>
                  <TimePicker
                    value={endTime}
                    onChange={setEndTime}
                    placeholder="Select end time"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Additional Details (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Provide any additional information about your absence..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full font-medium text-md">
            {isSubmitting ? (
              <div className="flex items-center gap-2 p-2 text">
                <ClockIcon className="w-4 h-4 animate-spin" />
                Creating Notice...
              </div>
            ) : (
              "Create Notice"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function EndAnnouncementButton({ announcementId }: { announcementId: Id<"holidayAnnouncements"> }) {
  const [isEnding, setIsEnding] = useState(false);
  const { toast } = useToast();
  const endAnnouncement = useMutation(api.holidayAnnouncements.endAnnouncement);

  const handleEndAnnouncement = async () => {
    setIsEnding(true);
    try {
      await endAnnouncement({ announcementId });
      toast({
        title: "Success",
        description: "Your announcement has been ended",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to end announcement",
        variant: "destructive",
      });
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <Button 
      onClick={handleEndAnnouncement} 
      disabled={isEnding}
      variant="outline"
      className="w-full text-md"
    >
      {isEnding ? "Ending..." : "End Absence Notice"}
    </Button>
  );
}
