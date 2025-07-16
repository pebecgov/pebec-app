"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { addBusinessHours } from "@/lib/businessHours";

function getDeadline(startTime: number): number {
  return addBusinessHours(startTime, 72); // 72 hours
}

function formatTimeLeft(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours < 0 || minutes < 0) return "0h 0m left";
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h ${minutes}m left`;
  }
  return `${hours}h ${minutes}m left`;
}

interface TicketCountdownProps {
  ticketCreatedAt: number;
  ticketReassignedAt?: number;
  ticketStatus: string;
}

export function TicketCountdown({
  ticketCreatedAt,
  ticketReassignedAt,
  ticketStatus
}: TicketCountdownProps) {
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