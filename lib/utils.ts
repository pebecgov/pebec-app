// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function createSlugFromName(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  return slug;
}
export function combineName(user: {
  firstName?: string;
  lastName?: string;
} | null) {
  if (!user) return "Anonymous";
  const firstName = user.firstName?.trim() ?? "";
  const lastName = user.lastName?.trim() ?? "";
  return `${firstName} ${lastName}`.trim();
}
export function formatDate(date: number) {
  const formatter = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  return formatter.format(date);
}