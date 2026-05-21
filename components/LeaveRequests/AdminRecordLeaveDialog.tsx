"use client";

import { useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeaveRequestRichTextEditor } from "./LeaveRequestRichTextEditor";
import { LeaveBalanceAlert } from "./LeaveBalanceAlert";
import { countWorkingDays, yearFromDate } from "@/lib/leaveWorkingDays";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function AdminRecordLeaveDialog({ open, onClose, onSuccess }: Props) {
  const staffList = useQuery(api.leaveRequests.listStaffMembersForLeave, {});
  const recordLeave = useMutation(api.leaveRequests.adminRecordStaffLeave);

  const [staffUserId, setStaffUserId] = useState<Id<"users"> | "">("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const leaveYear = startDate ? yearFromDate(startDate) : new Date().getFullYear();
  const balance = useQuery(
    api.leaveRequests.getLeaveBalanceForUser,
    staffUserId ? { userId: staffUserId as Id<"users">, year: leaveYear } : "skip"
  );

  const workingDaysPreview =
    startDate && endDate && endDate >= startDate ? countWorkingDays(startDate, endDate) : 0;

  const exceedsBalance = useMemo(() => {
    if (!balance || workingDaysPreview < 1) return false;
    return balance.used + balance.pending + workingDaysPreview > balance.annualAllowance;
  }, [balance, workingDaysPreview]);

  const reset = () => {
    setStaffUserId("");
    setSubject("");
    setBodyHtml("");
    setStartDate("");
    setEndDate("");
    setReviewNote("");
  };

  const handleSubmit = async () => {
    if (!staffUserId) {
      toast.error("Select a staff member");
      return;
    }
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
        `Cannot record leave: ${balance.userName} would exceed ${balance.annualAllowance} working days for ${balance.year}.`
      );
      return;
    }

    try {
      setSubmitting(true);
      await recordLeave({
        staffUserId: staffUserId as Id<"users">,
        subject: subject.trim(),
        bodyHtml,
        startDate,
        endDate,
        reviewNote: reviewNote.trim() || undefined,
      });
      toast.success("Leave recorded and absence notice created");
      reset();
      onClose();
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to record leave");
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
          <DialogTitle>Record staff leave</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Assign leave to a staff member on the website. It deducts from their 20 working-day allowance
          and creates an absence notice automatically.
        </p>

        <div className="space-y-4">
          <div>
            <Label>Staff member</Label>
            <Select
              value={staffUserId || undefined}
              onValueChange={(v) => setStaffUserId(v as Id<"users">)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select staff…" />
              </SelectTrigger>
              <SelectContent>
                {staffList?.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name} ({s.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {balance && (
            <p className="rounded-md border bg-gray-50 p-3 text-sm">
              <strong>{balance.userName}</strong> — {balance.year}: {balance.remaining} of{" "}
              {balance.annualAllowance} working days remaining
              {balance.pending > 0 ? ` (${balance.pending} pending)` : ""}
            </p>
          )}

          <div>
            <Label htmlFor="admin-leave-subject">Subject</Label>
            <Input
              id="admin-leave-subject"
              className="mt-1"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="admin-leave-start">Start date</Label>
              <Input
                id="admin-leave-start"
                type="date"
                className="mt-1"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="admin-leave-end">End date</Label>
              <Input
                id="admin-leave-end"
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
              Working days: <strong>{workingDaysPreview}</strong>
            </p>
          )}

          {balance && workingDaysPreview > 0 && (
            <LeaveBalanceAlert
              requestedDays={workingDaysPreview}
              used={balance.used}
              pending={balance.pending}
              year={balance.year}
              staffName={balance.userName}
            />
          )}

          <LeaveRequestRichTextEditor value={bodyHtml} onChange={setBodyHtml} label="Notes (optional)" />

          <div>
            <Label htmlFor="admin-leave-note">Admin note (optional)</Label>
            <Textarea
              id="admin-leave-note"
              className="mt-1"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || exceedsBalance}>
            {submitting ? "Saving…" : "Record leave"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
