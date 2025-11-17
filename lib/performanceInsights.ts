export type PerformanceListItem = {
  mdaId?: string;
  mdaName: string;
  resolvedWithin72h?: number;
  totalResolved?: number;
  overdueTickets?: number;
  openTickets?: number;
  totalTickets?: number;
};

export type PerformanceData = {
  topResolvedWithin72h: PerformanceListItem[];
  leastResolvedWithin72h: PerformanceListItem[];
  mostOverdueTickets: PerformanceListItem[];
  leastOverdueTickets: PerformanceListItem[];
  mostComplaints: PerformanceListItem[];
  leastComplaints: PerformanceListItem[];
};

export type PerformanceSection = {
  title: string;
  sheetName: string;
  columns: string[];
  rows: Array<Record<string, string | number>>;
};

export const emptyPerformanceData: PerformanceData = {
  topResolvedWithin72h: [],
  leastResolvedWithin72h: [],
  mostOverdueTickets: [],
  leastOverdueTickets: [],
  mostComplaints: [],
  leastComplaints: []
};

export const buildPerformanceSections = (data: PerformanceData): PerformanceSection[] => [
  {
    title: "Most Tickets Resolved ≤ 72h",
    sheetName: "TopResolved72h",
    columns: ["MDA", "Resolved ≤72h", "Total Resolved"],
    rows: data.topResolvedWithin72h.map(item => ({
      "MDA": item.mdaName,
      "Resolved ≤72h": item.resolvedWithin72h ?? 0,
      "Total Resolved": item.totalResolved ?? 0
    }))
  },
  {
    title: "Least Tickets Resolved ≤ 72h",
    sheetName: "LeastResolved72h",
    columns: ["MDA", "Resolved ≤72h", "Total Resolved"],
    rows: data.leastResolvedWithin72h.map(item => ({
      "MDA": item.mdaName,
      "Resolved ≤72h": item.resolvedWithin72h ?? 0,
      "Total Resolved": item.totalResolved ?? 0
    }))
  },
  {
    title: "Most Overdue Tickets",
    sheetName: "MostOverdue",
    columns: ["MDA", "Overdue Tickets", "Open Tickets"],
    rows: data.mostOverdueTickets.map(item => ({
      "MDA": item.mdaName,
      "Overdue Tickets": item.overdueTickets ?? 0,
      "Open Tickets": item.openTickets ?? 0
    }))
  },
  {
    title: "Least Overdue Tickets",
    sheetName: "LeastOverdue",
    columns: ["MDA", "Overdue Tickets", "Open Tickets"],
    rows: data.leastOverdueTickets.map(item => ({
      "MDA": item.mdaName,
      "Overdue Tickets": item.overdueTickets ?? 0,
      "Open Tickets": item.openTickets ?? 0
    }))
  },
  {
    title: "Most Complaints",
    sheetName: "MostComplaints",
    columns: ["MDA", "Total Complaints"],
    rows: data.mostComplaints.map(item => ({
      "MDA": item.mdaName,
      "Total Complaints": item.totalTickets ?? 0
    }))
  },
  {
    title: "Least Complaints",
    sheetName: "LeastComplaints",
    columns: ["MDA", "Total Complaints"],
    rows: data.leastComplaints.map(item => ({
      "MDA": item.mdaName,
      "Total Complaints": item.totalTickets ?? 0
    }))
  }
];

export const withFallbackRows = (section: PerformanceSection) => {
  if (section.rows.length > 0) return section.rows;
  const placeholder: Record<string, string> = {};
  section.columns.forEach((col, index) => {
    placeholder[col] = index === 0 ? "No data" : "-";
  });
  return [placeholder];
};

