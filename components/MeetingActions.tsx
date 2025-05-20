"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { useState } from "react";

interface MeetingActionsProps {
  meetingId: Id<"meetings">;
  userId: Id<"users">;
  userRole: string;
  isRescheduleOpen: boolean;
  isCancelOpen: boolean;
  onClose: () => void;
  onRescheduleSuccess: () => void;
  onCancelSuccess: () => void;
}

export default function MeetingActions({
  meetingId,
  userId,
  userRole,
  isRescheduleOpen,
  isCancelOpen,
  onClose,
  onRescheduleSuccess,
  onCancelSuccess
}: MeetingActionsProps) {
  const [newMeetingDate, setNewMeetingDate] = useState<string>("");
  const rescheduleMeeting = useMutation(api.meetings.rescheduleMeeting);
  const cancelMeeting = useMutation(api.meetings.cancelMeeting);

  const handleReschedule = async () => {
    if (!newMeetingDate) return;

    try {
      await rescheduleMeeting({
        meetingId,
        newDate: new Date(newMeetingDate).getTime(),
        userId,
      });

      toast.success("Meeting rescheduled successfully!");
      onRescheduleSuccess();
    } catch (error) {
      console.error("Failed to reschedule:", error);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelMeeting({ meetingId, userId });

      toast.success("Meeting cancelled successfully!");
      onCancelSuccess();
    } catch (error) {
      console.error("Failed to cancel:", error);
    }
  };

  return (
    <>
      <Dialog.Root open={isRescheduleOpen} onOpenChange={onClose}>
        <Dialog.Content>
          <Dialog.Title>Reschedule Meeting</Dialog.Title>
          <Input type="datetime-local" value={newMeetingDate} onChange={(e) => setNewMeetingDate(e.target.value)} />
          <Button onClick={handleReschedule}>Confirm</Button>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root open={isCancelOpen} onOpenChange={onClose}>
        <Dialog.Content>
          <Dialog.Title>Cancel Meeting</Dialog.Title>
          <Button onClick={handleCancel}>Yes, Cancel</Button>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
