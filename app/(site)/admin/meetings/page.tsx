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
import { ChevronDown } from "lucide-react"; // ✅ Import dropdown arrow icon
import UpcomingMeetings from "@/components/UpcomingMeetings";

export default function Meetings() {
  const { user } = useUser();

  const userId = user?.id ?? "";

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    userId ? { clerkUserId: userId } : "skip"
  );
  
  useEffect(() => {
    if (convexUser && convexUser._id) {
      console.log("Fetched Convex User:", convexUser);
    } else {
      console.warn("Convex User is undefined");
    }
  }, [convexUser]);
  
  const convexUserId = useMemo(() => convexUser?._id as Id<"users"> | undefined, [convexUser]);
 

 
  // ✅ Memoized Meetings Query to prevent rerenders
  const meetings = useQuery(api.meetings.getUserMeetings, convexUserId ? { userId: convexUserId } : "skip") || [];

  const createMeeting = useMutation(api.meetings.createMeeting);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingDate, setMeetingDate] = useState<Date | null>(null);
  const [duration, setDuration] = useState(30);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // ✅ Controls dropdown visibility
  // ✅ Fetch users based on selected role
  const users = useQuery(api.users.getUsersWithRole, selectedRole ? { role: selectedRole } : "skip");
  const userRole = convexUser?.role ?? "staff"; // ✅ Default to "staff" if undefined





  const meetingsWithCreatorImages = useMemo(() => {
    return meetings.map((meeting) => {
      const creator = users?.find((user) => user._id === meeting.createdBy);
      return {
        id: meeting._id as Id<"meetings">, // ✅ Fix: Rename `_id` to `id`
        title: meeting.title,
        description: meeting.description || "",
        meetingDate: meeting.meetingDate,
        duration: meeting.duration,
        attendees: meeting.attendees || [],
        acceptedAttendees: meeting.acceptedAttendees || [],
        createdBy: meeting.createdBy,
        status: meeting.status,
        creatorImage: meeting.creatorImage || creator?.imageUrl || "/default-avatar.png", // ✅ First from `meetings`, then `users`
        creatorName: meeting.creatorName || creator?.firstName || "Unknown Organizer",
      };
    });
  }, [meetings, users]);
  
  
      

  
  // ✅ Format meetings for Calendar
  const formattedMeetings = useMemo(() => {
    return meetings
      .filter((meeting) => 
        meeting.createdBy === convexUserId || meeting.acceptedAttendees.includes(convexUserId!)
      ) // ✅ Only show accepted meetings
      .map((meeting) => ({
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
        color:
          meeting.status === "cancelled"
            ? "#d1d5db"
            : meeting.acceptedAttendees.length > 0
            ? "#3b82f6"
            : "#9ca3af", // Gray if no one accepted
      }));
  }, [meetings]);
  
  const handleScheduleMeeting = async () => {
    if (!convexUserId) {
      toast.error("User data not loaded. Please try again.");
      console.warn("convexUserId is undefined");
      return;
    }
  
    // ✅ Check if required fields are missing
    if (!title.trim() || !meetingDate || selectedUsers.length === 0) {
      toast.error("You must fill all fields before scheduling a meeting.");
      return;
    }
  
    try {
      console.log("Submitting meeting:", {
        title,
        description,
        createdBy: convexUserId,
        attendees: selectedUsers.map((id) => id as Id<"users">),
        meetingDate: meetingDate.getTime(),
        duration,
      });
  
      await createMeeting({
        title,
        description,
        createdBy: convexUserId,
        attendees: selectedUsers.map((id) => id as Id<"users">),
        meetingDate: meetingDate.getTime(),
        duration,
      });
  
      toast.success("Meeting scheduled successfully!");
      setIsDialogOpen(false);
  
      // ✅ Reset form after scheduling a meeting
      setTitle("");
      setDescription("");
      setMeetingDate(null);
      setDuration(30);
      setSelectedUsers([]);
    } catch (error) {
      console.error("Meeting creation failed:", error);
      toast.error("Failed to create meeting.");
    }
  };
  
  

  // ✅ Handle User Selection & Removal
const handleUserSelection = (userId: string) => {
  setSelectedUsers((prev) =>
    prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId] // ✅ Remove if clicked again
  );
  setIsDropdownOpen(false); // ✅ Close dropdown after selection

};


  // ✅ Filter meetings for Upcoming Section
