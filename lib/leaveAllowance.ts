import { ANNUAL_LEAVE_WORKING_DAYS } from "./leaveWorkingDays";

export const EXTENDED_ANNUAL_LEAVE_WORKING_DAYS = 30;

/** Staff in the account workstream and these emails receive 30 working days per year. */
const EXTENDED_LEAVE_EMAILS = new Set([
  "saratu.adamu@pebec.gov.ng",
  "ifeanyi.icheke@pebec.gov.ng",
  "oluwaseun.obafemi@pebec.gov.ng",
  "oluwaseun.winsala@pebec.gov.ng",
  "beckyukpevo123@gmail.com"
]);

export function getAnnualLeaveAllowance(user: {
  email?: string;
  staffStream?: string;
}): number {
  const email = user.email?.trim().toLowerCase();
  if (email && EXTENDED_LEAVE_EMAILS.has(email)) {
    return EXTENDED_ANNUAL_LEAVE_WORKING_DAYS;
  }
  if (user.staffStream === "account") {
    return EXTENDED_ANNUAL_LEAVE_WORKING_DAYS;
  }
  return ANNUAL_LEAVE_WORKING_DAYS;
}
