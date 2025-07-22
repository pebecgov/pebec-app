// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { getTimeRemaining72HoursSkippingWeekends } from "@/lib/businessHours";

interface MiniCountdownProps {
  ticketCreatedAt: number;
  ticketReassignedAt?: number;
  ticketStatus: string;
}

export default function MiniCountdown({ 
  ticketCreatedAt, 
  ticketReassignedAt, 
  ticketStatus 
}: MiniCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isOverdue, setIsOverdue] = useState<boolean>(false);

  useEffect(() => {
    // Use reassignedAt if available, otherwise use createdAt
    const startTime = ticketReassignedAt || ticketCreatedAt;
    
    const updateCountdown = () => {
      const now = Date.now();
      const remaining = getTimeRemaining72HoursSkippingWeekends(startTime, now);
      const overdue = remaining <= 0;
      
      setTimeRemaining(remaining);
      setIsOverdue(overdue);
    };

    // Update immediately
    updateCountdown();

    // Update every 5 minutes for list view (less frequent than detail view)
    const interval = setInterval(updateCountdown, 300000);

    return () => clearInterval(interval);
  }, [ticketCreatedAt, ticketReassignedAt]);

  // Don't show for resolved/closed tickets
  if (ticketStatus === "resolved" || ticketStatus === "closed") {
    return <span className="text-xs text-gray-400">Completed</span>;
  }

  const formatTimeRemaining = (hours: number): string => {
    if (hours <= 0) return "0h";
    const wholeHours = Math.floor(hours);
    const minutes = Math.floor((hours - wholeHours) * 60);
    if (wholeHours >= 24) {
      const days = Math.floor(wholeHours / 24);
      const remainingHours = wholeHours % 24;
      return remainingHours > 0 ? `${days}d ${remainingHours}h ${minutes}m` : `${days}d`;
    }
    return `${wholeHours}h ${minutes}m`;
  };

  const getTextColor = () => {
    if (isOverdue) return "text-red-600";
    if (timeRemaining <= 4) return "text-orange-600";
    if (timeRemaining <= 12) return "text-yellow-600";
    return "text-blue-600";
  };

  const Icon = isOverdue ? AlertTriangle : Clock;

  return (
    <div className={`flex items-center gap-1 ${getTextColor()}`}>
      <Icon className="h-3 w-3" />
      <span className="text-xs font-mono">
        {isOverdue ? `+${formatTimeRemaining(Math.abs(timeRemaining))}` : formatTimeRemaining(timeRemaining)}
      </span>
    </div>
  );
} 