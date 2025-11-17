// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Select from "react-select";
import { Bar } from "react-chartjs-2";
import { Sparklines, SparklinesLine } from "react-sparklines";
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Briefcase, CheckCircle, AlertTriangle } from "lucide-react";
import { Line } from "react-chartjs-2";
import { Clock, Timer, BarChart2, TrendingUp } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { buildPerformanceSections, emptyPerformanceData, withFallbackRows, type PerformanceData } from "@/lib/performanceInsights";
Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);
export default function TicketSummary() {
  const { isSignedIn } =  useAuth();

  

  const router = useRouter();
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  const [mdaId, setMdaId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const stats = isSignedIn
    ? useQuery(api.tickets.getTicketStats, {
        fromDate: from?.getTime(),
        toDate: to?.getTime(),
        mdaId: mdaId ? (mdaId as Id<"mdas">) : undefined,
      })
    : null;

  

  const mdas = useQuery(api.tickets.getAllMdas);
  const currentUser = useQuery(api.users.getCurrentUsers);
  const privilegedRoles = ["admin", "staff", "president", "vice_president"];
  const canViewPerformanceInsights = !!currentUser && privilegedRoles.includes(currentUser.role ?? "");
  const performanceInsights = useQuery(api.tickets.getMdaPerformanceInsights, canViewPerformanceInsights ? {} : "skip");
  const performanceData: PerformanceData = performanceInsights ?? emptyPerformanceData;
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

  const exportPerformanceToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const sections = buildPerformanceSections(performanceData);
    sections.forEach(section => {
      const rows = withFallbackRows(section);
      const worksheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, section.sheetName);
    });
    XLSX.writeFile(workbook, "mda_performance_insights.xlsx");
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
  };
  // Create filtered chart data based on selected status
  const getFilteredChartData = () => {
    if (!stats) return { labels: [], datasets: [] };
    
    if (!selectedStatus) {
      // Show all data when no status is selected
      return {
        labels: ["Total", "Resolved", "Closed", "Open", "Overdue", "≤72h Res", "≤72h Cls"],
        datasets: [{
          label: "Tickets",
          data: [stats.totalTickets, stats.resolved, stats.closed, stats.open, stats.overdue, stats.resolvedWithin72h, stats.closedWithin72h],
          backgroundColor: "#3B82F6",
          borderRadius: 8,
          barThickness: 35
        }]
      };
    }
    
    // Filter data based on selected status
    const statusMap = {
      "Total Tickets": { label: "Total", value: stats.totalTickets },
      "Resolved": { label: "Resolved", value: stats.resolved },
      "Closed": { label: "Closed", value: stats.closed },
      "Open": { label: "Open", value: stats.open },
      "Overdue": { label: "Overdue", value: stats.overdue }
    };
    
    const selectedData = statusMap[selectedStatus as keyof typeof statusMap];
    if (!selectedData) return { labels: [], datasets: [] };
    
    return {
      labels: [selectedData.label],
      datasets: [{
        label: "Tickets",
        data: [selectedData.value],
        backgroundColor: selectedStatus === "Total Tickets" ? "#3B82F6" : 
                        selectedStatus === "Resolved" ? "#10B981" :
                        selectedStatus === "Closed" ? "#059669" :
                        selectedStatus === "Open" ? "#F59E0B" : "#EF4444",
        borderRadius: 8,
        barThickness: 35
      }]
    };
  };

  const barChartData = getFilteredChartData();



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
    {canViewPerformanceInsights && (
      <>
        <Button variant="secondary" onClick={exportPerformanceToExcel} className="flex items-center gap-2">
          📈 Export MDA insights (Excel)
        </Button>
        <Button variant="outline" onClick={exportPerformanceToPDF} className="flex items-center gap-2">
          📝 Export MDA insights (PDF)
        </Button>
      </>
    )}
  </div>
    </div>

      {} 
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        {[{
        label: "Total Tickets",
        value: stats.totalTickets,
        icon: Briefcase,
        color: "bg-blue-100 text-blue-800",
        selectedColor: "bg-blue-200 text-blue-900 border-blue-300",
        spark: sparklineMock(stats.totalTickets)
      }, {
        label: "Resolved",
        value: stats.resolved,
        icon: CheckCircle,
        color: "bg-green-100 text-green-800",
        selectedColor: "bg-green-200 text-green-900 border-green-300",
        spark: sparklineMock(stats.resolved)
      }, {
        label: "Closed",
        value: stats.closed,
        icon: CheckCircle,
        color: "bg-emerald-100 text-emerald-800",
        selectedColor: "bg-emerald-200 text-emerald-900 border-emerald-300",
        spark: sparklineMock(stats.closed)
      }, {
        label: "Open",
        value: stats.open,
        icon: Clock,
        color: "bg-yellow-100 text-yellow-800",
        selectedColor: "bg-yellow-200 text-yellow-900 border-yellow-300",
        spark: sparklineMock(stats.open)
      }, {
        label: "Overdue",
        value: stats.overdue,
        icon: AlertTriangle,
        color: "bg-red-100 text-red-800",
        selectedColor: "bg-red-200 text-red-900 border-red-300",
        spark: sparklineMock(stats.overdue)
      }].map(({
        label,
        value,
        icon: Icon,
        color,
        selectedColor,
        spark
      }) => {
        const isSelected = selectedStatus === label;
        return (
          <div 
            key={label} 
            className={`rounded-xl p-4 border shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 ${
              isSelected ? selectedColor : color
            } ${isSelected ? 'border-2' : 'border'}`}
            onClick={() => setSelectedStatus(isSelected ? null : label)}
          >
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
          </div>
        );
      })}
      </div>

      {}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-700">
            Ticket Distribution {selectedStatus && `- ${selectedStatus}`}
          </h3>
          {selectedStatus && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedStatus(null)}
              className="text-xs"
            >
              Show All
            </Button>
          )}
        </div>
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