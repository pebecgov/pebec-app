"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";

type Props = {
  leaveRequestId: Id<"leaveRequests"> | null;
  open: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  canReviewLeave?: boolean;
  onReviewed?: () => void;
};

function statusBadge(status: string) {
  if (status === "approved") return <Badge className="bg-green-600">Approved</Badge>;
  if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

export function LeaveRequestDetailDialog({
  leaveRequestId,
  open,
  onClose,
  isAdmin,
  canReviewLeave = false,
  onReviewed,
}: Props) {
  const detail = useQuery(
    api.leaveRequests.getLeaveRequest,
    leaveRequestId ? { leaveRequestId } : "skip"
  );
  const review = useMutation(api.leaveRequests.reviewLeaveRequest);
  const [reviewNote, setReviewNote] = useState("");
  const [busy, setBusy] = useState(false);

  const handleReview = async (decision: "approved" | "rejected") => {
    if (!leaveRequestId) return;
    try {
      setBusy(true);
      await review({ leaveRequestId, decision, reviewNote: reviewNote || undefined });
      toast.success(decision === "approved" ? "Leave approved — absence notice created" : "Leave rejected");
      setReviewNote("");
      onReviewed?.();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Review failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            {detail?.subject ?? "Leave request"}
            {detail && statusBadge(detail.status)}
          </DialogTitle>
        </DialogHeader>

        {!detail ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium text-gray-700">Applicant</span>
                <p>{detail.applicantName}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Working days</span>
                <p>{detail.workingDays}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Dates</span>
                <p>
                  {detail.startDate} → {detail.endDate}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Year</span>
                <p>{detail.leaveYear}</p>
              </div>
            </div>

            <div>
              <span className="font-medium text-gray-700">To</span>
              <p>{detail.toUsers.map((u) => u.name).join(", ") || "—"}</p>
            </div>
            {detail.ccUsers.length > 0 && (
              <div>
                <span className="font-medium text-gray-700">CC</span>
                <p>{detail.ccUsers.map((u) => u.name).join(", ")}</p>
              </div>
            )}

            <div>
              <span className="font-medium text-gray-700">Message</span>
              <div
                className="prose prose-sm mt-1 max-w-none rounded border bg-gray-50 p-3"
                dangerouslySetInnerHTML={{ __html: detail.bodyHtml || "<p>—</p>" }}
              />
            </div>

            {detail.attachments?.length > 0 && (
              <div>
                <span className="font-medium text-gray-700">Attachments</span>
                <ul className="mt-1 list-disc pl-5">
                  {detail.attachments.map((a) => (
                    <li key={a.storageId}>
                      {a.url ? (
                        <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {a.name}
                        </a>
                      ) : (
                        a.name
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {detail.status === "approved" && detail.holidayAnnouncementId && (
              <p className="rounded bg-green-50 p-2 text-green-800">
                An absence notice was created automatically. View it under{" "}
                <Link
                  href={isAdmin ? "/admin/holiday-whereabout" : "/staff/holiday-whereabout"}
                  className="underline font-medium"
                >
                  Absence Notice
                </Link>
                .
              </p>
            )}

            {detail.reviewedAt && (
              <div className="rounded border p-2 text-gray-600">
                Reviewed by {detail.reviewedByName} on{" "}
                {new Date(detail.reviewedAt).toLocaleString()}
                {detail.reviewNote ? (
                  <>
                    <br />
                    Note: {detail.reviewNote}
                  </>
                ) : null}
              </div>
            )}

            {canReviewLeave && detail.status === "pending" && (
              <div>
                <Label htmlFor="review-note">Review note (optional)</Label>
                <Textarea
                  id="review-note"
                  className="mt-1"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Optional message to the applicant"
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {canReviewLeave && detail?.status === "pending" && (
            <>
              <Button variant="destructive" disabled={busy} onClick={() => handleReview("rejected")}>
                Reject
              </Button>
              <Button disabled={busy} onClick={() => handleReview("approved")}>
                Approve
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
