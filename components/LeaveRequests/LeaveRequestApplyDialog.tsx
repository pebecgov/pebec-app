"use client";

import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LeaveRequestRichTextEditor } from "./LeaveRequestRichTextEditor";
import { countWorkingDays } from "@/lib/leaveWorkingDays";
import { getPublicHolidaysInRange } from "@/lib/publicHolidays";
import { wouldExceedLeaveAllowance } from "@/lib/leaveBalance";
import { LeaveBalanceAlert } from "./LeaveBalanceAlert";
import {
  LEAVE_APPROVER_DISPLAY_NAME,
  LEAVE_APPROVER_ROLE_LABEL,
} from "@/lib/leaveApprover";
import { toast } from "sonner";
import { Paperclip, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  mode?: "create" | "edit";
  editRequest?: {
    _id: Id<"leaveRequests">;
    subject: string;
    bodyHtml: string;
    startDate: string;
    endDate: string;
    workingDays?: number;
  } | null;
};

type PendingFile = {
  file: File;
  storageId?: Id<"_storage">;
  uploading?: boolean;
};

export function LeaveRequestApplyDialog({
  open,
  onClose,
  onSuccess,
  mode = "create",
  editRequest = null,
}: Props) {
  const balance = useQuery(api.leaveRequests.getLeaveBalance, {});
  const approver = useQuery(api.leaveRequests.getLeaveApproverDisplay, {});
  const submit = useMutation(api.leaveRequests.submitLeaveRequest);
  const updatePending = useMutation(api.leaveRequests.updateMyPendingLeaveRequest);
  const generateUploadUrl = useMutation(api.tickets.generateUploadUrl);

  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = mode === "edit" && !!editRequest;

  const existingRequestWorkingDays =
    isEdit && editRequest
      ? (editRequest.workingDays ??
        countWorkingDays(editRequest.startDate, editRequest.endDate))
      : 0;

  const effectivePendingDays = balance
    ? Math.max(0, balance.pending - existingRequestWorkingDays)
    : 0;

  const workingDaysPreview =
    startDate && endDate && endDate >= startDate ? countWorkingDays(startDate, endDate) : 0;

  const publicHolidaysInRange =
    startDate && endDate && endDate >= startDate
      ? getPublicHolidaysInRange(startDate, endDate)
      : [];

  const exceedsBalance =
    !!balance &&
    workingDaysPreview > 0 &&
    wouldExceedLeaveAllowance(
      balance.used,
      effectivePendingDays,
      workingDaysPreview,
      balance.annualAllowance,
    );

  const reset = () => {
    setSubject("");
    setBodyHtml("");
    setStartDate("");
    setEndDate("");
    setFiles([]);
  };

  useEffect(() => {
    if (!open) return;
    if (isEdit && editRequest) {
      setSubject(editRequest.subject);
      setBodyHtml(editRequest.bodyHtml || "");
      setStartDate(editRequest.startDate);
      setEndDate(editRequest.endDate);
      setFiles([]);
      return;
    }
    reset();
  }, [open, isEdit, editRequest]);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;
    setFiles((prev) => [...prev, ...picked.map((file) => ({ file }))]);
    e.target.value = "";
  };

  const uploadAll = async () => {
    const result: { storageId: Id<"_storage">; name: string }[] = [];
    for (const entry of files) {
      if (entry.storageId) {
        result.push({ storageId: entry.storageId, name: entry.file.name });
        continue;
      }
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": entry.file.type || "application/octet-stream" },
        body: entry.file,
      });
      if (!response.ok) throw new Error("Upload failed");
      const { storageId } = await response.json();
      result.push({ storageId: storageId as Id<"_storage">, name: entry.file.name });
    }
    return result;
  };

  const handleSubmit = async () => {
    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Start and end dates are required");
      return;
    }
    if (workingDaysPreview < 1) {
      toast.error("Leave must include at least one working day");
      return;
    }
    if (exceedsBalance && balance) {
      toast.error(
        `You cannot take ${workingDaysPreview} working day(s). Only ${balance.remaining} day(s) remain for ${balance.year} (maximum ${balance.annualAllowance} per year).`
      );
      return;
    }

    try {
      setSubmitting(true);
      if (isEdit && editRequest) {
        await updatePending({
          leaveRequestId: editRequest._id,
          subject: subject.trim(),
          bodyHtml,
          startDate,
          endDate,
        });
        toast.success("Leave request updated");
      } else {
        const uploaded = await uploadAll();
        await submit({
          subject: subject.trim(),
          bodyHtml,
          startDate,
          endDate,
          attachmentIds: uploaded.length ? uploaded.map((u) => u.storageId) : undefined,
          attachmentNames: uploaded.length ? uploaded.map((u) => u.name) : undefined,
        });
        toast.success("Leave request submitted");
      }
      reset();
      onClose();
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit leave request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit leave request" : "Apply for leave"}</DialogTitle>
        </DialogHeader>

        {balance && (
          <p className="text-sm text-muted-foreground">
            {balance.year}: {balance.remaining} of {balance.annualAllowance} working days remaining
            {balance.pending > 0 ? ` (${balance.pending} pending)` : ""}
          </p>
        )}

        <div className="space-y-4">
          <div className="rounded-md border bg-gray-50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">To ({approver?.roleLabel ?? LEAVE_APPROVER_ROLE_LABEL}): </span>
            <span className="font-medium">
              {approver?.name ?? LEAVE_APPROVER_DISPLAY_NAME}
            </span>
          </div>

          <div>
            <Label htmlFor="leave-subject">Subject</Label>
            <Input
              id="leave-subject"
              className="mt-1"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Leave application subject"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="leave-start">From (date)</Label>
              <Input
                id="leave-start"
                type="date"
                className="mt-1"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="leave-end">To (date)</Label>
              <Input
                id="leave-end"
                type="date"
                className="mt-1"
                min={startDate || undefined}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {workingDaysPreview > 0 && (
            <p className="text-sm text-gray-600">
              Working days in this request: <strong>{workingDaysPreview}</strong>
              <span className="text-muted-foreground">
                {" "}
                (weekends and public holidays excluded)
              </span>
            </p>
          )}
          {publicHolidaysInRange.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Public holidays in range (not counted):{" "}
              {publicHolidaysInRange
                .map((h) => `${h.localName} (${h.date})`)
                .join(", ")}
            </p>
          )}

          {balance && workingDaysPreview > 0 && (
            <LeaveBalanceAlert
              requestedDays={workingDaysPreview}
              used={balance.used}
              pending={effectivePendingDays}
              year={balance.year}
              annualAllowance={balance.annualAllowance}
            />
          )}

          <LeaveRequestRichTextEditor value={bodyHtml} onChange={setBodyHtml} />

          {!isEdit && (
            <div>
              <Label>Attachments</Label>
              <div className="mt-1 flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" asChild>
                  <label className="cursor-pointer">
                    <Paperclip className="mr-1 inline h-4 w-4" />
                    Add files
                    <input type="file" multiple className="hidden" onChange={handleFilePick} />
                  </label>
                </Button>
              </div>
              {files.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {files.map((f, i) => (
                    <li key={`${f.file.name}-${i}`} className="flex items-center justify-between text-sm">
                      <span>{f.file.name}</span>
                      <button
                        type="button"
                        className="text-gray-500 hover:text-red-600"
                        onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || exceedsBalance}>
            {submitting ? (isEdit ? "Saving…" : "Submitting…") : isEdit ? "Save changes" : "Submit request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
