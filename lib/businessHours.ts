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

export function addBusinessHours(startTime: number, hours: number): number {
  let currentTime = startTime;
  let remainingHours = hours;

  while (remainingHours > 0) {
    const date = new Date(currentTime);
    const dayOfWeek = date.getDay();
    const hour = date.getHours();

    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      currentTime += 24 * 60 * 60 * 1000; // Add one day
      continue;
    }

    // Only count business hours (9 AM - 5 PM WAT)
    if (hour >= 9 && hour < 17) {
      remainingHours--;
    }

    currentTime += 60 * 60 * 1000; // Add one hour
  }

  return currentTime;
}

export function skipWeekendsHours(startTime: number, endTime: number, includeWeekends: boolean = false): number {
  if (includeWeekends) {
    return (endTime - startTime) / (60 * 60 * 1000); // Convert to hours
  }

  let currentTime = startTime;
  let businessHours = 0;

  while (currentTime < endTime) {
    const date = new Date(currentTime);
    const dayOfWeek = date.getDay();
    const hour = date.getHours();

    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      currentTime += 24 * 60 * 60 * 1000; // Add one day
      continue;
    }

    // Only count business hours (9 AM - 5 PM WAT)
    if (hour >= 9 && hour < 17) {
      businessHours++;
    }

    currentTime += 60 * 60 * 1000; // Add one hour
  }

  return businessHours;
}

export function calculateBusinessHours(startTime: number, endTime: number): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  if (start >= end) return 0;
  
  let totalHours = 0;
  let current = getNextBusinessHour(start);
  
  while (current < end) {
    if (isWithinBusinessHours(current)) {
      // Calculate hours until end of business day or end time
      const endOfDay = new Date(current);
      endOfDay.setHours(17, 0, 0, 0);
      
      const periodEnd = end < endOfDay ? end : endOfDay;
      const hoursInPeriod = (periodEnd.getTime() - current.getTime()) / (1000 * 60 * 60);
      
      totalHours += hoursInPeriod;
      
      // Move to start of next business day
      current = new Date(current);
      current.setDate(current.getDate() + 1);
      current = getNextBusinessHour(current);
    } else {
      current = getNextBusinessHour(current);
    }
  }
  
  return totalHours;
}

export function getTimeRemaining72Hours(startTime: number, currentTime: number): number {
  const baseDeadline = addBusinessHours(startTime, 72);
  
  // Calculate remaining time
  const remaining = (baseDeadline - currentTime) / (60 * 60 * 1000); // Convert to hours
  return remaining;
}

export function isOverdue72Hours(startTime: number, currentTime: number): boolean {
  return getTimeRemaining72Hours(startTime, currentTime) <= 0;
} 