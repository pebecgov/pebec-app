"use client";

import React from "react";
import Image from "next/image";

interface TicketProps {
  ticketNumber: string;
  eventName: string;
  eventDate: string;
  qrCodeUrl: string;
}

export default function TicketTemplate({ ticketNumber, eventName, eventDate, qrCodeUrl }: TicketProps) {
  return (
    <div id="ticket-template" className="relative w-[600px] h-[280px] bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200">
      {/* Background Decoration */}
      <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-green-800 opacity-10"></div>

      {/* Left Section */}
      <div className="flex h-full">
        <div className="w-2/3 p-6">
          <h2 className="text-xl font-semibold text-gray-900">{eventName}</h2>
          <p className="text-sm text-gray-600 mt-1">Date: {eventDate}</p>
          <p className="text-sm text-gray-600 mt-1">Ticket No: {ticketNumber}</p>

          {/* Barcode Placeholder */}
          <div className="mt-4">
            <Image src={qrCodeUrl} alt="QR Code" width={80} height={80} className="border rounded-md" />
          </div>
        </div>

        {/* Right Section - Tear-off Design */}
        <div className="w-1/3 bg-gray-100 flex flex-col items-center justify-center border-l border-gray-300">
          <p className="text-xs text-gray-500">SCAN TO VALIDATE</p>
          <Image src={qrCodeUrl} alt="QR Code" width={100} height={100} className="border rounded-md" />
        </div>
      </div>
    </div>
  );
}
