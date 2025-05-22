// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useMemo, useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "@/app/calendar.css";
import { format, isSameDay, parseISO, addMinutes, isBefore, setHours, setMinutes, isAfter } from "date-fns";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Id } from "@/convex/_generated/dataModel";
import { ToggleSwitch } from "@/components/ToggleBtn";
export default function StaffAvailabilityPage() {
  const {
    user
  } = useUser();
  const convexUser = useQuery(api.users.getUserByClerkId, user?.id ? {
    clerkUserId: user.id
  } : "skip");
  const allUsers = useQuery(api.users.getAllUsers) || [];
  const availability = useQuery(api.meetings.getStaffAvailability, convexUser?._id && convexUser?.staffStream ? {
    userId: convexUser._id,
    workstream: convexUser.staffStream
  } : "skip") || [];
  const [showInfo, setShowInfo] = useState(false);
  const setAvailability = useMutation(api.meetings.setAvailability);
  const deactivateSlot = useMutation(api.meetings.deactivateSlot);
  const deleteSlot = useMutation(api.meetings.deleteSlot);
  const cancelSlot = useMutation(api.meetings.cancelSlot);
  const [showDeleteDialog, setShowDeleteDialog] = useState<{
    open: boolean;
    slotId: Id<"availability"> | null;
  }>({
    open: false,
    slotId: null
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<"upcoming" | "slots">("upcoming");
  const [showAllMeetings, setShowAllMeetings] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [startDateTime, setStartDateTime] = useState<Date | null>(null);
  const [duration, setDuration] = useState(60);
  const [loadingIds, setLoadingIds] = useState<Id<"availability">[]>([]);
  const [releaseDialog, setReleaseDialog] = useState<{
    open: boolean;
    slotId: Id<"availability"> | null;
  }>({
    open: false,
    slotId: null
  });
  const staffStream = convexUser?.staffStream;
  useEffect(() => {
    availability.forEach(async slot => {
      const start = parseISO(`${slot.date}T${slot.startTime}`);
      if (isBefore(start, new Date()) && !slot.deactivated) {
        await deactivateSlot({
          slotId: slot._id,
          deactivate: true
        });
      }
    });
  }, [availability]);
  const slotsForDay = useMemo(() => {
    if (!selectedDate) return [];
    return availability.filter(slot => isSameDay(parseISO(`${slot.date}T${slot.startTime}`), selectedDate));
  }, [selectedDate, availability]);
  const handleCreateSlot = async () => {
    if (!startDateTime || !staffStream) return toast.error("Missing info");
    const now = new Date();
    if (isBefore(startDateTime, setHours(setMinutes(now, 0), 0))) {
      return toast.error("Cannot create slot in the past");
    }
    const date = format(startDateTime, "yyyy-MM-dd");
    const time = format(startDateTime, "HH:mm");
    const exists = availability.some(s => s.date === date && s.startTime === time);
    if (exists) return toast.error("Slot already exists");
    await setAvailability({
      userId: convexUser!._id,
      workstream: staffStream,
      date,
      day: format(startDateTime, "EEEE"),
      startTime: time,
      duration
    });
    toast.success("Slot created");
    setDialogOpen(false);
  };
  const handleCreate6Slots = async () => {
    if (!startDateTime || !staffStream) {
      toast.error("Please select a date in the modal");
      return;
    }
    const now = new Date();
    const selectedDay = new Date(startDateTime.getFullYear(), startDateTime.getMonth(), startDateTime.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (selectedDay < today) {
      toast.error("Cannot create slots in the past");
      return;
    }
    const base = setHours(setMinutes(new Date(startDateTime), 0), 10);
    let created = 0;
    for (let i = 0; i < 6; i++) {
      const slotStart = addMinutes(base, i * 60);
      if (isBefore(slotStart, now)) continue;
      const date = format(slotStart, "yyyy-MM-dd");
      const time = format(slotStart, "HH:mm");
      const exists = availability.some(s => s.date === date && s.startTime === time);
      if (!exists) {
        await setAvailability({
          userId: convexUser!._id,
          workstream: staffStream,
          date,
          day: format(slotStart, "EEEE"),
          startTime: time,
          duration: 60
        });
        created++;
      }
    }
    if (created > 0) {
      toast.success(`${created} slots created.`);
    } else {
      toast.warning("All valid slots already exist or are in the past.");
    }
    setDialogOpen(false);
  };
  const visibleSlots = useMemo(() => {
    const now = new Date();
    if (activeTab === "upcoming") {
      return availability.filter(slot => {
        const start = parseISO(`${slot.date}T${slot.startTime}`);
        return slot.bookedBy && !(slot as any)?.cancelled && isAfter(start, now) && (showAllMeetings || selectedDate && isSameDay(start, selectedDate));
      });
    } else {
      return slotsForDay;
    }
  }, [availability, activeTab, showAllMeetings, selectedDate]);
  return <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">🧑‍💼 Staff Meetings Management</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="bg-white rounded-xl shadow w-full lg:w-1/3 p-4">
        <div className="flex justify-between mb-4">
  <Button className="w-full mr-2" onClick={() => setDialogOpen(true)}>
    ➕ Set Availability
  </Button>
  <Button variant="outline" onClick={() => setShowInfo(true)}>ℹ️ Instructions</Button>
        </div>

          <Calendar onChange={date => {
          setSelectedDate(date as Date);
          setActiveTab("upcoming");
          setShowAllMeetings(false);
        }} value={selectedDate} tileContent={({
          date
        }) => {
          const daySlots = availability.filter(slot => isSameDay(parseISO(`${slot.date}T${slot.startTime}`), date));
          if (!daySlots.length) return null;
          const allBooked = daySlots.every(s => s.bookedBy);
          return <div className="flex justify-center mt-1">
                  <div className={`w-2 h-2 rounded-full ${allBooked ? "bg-red-500" : "bg-green-500"}`} />
                </div>;
        }} />
        </div>

        <div className="flex-1 bg-white p-4 rounded-xl shadow max-h-[600px] overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-4 gap-3">
            <h2 className="text-lg font-semibold">
              {activeTab === "upcoming" ? showAllMeetings ? "📋 All Upcoming Meetings" : `📋 Meetings for ${format(selectedDate ?? new Date(), "EEEE, MMM d")}` : `⚙️ Slot Settings for ${format(selectedDate ?? new Date(), "EEEE, MMM d")}`}
            </h2>
            <div className="flex gap-2">
              <Button variant={activeTab === "slots" ? "default" : "outline"} onClick={() => setActiveTab("slots")}>Slot Settings</Button>
              <Button variant={activeTab === "upcoming" ? "default" : "outline"} onClick={() => setActiveTab("upcoming")}>Upcoming</Button>
            </div>
          </div>

          <div className="space-y-3">
            {visibleSlots.map(slot => {
            const start = parseISO(`${slot.date}T${slot.startTime}`);
            const end = addMinutes(start, slot.duration);
            const mda = allUsers.find(u => u._id === slot.bookedBy);
            const isExpired = isBefore(end, new Date());
            return <div key={slot._id} className="border rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:justify-between gap-3 bg-gray-50">
                  <div>
                    <p className="font-medium">{format(start, "EEEE, MMM d")} | {format(start, "h:mm a")} – {format(end, "h:mm a")}</p>
                    {mda && <p className="text-sm text-gray-700">
                        Booked by {mda.mdaName} — {mda.firstName} {mda.lastName}, {mda.jobTitle}
                      </p>}
                  </div>

                  {activeTab === "slots" && <div className="flex gap-2 items-center">
                   {!slot.bookedBy && !isExpired && <>
    <Switch checked={!slot.deactivated} onCheckedChange={async () => {
                    setLoadingIds(prev => [...prev, slot._id]);
                    await deactivateSlot({
                      slotId: slot._id,
                      deactivate: !slot.deactivated
                    });
                    setLoadingIds(prev => prev.filter(id => id !== slot._id));
                  }} disabled={loadingIds.includes(slot._id)} />
    <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog({
                    open: true,
                    slotId: slot._id
                  })}>
      Delete
    </Button>
  </>}
                      {isExpired && <span className="text-xs text-muted">Expired</span>}
                      {slot.bookedBy && <Button variant="destructive" size="sm" onClick={() => setReleaseDialog({
                  open: true,
                  slotId: slot._id
                })}>
                          Release
                        </Button>}
                    </div>}
                </div>;
          })}

            {visibleSlots.length === 0 && <p className="text-gray-500 text-sm">No {activeTab === "upcoming" ? "appointments." : "slots for this day."}</p>}

            {activeTab === "upcoming" && <div className="text-right mt-4">
                <Button size="sm" variant="ghost" className="text-blue-600 hover:underline" onClick={() => setShowAllMeetings(prev => !prev)}>
                  {showAllMeetings ? "Show Selected Date" : "See All"}
                </Button>
              </div>}

            {activeTab === "slots" && slotsForDay.length > 0 && <div className="text-right mt-4">
                <ToggleSwitch checked={slotsForDay.every(s => !s.deactivated)} onChange={async () => {
              const shouldActivate = slotsForDay.every(s => s.deactivated);
              await Promise.all(slotsForDay.map(slot => deactivateSlot({
                slotId: slot._id,
                deactivate: !shouldActivate
              })));
              toast.success(shouldActivate ? "All slots activated" : "All slots deactivated");
            }} label={slotsForDay.every(s => !s.deactivated) ? "Deactivate All" : "Activate All"} />
              </div>}
          </div>
        </div>
      </div>

      {}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Slot</DialogTitle></DialogHeader>
          <div className="space-y-4">
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Select Date
    </label>
    <DatePicker selected={startDateTime} onChange={date => setStartDateTime(date)} minDate={new Date()} dateFormat="MMMM d, yyyy" className="w-full border px-3 py-2 rounded" />

  </div>

  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Select Start Time
    </label>
    <DatePicker selected={startDateTime} onChange={time => {
              if (startDateTime && time) {
                const updated = new Date(startDateTime);
                updated.setHours(time.getHours(), time.getMinutes());
                setStartDateTime(updated);
              }
            }} showTimeSelect showTimeSelectOnly timeIntervals={15} dateFormat="h:mm aa" className="w-full border px-3 py-2 rounded" />
  </div>

  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Duration (in minutes)
    </label>
    <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} min={15} max={120} className="w-full border px-3 py-2 rounded" />
  </div>
        </div>




          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSlot}>Add Slot</Button>
            <Button onClick={handleCreate6Slots}>Add 6 Slots</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={releaseDialog.open} onOpenChange={() => setReleaseDialog({
      open: false,
      slotId: null
    })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Release Slot</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Releasing this slot will cancel the user's appointment but keep the slot available. Continue?</p>
          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => setReleaseDialog({
            open: false,
            slotId: null
          })}>No</Button>
            <Button variant="destructive" onClick={async () => {
            if (releaseDialog.slotId) {
              await cancelSlot({
                slotId: releaseDialog.slotId
              });
              toast.success("Slot released");
              setReleaseDialog({
                open: false,
                slotId: null
              });
            }
          }}>Yes, Release</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showInfo} onOpenChange={setShowInfo}>
  <DialogContent>
    <DialogHeader><DialogTitle>📘 Instructions</DialogTitle></DialogHeader>
    <div className="space-y-4 text-sm text-gray-700">
      <div>
        <strong>🕒 Create a Single Slot:</strong>
        <p>Click <em>Set Availability</em>, choose a date and time, then click <strong>Add Slot</strong>.</p>
      </div>
      <div>
        <strong>📅 Create 6 Slots:</strong>
        <p>Click <em>Set Availability</em>, choose the date using the date picker, then click <strong>Add 6 Slots</strong>. Slots will be added from <strong>10:00 AM to 3:00 PM</strong> (6 one-hour slots).</p>
      </div>
      <div>
        <strong>🛑 Deactivate Slots:</strong>
        <ul className="list-disc list-inside">
          <li>To deactivate a single slot, go to <strong>Slot Settings</strong> and toggle off the switch beside the slot.</li>
          <li>To deactivate all slots for a date, click the <strong>Deactivate All</strong> toggle at the bottom-left of the Slot Settings panel.</li>
        </ul>
      </div>
      <div>
        <strong>🗑️ Delete Slots:</strong>
        <p>In <strong>Slot Settings</strong>, click the red <strong>Delete</strong> button beside a slot. You will be prompted for confirmation before it is removed.</p>
      </div>
      <div>
        <strong>🔵 What do the dots on the calendar mean?</strong>
        <ul className="list-disc list-inside">
          <li><span className="text-green-600 font-semibold">Green Dot</span>: You still have available slots on that date.</li>
          <li><span className="text-red-600 font-semibold">Red Dot</span>: All slots on that date are fully booked.</li>
        </ul>
      </div>
    </div>
    <DialogFooter className="mt-4">
      <Button onClick={() => setShowInfo(false)}>Close</Button>
    </DialogFooter>
  </DialogContent>
    </Dialog>



    {}
    <Dialog open={showDeleteDialog.open} onOpenChange={() => setShowDeleteDialog({
      open: false,
      slotId: null
    })}>
  <DialogContent>
    <DialogHeader><DialogTitle>Confirm Delete</DialogTitle></DialogHeader>
    <p className="text-sm text-gray-600">Are you sure you want to delete this slot? This action cannot be undone.</p>
    <DialogFooter className="mt-4 flex gap-2">
      <Button variant="outline" onClick={() => setShowDeleteDialog({
            open: false,
            slotId: null
          })}>Cancel</Button>
      <Button variant="destructive" onClick={async () => {
            if (showDeleteDialog.slotId) {
              await deleteSlot({
                slotId: showDeleteDialog.slotId
              });
              toast.success("Slot deleted");
              setShowDeleteDialog({
                open: false,
                slotId: null
              });
            }
          }}>
        Yes, Delete
      </Button>
    </DialogFooter>
  </DialogContent>
    </Dialog>

      <Toaster position="top-center" />
    </div>;
}