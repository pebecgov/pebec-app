import holidaysData from "../public_holiday.json";

export type PublicHolidayEntry = {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
};

const entries = holidaysData as PublicHolidayEntry[];

/** YYYY-MM-DD → holiday name (Nigeria public holidays from public_holiday.json). */
const holidayByDate = new Map<string, string>(
  entries.map((h) => [h.date, h.localName || h.name])
);

export function isPublicHoliday(dateStr: string): boolean {
  return holidayByDate.has(dateStr);
}

export function getPublicHolidayName(dateStr: string): string | undefined {
  return holidayByDate.get(dateStr);
}

/** All configured public holiday dates (sorted). */
export function getPublicHolidayDates(): string[] {
  return [...holidayByDate.keys()].sort();
}

export function getPublicHolidaysInRange(
  startDate: string,
  endDate: string
): PublicHolidayEntry[] {
  return entries.filter((h) => h.date >= startDate && h.date <= endDate);
}
