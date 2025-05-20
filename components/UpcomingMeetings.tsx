"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Image from "next/image";
import { DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner"; // ✅ Import Toast for Notifications

import * as Dialog from "@radix-ui/react-dialog"; // ✅ Import Radix UI Dialog
import { ArrowRight, CalendarClock, XCircle } from "lucide-react";

interface Meeting {
  id: Id<"meetings">;
  title: string;
  meetingDate: number;
  status: "pending" | "confirmed" | "cancelled" | "declined";
  attendees: Id<"users">[];
  acceptedAttendees: Id<"users">[];
  createdBy: Id<"users">;
  creatorImage?: string;
}

interface Props {
  meetings: Meeting[];
  userRole: string;
  userId: Id<"users">;
}

export default function UpcomingMeetings({ meetings, userRole, userId }: Props) {
  const router = useRouter();
  const [rescheduleModal, setRescheduleModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<Id<"meetings"> | null>(null);
  const [newMeetingDate, setNewMeetingDate] = useState<string>("");

  const acceptInvite = useMutation(api.meetings.respondToMeetingInvite);
  const declineInvite = useMutation(api.meetings.respondToMeetingInvite);
  const cancelMeeting = useMutation(api.meetings.cancelMeeting);
  const rescheduleMeeting = useMutation(api.meetings.rescheduleMeeting);

  // ✅ Remove declined meetings from the list
  const handleDecline = async (meetingId: Id<"meetings">) => {
    try {
      await declineInvite({ meetingId, userId, response: "declined" });

      toast.success("Meeting declined successfully!");

      // ✅ Refresh page to remove declined meeting
      router.refresh();
    } catch (error) {
      toast.error("Failed to decline the meeting.");
    }
  };

  const handleReschedule = async () => {
    if (!selectedMeetingId || !newMeetingDate) return;
    try {
      await rescheduleMeeting({
        meetingId: selectedMeetingId,
        newDate: new Date(newMeetingDate).getTime(),
        userId,
      });

      toast.success("Meeting rescheduled successfully!");
      setRescheduleModal(false);
      setSelectedMeetingId(null);
      setNewMeetingDate("");

      router.refresh();
    } catch (error) {
      console.error("Failed to reschedule:", error);
    }
  };

  const handleCancel = async () => {
    if (!selectedMeetingId) return;

    try {
      await cancelMeeting({ meetingId: selectedMeetingId, userId });
      toast.success("Meeting Cancelled", { duration: 3000 });

      setCancelModal(false);
      setSelectedMeetingId(null);

      router.refresh();
    } catch (error) {
      console.error("Failed to cancel:", error);
    }
  };

  // ✅ Get the current time
  const now = new Date().getTime();

  return (
    <div className="flex flex-col bg-white dark:bg-gray-900 p-4 rounded-lg shadow-md w-full sm:w-2/3 mx-auto max-h-[550px] overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Upcoming Meetings</h2>

      {meetings.length === 0 ? (
        <p className="text-gray-400">No upcoming meetings</p>
      ) : (
        <div className="space-y-3">
          {meetings
  .filter((meeting) => meeting.status !== "cancelled" && meeting.meetingDate > now) // ✅ Only future meetings
  .map((meeting) => (
              
              <div key={meeting.id} className="relative flex flex-col p-4 border rounded-lg shadow-sm bg-white dark:bg-gray-900">
                
              {/* Status Badge - Correctly Displays "Pending", "Confirmed", or "Declined" */}
<div className="flex mb-2">
  <span
    className={`px-3 py-1 text-xs font-semibold rounded-full text-white shadow-md ${
      meeting.status === "pending"
        ? "bg-yellow-500"  // Yellow for Pending
        : meeting.status === "declined"
        ? "bg-red-500"      // Red for Declined
        : "bg-green-500"    // Green for Confirmed
    }`}
  >
    {meeting.status === "pending"
      ? "Pending"
      : meeting.status === "declined"
      ? "Declined"
      : "Confirmed"}
  </span>
</div>


                {/* Profile & Title */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Image
                      src={meeting.creatorImage || "/default-avatar.png"}
                      alt="Organizer"
                      width={35}
                      height={35}
                      className="rounded-full border"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{meeting.title}</h3>
                      <p className="text-xs text-gray-500">{new Date(meeting.meetingDate).toLocaleString()}</p>
                    </div>
                  </div>

      
                {/* View Details Button */}
                <button
                  onClick={() => router.push(`/${userRole}/meetings/${meeting.id}`)}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-medium transition-all border rounded-full shadow-sm group bg-white dark:bg-gray-800 border-gray-300 text-gray-700 hover:bg-emerald-500 hover:text-white hover:border-emerald-500"
                >
                  View Details
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 ease-in-out transform group-hover:rotate-90" />
                </button>
              </div>
      
              {/* Accept & Decline Buttons */}
              {!meeting.acceptedAttendees.includes(userId) && meeting.attendees.includes(userId) && meeting.meetingDate > Date.now() && (
                <div className="flex space-x-2 mt-2">
                  <Button className="bg-green-500 text-white text-xs flex-1" onClick={() => acceptInvite({ meetingId: meeting.id, userId, response: "accepted" })}>
                    Accept
                  </Button>
                  <Button className="bg-red-500 text-white text-xs flex-1" onClick={() => handleDecline(meeting.id)}>
                    Decline
                  </Button>
                </div>
              )}
      
              {/* Creator Actions */}
              {meeting.createdBy === userId && (
                <div className="flex space-x-2 mt-2">
                  <Button className="bg-yellow-500 text-white text-xs flex-1" onClick={() => { setSelectedMeetingId(meeting.id); setRescheduleModal(true); }}>
                    <CalendarClock className="w-4 h-4" />
                    Reschedule
                  </Button>
                  <Button variant="destructive" className="text-xs flex-1" onClick={() => { setSelectedMeetingId(meeting.id); setCancelModal(true); }}>
                    <XCircle className="w-4 h-4" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          ))}
      </div>
      )}

      {/* ✅ Reschedule Meeting Modal */}
      <Dialog.Root open={rescheduleModal} onOpenChange={setRescheduleModal}>
        <DialogContent>
          <DialogTitle>Reschedule Meeting</DialogTitle>
          <Input type="datetime-local" value={newMeetingDate} onChange={(e) => setNewMeetingDate(e.target.value)} />
          <Button onClick={handleReschedule}>Confirm Reschedule</Button>
        </DialogContent>
      </Dialog.Root>

      {/* ✅ Cancel Meeting Modal */}
      <Dialog.Root open={cancelModal} onOpenChange={setCancelModal}>
        <DialogContent>
          <DialogTitle>Cancel Meeting?</DialogTitle>
          <p>Are you sure you want to cancel this meeting?</p>
          <Button onClick={handleCancel}>Yes, Cancel</Button>
        </DialogContent>
      </Dialog.Root>
    </div>
  );
}
