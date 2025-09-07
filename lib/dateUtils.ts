// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.

export const isWorkingDay = (date: Date): boolean => {
  const day = date.getDay();
  return day >= 1 && day <= 5; // Monday to Friday
};

export const getNextWorkingDays = (startDate: Date, count: number): Date[] => {
  const workingDays: Date[] = [];
  let currentDate = new Date(startDate);
  
  while (workingDays.length < count) {
    if (isWorkingDay(currentDate)) {
      workingDays.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workingDays;
};

export const formatDateForDisplay = (date: Date): string => {
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
};

export const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split('T')[0];
};
