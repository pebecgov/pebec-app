// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from "chart.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import TicketsChart from "../AnalyticsCharts/TicketsChart";
import UsersChart from "../AnalyticsCharts/UsersChart";
import MdaChart from "../AnalyticsCharts/MdaChart";
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);
export default function AnalyticsDashboard() {
  const incidentsStats = useQuery(api.tickets.getIncidentsStats) || {
    total: 0,
    resolved: 0,
    in_progress: 0,
    closed: 0,
    pending: 0
  };
  const rawMdaStats = useQuery(api.tickets.getMDAIncidentsStats) || {};
  const mdaStats: Record<string, {
    total: number;
  }> = rawMdaStats ?? {};
  const eventResponses = useQuery(api.events.getEventResponses) || [];
  const users = useQuery(api.users.getUsers) || [];
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
      Role: user.role || "user"
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
      body: users.map(user => [`${user.firstName || ""} ${user.lastName || ""}`, user.email || "", user.role || "user"])
    });
    doc.save("users_report.pdf");
    toast({
      title: "Downloaded",
      description: "PDF file generated successfully!"
    });
  };
  return <div className="container mx-auto p-8 space-y-8 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-bold text-gray-800">Analytics Overview</h1>

      <TicketsChart />
      <UsersChart />
       <MdaChart />
      
    

      <Toaster />
    </div>;
}