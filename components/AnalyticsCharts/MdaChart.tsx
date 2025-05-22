// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ResponsiveBar } from "@nivo/bar";
import { useEffect, useState } from "react";
import { Building, ChevronDown, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
export default function MdaChart() {
  const mdaData = useQuery(api.tickets.getMDAIncidentsStats) || {};
  const [selectedMDA, setSelectedMDA] = useState("Overview");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const barData = Object.entries(mdaData).filter(([_, stats]) => stats.mdaName && stats.mdaName !== "Unknown MDA").map(([_, stats]) => ({
    mdaName: stats.mdaName,
    total: stats.total || 0,
    Open: stats.open || 0,
    "In Progress": stats.in_progress || 0,
    Resolved: stats.resolved || 0,
    Closed: stats.closed || 0
  }));
  const isOverview = selectedMDA === "Overview";
  const chartData: {
    [key: string]: string | number;
  }[] = isOverview ? barData.map(({
    mdaName,
    total
  }) => ({
    label: mdaName,
    count: total
  })) : (() => {
    const selectedStats = barData.find(entry => entry.mdaName === selectedMDA);
    return selectedStats ? [{
      label: "Open",
      count: selectedStats.Open
    }, {
      label: "In Progress",
      count: selectedStats["In Progress"]
    }, {
      label: "Resolved",
      count: selectedStats.Resolved
    }, {
      label: "Closed",
      count: selectedStats.Closed
    }] : [];
  })();
  const handleDownloadPDF = async () => {
    const doc = new jsPDF();
    doc.text(isOverview ? "MDA Reports Overview" : `MDA Report: ${selectedMDA}`, 14, 10);
    const chartElement = document.getElementById("mda-chart");
    if (chartElement) {
      const canvas = await html2canvas(chartElement, {
        backgroundColor: "#ffffff",
        scale: 2
      });
      const imgData = canvas.toDataURL("image/png");
      doc.addImage(imgData, "PNG", 10, 20, 180, 100);
    }
    if (isOverview) {
      autoTable(doc, {
        startY: 130,
        head: [["MDA Name", "Total", "Open", "In Progress", "Resolved", "Closed"]],
        body: barData.map(entry => [entry.mdaName, entry.total, entry.Open, entry["In Progress"], entry.Resolved, entry.Closed])
      });
    } else {
      autoTable(doc, {
        startY: 130,
        head: [["Status", "Reports"]],
        body: chartData.map(entry => [entry.label, entry.count])
      });
    }
    doc.save("mda_report.pdf");
  };
  return <div className="bg-[#0F172A] text-white p-6 rounded-2xl shadow-xl w-full overflow-x-auto">
      {}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-full">
            <Building className="text-white w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">ReportGov - Complaints status per MDA</h2>
            <p className="text-sm text-gray-400">Current status of complaint tickets for ReportGov per MDA</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleDownloadPDF} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition">
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">Download</span>
          </button>

          <div className="relative">
          <button onClick={() => setShowDropdown(!showDropdown)} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 max-w-[200px] truncate" title={selectedMDA}>
  {selectedMDA}
  <ChevronDown className="w-4 h-4" />
          </button>


            <AnimatePresence>
              {showDropdown && <motion.ul initial={{
              opacity: 0,
              height: 0
            }} animate={{
              opacity: 1,
              height: "auto"
            }} exit={{
              opacity: 0,
              height: 0
            }} transition={{
              duration: 0.2
            }} className="absolute bg-white text-gray-800 shadow-lg rounded-lg mt-1 w-52 max-h-64 overflow-y-auto z-50 scrollbar-visible">
            
                  <li onClick={() => {
                setSelectedMDA("Overview");
                setShowDropdown(false);
              }} className="px-4 py-2 hover:bg-gray-100 cursor-pointer">
                    Overview
                  </li>
                  {barData.map(entry => <li key={entry.mdaName} onClick={() => {
                setSelectedMDA(entry.mdaName);
                setShowDropdown(false);
              }} className="px-4 py-2 hover:bg-gray-100 cursor-pointer truncate" title={entry.mdaName}>
                      {entry.mdaName}
                    </li>)}
                </motion.ul>}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {}
      <div className="bg-[#1E293B] rounded-xl p-4 md:p-6 min-w-[600px]" id="mda-chart">
        {chartData.length > 0 ? <div className="h-[400px] w-full">
            <ResponsiveBar data={chartData} keys={["count"]} indexBy="label" margin={{
          top: 20,
          right: 30,
          bottom: 100,
          left: 60
        }} padding={0.3} colors={{
          scheme: "nivo"
        }} borderRadius={4} borderColor={{
          from: "color",
          modifiers: [["darker", 1.2]]
        }} enableLabel={false} tooltip={({
          id,
          value,
          indexValue
        }) => <div className="p-2 bg-white text-sm text-gray-800 shadow-md rounded">
                  <strong>{indexValue}</strong> <br />
                  {id}: {value}
                </div>} axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: isMobile ? -45 : -20,
          legend: isOverview ? "MDA Name" : "Status",
          legendPosition: "middle",
          legendOffset: 70,
          format: value => value.length > 15 ? value.slice(0, 12) + "..." : value
        }} axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          legend: "Reports",
          legendPosition: "middle",
          legendOffset: -50
        }} theme={{
          axis: {
            ticks: {
              text: {
                fill: "#CBD5E1",
                fontSize: 12,
                fontWeight: "bold"
              }
            },
            legend: {
              text: {
                fill: "#E2E8F0",
                fontSize: 14,
                fontWeight: "bold"
              }
            }
          }
        }} />
          </div> : <p className="text-gray-400 text-center py-10">No data available</p>}
      </div>
    </div>;
}