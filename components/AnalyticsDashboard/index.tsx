// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, type ReactNode } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from "chart.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import TicketsChart from "../AnalyticsCharts/TicketsChart";
import UsersChart from "../AnalyticsCharts/UsersChart";
import MdaChart from "../AnalyticsCharts/MdaChart";
import { formatRole } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { buildPerformanceSections, emptyPerformanceData, withFallbackRows, type PerformanceData, type PerformanceListItem } from "@/lib/performanceInsights";
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);
export default function AnalyticsDashboard() {
  const currentUser = useQuery(api.users.getCurrentUsers);
  const privilegedRoles = ["admin", "staff", "president", "vice_president"];
  const canViewPerformanceInsights = !!currentUser && privilegedRoles.includes(currentUser.role ?? "");
  const incidentsStats = useQuery(api.tickets.getIncidentsStats) || {
    total: 0,
    open: 0,
    resolved: 0,
    in_progress: 0,
    closed: 0,
    pending: 0
  };
  const globalResolvedTickets = incidentsStats.resolved + incidentsStats.closed;
  const formatCount = (value?: number) => (value ?? 0).toLocaleString();
  const rawMdaStats = useQuery(api.tickets.getMDAIncidentsStats) || {};
  const mdaStats: Record<string, {
    total: number;
  }> = rawMdaStats ?? {};
  const eventResponses = useQuery(api.events.getEventResponses) || [];
  const users = useQuery(api.users.getUsers) || [];
  const performanceInsights = useQuery(api.tickets.getMdaPerformanceInsights, canViewPerformanceInsights ? {} : "skip");
  const performanceData: PerformanceData = performanceInsights ?? emptyPerformanceData;
  const [filterType, setFilterType] = useState("users");
  const totalIncidentsData = {
    labels: ["Resolved", "In Progress", "Closed"],
    datasets: [{
      label: "Incidents",
      data: [incidentsStats.resolved, incidentsStats.in_progress, incidentsStats.closed],
      backgroundColor: ["#36A2EB", "#FFCE56", "#FF6384"]
    }]
  };
  const pendingIncidentsData = {
    labels: ["Pending"],
    datasets: [{
      data: [incidentsStats.pending],
      backgroundColor: ["#FF6384"]
    }]
  };
  const userData = {
    labels: ["Total Users", "Admins", "Regular Users"],
    datasets: [{
      label: "Users Overview",
      data: [users.length, users.filter(u => u.role === "admin").length, users.filter(u => u.role === "user").length],
      backgroundColor: ["#4CAF50", "#FF9800", "#03A9F4"]
    }]
  };
  const eventData = {
    labels: eventResponses.map(e => e.eventName),
    datasets: [{
      label: "Event Responses",
      data: eventResponses.map(e => e.responses),
      backgroundColor: "#8E44AD"
    }]
  };
  const mdaIncidentData = {
    labels: Object.keys(mdaStats),
    datasets: [{
      label: "MDA Incidents",
      data: Object.values(mdaStats).map(mda => mda.total || 0),
      backgroundColor: "#3498DB"
    }]
  };
  const handleDownloadExcel = () => {
    const filteredData = users.map(user => ({
      Name: `${user.firstName || ""} ${user.lastName || ""}`,
      Email: user.email || "",
      Role: formatRole(user.role) || "User"
    }));
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users Report");
    XLSX.writeFile(wb, "users_report.xlsx");
    toast({
      title: "Downloaded",
      description: "Excel file generated successfully!"
    });
  };
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.text("Users Report", 14, 10);
    autoTable(doc, {
      head: [["Name", "Email", "Role"]],
      body: users.map(user => [`${user.firstName || ""} ${user.lastName || ""}`, user.email || "", formatRole(user.role) || "User"])
    });
    doc.save("users_report.pdf");
    toast({
      title: "Downloaded",
      description: "PDF file generated successfully!"
    });
  };

  const exportPerformanceToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const sections = buildPerformanceSections(performanceData);
    sections.forEach(section => {
      const rows = withFallbackRows(section);
      const worksheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, section.sheetName);
    });
    XLSX.writeFile(workbook, "mda_performance_insights.xlsx");
    toast({
      title: "Export complete",
      description: "MDA performance insights exported to Excel."
    });
  };

  const exportPerformanceToPDF = () => {
    const doc = new jsPDF();
    const sections = buildPerformanceSections(performanceData);
    sections.forEach((section, index) => {
      if (index > 0) doc.addPage();
      doc.text(section.title, 14, 15);
      const rows = withFallbackRows(section);
      const headers = section.columns;
      const body = rows.map(row => headers.map(header => row[header] ?? ""));
      autoTable(doc, {
        startY: 22,
        head: [headers],
        body
      });
    });
    doc.save("mda_performance_insights.pdf");
    toast({
      title: "Export complete",
      description: "MDA performance insights exported to PDF."
    });
  };
  return <div className="container mx-auto p-8 space-y-8 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-bold text-gray-800">Analytics Overview</h1>

      <TicketsChart />
      <UsersChart />
       <MdaChart />
      
      {canViewPerformanceInsights && (
      <section className="space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold text-gray-800">MDA Performance Insights</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="default" onClick={exportPerformanceToExcel} className="bg-blue-600 hover:bg-blue-700 text-white">
              Export Insights (Excel)
            </Button>
            <Button variant="outline" onClick={exportPerformanceToPDF}>
              Export Insights (PDF)
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PerformanceList
            title="Most Tickets Resolved Within 72 Hours"
            items={performanceData.topResolvedWithin72h}
            renderDetails={item => (
              <p className="text-sm text-gray-500">
                {formatCount(item.resolvedWithin72h)} resolved ≤72h out of {formatCount(globalResolvedTickets)} total resolved/closed tickets
              </p>
            )}
            highlightKey="resolvedWithin72h"
          />
          <PerformanceList
            title="Least Tickets Resolved Within 72 Hours"
            items={performanceData.leastResolvedWithin72h}
            renderDetails={item => (
              <p className="text-sm text-gray-500">
                {formatCount(item.resolvedWithin72h)} resolved ≤72h out of {formatCount(globalResolvedTickets)} total resolved/closed tickets
              </p>
            )}
            highlightKey="resolvedWithin72h"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PerformanceList
            title="Most Overdue Tickets"
            items={performanceData.mostOverdueTickets}
            renderDetails={item => (
              <p className="text-sm text-gray-500">
                {formatCount(item.overdueTickets)} overdue out of {formatCount(item.totalTickets ?? incidentsStats.total)} total tickets
              </p>
            )}
            highlightKey="overdueTickets"
          />
          <PerformanceList
            title="Least Overdue Tickets"
            items={performanceData.leastOverdueTickets}
            renderDetails={item => (
              <p className="text-sm text-gray-500">
                {formatCount(item.overdueTickets)} overdue out of {formatCount(item.totalTickets ?? incidentsStats.total)} total tickets
              </p>
            )}
            highlightKey="overdueTickets"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PerformanceList
            title="Most Complaints"
            items={performanceData.mostComplaints}
            renderDetails={item => (
              <p className="text-sm text-gray-500">
                {formatCount(item.totalTickets)} complaints out of {formatCount(incidentsStats.total)} total tickets
              </p>
            )}
            highlightKey="totalTickets"
          />
          <PerformanceList
            title="Least Complaints"
            items={performanceData.leastComplaints}
            renderDetails={item => (
              <p className="text-sm text-gray-500">
                {formatCount(item.totalTickets)} complaints out of {formatCount(incidentsStats.total)} total tickets
              </p>
            )}
            highlightKey="totalTickets"
          />
        </div>
      </section>
      )}

      <Toaster />
    </div>;
}

type PerformanceListProps = {
  title: string;
  items: PerformanceListItem[];
  highlightKey: keyof PerformanceListItem;
  renderDetails: (item: PerformanceListItem) => ReactNode;
};

const PerformanceList = ({ title, items, highlightKey, renderDetails }: PerformanceListProps) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No data available yet.</p>
      ) : (
        <ol className="space-y-4">
          {items.map((item, index) => (
            <li key={`${item.mdaId ?? item.mdaName}-${index}`} className="flex items-start justify-between">
              <div className="pr-4">
                <p className="font-medium text-gray-900">
                  {index + 1}. {item.mdaName}
                </p>
                {renderDetails(item)}
              </div>
              <span className="text-xl font-semibold text-gray-800">
                {item[highlightKey] ?? 0}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};