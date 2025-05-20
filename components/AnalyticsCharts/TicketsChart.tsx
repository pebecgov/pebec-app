"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Line } from "react-chartjs-2";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import autoTable from "jspdf-autotable";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { useRef } from "react";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function TicketsChart() {
  const ticketsData = useQuery(api.tickets.getIncidentsStatsByMonth) || {};
  const incidentsStats = useQuery(api.tickets.getIncidentsStats) || {
    total: 0,
    resolved: 0,
    in_progress: 0,
    closed: 0,
    pending: 0,
  };

  const chartRef = useRef<HTMLDivElement>(null);

  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const ticketsPerMonth = monthLabels.map((m) => ticketsData[m]?.total || 0);
  const resolvedPerMonth = monthLabels.map((m) => ticketsData[m]?.resolved || 0);

  const chartData = {
    labels: monthLabels,
    datasets: [
      {
        label: "Total Complaints",
        data: ticketsPerMonth,
        borderColor: "#0ea5e9",
        backgroundColor: "rgba(14,165,233,0.1)",
        pointBackgroundColor: "#0ea5e9",
        tension: 0.4,
        fill: true,
      },
      {
        label: "Resolved Complaints",
        data: resolvedPerMonth,
        borderColor: "#8b5cf6",
        backgroundColor: "rgba(139,92,246,0.1)",
        pointBackgroundColor: "#8b5cf6",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "#6b7280",
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#9ca3af" } },
      y: { beginAtZero: true, ticks: { color: "#9ca3af" } },
    },
  };

  const handleDownloadPDF = async () => {
    const doc = new jsPDF();
    doc.text("Reports Overview", 14, 10);

    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current);
      const imgData = canvas.toDataURL("image/png");
      doc.addImage(imgData, "PNG", 10, 20, 180, 100);
    }

    autoTable(doc, {
      startY: 130,
      head: [["Month", "Total", "Resolved"]],
      body: monthLabels.map((month, idx) => [
        month,
        ticketsPerMonth[idx],
        resolvedPerMonth[idx],
      ]),
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 140;

    doc.text("Summary", 14, finalY + 10);

    autoTable(doc, {
      startY: finalY + 20,
      head: [["Status", "Count"]],
      body: [
        ["Resolved", incidentsStats.resolved],
        ["In Progress", incidentsStats.in_progress],
        ["Closed", incidentsStats.closed],
        ["Open", incidentsStats.pending],
      ],
    });

    doc.save("reports-overview.pdf");
  };

  if (!ticketsData || !incidentsStats) {
    return <p className="text-center text-gray-500">Loading reports data...</p>;
  }

  return (
    <div className="bg-gradient-to-tr from-slate-800 to-slate-900 p-6 md:p-8 rounded-2xl shadow-xl w-full relative text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-extrabold">ReportGov Analytics</h2>
        <button
          onClick={handleDownloadPDF}
          className="bg-slate-700 hover:bg-slate-600 p-2 rounded-full transition"
        >
          <Download className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Chart */}
      <div ref={chartRef} className="h-[350px]">
        <Line data={chartData} options={chartOptions} />
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Resolved", value: incidentsStats.resolved, color: "text-green-400" },
          { label: "Open", value: incidentsStats.pending, color: "text-blue-400" },
          { label: "In Progress", value: incidentsStats.in_progress, color: "text-yellow-400" },
          { label: "Closed", value: incidentsStats.closed, color: "text-red-400" },
        ].map((item) => (
          <div
            key={item.label}
            className="p-4 bg-white/10 backdrop-blur-sm rounded-xl flex flex-col items-center"
          >
            <h3 className="text-sm font-medium text-gray-300">{item.label}</h3>
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
