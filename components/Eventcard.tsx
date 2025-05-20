'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Event } from "@/lib/types";
import { formatDate } from '@/lib/utils';
import { Clock } from 'lucide-react';

export default function EventItem({ event }: { event: Event }) {
  const coverImageUrl = event.coverImageUrl || null;

  // Shorten the description to show only the first 30 words
  const descriptionWords = event.description.split(" ");
  const shortDescription = descriptionWords.length > 30 
    ? descriptionWords.slice(0, 30).join(" ") + "..."
    : event.description;

  // Format the event time
  const eventTime = new Date(event.eventDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Check if the event date is in the future
  const isEventInTheFuture = new Date(event.eventDate) >= new Date();

  if (!isEventInTheFuture) return null;

  return (
    <li className="max-w-lg mx-auto bg-white rounded-lg shadow-md overflow-hidden sm:max-w-2xl m-3 relative transition-transform hover:scale-[1.02]">
      <Link href={`/events/${event._id}`} className="block">
        <div className="flex flex-col sm:flex-row">
          {/* Date Badge */}
          <div className="absolute top-3 right-3 bg-green-600 text-white text-xs px-3 py-1 rounded-lg">
            {formatDate(event.eventDate)}
          </div>

          {/* Event Cover Image */}
          {coverImageUrl && (
            <div className="w-full sm:w-48 h-48 relative">
              <Image
                alt="Event Cover"
                src={coverImageUrl}
                layout="fill"
                objectFit="cover"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Event Details */}
          <div className="p-6 flex flex-col justify-between w-full">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{event.title}</h2>
              <p className="text-sm sm:text-base text-gray-700">Hosted by {event.host}</p>
              <p className="mt-2 text-sm text-gray-600">{shortDescription}</p>
            </div>

            {/* Event Time */}
            <div className="mt-4 flex items-center text-sm text-gray-500 space-x-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span>{eventTime}</span>
            </div>

            {/* View Details Button */}
            <div className="mt-5">
              <Button className="w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                View Details
              </Button>
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
}
