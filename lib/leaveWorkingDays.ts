export const ANNUAL_LEAVE_WORKING_DAYS = 20;

/** Count Mon–Fri between start and end (inclusive), YYYY-MM-DD. */
export function countWorkingDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  if (end < start) return 0;

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function yearFromDate(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00`).getFullYear();
}
