"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type LeavePeriod = {
  subject: string;
  startDate: string;
  endDate: string;
  workingDays: number;
};

type StaffWithLeaves = {
  userId: string;
  name: string;
  email?: string;
  leaves: LeavePeriod[];
};

type StaffSimple = {
  userId: string;
  name: string;
  email?: string;
};

export type OverviewModalKey =
  | "onLeaveNow"
  | "upcomingLeave"
  | "pendingReview"
  | "notOnLeave"
  | null;

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  staffWithLeaves?: StaffWithLeaves[];
  staffSimple?: StaffSimple[];
  emptyMessage?: string;
};

export function LeaveOverviewStaffDialog({
  open,
  onClose,
  title,
  staffWithLeaves,
  staffSimple,
  emptyMessage = "No staff in this group.",
}: Props) {
  const list = staffWithLeaves ?? [];
  const simple = staffSimple ?? [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {list.length === 0 && simple.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">{emptyMessage}</p>
        )}

        {list.length > 0 && (
          <ul className="space-y-4">
            {list.map((staff) => (
              <li
                key={staff.userId}
                className="rounded-lg border border-gray-200 bg-gray-50/50 p-3"
              >
                <div className="mb-2">
                  <p className="font-medium text-gray-900">{staff.name}</p>
                  {staff.email && (
                    <p className="text-xs text-muted-foreground">{staff.email}</p>
                  )}
                  {staff.leaves.length > 1 && (
                    <p className="mt-1 text-xs text-amber-700">
                      {staff.leaves.length} leave periods
                    </p>
                  )}
                </div>
                <ul className="space-y-2 border-t border-gray-200 pt-2">
                  {staff.leaves.map((leave, i) => (
                    <li key={i} className="text-sm text-gray-700">
                      <span className="font-medium">{leave.subject}</span>
                      <br />
                      <span className="text-muted-foreground">
                        {leave.startDate} → {leave.endDate} · {leave.workingDays} working day
                        {leave.workingDays !== 1 ? "s" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}

        {simple.length > 0 && (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {simple.map((staff) => (
              <li
                key={staff.userId}
                className="flex flex-col px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium text-gray-900">{staff.name}</span>
                {staff.email && (
                  <span className="text-sm text-muted-foreground">{staff.email}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