// ✅ Filter meetings for Upcoming Section
const upcomingMeetings = useMemo(() => {
  return meetings
    ? meetings.filter((meeting) =>
        meeting.createdBy === convexUserId || 
        meeting.acceptedAttendees.includes(convexUserId!) || 
        meeting.attendees.includes(convexUserId!) // ✅ Include pending invites
      )
    : [];
}, [meetings, convexUserId]);

  
  

  return (
    <div className="container mx-auto ">
   <div className="container mx-auto p-6 flex flex-col sm:flex-row gap-6">
      {/* ✅ Left Side: Upcoming Meetings */}
      <UpcomingMeetings
  meetings={meetingsWithCreatorImages} // ✅ Now properly formatted
  userRole={convexUser?.role ?? "staff"}
  userId={convexUserId!}
/>

      {/* ✅ Right Side: Calendar */}
      <Calendar 
  meetings={meetingsWithCreatorImages} // ✅ Corrected for calendar
  onAddEvent={() => setIsDialogOpen(true)} 
  userId={convexUserId || ""} 
  userRole={userRole}
/>
    </div>

      {/* Schedule Meeting Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
  setIsDialogOpen(isOpen);
  if (!isOpen) {
    // ✅ Reset the form when dialog is closed
    setTitle("");
    setDescription("");
    setMeetingDate(null);
    setDuration(30);
    setSelectedUsers([]);
    setSelectedRole("");
  }
}}>
        <DialogContent>
          <DialogTitle>Schedule a New Meeting</DialogTitle>

          <div className="space-y-4">
  {/* Meeting Title */}
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Meeting Title</label>
    <Input 
      placeholder="Enter meeting title" 
      value={title} 
      onChange={(e) => setTitle(e.target.value)} 
      className="mt-1"
    />
  </div>

  {/* Description */}
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description (optional)</label>
    <Input 
      placeholder="Enter meeting description" 
      value={description} 
      onChange={(e) => setDescription(e.target.value)} 
      className="mt-1"
    />
  </div>

  {/* Meeting Date & Time */}
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Meeting Date & Time</label>
    <Input 
      type="datetime-local" 
      onChange={(e) => setMeetingDate(new Date(e.target.value))} 
      className="mt-1"
    />
  </div>

  {/* Meeting Estimated Duration */}
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Meeting Estimated Duration (minutes)</label>
    <Input 
      type="number" 
      placeholder="Enter duration in minutes" 
      value={duration} 
      onChange={(e) => setDuration(Number(e.target.value))} 
      className="mt-1"
    />
  </div>
</div>

          {/* Role Selection */}
          <Select onValueChange={setSelectedRole}>
            <SelectTrigger>
              <SelectValue placeholder="Select Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">PEBEC Admins</SelectItem>
              <SelectItem value="mda">MDAs</SelectItem>
              <SelectItem value="staff">PEBEC Staff</SelectItem>
              <SelectItem value="reform_champion">Reform Champions</SelectItem>
            </SelectContent>
          </Select>

          {/* ✅ Proper Multi-Select Dropdown */}
          {users && (
  <div className="mt-4">
    <h3 className="text-sm font-semibold mb-2">Select Attendees:</h3>
    <div className="relative">
      <button
        className="w-full px-4 py-2 border rounded-lg text-left flex justify-between items-center"
        onClick={() => setIsDropdownOpen((prev) => !prev)}
      >
        {selectedUsers.length > 0
          ? `${selectedUsers.length} attendee(s) selected`
          : "Select attendees"}
        <ChevronDown className="w-5 h-5 text-gray-500" />
      </button>

      {isDropdownOpen && (
  <div className="absolute z-10 bg-white border rounded-md shadow-md mt-1 w-full max-h-60 overflow-auto">
    {users
      .filter(user => user._id !== convexUserId) // ✅ Exclude self
      .map((user) => (
        <div
          key={user._id}
          onClick={() => handleUserSelection(user._id)} // ✅ Dropdown closes on selection
          className={`flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-gray-100 ${
            selectedUsers.includes(user._id) ? "bg-blue-100" : ""
          }`}
        >
          <Image
            src={user.imageUrl || "/default-avatar.png"}
            alt="User Profile"
            width={25}
            height={25}
            className="rounded-full"
          />
          <span>{user.firstName} {user.lastName}</span>
        </div>
      ))}
  </div>
)}

    </div>
  </div>
)}


          {/* ✅ Display selected attendees below the dropdown */}
          {selectedUsers.length > 0 && (
            <div className="mt-4 p-2 border rounded-md bg-gray-100">
              <h3 className="text-sm font-semibold">Attendees:</h3>
              <div className="flex flex-wrap gap-2 mt-1">
                {selectedUsers.map((userId) => {
                  const user = users?.find((u) => u._id === userId);
                  return (
                    user && (
                      <div key={user._id} className="flex items-center gap-2 bg-white px-2 py-1 rounded-md shadow">
                        <Image
                          src={user.imageUrl || "/default-avatar.png"}
                          alt="User Profile"
                          width={25}
                          height={25}
                          className="rounded-full"
                        />
                        <span className="text-sm">{user.firstName} {user.lastName}</span>
                        <button
  className="text-red-500 text-xs hover:bg-red-100 px-1 rounded"
  onClick={(e) => {
    e.stopPropagation(); // ✅ Prevent dropdown from opening when removing user
    handleUserSelection(user._id);
  }}
>
  ✕
</button>
                      </div>
                    )
                  );
                })}
              </div>
            </div>
          )}

          <Button onClick={handleScheduleMeeting}>Invite</Button>
        </DialogContent>
      </Dialog>


    
    </div>
  );
}
