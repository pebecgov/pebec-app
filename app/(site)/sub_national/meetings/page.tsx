// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Calendar from "@/components/Calendar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import UpcomingMeetings from "@/components/UpcomingMeetings";
import { Textarea } from "@/components/ui/textarea";
export default function Meetings() {
  const {
    user
  } = useUser();
  const userId = user?.id ?? "";
  const convexUser = useQuery(api.users.getUserByClerkId, userId ? {
    clerkUserId: userId
  } : "skip");
  useEffect(() => {
    if (convexUser && convexUser._id) {
      console.log("Fetched Convex User:", convexUser);
    } else {
      console.warn("Convex User is undefined");
    }
  }, [convexUser]);
  const convexUserId = useMemo(() => convexUser?._id as Id<"users"> | undefined, [convexUser]);
  const meetings = useQuery(api.meetings.getUserMeetings, convexUserId ? {
    userId: convexUserId
  } : "skip") || [];
  const createMeeting = useMutation(api.meetings.createMeeting);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingDate, setMeetingDate] = useState<Date | null>(null);
  const [duration, setDuration] = useState(30);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const users = useQuery(api.users.getUsersWithRole, selectedRole ? {
    role: selectedRole
  } : "skip");
  const userRole = convexUser?.role ?? "staff";
  const meetingsWithCreatorImages = useMemo(() => {
    return meetings.map(meeting => {
      const creator = users?.find(user => user._id === meeting.createdBy);
      return {
        id: meeting._id as Id<"meetings">,
        title: meeting.title,
        description: meeting.description || "",
        meetingDate: meeting.meetingDate,
        duration: meeting.duration,
        attendees: meeting.attendees || [],
        acceptedAttendees: meeting.acceptedAttendees || [],
        createdBy: meeting.createdBy,
        status: meeting.status,
        creatorImage: meeting.creatorImage || creator?.imageUrl || "/default-avatar.png",
        creatorName: meeting.creatorName || creator?.firstName || "Unknown Organizer"
      };
    });
  }, [meetings, users]);
  const formattedMeetings = useMemo(() => {
    return meetings.filter(meeting => meeting.createdBy === convexUserId || meeting.acceptedAttendees.includes(convexUserId!)).map(meeting => ({
      id: meeting._id,
      title: meeting.title,
      description: meeting.description || "",
      meetingDate: meeting.meetingDate,
      duration: meeting.duration,
      start: new Date(meeting.meetingDate).toISOString(),
      end: new Date(meeting.meetingDate + meeting.duration * 60000).toISOString(),
      attendees: meeting.attendees || [],
      acceptedAttendees: meeting.acceptedAttendees || [],
      createdBy: meeting.createdBy,
      status: meeting.status,
      color: meeting.status === "cancelled" ? "#d1d5db" : meeting.acceptedAttendees.length > 0 ? "#3b82f6" : "#9ca3af"
    }));
  }, [meetings]);
  const handleScheduleMeeting = async () => {
    if (!convexUserId) {
      toast.error("User data not loaded. Please try again.");
      console.warn("convexUserId is undefined");
      return;
    }
    if (!title || !meetingDate || selectedUsers.length === 0) {
      toast.error("Please fill in all fields.");
      console.log("Missing fields:", {
        convexUserId,
        title,
        meetingDate,
        selectedUsers
      });
      return;
    }
    try {
      console.log("Submitting meeting:", {
        title,
        description,
        createdBy: convexUserId,
        attendees: selectedUsers.map(id => id as Id<"users">),
        meetingDate: meetingDate.getTime(),
        duration
      });
      await createMeeting({
        title,
        description,
        createdBy: convexUserId,
        attendees: selectedUsers.map(id => id as Id<"users">),
        meetingDate: meetingDate.getTime(),
        duration
      });
      toast.success("Meeting scheduled successfully!");
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Meeting creation failed:", error);
      toast.error("Failed to create meeting.");
    }
  };
  const handleUserSelection = (userId: string) => {
    setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };
  const upcomingMeetings = useMemo(() => {
    return meetings ? meetings.filter(meeting => meeting.createdBy === convexUserId || meeting.acceptedAttendees.includes(convexUserId!) || meeting.attendees.includes(convexUserId!)) : [];
  }, [meetings, convexUserId]);
  return <div className="container mx-auto ">
   <div className="container mx-auto p-6 flex flex-col sm:flex-row gap-6">
      {}
      <UpcomingMeetings meetings={meetingsWithCreatorImages} userRole={convexUser?.role ?? "staff"} userId={convexUserId!} />

      {}
      <Calendar meetings={meetingsWithCreatorImages} onAddEvent={() => setIsDialogOpen(true)} userId={convexUserId || ""} userRole={userRole} />
    </div>

      {}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogTitle>Schedule a New Meeting</DialogTitle>

          <Input placeholder="Meeting Title" value={title} onChange={e => setTitle(e.target.value)} />
          <Textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
          <Input type="datetime-local" onChange={e => setMeetingDate(new Date(e.target.value))} />
          <Input type="number" placeholder="Duration (minutes)" value={duration} onChange={e => setDuration(Number(e.target.value))} />

          {}
          <Select onValueChange={setSelectedRole}>
            <SelectTrigger>
              <SelectValue placeholder="Select Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="mda">MDA</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="sub_national">Sub-National</SelectItem>
            </SelectContent>
          </Select>

          {}
          {users && <div className="mt-4"> {}
              <h3 className="text-sm font-semibold mb-2">Select Attendees:</h3>
              <div className="relative">
                <button className="w-full px-4 py-2 border rounded-lg text-left flex justify-between items-center" onClick={() => setIsDropdownOpen(prev => !prev)}>
                  {selectedUsers.length > 0 ? `${selectedUsers.length} attendee(s) selected` : "Select attendees"}
                  <ChevronDown className="w-5 h-5 text-gray-500" /> {}
                </button>
                {isDropdownOpen && <div className="absolute z-10 bg-white border rounded-md shadow-md mt-1 w-full max-h-60 overflow-auto">
                    {users.map(user => <div key={user._id} onClick={() => handleUserSelection(user._id)} className={`flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-gray-100 ${selectedUsers.includes(user._id) ? "bg-blue-100" : ""}`}>
                        <Image src={user.imageUrl || "/default-avatar.png"} alt="User Profile" width={25} height={25} className="rounded-full" />
                        <span>{user.firstName} {user.lastName}</span>
                      </div>)}
                  </div>}
              </div>
            </div>}

          {}
          {selectedUsers.length > 0 && <div className="mt-4 p-2 border rounded-md bg-gray-100">
              <h3 className="text-sm font-semibold">Attendees:</h3>
              <div className="flex flex-wrap gap-2 mt-1">
                {selectedUsers.map(userId => {
              const user = users?.find(u => u._id === userId);
              return user && <div key={user._id} className="flex items-center gap-2 bg-white px-2 py-1 rounded-md shadow">
                        <Image src={user.imageUrl || "/default-avatar.png"} alt="User Profile" width={25} height={25} className="rounded-full" />
                        <span className="text-sm">{user.firstName} {user.lastName}</span>
                        <button className="text-red-500 text-xs hover:bg-red-100 px-1 rounded" onClick={e => {
                  e.stopPropagation();
                  handleUserSelection(user._id);
                }}>
  ✕
                </button>
                      </div>;
            })}
              </div>
            </div>}

          <Button onClick={handleScheduleMeeting}>Invite</Button>
        </DialogContent>
      </Dialog>


    
    </div>;
}