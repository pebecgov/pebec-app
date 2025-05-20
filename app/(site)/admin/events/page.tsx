'use client';

import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { format } from 'date-fns';
import Link from 'next/link';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

type EventType = 'vip' | 'general' | 'vip_and_general';

export default function ManageEventsPage() {
  const events = useQuery(api.events.getAllEventsWithStats);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');
  const [dateFilter, setDateFilter] = useState('');

  const filteredEvents = useMemo(() => {
    return (
      events?.filter((event) => {
        const matchesSearch = event.title.toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === 'all' || event.eventType === typeFilter;
        const matchesDate =
          !dateFilter || format(new Date(event.eventDate), 'yyyy-MM-dd') === dateFilter;
        return matchesSearch && matchesType && matchesDate;
      }) || []
    );
  }, [events, search, typeFilter, dateFilter]);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-green-700 mb-6">Manage Events</h1>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Input
          placeholder="Search by event name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="md:w-1/3"
        />

        <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val as EventType | 'all')}>
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

        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="md:w-1/4"
        />
      </div>

      {/* Events Table */}
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
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.map((event) => (
              <TableRow key={event._id}>
<TableCell className="flex flex-col gap-1">
  <span>{event.title}</span>
  {(() => {
    const eventDate = new Date(event.eventDate);
    const today = new Date();

    // Strip time for date-only comparison
    const eventDay = new Date(eventDate.toDateString());
    const todayDay = new Date(today.toDateString());

    if (eventDay < todayDay) {
      return (
        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded w-fit">
          PASSED
        </span>
      );
    } else if (eventDay > todayDay) {
      return (
        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded w-fit">
          UPCOMING
        </span>
      );
    }

    return null; // Same day = no tag
  })()}
</TableCell>
                <TableCell>{format(new Date(event.eventDate), 'PPpp')}</TableCell>
                <TableCell>{event.host}</TableCell>
                <TableCell>{event.location}</TableCell>
                <TableCell>
                  {event.eventType === 'vip' && (
                    <>VIP: {event.vipTicketsSold}</>
                  )}
                  {event.eventType === 'general' && (
                    <>General: {event.generalTicketsSold}</>
                  )}
                  {event.eventType === 'vip_and_general' && (
                    <>
                      <div>VIP: {event.vipTicketsSold}</div>
                      <div>General: {event.generalTicketsSold}</div>
                    </>
                  )}
                </TableCell>
                <TableCell>{event.totalAttendees}</TableCell>
                <TableCell>
                  <Link href={`/admin/events/${event._id}`}>
                    <Button variant="outline" size="sm">
                      View details & attendees
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
