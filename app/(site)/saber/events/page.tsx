// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, User, Clock, ExternalLink, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";
import Link from "next/link";

export default function SaberEventsPage() {
  const saberEvents = useQuery(api.events.getSaberEvents) || [];

  const upcomingEvents = saberEvents.filter(event => new Date(event.eventDate) > new Date());
  const pastEvents = saberEvents.filter(event => new Date(event.eventDate) <= new Date());

  const getEventStatus = (eventDate: number) => {
    const now = new Date();
    const eventDateObj = new Date(eventDate);
    
    if (eventDateObj > now) {
      const diffTime = eventDateObj.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return { status: "Tomorrow", color: "bg-orange-100 text-orange-800" };
      if (diffDays <= 7) return { status: "This Week", color: "bg-yellow-100 text-yellow-800" };
      return { status: "Upcoming", color: "bg-green-100 text-green-800" };
    } else {
      return { status: "Past", color: "bg-gray-100 text-gray-800" };
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case "vip":
        return "bg-purple-100 text-purple-800";
      case "general":
        return "bg-blue-100 text-blue-800";
      case "vip_and_general":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/saber" className="inline-flex items-center text-sky-600 hover:text-sky-700 mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to SABER
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">SABER Events</h1>
        <p className="text-gray-600">
          Stay updated with SABER-related events, workshops, and activities
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Events</p>
                <p className="text-2xl font-bold text-gray-900">{saberEvents.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="text-2xl font-bold text-blue-600">{upcomingEvents.length}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Past Events</p>
                <p className="text-2xl font-bold text-gray-600">{pastEvents.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Upcoming Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map((event) => {
              const status = getEventStatus(event.eventDate);
              return (
                <Card key={event._id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg leading-tight mb-2">
                          {event.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getEventTypeColor(event.eventType)}>
                            {event.eventType.replace("_", " ").toUpperCase()}
                          </Badge>
                          <Badge className={status.color}>
                            {status.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <CardDescription className="text-sm mb-4 line-clamp-3">
                      {event.description}
                    </CardDescription>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        {format(new Date(event.eventDate), "PPP 'at' p")}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        {event.location}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="h-4 w-4 mr-2" />
                        Hosted by {event.host}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/events/${event._id}`}>
                        <Button className="flex-1" variant="outline">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Past Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastEvents.map((event) => {
              const status = getEventStatus(event.eventDate);
              return (
                <Card key={event._id} className="hover:shadow-lg transition-shadow opacity-75">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg leading-tight mb-2">
                          {event.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getEventTypeColor(event.eventType)}>
                            {event.eventType.replace("_", " ").toUpperCase()}
                          </Badge>
                          <Badge className={status.color}>
                            {status.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <CardDescription className="text-sm mb-4 line-clamp-3">
                      {event.description}
                    </CardDescription>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        {format(new Date(event.eventDate), "PPP 'at' p")}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        {event.location}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="h-4 w-4 mr-2" />
                        Hosted by {event.host}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/events/${event._id}`}>
                        <Button className="flex-1" variant="outline">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* No Events */}
      {saberEvents.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No SABER Events Available</h3>
            <p className="text-gray-600">
              There are currently no SABER events scheduled. Check back later for updates.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
