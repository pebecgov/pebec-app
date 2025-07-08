// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useEffect } from "react";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { addBusinessHours, skipWeekendsHours } from "@/lib/businessHours";

function getDeadline(startTime: number): number {
  return addBusinessHours(startTime, 72); // 72 business hours (3 days)
}

function formatTimeLeft(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  return `${hours} hours left`;
}

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
  ticketStatus
}: {
  ticketCreatedAt: number;
  ticketReassignedAt?: number;
  ticketStatus: string;
}) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const startTime = ticketReassignedAt || ticketCreatedAt;
      const deadline = getDeadline(startTime);
      const now = Date.now();
      const diff = deadline - now;

      if (diff <= 0 && ticketStatus !== "resolved" && ticketStatus !== "closed") {
        setIsOverdue(true);
        setTimeLeft("Overdue");
        return;
      }

      setIsOverdue(false);
      setTimeLeft(formatTimeLeft(diff));
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [ticketCreatedAt, ticketReassignedAt, ticketStatus]);

  if (ticketStatus === "resolved" || ticketStatus === "closed") {
    return null;
  }

  return (
    <div className={`inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
      <Clock className="h-4 w-4" />
      <span>{timeLeft}</span>
    </div>
  );
} 