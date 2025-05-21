'use client';

import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { format } from 'date-fns';
import { Spinner } from '@/components/ui/spinner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from './ui/button';

export default function UpcomingEvents() {
  const events = useQuery(api.events.getEvents);

  if (!events) return <Spinner />;

  const now = new Date();

  // ✅ Filter upcoming events
  const upcomingEvents = events.filter(event => new Date(event.eventDate) >= now);

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>Upcoming Events</CardTitle>
      </CardHeader>

      <CardContent>
        <ul className="flex flex-col gap-4">
          {upcomingEvents.length === 0 ? (
            <p className="text-gray-500 text-sm">No upcoming events.</p>
          ) : (
            upcomingEvents.map((event) => (
              <li key={event._id} className="flex items-start justify-between gap-4">
                <div className="inline-flex items-center gap-3">
                  {/* Event Avatar */}
                  <Avatar className="w-12 h-12">
                    <AvatarImage
                      src={event.coverImageUrl || '/placeholder.jpg'}
                      alt={event.title}
                    />
                    <AvatarFallback>{event.title.charAt(0)}</AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="max-w-xs">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      {event.title}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                      {event.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(event.eventDate), 'MMMM d, yyyy')} - {event.location}
                    </p>
                  </div>
                </div>

                <Link href={`/events/${event._id}`}>
                  <Button size="sm" variant="outline" className="rounded-full">
                    RSVP
                  </Button>
                </Link>
              </li>
            ))
          )}
        </ul>
      </CardContent>

      <CardFooter>
        <Link href="/events" className="text-sm font-light text-emerald-600 hover:underline">
          See more events
        </Link>
      </CardFooter>
    </Card>
  );
}
