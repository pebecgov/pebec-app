import { isPublicHoliday } from "./publicHolidays";

export const ANNUAL_LEAVE_WORKING_DAYS = 20;

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** True if the date counts toward annual leave (not weekend, not public holiday). */
export function isLeaveWorkingDay(dateStr: string): boolean {
  const d = new Date(`${dateStr}T12:00:00`);
  const weekday = d.getDay();
  if (weekday === 0 || weekday === 6) return false;
  if (isPublicHoliday(dateStr)) return false;
  return true;
}

/**
 * Count working days between start and end (inclusive).
 * Excludes weekends and Nigeria public holidays from public_holiday.json.
 */
export function countWorkingDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  if (end < start) return 0;

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dateStr = toDateString(cur);
    if (isLeaveWorkingDay(dateStr)) count += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function yearFromDate(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00`).getFullYear();
}
