// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Loader2, ArrowRightLeft } from "lucide-react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AssistantMarkdown } from "@/components/AiCustomerSupport/AssistantMarkdown";

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

type MdaOption = {
  _id: string;
  name: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The AI has no structured "suggested MDA" field, so detect it from the narrative text.
 * MDA names look like "FAAN - Federal Airports Authority of Nigeria", while the AI text
 * may only mention the acronym ("FAAN") or the full name — so match against both parts.
 */
function detectSuggestedMda(
  ticket: TicketAiFields,
  mdaList: MdaOption[]
): string | undefined {
  const haystack = `${ticket.nextSteps ?? ""} ${ticket.explanation ?? ""}`.trim();
  if (!haystack) return undefined;
  const lower = haystack.toLowerCase();

  let best: string | undefined;
  let bestScore = 0;

  for (const mda of mdaList) {
    const name = mda.name?.trim();
    if (!name) continue;
    if (name.toLowerCase() === ticket.assignedMDAName?.toLowerCase()) continue;

    // Candidate strings to match: the full name plus each part around a dash separator.
    const parts = name
      .split(/\s*[-–—:]\s*/)
      .map((p) => p.trim())
      .filter(Boolean);
    const candidates = Array.from(new Set([name, ...parts]));

    for (const candidate of candidates) {
      const c = candidate.toLowerCase();
      if (c.length < 3) continue;

      // Short all-letter tokens are acronyms — require word boundaries to avoid false hits.
      const isAcronym = /^[a-z]{2,7}$/.test(c);
      const matched = isAcronym
        ? new RegExp(`\\b${escapeRegExp(c)}\\b`, "i").test(haystack)
        : lower.includes(c);

      if (matched && candidate.length > bestScore) {
        best = name;
        bestScore = candidate.length;
      }
    }
  }

  return best;
}

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

export default function TicketAiAnalysis({
  ticket,
  ticketId,
  mdaList = [],
}: {
  ticket: TicketAiFields;
  ticketId?: Id<"tickets">;
  mdaList?: MdaOption[];
}) {
  const isDone = ticket.aiStatus === "done" && !!ticket.aiResult;
  const confidence = formatConfidence(ticket.aiConfidence);
  const canViewDetails = isDone;

  const assignMDA = useMutation(api.tickets.assignTicketMDA);
  const [open, setOpen] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);

  const sortedMdas = useMemo(
    () =>
      mdaList
        .filter((mda) => mda.name && mda.name.trim() !== "")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [mdaList]
  );

  const suggestedMda = useMemo(
    () => detectSuggestedMda(ticket, sortedMdas),
    [ticket, sortedMdas]
  );

  const canReassign = !!ticketId && sortedMdas.length > 0;
  const [selectedMda, setSelectedMda] = useState<string>("");

  useEffect(() => {
    if (open) {
      setSelectedMda(suggestedMda ?? ticket.assignedMDAName ?? "");
    }
  }, [open, suggestedMda, ticket.assignedMDAName]);

  const handleReassign = async () => {
    if (!ticketId || !selectedMda) return;
    const mdaRecord = sortedMdas.find((mda) => mda.name === selectedMda);
    if (!mdaRecord) {
      toast.error("MDA not found.");
      return;
    }
    setIsReassigning(true);
    try {
      await assignMDA({
        ticketId,
        mdaId: mdaRecord._id as Id<"mdas">,
        // Admin corrected the routing — mark the AI flag as MATCH in the DB (no AI re-run).
        markAiMatch: ticket.aiResult !== "MATCH",
      });
      toast.success(`Report reassigned to ${selectedMda}.`);
      setOpen(false);
    } catch {
      toast.error("Failed to reassign MDA.");
    } finally {
      setIsReassigning(false);
    }
  };

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
        <Dialog open={open} onOpenChange={setOpen}>
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
          <DialogContent className="max-w-[calc(100vw-2rem)] overflow-x-hidden sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>AI analysis</DialogTitle>
              <DialogDescription className="break-words">
                {ticket.ticketNumber
                  ? `Report ${ticket.ticketNumber}`
                  : "Automated routing review"}
                {ticket.assignedMDAName ? ` · Assigned MDA: ${ticket.assignedMDAName}` : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 overflow-x-hidden break-words text-sm">
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
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-gray-700">
                    <AssistantMarkdown content={ticket.explanation} />
                  </div>
                </div>
              )}
              {ticket.nextSteps?.trim() && (
                <div>
                  <p className="mb-1 font-medium text-gray-900">Suggested next steps</p>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950">
                    <AssistantMarkdown content={ticket.nextSteps} />
                  </div>
                </div>
              )}
              {!ticket.explanation?.trim() && !ticket.nextSteps?.trim() && !confidence && (
                <p className="text-gray-500">No additional narrative was returned for this analysis.</p>
              )}

              {canReassign && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="mb-1 flex items-center gap-2 font-medium text-gray-900">
                    <ArrowRightLeft className="h-4 w-4 text-green-700" aria-hidden />
                    Reassign MDA
                  </div>
                  <p className="mb-2 text-xs text-gray-500">
                    {suggestedMda
                      ? "The MDA suggested by the AI is selected below. Change it if needed, then confirm."
                      : "Select the correct MDA for this report, then confirm."}
                  </p>
                  <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                    <Select value={selectedMda} onValueChange={setSelectedMda}>
                      <SelectTrigger className="w-full min-w-0 flex-1 [&>span]:truncate">
                        <SelectValue placeholder="Select an MDA" />
                      </SelectTrigger>
                      <SelectContent className="max-w-[min(90vw,24rem)]">
                        {sortedMdas.map((mda) => (
                          <SelectItem key={mda._id} value={mda.name}>
                            <span className="block truncate">
                              {mda.name}
                              {mda.name === suggestedMda ? " (AI suggested)" : ""}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      onClick={handleReassign}
                      disabled={
                        !selectedMda ||
                        isReassigning ||
                        selectedMda === ticket.assignedMDAName
                      }
                      className="w-full shrink-0 bg-green-600 text-white hover:bg-green-700 sm:w-auto"
                    >
                      {isReassigning ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      ) : null}
                      Change MDA
                    </Button>
                  </div>
                  {selectedMda && selectedMda === ticket.assignedMDAName && (
                    <p className="mt-2 text-xs text-amber-600">
                      This is the MDA the report is already assigned to.
                    </p>
                  )}
                </div>
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
