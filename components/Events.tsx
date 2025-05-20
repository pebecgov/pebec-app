'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

import Image from 'next/image';
import { Spinner } from '@/components/ui/spinner';
import { format } from 'date-fns';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

export const metadata = {
  title: 'Upcoming Events - PEBEC',
  description: 'Discover and join our upcoming events!',
};

export default function EventsPage() {
  const events = useQuery(api.events.getEvents);

  const now = new Date();

  const upcomingEvents = events?.filter(
    (event) => new Date(event.eventDate) >= now
  ) || [];

  const pastEvents = events?.filter(
    (event) => new Date(event.eventDate) < now
  ) || [];

  return (
    <div className="pb-20 bg-gray-50">
      {/* HERO SECTION */}
      <div className="relative w-full h-[300px] md:h-[400px] lg:h-[500px] overflow-hidden">
        <Image
          src="/images/events.jpg"
          alt="Events Banner"
          fill
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-green-900/80" />
        <div className="relative z-10 h-full flex flex-col justify-center items-center text-center text-white px-4">
          <h1 className="text-3xl md:text-5xl font-extrabold">
            Upcoming Events
          </h1>
          <p className="mt-4 max-w-xl text-gray-200 text-base md:text-lg">
            Discover and join our exciting events. Be part of something big!
          </p>
        </div>
      </div>

      {/* EVENTS SECTION */}
      <div className="mt-10 max-w-7xl mx-auto px-4 md:px-8 flex flex-col lg:flex-row gap-8">
        {/* Upcoming Events */}
        <div className="w-full lg:w-[70%]">
          <h2 className="text-2xl font-bold mb-6 text-green-700">
            Upcoming Events
          </h2>

          {!events ? (
            <div className="flex h-40 items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : upcomingEvents.length === 0 ? (
            <p className="text-center text-gray-600 text-lg">
              No upcoming events.
            </p>
          ) : (
            <ul className="grid gap-6 md:grid-cols-2">
            {upcomingEvents.map((event) => (
              <li
                key={event._id}
                className="flex flex-col justify-between bg-white border rounded-lg shadow-sm hover:shadow-md transition overflow-hidden min-h-[420px]"
              >
                {/* Image */}
                <div className="relative w-full h-40 bg-white">
                  <Image
                    src={event.coverImageUrl || '/placeholder.jpg'}
                    alt={event.title}
                    fill
                    className="object-cover object-center"
                  />
                </div>
          
                {/* Content */}
                <div className="p-4 flex flex-col flex-grow justify-between space-y-3">
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                        <p className="text-sm text-gray-600">
                          Hosted by {event.host || 'PEBEC'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className="text-xs bg-green-600 text-white px-2 py-1">
                          {format(new Date(event.eventDate), 'PP')}
                        </Badge>
                       
                      </div>
                    </div>
          
                    <p className="text-sm text-gray-500 mt-1">{event.description}</p>
          
                    <div className="flex items-center text-sm text-gray-600 gap-2 mt-1">
                      <Clock className="w-4 h-4" />
                      {format(new Date(event.eventDate), 'p')}
                    </div>
          
                    {/* 🎟️ Ticket Availability
                    {(event.vipTicketLimit || event.generalTicketLimit) && (
                      <div className="bg-gray-100 rounded-md p-2 mt-2 text-xs text-gray-700 space-y-1">
                        {event.eventType !== 'general' &&
                          typeof event.vipTicketLimit === 'number' && (
                            <div>
                              VIP Tickets Left:{' '}
                              <span className="font-medium">
                                {event.vipTicketLimit - (event.vipTicketsSold || 0)}
                              </span>
                            </div>
                          )}
                        {event.eventType !== 'vip' &&
                          typeof event.generalTicketLimit === 'number' && (
                            <div>
                              General Tickets Left:{' '}
                              <span className="font-medium">
                                {event.generalTicketLimit -
                                  (event.generalTicketsSold || 0)}
                              </span>
                            </div>
                          )}
                      </div>
                    )} */}
                  </div>
          
                  <Link href={`/events/${event._id}`}>
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white mt-3">
                      View Details
                    </Button>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
          
          )}
        </div>

        {/* Past Events */}
        <div className="w-full lg:w-[30%]">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-green-700 mb-4">
              Past Events
            </h2>

            {pastEvents.length === 0 ? (
              <p className="text-gray-500 text-sm">No past events.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                {pastEvents
  .sort(
    (a, b) =>
      new Date(b.eventDate).getTime() -
      new Date(a.eventDate).getTime()
  )
  .slice(0, 4)
  .map((event) => (
    <Link
      key={event._id}
      href={`/events/${event._id}`}
      className="block rounded-lg overflow-hidden border bg-white shadow-sm hover:shadow-md transition"
    >
      <div className="relative h-28 w-full">
        <Image
          src={event.coverImageUrl || '/placeholder.jpg'}
          alt={event.title}
          fill
          className="object-cover object-center"
        />
      </div>
      <div className="p-3">
        <h3 className="text-sm font-semibold text-gray-800">
          {event.title}
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          {new Date(event.eventDate).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </p>
      </div>
    </Link>
  ))}

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
