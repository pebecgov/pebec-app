// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";
import { Id } from "@/convex/_generated/dataModel";
import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowLeft, CalendarDays, Clock, CircleCheck, Users } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
export default function MeetingDetails() {
  const {
    user
  } = useUser();
  const router = useRouter();
  const params = useParams();
  const [meetingId, setMeetingId] = useState<Id<"meetings"> | undefined>(undefined);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [newMeetingDate, setNewMeetingDate] = useState<string>("");
  useEffect(() => {
    if (params?.meetingId) {
      setMeetingId(params.meetingId as Id<"meetings">);
    }
  }, [params]);
  const meeting = useQuery(api.meetings.getMeetingById, meetingId ? {
    meetingId
  } : "skip");
  const cancelMeeting = useMutation(api.meetings.cancelMeeting);
  const rescheduleMeeting = useMutation(api.meetings.rescheduleMeeting);
  const attendees = useQuery(api.meetings.getAttendees, meetingId ? {
    meetingId
  } : "skip");
  const convexUser = useQuery(api.users.getUserByClerkId, user?.id ? {
    clerkUserId: user?.id
  } : "skip");
  const convexUserId = convexUser?._id as Id<"users"> | undefined;
  if (!meetingId) {
    return <p className="text-red-500 text-center mt-10">Invalid meeting ID.</p>;
  }
  if (!meeting) {
    return <p className="text-center text-gray-500 mt-10">Loading meeting details...</p>;
  }
  const isCreator = convexUserId === meeting.createdBy;
  const handleCancelMeeting = async () => {
    if (!convexUserId) {
      toast.error("User data not found. Please try again.");
      return;
    }
    try {
      await cancelMeeting({
        meetingId,
        userId: convexUserId
      });
      toast.success("Meeting cancelled successfully!");
      setIsCancelOpen(false);
      router.refresh();
    } catch (error) {
      toast.error("Failed to cancel meeting.");
    }
  };
  const handleRescheduleMeeting = async () => {
    if (!convexUserId) {
      toast.error("User data not found. Please try again.");
      return;
    }
    if (!newMeetingDate) {
      toast.error("Please select a new date.");
      return;
    }
    try {
      await rescheduleMeeting({
        meetingId,
        newDate: new Date(newMeetingDate).getTime(),
        userId: convexUserId
      });
      toast.success("Meeting rescheduled successfully!");
      setIsRescheduleOpen(false);
      router.refresh();
    } catch (error) {
      toast.error("Failed to reschedule meeting.");
    }
  };
  return <div className="flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-2xl bg-white shadow-md rounded-lg p-6">
        
        {}
        <button type="button" onClick={() => router.back()} className="bg-white text-center w-48 rounded-2xl h-14 relative text-black text-xl font-semibold border-4 border-white group">
          <div className="bg-green-400 rounded-xl h-12 w-1/4 grid place-items-center absolute left-0 top-0 group-hover:w-full z-10 duration-500">
            <ArrowLeft size={20} />
          </div>
          <p className="translate-x-4">Go Back</p>
        </button>

        {}
        <div className="flex items-center gap-4 mt-4">
          <Image src={meeting.creatorImage || "/default-avatar.png"} alt="Organizer" width={60} height={60} className="rounded-full border" />
          <div>
            <h1 className="text-2xl font-bold">{meeting.title}</h1>
            <p className="text-sm text-gray-500">Hosted by {meeting.creatorName || "Unknown Organizer"}</p>
          </div>
        </div>

        {}
        <div className="mt-5 border-t pt-4 space-y-2">
          <p className="text-gray-700">{meeting.description || "No description provided."}</p>
          <p className="text-sm text-gray-600 flex items-center gap-2">
            <CalendarDays className="text-blue-500" size={18} />
            <strong>Date:</strong> {new Date(meeting.meetingDate).toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 flex items-center gap-2">
            <Clock className="text-green-500" size={18} />
            <strong>Duration:</strong> {meeting.duration} minutes
          </p>
          <p className="text-sm flex items-center gap-2">
            <CircleCheck className={`size-18 ${meeting.status === "confirmed" ? "text-green-500" : meeting.status === "cancelled" ? "text-red-500" : "text-yellow-500"}`} />
            <strong>Status:</strong> {meeting.status}
          </p>
        </div>


          {}
          {attendees && attendees.length > 0 && <div className="mt-6 border-t pt-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="text-gray-500" size={20} /> Attendees
            </h3>
            
            <div className="mt-3 space-y-2">
              {attendees.map(attendee => <div key={attendee._id} className="flex items-center gap-3 bg-gray-100 rounded-lg px-3 py-2">
                  <Image src={attendee.imageUrl || "/default-avatar.png"} alt="User" width={40} height={40} className="rounded-full border" />
                  <div>
                    <p className="text-sm font-medium">{attendee.firstName} {attendee.lastName}</p>
                    <p className={`text-xs ${meeting.acceptedAttendees.includes(attendee._id) ? "text-green-500" : "text-yellow-500"}`}>
                      {meeting.acceptedAttendees.includes(attendee._id) ? "Accepted" : "Pending"}
                    </p>
                  </div>
                </div>)}
            </div>
          </div>}

        {}
        {isCreator && meeting.meetingDate > Date.now() && <div className="flex gap-4 mt-6">
    <Button className="bg-yellow-500 text-white" onClick={() => setIsRescheduleOpen(true)}>
      Reschedule
    </Button>
    <Button variant="destructive" onClick={() => setIsCancelOpen(true)}>
      Cancel Meeting
    </Button>
  </div>}
      </div>

      {}
      <Dialog.Root open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <Dialog.Title>Reschedule Meeting</Dialog.Title>
              <Input type="datetime-local" onChange={e => setNewMeetingDate(e.target.value)} />
              <Button onClick={handleRescheduleMeeting}>Confirm</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {}
      <Dialog.Root open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <Dialog.Title>Cancel Meeting?</Dialog.Title>
              <Button onClick={handleCancelMeeting}>Yes, Cancel</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>;
}