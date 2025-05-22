// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Line } from "react-chartjs-2";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Chart as ChartJS, CategoryScale, LinearScale, LineElement, Title, Tooltip, Legend, PointElement } from "chart.js";
ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend);
export default function MdaTicketsChart() {
  const ticketsData = useQuery(api.tickets.getMDAIncidentsStatsByMonth) || {};
  const incidentsStats = useQuery(api.tickets.getMDAIncidentsStat) || {
    totalAssigned: 0,
    resolved: 0,
    closed: 0,
    unresolved: 0,
    resolvedPercentage: 0,
    score: 0
  };
  if (!ticketsData || !incidentsStats) {
    return <p className="text-center text-gray-500">Loading reports data...</p>;
  }
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const ticketsPerMonth = monthLabels.map(month => ticketsData[month]?.total || 0);
  const resolvedPerMonth = monthLabels.map(month => ticketsData[month]?.resolved || 0);
  const inProgressPerMonth = monthLabels.map(month => ticketsData[month]?.in_progress || 0);
  const closedPerMonth = monthLabels.map(month => ticketsData[month]?.closed || 0);
  const pendingPerMonth = monthLabels.map(month => ticketsData[month]?.pending || 0);
  const chartData = {
    labels: monthLabels,
    datasets: [{
      label: "Total Reports",
      data: ticketsPerMonth,
      borderColor: "#1D4ED8",
      backgroundColor: "rgba(29, 78, 216, 0.2)",
      fill: true,
      pointRadius: 4,
      tension: 0.4
    }, {
      label: "Resolved",
      data: resolvedPerMonth,
      borderColor: "#22C55E",
      backgroundColor: "rgba(34, 197, 94, 0.2)",
      fill: true,
      pointRadius: 4,
      tension: 0.4
    }, {
      label: "In Progress",
      data: inProgressPerMonth,
      borderColor: "#F59E0B",
      backgroundColor: "rgba(245, 158, 11, 0.2)",
      fill: true,
      pointRadius: 4,
      tension: 0.4
    }, {
      label: "Closed",
      data: closedPerMonth,
      borderColor: "#DC2626",
      backgroundColor: "rgba(220, 38, 38, 0.2)",
      fill: true,
      pointRadius: 4,
      tension: 0.4
    }]
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true
      }
    }
  };
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.text("MDA Ticket Overview Report", 14, 10);
    autoTable(doc, {
      startY: 20,
      head: [["Month", "Total", "Resolved", "In Progress", "Closed", "Open"]],
      body: monthLabels.map((month, index) => [month, ticketsPerMonth[index], resolvedPerMonth[index], inProgressPerMonth[index], closedPerMonth[index], pendingPerMonth[index]])
    });
    const finalY = (doc as any).lastAutoTable?.finalY || 30;
    doc.text("Summary:", 14, finalY + 10);
    autoTable(doc, {
      startY: finalY + 20,
      head: [["Category", "Count"]],
      body: [["Total Tickets Assigned", incidentsStats.totalAssigned], ["Resolved Reports", incidentsStats.resolved], ["In Progress Reports", incidentsStats.unresolved], ["Closed Reports", incidentsStats.resolvedPercentage + "%"]]
    });
    doc.save("MDA_Ticket_Report.pdf");
  };
  return <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg w-full relative">
      {}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">MDA Ticket Overview</h2>
        <button onClick={handleDownloadPDF} className="text-gray-500 hover:text-gray-900">
          <Download className="w-6 h-6" />
        </button>
      </div>

      {}
      <div className="h-72">
        <Line data={chartData} options={chartOptions} />
      </div>

      {}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className="p-4 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-semibold">Total Assigned</h3>
          <p className="text-xl font-bold text-blue-600">{incidentsStats.totalAssigned}</p>
        </div>
        <div className="p-4 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-semibold">Resolved</h3>
          <p className="text-xl font-bold text-green-600">{incidentsStats.resolved}</p>
        </div>
        <div className="p-4 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-semibold">In Progress</h3>
          <p className="text-xl font-bold text-yellow-500">{incidentsStats.unresolved}</p>
        </div>
        <div className="p-4 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-semibold">Closed</h3>
          <p className="text-xl font-bold text-red-600">{incidentsStats.closed}</p>
        </div>
      </div>
    </div>;
}