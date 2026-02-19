// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Image from 'next/image';
import { Spinner } from '@/components/ui/spinner';
import { format } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
export const metadata = {
  title: 'Upcoming Events - PEBEC',
  description: 'Discover and join our upcoming events!'
};
export default function EventsPage() {
  const events = useQuery(api.events.getEvents);
  const now = new Date();
  const upcomingEvents = events?.filter(event => new Date(event.eventDate) >= now) || [];
  const pastEvents = events?.filter(event => new Date(event.eventDate) < now) || [];

  // Hardcoded workshop event date
  const workshopEventDate = new Date('2024-10-14T11:00:00');
  const isWorkshopUpcoming = workshopEventDate >= now;
  return <div className="pb-20 bg-gray-50">
    { }
    <div className="relative w-full h-[300px] md:h-[400px] lg:h-[500px] overflow-hidden">
      <Image src="/images/events.jpg" alt="Events Banner" fill className="object-cover object-center" />
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

    { }
    <div className="mt-10 max-w-7xl mx-auto px-4 md:px-8 flex flex-col lg:flex-row gap-8">
      { }
      <div className="w-full lg:w-[70%]">
        <h2 className="text-2xl font-bold mb-6 text-green-700">
          Upcoming Events
        </h2>

        {!events ? <div className="flex h-40 items-center justify-center">
          <Spinner size="lg" />
        </div> : <ul className="grid gap-6 grid-cols-1">
          {/* Workshop Event Card - image left, details right */}
          {isWorkshopUpcoming && (
            <li className="flex flex-row bg-white border rounded-xl shadow-sm hover:shadow-md transition overflow-hidden">
              <div className="relative w-full min-w-[45%] max-w-[50%] aspect-[4/3] md:aspect-auto md:min-h-[280px] shrink-0">
                <Image
                  src="/images/workshop-banner.png"
                  alt="Strategic Engagement Workshop"
                  fill
                  className="object-cover object-center"
                />
              </div>
              <div className="flex flex-col justify-between p-6 flex-1">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-green-700">Strategic Engagement on Business Facilitation & Investment Access</h3>
                  <p className="text-sm text-gray-600">Date: Oct 14, 2024</p>
                  <p className="text-sm text-gray-600">Time: 11:00 AM</p>
                  <p className="text-sm text-gray-600">Hosted by: PEBEC & Embassy of the United Arab Emirates, Abuja</p>
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">Presenting Strategic Investment opportunities in the UAE and Highlighting Nigeria's Business and Investment Climate</p>
                </div>
                <Link href="/workshop" className="mt-4">
                  <Button className="w-full sm:w-auto bg-gray-800 hover:bg-gray-900 text-white">
                    Register
                  </Button>
                </Link>
              </div>
            </li>
          )}

          {/* Regular Events - image left, details right */}
          {upcomingEvents.map(event => (
            <li key={event._id} className="flex flex-row bg-white border rounded-xl shadow-sm hover:shadow-md transition overflow-hidden">
              <div className="relative w-full min-w-[45%] max-w-[50%] aspect-[4/3] md:aspect-auto md:min-h-[280px] shrink-0">
                <Image
                  src={event.coverImageUrl || '/placeholder.jpg'}
                  alt={event.title}
                  fill
                  className="object-cover object-center"
                />
              </div>
              <div className="flex flex-col justify-between p-6 flex-1">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-green-700">{event.title}</h3>
                  <p className="text-sm text-gray-600">Date: {format(new Date(event.eventDate), 'do MMMM yyyy')}</p>
                  <p className="text-sm text-gray-600">Time: {format(new Date(event.eventDate), 'hh:mm a')}</p>
                  {event.location && <p className="text-sm text-gray-600">Location: {event.location}</p>}
                  <p className="text-sm text-gray-600">Hosted by: {event.host || 'PEBEC'}</p>
                  {event.description && <p className="text-sm text-gray-500 mt-2 line-clamp-3">{event.description}</p>}
                </div>
                <Link href={`/events/${event.customUrl || event._id}`} className="mt-4">
                  <Button className="w-full sm:w-auto bg-gray-800 hover:bg-gray-900 text-white">
                    Register
                  </Button>
                </Link>
              </div>
            </li>
          ))}
        </ul>}
      </div>

      { }
      <div className="w-full lg:w-[30%]">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-green-700 mb-4">
            Past Events
          </h2>

          {pastEvents.length === 0 && isWorkshopUpcoming ? <p className="text-gray-500 text-sm">No past events.</p> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            {/* Hardcoded Workshop Event - Show in past events if date has passed */}
            {!isWorkshopUpcoming && (
              <Link href="/workshop" className="block rounded-lg overflow-hidden border bg-white shadow-sm hover:shadow-md transition">
                <div className="relative h-28 w-full">
                  <Image src="/images/workshop-banner.png" alt="Strategic Engagement Workshop" fill className="object-cover object-center" />
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-gray-800">
                    Strategic Engagement on Business Facilitation & Investment Access
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Oct 14, 2024
                  </p>
                </div>
              </Link>
            )}

            {pastEvents.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()).slice(0, 4).map(event => <Link key={event._id} href={`/events/${event.customUrl || event._id}`} className="block rounded-lg overflow-hidden border bg-white shadow-sm hover:shadow-md transition">
              <div className="relative h-28 w-full">
                <Image src={event.coverImageUrl || '/placeholder.jpg'} alt={event.title} fill className="object-cover object-center" />
              </div>
              <div className="p-3">
                <h3 className="text-sm font-semibold text-gray-800">
                  {event.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(event.eventDate).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </Link>)}

          </div>}
        </div>
      </div>
    </div>
  </div>;
}