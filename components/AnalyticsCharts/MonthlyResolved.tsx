// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FileDown, FileSpreadsheet, BarChart2, Turtle } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";
import GenerateTopMdasReport from "../GenerateReports/GenerateTopMdasReport ";
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);
const now = new Date();
const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
const endDate = now;
const periodText = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
export default function AdminTicketReport() {
  const stats = useQuery(api.tickets.getAdminMonthlyStats);
  const topMDAs = useQuery(api.tickets.getTopMdasByResolution);
  const currentUser = useQuery(api.users.getCurrentUsers);
  const userRole = currentUser?.role;
  const canSeeLeastMDA = ["admin", "president", "vice_president"].includes(userRole || "");
  const topMdaCount = 5;
  const topMDAsSorted = topMDAs ?? [];
  const topMdaList = topMDAsSorted.slice(0, topMdaCount);
  const topMdaNames = topMdaList.map(mda => mda.mdaName);
  const leastMDAs = topMDAsSorted.filter(mda => mda.mdaName !== "Unknown MDA" && !topMdaNames.includes(mda.mdaName)).slice(-topMdaCount);
  const horizontalBarOptions = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    layout: {
      padding: {
        left: 0,
        right: 0
      }
    },
    scales: {
      x: {
        beginAtZero: true
      },
      y: {
        beginAtZero: true,
        ticks: {
          autoSkip: false,
          font: {
            size: 12
          },
          callback: function (value, index, ticks) {
            const label = this.getLabelForValue(value);
            return label.length > 20 ? label.slice(0, 20) + "..." : label;
          }
        },
        title: {
          display: false
        }
      }
    }
  };
  const verticalBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };
  const exportPDF = (filename, tableHead, tableBody) => {
    const doc = new jsPDF({
      orientation: "landscape"
    });
    doc.setFontSize(18);
    doc.text("Tickets Report (This Month)", 14, 20);
    doc.setFontSize(12);
    doc.text(`Period: ${periodText}`, 14, 30);
    autoTable(doc, {
      startY: 40,
      head: tableHead,
      body: tableBody
    });
    doc.save(filename);
  };
  const exportExcel = (filename, data) => {
    const ws = XLSX.utils.json_to_sheet([{
      Period: periodText
    }, {}, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, filename);
  };
  return <div className="bg-white p-4 sm:p-6 rounded-xl shadow space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          🗓 Tickets Report <span className="text-sm">(This Month)</span>
        </h2>
        <p className="text-sm text-gray-600">Period: {periodText}</p>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => exportPDF("Overview_Report.pdf", [["Total", "Resolved Within 72h", "Closed Within 72h"]], [[stats?.total ?? 0, stats?.resolvedWithin72h ?? 0, stats?.closedWithin72h ?? 0]])} className="bg-blue-600 text-white">
            <FileDown className="mr-2 w-4 h-4" /> Export PDF
          </Button>

          <Button onClick={() => exportExcel("Overview_Report.xlsx", [{
          Total: stats?.total ?? 0,
          "Resolved Within 72h": stats?.resolvedWithin72h ?? 0,
          "Closed Within 72h": stats?.closedWithin72h ?? 0
        }])} className="bg-green-600 text-white">
            <FileSpreadsheet className="mr-2 w-4 h-4" /> Export Excel
          </Button>
        </div>
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border p-4 rounded-lg text-center">
          <h3 className="text-lg font-medium text-gray-700">Reports This Month</h3>
          <p className="text-4xl font-bold text-blue-600">{stats?.total ?? 0}</p>
        </div>

        <div className="border p-4 rounded-lg text-center">
          <h3 className="text-lg font-medium text-gray-700">Resolved Within 72h</h3>
          <p className="text-4xl font-bold text-green-600">{stats?.resolvedWithin72h ?? 0}</p>
        </div>

        <div className="border p-4 rounded-lg text-center">
          <h3 className="text-lg font-medium text-gray-700">Closed Within 72h</h3>
          <p className="text-4xl font-bold text-purple-600">{stats?.closedWithin72h ?? 0}</p>
        </div>
      </div>

      {}
      <div className={`grid gap-4 ${canSeeLeastMDA ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 justify-center"}`}>
        {}
        <div className={`border p-4 rounded-lg h-[300px] ${!canSeeLeastMDA ? "mx-auto w-full md:w-1/2" : ""}`}>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart2 className="w-5 h-5" /> Top MDAs
          </h3>
          <div className="overflow-x-auto">
  <Bar data={{
            labels: topMdaList.map(mda => mda.mdaName),
            datasets: [{
              label: "Resolved + Closed",
              data: topMdaList.map(mda => mda.count),
              backgroundColor: "#3b82f6",
              borderRadius: 6,
              barPercentage: 0.5,
              categoryPercentage: 0.5
            }]
          }} options={horizontalBarOptions} />
        </div>

        </div>

        {}
        {canSeeLeastMDA && <div className="border p-4 rounded-lg h-[300px]">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Turtle className="w-5 h-5 text-red-500" /> Least Performing MDAs
            </h3>
            {leastMDAs.length > 0 ? <Bar data={{
          labels: leastMDAs.map(mda => mda.mdaName),
          datasets: [{
            label: "Resolved + Closed",
            data: leastMDAs.map(mda => mda.count),
            backgroundColor: "#ef4444",
            borderRadius: 6,
            barThickness: 18
          }]
        }} options={verticalBarOptions} /> : <p className="text-sm text-gray-500 italic">No least performing MDAs to display.</p>}
          </div>}
      </div>

      {}
      <div className={`pt-4 border-t mt-6 flex flex-wrap gap-2 ${!canSeeLeastMDA ? "justify-center" : "justify-start"}`}>
        <Button onClick={() => exportPDF("Top_MDA_Report.pdf", [["Rank", "MDA", "Resolved+Closed"]], topMdaList.map((mda, i) => [i + 1, mda.mdaName, mda.count]))} className="bg-blue-600 text-white">
          <FileDown className="mr-2 w-4 h-4" /> Download Top MDAs PDF
        </Button>

        <Button onClick={() => exportExcel("Top_MDA_Report.xlsx", topMdaList.map((mda, i) => ({
        Rank: i + 1,
        MDA: mda.mdaName,
        "Resolved + Closed": mda.count
      })))} className="bg-green-600 text-white">
          <FileSpreadsheet className="mr-2 w-4 h-4" /> Download Top MDAs Excel
        </Button>

        <GenerateTopMdasReport />
      </div>
    </div>;
}