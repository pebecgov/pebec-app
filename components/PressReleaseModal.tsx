"use client";

import { useState, useEffect } from "react";
import { XMarkIcon, CalendarIcon, MapPinIcon, PhoneIcon } from "@heroicons/react/24/outline";

export default function PressReleaseModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Show modal after a short delay when site loads
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 2000); // 2 second delay to let the site load

    return () => clearTimeout(timer);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
        
        {/* Modal panel */}
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
          {/* Close button */}
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              type="button"
              className="rounded-md bg-white text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={() => setIsOpen(false)}
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Modal content */}
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-blue-100 rounded-full sm:mx-0 sm:h-10 sm:w-10 mb-4">
                  <CalendarIcon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold leading-6 text-gray-900 sm:text-2xl">
                  IMPORTANT VENUE CHANGE
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  PRESS RELEASE - 26 November 2025
                </p>
              </div>

              {/* Main content */}
              <div className="space-y-4 text-sm text-gray-700">
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                  <h4 className="font-semibold text-blue-800 text-lg mb-2">
                    PEBEC Announces Change of Venue for the 2025 PEBEC Awards & Gala Night
                  </h4>
                </div>

                <p className="leading-relaxed">
                  The Presidential Enabling Business Environment Council (PEBEC) on behalf of His Excellency, 
                  the Vice President of Nigeria, Senator Kashim Shettima wishes to inform all invited guests, 
                  partners, awardees, and stakeholders of a change in venue for the upcoming PEBEC Awards & Gala Night.
                </p>

                {/* Venue change highlight */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <MapPinIcon className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-red-800 mb-1">Venue Change:</p>
                      <p className="text-red-700 line-through text-sm mb-1">
                        <strong>Originally:</strong> Bola Ahmed Tinubu Conference Center (Former International Conference Center), Abuja
                      </p>
                      <p className="text-green-700 font-semibold">
                        <strong>New Venue:</strong> Banquet Hall, State House, Abuja
                      </p>
                    </div>
                  </div>
                </div>

                {/* Event details */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <CalendarIcon className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-green-800 mb-2">Event Details:</p>
                      <ul className="space-y-1 text-green-700">
                        <li><strong>Date:</strong> Tuesday, 2nd December 2025</li>
                        <li><strong>Time:</strong> 5:00 PM</li>
                        <li><strong>Dress Code:</strong> Afro-Glam or Black-Tie</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <p className="leading-relaxed">
                  This decision follows an overwhelming level of interest and confirmation from stakeholders 
                  across government, the private sector, the diplomatic community, and development partners. 
                  To ensure a comfortable, secure, and seamless experience for all attendees, PEBEC has opted 
                  for a larger facility capable of accommodating the expanded guest list.
                </p>

                <p className="leading-relaxed">
                  The PEBEC Awards & Gala Night celebrates exceptional public service delivery, reform excellence, 
                  and collaborative efforts toward improving Nigeria's business environment. We look forward to 
                  hosting all our esteemed guests for an evening that highlights the very best of innovation, 
                  service, and impact.
                </p>


                {/* Signature */}
                <div className="border-t pt-4 mt-6">
                  <p className="font-semibold text-gray-800">Princess Zahrah Mustapha Audu</p>
                  <p className="text-gray-600 text-sm">Director General</p>
                  <p className="text-gray-600 text-sm">Presidential Enabling Business Environment Council (PEBEC)</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-6 sm:flex sm:flex-row-reverse gap-3">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:w-auto"
                  onClick={() => setIsOpen(false)}
                >
                  Understood
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                  onClick={() => {
                    // Copy to clipboard
                    const text = `PEBEC Awards & Gala Night - VENUE CHANGE
Date: Tuesday, 2nd December 2025, 5:00 PM
New Venue: Banquet Hall, State House, Abuja
Dress Code: Afro-Glam or Black-Tie
Contact: 0803 362 0898 or 0701 244 4706`;
                    navigator.clipboard.writeText(text);
                    alert('Event details copied to clipboard!');
                  }}
                >
                  📋 Copy Details
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
