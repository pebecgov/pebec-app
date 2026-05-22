import { ANNUAL_LEAVE_WORKING_DAYS } from "./leaveWorkingDays";

export function getRemainingWorkingDays(
  used: number,
  pending: number,
  annualAllowance: number = ANNUAL_LEAVE_WORKING_DAYS
): number {
  return annualAllowance - used - pending;
}

export function wouldExceedLeaveAllowance(
  used: number,
  pending: number,
  requestedDays: number,
  annualAllowance: number = ANNUAL_LEAVE_WORKING_DAYS
): boolean {
  return used + pending + requestedDays > annualAllowance;
}

export function leaveAllowanceExceededMessage(
  requestedDays: number,
  used: number,
  pending: number,
  year: number,
  annualAllowance: number = ANNUAL_LEAVE_WORKING_DAYS
): string {
  const remaining = getRemainingWorkingDays(used, pending, annualAllowance);
  return `This leave is ${requestedDays} working day(s), but only ${Math.max(0, remaining)} day(s) remain for ${year} (maximum ${annualAllowance} working days per year).`;
}
