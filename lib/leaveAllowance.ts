import { ANNUAL_LEAVE_WORKING_DAYS } from "./leaveWorkingDays";

/**
 * Annual leave is capped at 20 working days for all staff.
 * Prior approvals that already exceeded 20 are left as-is; remaining days
 * become 0 so no further leave can be requested that year.
 */
export function getAnnualLeaveAllowance(_user?: {
  email?: string;
  staffStream?: string;
}): number {
  return ANNUAL_LEAVE_WORKING_DAYS;
}
