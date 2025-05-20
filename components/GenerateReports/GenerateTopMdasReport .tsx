"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Id } from "@/convex/_generated/dataModel";

export default function GenerateTopMdasReport() {
  const [open, setOpen] = useState(false);
  const [fromDate, setFromDate] = useState<number | null>(null);
  const [toDate, setToDate] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const mdas = useQuery(api.tickets.getAllMdas); // ✅ Should return all MDAs
  const mdaIds: Id<"mdas">[] = mdas?.map((mda) => mda._id) ?? [];

  const reportData = useQuery(
    api.tickets.getMDAReports,
    fromDate && toDate && submitted && mdaIds.length > 0
      ? { fromDate, toDate, mdaIds }
      : "skip"
  );

  const handleGenerate = () => {
    if (!fromDate || !toDate) return alert("Please select both dates.");
    setSubmitted(true);
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-GB");
  };

  // 🔁 Aggregate tickets into MDA stats
  const getTopMdas = () => {
    const grouped: Record<string, { mdaName: string; count: number }> = {};
    reportData?.forEach((ticket) => {
      const name = ticket.assignedMDAName;
      if (!grouped[name]) {
        grouped[name] = { mdaName: name, count: 0 };
      }
      if (["resolved", "closed"].includes(ticket.status)) {
        grouped[name].count += 1;
      }
    });

    return Object.values(grouped)
      .sort((a, b) => b.count - a.count)
      .map((mda, i) => ({
        rank: i + 1,
        name: mda.mdaName,
        count: mda.count,
      }));
  };

  const exportPDF = () => {
    const topMdas = getTopMdas();

    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(18);
    doc.text("Top MDAs Report", 14, 20);

    doc.setFontSize(12);
    doc.text(
      `Period: ${formatDate(fromDate)} to ${formatDate(toDate)}`,
      14,
      28
    );

    autoTable(doc, {
      startY: 35,
      head: [["Rank", "MDA", "Resolved + Closed"]],
      body: topMdas.map((mda) => [mda.rank, mda.name, mda.count]),
    });

    doc.save("Top_MDAs_Report.pdf");
  };

  const exportExcel = () => {
    const topMdas = getTopMdas();

    const sheetData = topMdas.map((mda) => ({
      Rank: mda.rank,
      MDA: mda.name,
      "Resolved + Closed": mda.count,
    }));

    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TopMdas");
    XLSX.writeFile(wb, "Top_MDAs_Report.xlsx");
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-black text-white">
        📈 Generate Top MDAs Report
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Select Date Range</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label>From</label>
              <input
                type="date"
                className="border rounded px-3 py-2"
                onChange={(e) =>
                  setFromDate(new Date(e.target.value).getTime())
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <label>To</label>
              <input
                type="date"
                className="border rounded px-3 py-2"
                onChange={(e) =>
                  setToDate(new Date(e.target.value).getTime())
                }
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={loading || !fromDate || !toDate}
              className="w-full bg-blue-600 text-white"
            >
              {loading ? "Generating..." : "Generate"}
            </Button>

            {reportData && reportData.length > 0 && (
              <div className="flex flex-col gap-2 mt-4">
                <Button onClick={exportPDF} className="bg-blue-500 text-white">
                  <FileDown className="mr-2 w-4 h-4" /> Export PDF
                </Button>
                <Button
                  onClick={exportExcel}
                  className="bg-green-500 text-white"
                >
                  <FileSpreadsheet className="mr-2 w-4 h-4" /> Export Excel
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
