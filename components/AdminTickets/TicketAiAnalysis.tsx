// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type TicketAiFields = {
  ticketNumber?: string;
  assignedMDAName?: string;
  aiStatus?: "pending" | "queued" | "processing" | "done";
  aiResult?: "MATCH" | "WRONG_MDA" | "IRRELEVANT";
  explanation?: string;
  nextSteps?: string;
  aiConfidence?: number;
  processedAt?: number;
};

function formatConfidence(value?: number): string | null {
  if (value == null || Number.isNaN(value)) return null;
  const pct = value <= 1 ? Math.round(value * 100) : Math.round(value);
  return `${pct}%`;
}

function getAiResultStyles(result?: TicketAiFields["aiResult"]) {
  switch (result) {
    case "MATCH":
      return "bg-green-100 text-green-800 border-green-400";
    case "WRONG_MDA":
      return "bg-amber-100 text-amber-900 border-amber-400";
    case "IRRELEVANT":
      return "bg-red-100 text-red-800 border-red-400";
    default:
      return "bg-gray-100 text-gray-700 border-gray-300";
  }
}

function getAiResultLabel(result?: TicketAiFields["aiResult"]) {
  switch (result) {
    case "MATCH":
      return "Match";
    case "WRONG_MDA":
      return "Wrong MDA";
    case "IRRELEVANT":
      return "Irrelevant";
    default:
      return "—";
  }
}

function getAiStatusStyles(status?: TicketAiFields["aiStatus"]) {
  switch (status) {
    case "pending":
      return "bg-slate-100 text-slate-700 border-slate-300";
    case "queued":
      return "bg-blue-50 text-blue-800 border-blue-300";
    case "processing":
      return "bg-violet-50 text-violet-800 border-violet-300";
    case "done":
      return "";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function getAiStatusLabel(status?: TicketAiFields["aiStatus"]) {
  switch (status) {
    case "pending":
      return "Pending";
    case "queued":
      return "Queued";
    case "processing":
      return "Analyzing";
    case "done":
      return "";
    default:
      return "Not started";
  }
}

export default function TicketAiAnalysis({ ticket }: { ticket: TicketAiFields }) {
  const isDone = ticket.aiStatus === "done" && !!ticket.aiResult;
  const confidence = formatConfidence(ticket.aiConfidence);
  const canViewDetails = isDone;

  return (
    <div className="flex w-full min-w-[140px] items-center justify-between gap-2">
      {isDone ? (
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
            getAiResultStyles(ticket.aiResult)
          )}
          title={ticket.explanation}
        >
          {getAiResultLabel(ticket.aiResult)}
        </span>
      ) : (
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
            getAiStatusStyles(ticket.aiStatus)
          )}
        >
          {ticket.aiStatus === "processing" && (
            <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
          )}
          {getAiStatusLabel(ticket.aiStatus)}
        </span>
      )}

      {canViewDetails ? (
        <Dialog>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-auto h-8 w-8 shrink-0 text-gray-600 hover:text-green-700"
              aria-label="View AI analysis details"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>AI analysis</DialogTitle>
              <DialogDescription>
                {ticket.ticketNumber
                  ? `Report ${ticket.ticketNumber}`
                  : "Automated routing review"}
                {ticket.assignedMDAName ? ` · Assigned MDA: ${ticket.assignedMDAName}` : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                    getAiResultStyles(ticket.aiResult)
                  )}
                >
                  {getAiResultLabel(ticket.aiResult)}
                </span>
                {confidence && (
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                    Confidence: {confidence}
                  </span>
                )}
                {ticket.processedAt && (
                  <span className="text-xs text-gray-500">
                    Processed{" "}
                    {new Date(ticket.processedAt).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
              {ticket.explanation?.trim() && (
                <div>
                  <p className="mb-1 font-medium text-gray-900">Explanation</p>
                  <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-gray-700">
                    {ticket.explanation}
                  </p>
                </div>
              )}
              {ticket.nextSteps?.trim() && (
                <div>
                  <p className="mb-1 font-medium text-gray-900">Suggested next steps</p>
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950">
                    {ticket.nextSteps}
                  </p>
                </div>
              )}
              {!ticket.explanation?.trim() && !ticket.nextSteps?.trim() && !confidence && (
                <p className="text-gray-500">No additional narrative was returned for this analysis.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <span className="h-8 w-8 shrink-0" aria-hidden />
      )}
    </div>
  );
}
