// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { format } from 'date-fns';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import WorkshopRegistrations from '@/components/Admin/WorkshopRegistrations';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
type EventType = 'vip' | 'general' | 'vip_and_general';
export default function ManageEventsPage() {
  const events = useQuery(api.events.getAllEventsWithStats);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');
  const [dateFilter, setDateFilter] = useState('');
  
  const markEventAsSaber = useMutation(api.events.markEventAsSaber);
  const unmarkEventAsSaber = useMutation(api.events.unmarkEventAsSaber);
  const filteredEvents = useMemo(() => {
    return events?.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'all' || event.eventType === typeFilter;
      const matchesDate = !dateFilter || format(new Date(event.eventDate), 'yyyy-MM-dd') === dateFilter;
      return matchesSearch && matchesType && matchesDate;
    }) || [];
  }, [events, search, typeFilter, dateFilter]);

  const handleMarkAsSaber = async (eventId: string) => {
    try {
      await markEventAsSaber({ eventId: eventId as any });
      toast.success("Event marked as SABER event");
    } catch (error) {
      toast.error("Failed to mark event as SABER event");
    }
  };

  const handleUnmarkAsSaber = async (eventId: string) => {
    try {
      await unmarkEventAsSaber({ eventId: eventId as any });
      toast.success("Event unmarked as SABER event");
    } catch (error) {
      toast.error("Failed to unmark event as SABER event");
    }
  };

  return <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-green-700">Manage Events</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 text-white hover:bg-blue-700">Workshop registrations</Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl w-[95vw] h-[85vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Strategic Engagement Workshop Registrations</DialogTitle>
            </DialogHeader>
            <div className="h-[calc(85vh-80px)] overflow-auto pr-2">
              <WorkshopRegistrations />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Input placeholder="Search by event name..." value={search} onChange={e => setSearch(e.target.value)} className="md:w-1/3" />

        <Select value={typeFilter} onValueChange={val => setTypeFilter(val as EventType | 'all')}>
          <SelectTrigger className="md:w-1/4">
            <SelectValue placeholder="Event Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="vip_and_general">VIP + General</SelectItem>
          </SelectContent>
        </Select>

        <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="md:w-1/4" />
      </div>

      {}
      <div className="overflow-x-auto bg-white rounded-md shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Host</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Tickets</TableHead>
              <TableHead>Attendees</TableHead>
              <TableHead>SABER</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.map(event => <TableRow key={event._id}>
            <TableCell className="flex flex-col gap-1">
  <span>{event.title}</span>
  {(() => {
                const eventDate = new Date(event.eventDate);
                const today = new Date();
                const eventDay = new Date(eventDate.toDateString());
                const todayDay = new Date(today.toDateString());
                if (eventDay < todayDay) {
                  return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded w-fit">
          PASSED
        </span>;
                } else if (eventDay > todayDay) {
                  return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded w-fit">
          UPCOMING
        </span>;
                }
                return null;
              })()}
            </TableCell>
                <TableCell>{format(new Date(event.eventDate), 'PPpp')}</TableCell>
                <TableCell>{event.host}</TableCell>
                <TableCell>{event.location}</TableCell>
                <TableCell>
                  {event.eventType === 'vip' && <>VIP: {event.vipTicketsSold}</>}
                  {event.eventType === 'general' && <>General: {event.generalTicketsSold}</>}
                  {event.eventType === 'vip_and_general' && <>
                      <div>VIP: {event.vipTicketsSold}</div>
                      <div>General: {event.generalTicketsSold}</div>
                    </>}
                </TableCell>
                <TableCell>{event.totalAttendees}</TableCell>
                <TableCell>
                  {event.isSaberEvent ? (
                    <div className="flex flex-col gap-2">
                      <Badge className="bg-green-100 text-green-800">SABER Event</Badge>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleUnmarkAsSaber(event._id)}
                        className="text-xs"
                      >
                        Remove SABER
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleMarkAsSaber(event._id)}
                      className="text-xs"
                    >
                      Mark as SABER
                    </Button>
                  )}
                </TableCell>
                <TableCell className="flex flex-wrap gap-2">
                  <Link href={`/admin/events/${event._id}`}>
                    <Button variant="outline" size="sm">
                      View details & attendees
                    </Button>
                  </Link>
                  <Link href={`/admin/create-events/${event._id}`}>
                    <Button variant="outline" size="sm" className="text-green-700 border-green-700">
                      Edit event
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>)}
          </TableBody>
        </Table>
      </div>
    </div>;
}