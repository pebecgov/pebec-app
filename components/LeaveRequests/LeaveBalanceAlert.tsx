"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { leaveAllowanceExceededMessage, wouldExceedLeaveAllowance } from "@/lib/leaveBalance";
import { ANNUAL_LEAVE_WORKING_DAYS } from "@/lib/leaveWorkingDays";

type Props = {
  requestedDays: number;
  used: number;
  pending: number;
  year: number;
  staffName?: string;
};

export function LeaveBalanceAlert({ requestedDays, used, pending, year, staffName }: Props) {
  if (requestedDays < 1) return null;
  if (!wouldExceedLeaveAllowance(used, pending, requestedDays)) return null;

  const message = leaveAllowanceExceededMessage(requestedDays, used, pending, year);

  return (
    <Alert variant="destructive" className="border-red-300 bg-red-50">
      <ExclamationTriangleIcon className="h-4 w-4" />
      <AlertTitle>
        {staffName ? `${staffName} cannot take this leave` : "Leave exceeds your annual allowance"}
      </AlertTitle>
      <AlertDescription>
        {message} No one may exceed {ANNUAL_LEAVE_WORKING_DAYS} working days of leave per year.
      </AlertDescription>
    </Alert>
  );
}
