// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useEffect } from "react";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { addBusinessHours, getTimeRemaining72Hours, isOverdue72Hours } from "@/lib/businessHours";

interface TicketCountdownProps {
  ticketCreatedAt: number;
  ticketReassignedAt?: number;
  ticketStatus: string;
  className?: string;
}

export default function TicketCountdown({ 
  ticketCreatedAt, 
  ticketReassignedAt, 
  ticketStatus,
  className = ""
}: TicketCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isOverdue, setIsOverdue] = useState<boolean>(false);
  const [deadlineTime, setDeadlineTime] = useState<number>(0);

  useEffect(() => {
    // Use reassignedAt if available (when ticket was transferred), otherwise use createdAt
    const startTime = ticketReassignedAt || ticketCreatedAt;
    
    // Calculate deadline (72 business hours from start time)
    const deadline = addBusinessHours(startTime, 72);
    setDeadlineTime(deadline);

    const updateCountdown = () => {
      const now = Date.now();
      const remaining = getTimeRemaining72Hours(startTime, now);
      const overdue = isOverdue72Hours(startTime, now);
      
      setTimeRemaining(remaining);
      setIsOverdue(overdue);
    };

    // Update immediately
    updateCountdown();

    // Update every minute
    const interval = setInterval(updateCountdown, 60000);

    return () => clearInterval(interval);
  }, [ticketCreatedAt, ticketReassignedAt]);

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

  const formatTimeRemaining = (hours: number): string => {
    if (hours <= 0) return "0h 0m";
    
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    
    if (wholeHours === 0) {
      return `${minutes}m`;
    }
    
    if (minutes === 0) {
      return `${wholeHours}h`;
    }
    
    return `${wholeHours}h ${minutes}m`;
  };

  const formatDeadlineDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getCountdownColor = () => {
    if (isOverdue) return "border-red-200 bg-red-50";
    if (timeRemaining <= 4) return "border-orange-200 bg-orange-50"; // Less than 4 hours
    if (timeRemaining <= 12) return "border-yellow-200 bg-yellow-50"; // Less than 12 hours
    return "border-blue-200 bg-blue-50";
  };

  const getTextColor = () => {
    if (isOverdue) return "text-red-800";
    if (timeRemaining <= 4) return "text-orange-800";
    if (timeRemaining <= 12) return "text-yellow-800";
    return "text-blue-800";
  };

  const getIconColor = () => {
    if (isOverdue) return "text-red-600";
    if (timeRemaining <= 4) return "text-orange-600";
    if (timeRemaining <= 12) return "text-yellow-600";
    return "text-blue-600";
  };

  const Icon = isOverdue ? AlertTriangle : Clock;

  return (
    <div className={`flex items-center gap-3 p-4 border rounded-lg ${getCountdownColor()} ${className}`}>
      <Icon className={`h-6 w-6 ${getIconColor()}`} />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className={`text-sm font-semibold ${getTextColor()}`}>
            {isOverdue ? "Ticket Overdue" : "Ticket Countdown"}
          </h4>
          <span className={`text-lg font-mono font-bold ${getTextColor()}`}>
            {isOverdue ? `+${formatTimeRemaining(Math.abs(timeRemaining))}` : formatTimeRemaining(timeRemaining)}
          </span>
        </div>
        <div className="mt-1">
          <p className={`text-xs ${getTextColor()} opacity-75`}>
            {isOverdue 
              ? `Deadline was: ${formatDeadlineDate(deadlineTime)}`
              : `Deadline: ${formatDeadlineDate(deadlineTime)}`
            }
          </p>
          <p className={`text-xs ${getTextColor()} opacity-60 mt-1`}>
            * 72 hours from start of business hours (Mon-Fri, 9AM-5PM WAT)
          </p>
        </div>
      </div>
    </div>
  );
} 