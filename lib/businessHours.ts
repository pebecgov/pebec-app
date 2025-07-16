// Business hours utility functions
// Business hours: 9am-5pm Monday-Friday

export function isBusinessDay(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5; // Monday (1) to Friday (5)
}

export function isWithinBusinessHours(date: Date): boolean {
  if (!isBusinessDay(date)) return false;
  const hour = date.getHours();
  return hour >= 9 && hour < 17; // 9am to 5pm (17:00 exclusive)
}

export function getNextBusinessHour(date: Date): Date {
  const next = new Date(date);
  
  // If it's after 5pm or on weekend, move to next business day 9am
  if (!isBusinessDay(next) || next.getHours() >= 17) {
    // Move to next day
    next.setDate(next.getDate() + 1);
    next.setHours(9, 0, 0, 0);
    
    // Keep moving until we hit a business day
    while (!isBusinessDay(next)) {
      next.setDate(next.getDate() + 1);
    }
    next.setHours(9, 0, 0, 0);
    return next;
  }
  
  // If it's before 9am on a business day, move to 9am
  if (next.getHours() < 9) {
    next.setHours(9, 0, 0, 0);
    return next;
  }
  
  // Already within business hours
  return next;
}

// Get the effective start time for SLA countdown
// If created during business hours, use creation time
// If created outside business hours, use next business hour
export function getEffectiveStartTime(creationTime: number): number {
  const creationDate = new Date(creationTime);
  
  if (isWithinBusinessHours(creationDate)) {
    return creationTime;
  } else {
    return getNextBusinessHour(creationDate).getTime();
  }
}

// 72-hour utility functions (real hours, not business hours)

// Returns the deadline timestamp 72 hours after startTime
export function addBusinessHours(startTime: number, hours: number): number {
  return startTime + hours * 60 * 60 * 1000;
}

// Returns the number of hours between startTime and endTime
export function skipWeekendsHours(startTime: number, endTime: number, _includeWeekends: boolean = false): number {
  return (endTime - startTime) / (60 * 60 * 1000);
}

// Returns the number of hours between startTime and endTime
export function calculateBusinessHours(startTime: number, endTime: number): number {
  return (endTime - startTime) / (60 * 60 * 1000);
}

// Returns the number of hours remaining until 72 hours after startTime
export function getTimeRemaining72Hours(startTime: number, currentTime: number): number {
  const baseDeadline = startTime + 72 * 60 * 60 * 1000;
  const remaining = (baseDeadline - currentTime) / (60 * 60 * 1000);
  return remaining;
}

// Returns true if more than 72 hours have passed since startTime
export function isOverdue72Hours(startTime: number, currentTime: number): boolean {
  return getTimeRemaining72Hours(startTime, currentTime) <= 0;
} 