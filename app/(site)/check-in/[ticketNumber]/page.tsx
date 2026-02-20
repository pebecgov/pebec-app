"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle, XCircle, User, Mail, Phone, Building, Briefcase, Calendar, MapPin, Clock, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function CheckInPage() {
  const params = useParams();
  const ticketNumber = params.ticketNumber as string;
  const registration = useQuery(api.events.getEventRegistration, ticketNumber ? { ticketNumber } : "skip");
  const checkInMutation = useMutation(api.events.checkInAttendee);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const handleCheckIn = async () => {
    if (!ticketNumber) return;
    setIsCheckingIn(true);
    try {
      await checkInMutation({ ticketNumber });
      toast.success("Attendee checked in successfully!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to check in";
      toast.error(msg);
    } finally {
      setIsCheckingIn(false);
    }
  };

  if (!ticketNumber) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Ticket</h1>
          <p className="text-gray-600">No ticket number provided.</p>
        </div>
      </div>
    );
  }

  if (registration === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ticket information...</p>
        </div>
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ticket Not Found</h1>
          <p className="text-gray-600">The ticket number "{ticketNumber}" could not be found.</p>
        </div>
      </div>
    );
  }

  const isCheckedIn = !!registration.checkedInAt;
  const event = registration.event;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Event Check-In</h1>
            {isCheckedIn ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-6 h-6" />
                <span className="font-semibold">Checked In</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-500">
                <XCircle className="w-6 h-6" />
                <span className="font-semibold">Not Checked In</span>
              </div>
            )}
          </div>
          {isCheckedIn && registration.checkedInAt && (
            <p className="text-sm text-gray-600">
              Checked in at: {format(new Date(registration.checkedInAt), "PPpp")}
            </p>
          )}
        </div>

        {/* Event Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{event.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Event Date</p>
                <p className="font-medium">{event.eventDate ? format(new Date(event.eventDate), "PP") : "TBD"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Event Time</p>
                <p className="font-medium">
                  {event.eventDate ? format(new Date(event.eventDate), "p") : "TBD"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium">{event.location || "TBD"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Host</p>
                <p className="font-medium">{event.host || "PEBEC"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Attendee Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Attendee Information</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Ticket className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Ticket Number</p>
                <p className="font-mono font-semibold text-lg">{registration.ticketNumber}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">
                  {registration.firstName} {registration.lastName}
                </p>
              </div>
            </div>
            {registration.email && (
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{registration.email}</p>
                </div>
              </div>
            )}
            {registration.phone && (
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{registration.phone}</p>
                </div>
              </div>
            )}
            {registration.organization && (
              <div className="flex items-start gap-3">
                <Building className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Organization</p>
                  <p className="font-medium">{registration.organization}</p>
                </div>
              </div>
            )}
            {registration.designation && (
              <div className="flex items-start gap-3">
                <Briefcase className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Designation</p>
                  <p className="font-medium">{registration.designation}</p>
                </div>
              </div>
            )}
            {registration.isVip && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                VIP Attendee
              </div>
            )}
          </div>
        </div>

        {/* Form Responses (if special event) */}
        {registration.structuredResponses && Object.keys(registration.structuredResponses).length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Form Responses</h2>
            <div className="space-y-3">
              {Object.entries(registration.structuredResponses).map(([questionId, data]: [string, any]) => {
                const answer = data?.answer;
                const questionText = data?.questionText || registration.questions?.find((q: any) => q._id === questionId)?.questionText || "Question";
                return (
                  <div key={questionId} className="border-l-4 border-green-500 pl-4">
                    <p className="text-sm font-medium text-gray-700">{questionText}</p>
                    <p className="text-gray-900 mt-1">
                      {Array.isArray(answer) ? answer.join(", ") : answer || "No answer"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Check In Button */}
        {!isCheckedIn && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <Button
              onClick={handleCheckIn}
              disabled={isCheckingIn}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-semibold"
            >
              {isCheckingIn ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2 inline-block"></div>
                  Checking In...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Check In Attendee
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
