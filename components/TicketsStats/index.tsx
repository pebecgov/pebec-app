// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Select from "react-select";
import { Bar } from "react-chartjs-2";
import { Sparklines, SparklinesLine } from "react-sparklines";
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import * as XLSX from "xlsx";
import { Briefcase, CheckCircle, AlertTriangle } from "lucide-react";
import { Line } from "react-chartjs-2";
import { Clock, Timer, BarChart2, TrendingUp } from "lucide-react";
Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);
export default function TicketSummary() {
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  const [mdaId, setMdaId] = useState<string>("");
  const stats = useQuery(api.tickets.getTicketStats, {
    fromDate: from?.getTime(),
    toDate: to?.getTime(),
    mdaId: mdaId ? mdaId as Id<"mdas"> : undefined
  });
  const mdas = useQuery(api.tickets.getAllMdas);
  const handleExport = () => {
    if (!stats) return;
    const data = [{
      Metric: "MDA",
      Value: mdas?.find(m => m._id === mdaId)?.name ?? "All"
    }, {
      Metric: "From",
      Value: from?.toLocaleDateString() ?? "N/A"
    }, {
      Metric: "To",
      Value: to?.toLocaleDateString() ?? "N/A"
    }, {}, {
      Metric: "Total Tickets",
      Value: stats.totalTickets
    }, {
      Metric: "Resolved",
      Value: stats.resolved
    }, {
      Metric: "Closed",
      Value: stats.closed
    }, {
      Metric: "Open",
      Value: stats.open
    }, {
      Metric: "Overdue",
      Value: stats.overdue
    }, {
      Metric: "Resolved ≤ 72h",
      Value: stats.resolvedWithin72h
    }, {
      Metric: "Closed ≤ 72h",
      Value: stats.closedWithin72h
    }, {
      Metric: "Avg Resolution Time (hrs)",
      Value: stats.avgResolutionTime
    }, {
      Metric: "Avg First Response Time (hrs)",
      Value: stats.avgResponseTime
    }];
    const sheet = XLSX.utils.json_to_sheet(data);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Ticket Summary");
    XLSX.writeFile(book, "ticket_summary.xlsx");
  };
  const barChartData = {
    labels: ["Total", "Resolved", "Closed", "Open", "Overdue", "≤72h Res", "≤72h Cls"],
    datasets: [{
      label: "Tickets",
      data: stats ? [stats.totalTickets, stats.resolved, stats.closed, stats.open, stats.overdue, stats.resolvedWithin72h, stats.closedWithin72h] : [],
      backgroundColor: "#3B82F6",
      borderRadius: 8,
      barThickness: 35
    }]
  };
  if (!stats || !mdas) return <div className="text-center mt-10">Loading analytics...</div>;
  const sparklineMock = (base: number) => Array.from({
    length: 6
  }, (_, i) => base * (0.8 + Math.random() * 0.4));
  const cards = [{
    label: "Resolved ≤ 72h",
    value: stats.resolvedWithin72h,
    icon: <Clock className="text-green-500 w-6 h-6" />,
    chartData: [3, 5, 2, 4, 1, stats.resolvedWithin72h]
  }, {
    label: "Closed ≤ 72h",
    value: stats.closedWithin72h,
    icon: <Timer className="text-blue-500 w-6 h-6" />,
    chartData: [1, 0, 1, 0, 0, stats.closedWithin72h]
  }, {
    label: "Avg Resolution (hrs)",
    value: stats.avgResolutionTime,
    icon: <BarChart2 className="text-yellow-500 w-6 h-6" />,
    chartData: [5, 6, 8, 7, stats.avgResolutionTime]
  }, {
    label: "Avg Response (hrs)",
    value: stats.avgResponseTime,
    icon: <TrendingUp className="text-red-500 w-6 h-6" />,
    chartData: [4, 6, 5, 7, stats.avgResponseTime]
  }];
  return <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
   {}
    <div className="bg-white rounded-xl p-4 shadow-sm border flex flex-wrap items-end justify-between gap-4">
  <div className="flex flex-wrap gap-4 items-end">
    {}
    <div>
      <label className="text-sm text-gray-600 mb-1 block">From</label>
      <DatePicker selected={from} onChange={setFrom} className="border px-3 py-2 rounded-md w-40" placeholderText="Start date" />
    </div>

    {}
    <div>
      <label className="text-sm text-gray-600 mb-1 block">To</label>
      <DatePicker selected={to} onChange={setTo} className="border px-3 py-2 rounded-md w-40" placeholderText="End date" />
    </div>

    {}
    <div className="w-60">
      <label className="text-sm text-gray-600 mb-1 block">MDA</label>
      <Select value={mdas.map(m => ({
            label: m.name,
            value: m._id
          })).find(opt => opt.value === mdaId) || null} onChange={opt => setMdaId(opt?.value || "")} options={mdas.map(m => ({
            label: m.name,
            value: m._id
          }))} placeholder="All MDAs" isClearable className="text-sm" />
    </div>
  </div>

  {}
  <div className="flex gap-2 flex-wrap">
    <Button variant="outline" onClick={() => {
          setFrom(null);
          setTo(null);
          setMdaId("");
        }} className="flex items-center gap-2 border-gray-300">
      ♻️ Reset
    </Button>

    <Button onClick={handleExport} className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2">
      📤 Export filtered data
    </Button>
  </div>
    </div>


      {}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[{
        label: "Total Tickets",
        value: stats.totalTickets,
        icon: Briefcase,
        color: "bg-blue-100 text-blue-800",
        spark: sparklineMock(stats.totalTickets)
      }, {
        label: "Resolved",
        value: stats.resolved,
        icon: CheckCircle,
        color: "bg-green-100 text-green-800",
        spark: sparklineMock(stats.resolved)
      }, {
        label: "Open",
        value: stats.open,
        icon: Clock,
        color: "bg-yellow-100 text-yellow-800",
        spark: sparklineMock(stats.open)
      }, {
        label: "Overdue",
        value: stats.overdue,
        icon: AlertTriangle,
        color: "bg-red-100 text-red-800",
        spark: sparklineMock(stats.overdue)
      }].map(({
        label,
        value,
        icon: Icon,
        color,
        spark
      }) => <div key={label} className={`rounded-xl p-4 border shadow-sm ${color}`}>
            <div className="flex items-center gap-3 mb-2">
              <Icon className="w-6 h-6" />
              <div>
                <p className="text-xs">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            </div>
            <Sparklines data={spark} width={100} height={30}>
              <SparklinesLine style={{
            stroke: "currentColor",
            fill: "none"
          }} />
            </Sparklines>
          </div>)}
      </div>

      {}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Ticket Distribution</h3>
        <Bar data={barChartData} options={{
        responsive: true,
        plugins: {
          legend: {
            display: false
          }
        }
      }} />
      </div>

      {}
     {}
     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => <div key={index} className="bg-white p-5 rounded-xl shadow border flex flex-col justify-between">
            <div className="flex items-center gap-3">
              {card.icon}
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-800">{card.value}</p>
              </div>
            </div>
            <div className="mt-4">
              <Line data={{
            labels: card.chartData.map((_, i) => i.toString()),
            datasets: [{
              data: card.chartData,
              borderColor: "#4F46E5",
              backgroundColor: "rgba(79, 70, 229, 0.2)",
              fill: true,
              tension: 0.4
            }]
          }} options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              }
            },
            scales: {
              x: {
                display: false
              },
              y: {
                display: false
              }
            }
          }} height={60} />
            </div>
          </div>)}
      </div>
    </div>;
}