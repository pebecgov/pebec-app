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

// Add 72 actual hours from the effective start time
export function addBusinessHours(startTime: number, hoursToAdd: number): number {
  // For 72-hour SLA, we want 72 actual hours from effective start time
  if (hoursToAdd === 72) {
    const effectiveStart = getEffectiveStartTime(startTime);
    return effectiveStart + (72 * 60 * 60 * 1000); // 72 hours in milliseconds
  }
  
  // For other hour calculations, keep the original business hours logic
  const start = new Date(startTime);
  let current = getNextBusinessHour(start);
  let remainingHours = hoursToAdd;
  
  while (remainingHours > 0) {
    if (isWithinBusinessHours(current)) {
      // Calculate hours until end of business day
      const endOfDay = new Date(current);
      endOfDay.setHours(17, 0, 0, 0);
      
      const availableHours = (endOfDay.getTime() - current.getTime()) / (1000 * 60 * 60);
      
      if (remainingHours <= availableHours) {
        // We can complete within this business day
        current.setTime(current.getTime() + (remainingHours * 60 * 60 * 1000));
        return current.getTime();
      } else {
        // Use up the rest of this business day
        remainingHours -= availableHours;
        
        // Move to start of next business day
        current.setDate(current.getDate() + 1);
        current = getNextBusinessHour(current);
      }
    } else {
      current = getNextBusinessHour(current);
    }
  }
  
  return current.getTime();
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

export function isOverdue72Hours(startTime: number, currentTime: number = Date.now()): boolean {
  const effectiveStart = getEffectiveStartTime(startTime);
  const deadline = effectiveStart + (72 * 60 * 60 * 1000); // 72 hours in milliseconds
  return currentTime > deadline;
}

export function getTimeRemaining72Hours(startTime: number, currentTime: number = Date.now()): number {
  const effectiveStart = getEffectiveStartTime(startTime);
  const deadline = effectiveStart + (72 * 60 * 60 * 1000); // 72 hours in milliseconds
  const remainingMs = deadline - currentTime;
  
  if (remainingMs <= 0) return 0;
  
  // Convert milliseconds to hours
  return remainingMs / (1000 * 60 * 60);
} 