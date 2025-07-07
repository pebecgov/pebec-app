// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useEffect } from "react";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { addBusinessHours, skipWeekendsHours } from "@/lib/businessHours";

interface TicketCountdownProps {
  ticketCreatedAt: number;
  ticketReassignedAt?: number;
  ticketStatus: string;
  extensionRequest?: {
    requestedAt: number;
    requestedDays: number;
    status: "pending" | "approved" | "rejected";
    includeWeekends: boolean;
  };
  className?: string;
}

export function TicketCountdown({ 
  ticketCreatedAt, 
  ticketReassignedAt, 
  ticketStatus,
  extensionRequest,
  className = ""
}: TicketCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isOverdue, setIsOverdue] = useState<boolean>(false);
  const [deadlineTime, setDeadlineTime] = useState<number>(0);

  useEffect(() => {
    // Use reassignedAt if available (when ticket was transferred), otherwise use createdAt
    const startTime = ticketReassignedAt || ticketCreatedAt;
    
    // Calculate base deadline (72 business hours from start time)
    let deadline = addBusinessHours(startTime, 72);

    // If there's an approved extension, add the extra time
    if (extensionRequest?.status === "approved") {
      const extraHours = extensionRequest.requestedDays * 24;
      if (extensionRequest.includeWeekends) {
        deadline += extraHours * 60 * 60 * 1000; // Convert hours to milliseconds
      } else {
        deadline = addBusinessHours(deadline, extraHours);
      }
    }

    setDeadlineTime(deadline);

    const updateCountdown = () => {
      const now = Date.now();
      const hoursRemaining = skipWeekendsHours(
        now, 
        deadline, 
        extensionRequest?.status === "approved" && extensionRequest.includeWeekends
      );
      
      setTimeRemaining(hoursRemaining);
      setIsOverdue(hoursRemaining <= 0);
    };

    // Update immediately
    updateCountdown();

    // Update every minute
    const interval = setInterval(updateCountdown, 60000);

    return () => clearInterval(interval);
  }, [ticketCreatedAt, ticketReassignedAt, extensionRequest]);

  // Don't show countdown for resolved/closed tickets
  if (ticketStatus === "resolved" || ticketStatus === "closed") {
    return (
      <div className={`flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg ${className}`}>
        <CheckCircle className="h-5 w-5 text-green-600" />
        <div>
          <p className="text-sm font-medium text-green-800">Ticket Completed</p>
          <p className="text-xs text-green-600">SLA monitoring stopped</p>
        </div>
      </div>
    );
  }

  // Show extension request status if one exists
  if (extensionRequest?.status === "pending") {
    return (
      <div className={`flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
        <Clock className="h-5 w-5 text-yellow-600" />
        <div>
          <p className="text-sm font-medium text-yellow-800">Extension Requested</p>
          <p className="text-xs text-yellow-600">
            Waiting for admin approval ({extensionRequest.requestedDays} days)
          </p>
        </div>
      </div>
    );
  }

  // Show countdown with extension info if approved
  return (
    <div className={`flex items-center gap-2 p-3 ${isOverdue ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'} rounded-lg ${className}`}>
      {isOverdue ? (
        <AlertTriangle className="h-5 w-5 text-red-600" />
      ) : (
        <Clock className="h-5 w-5 text-blue-600" />
      )}
      <div>
        <p className={`text-sm font-medium ${isOverdue ? 'text-red-800' : 'text-blue-800'}`}>
          {isOverdue ? 'Overdue' : 'Time Remaining'}
        </p>
        <p className={`text-xs ${isOverdue ? 'text-red-600' : 'text-blue-600'}`}>
          {extensionRequest?.status === "approved" && (
            <span>Extended (+{extensionRequest.requestedDays} days{extensionRequest.includeWeekends ? ', incl. weekends' : ''}) • </span>
          )}
          {Math.abs(Math.ceil(timeRemaining))} hours {isOverdue ? 'overdue' : 'left'}
        </p>
      </div>
    </div>
  );
} 