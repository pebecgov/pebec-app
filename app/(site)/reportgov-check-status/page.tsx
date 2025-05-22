// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import { FaSearch } from "react-icons/fa";
export default function CheckStatusPage() {
  const [ticketNumber, setTicketNumber] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const isValid = ticketNumber && contactInfo;
  const isEmail = contactInfo.includes("@");
  const ticket = useQuery(api.tickets.getPublicTicketByReference, submitted && isValid ? {
    ticketNumber,
    email: isEmail ? contactInfo : undefined,
    phoneNumber: !isEmail ? contactInfo : undefined
  } : "skip");
  useEffect(() => {
    if (!isValid) {
      setSubmitted(false);
      setLoading(false);
    } else if (submitted) {
      setLoading(ticket === undefined);
    }
  }, [ticket, isValid, submitted]);
  const handleSearch = () => {
    if (!isValid) return;
    setSubmitted(true);
    setLoading(true);
  };
  return <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-16 px-6 mt-25">
      <div className="max-w-6xl mx-auto bg-white shadow-xl rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        
        {}
        <div className="p-10 md:p-14 flex flex-col justify-center">
          <div className="mb-8 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
              Check Complaint Status
            </h1>
            <p className="mt-2 text-gray-600 text-sm">
              Enter your ticket number and either your email or phone number to track your complaint.
            </p>
          </div>

          <div className="space-y-4">
            <Input placeholder="Ticket Number (e.g. REP-23456)" value={ticketNumber} onChange={e => setTicketNumber(e.target.value)} />
            <Input placeholder="Email or Phone Number" value={contactInfo} onChange={e => setContactInfo(e.target.value)} />
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2" onClick={handleSearch} disabled={!isValid}>
              <FaSearch className="w-4 h-4" />
              Search
            </Button>
          </div>

          {}
          {loading && <p className="mt-4 text-sm text-gray-500 animate-pulse text-center md:text-left">
              Searching for your complaint...
            </p>}

          {}
          {submitted && !loading && ticket === null && <p className="mt-4 text-sm text-red-500 font-medium text-center md:text-left">
              No ticket found with those details.
            </p>}

          {}
          {ticket && <div className="mt-6 bg-gray-50 p-5 rounded-lg border text-sm text-gray-700 space-y-1">
              <p><strong>Ticket:</strong> #{ticket.ticketNumber}</p>
              <p><strong>Status:</strong> <span className="capitalize text-blue-600">{ticket.status}</span></p>
              <p><strong>MDA:</strong> {ticket.assignedMDAName || "Unassigned"}</p>
              <p><strong>Date:</strong> {new Date(ticket.createdAt).toLocaleDateString()}</p>

              <Link href={`/reportgov-guest/tickets/${ticket._id}`} className="inline-block mt-3 text-blue-600 hover:underline font-medium">
                View Full Ticket →
              </Link>
            </div>}
        </div>

        {}
        <div className="hidden md:flex items-center justify-center bg-blue-100">
          <img src="/images/check_status.svg" alt="Status Illustration" className="max-w-md object-contain p-10" />
        </div>
      </div>
    </div>;
}