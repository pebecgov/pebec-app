"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { api } from "@/convex/_generated/api";
import { useQuery, useConvex } from "convex/react";

export default function GenerateMonthlyReport({ open, onClose }: { open: boolean; onClose: () => void }) {
  const convex = useConvex();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [filteredData, setFilteredData] = useState<any[]>([]);

  const handleGenerate = async () => {
    setIsGenerating(true);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const today = now.getTime();

    const result = await convex.query(api.tickets.getFilteredTickets, {
      fromDate: startOfMonth,
      toDate: today,
    });

    setFilteredData(result);
    setIsGenerating(false);
    setIsGenerated(true);
  };

  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(18);
    doc.text("Monthly Ticket Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${format(new Date(), "PPPpp")}`, 14, 28);

    const tableData = filteredData.map((t) => [
      t.ticketNumber || "—",
      t.fullName || "—",
      t.businessName || "—", // ✅ Add this!
      t.title || "—",
      t.status,
      format(new Date(t._creationTime), "PPP"),
      t.state || "—",
      t.address || "—",
      t.email || "—",
      t.phoneNumber || "—",
      t.description?.replace(/<[^>]+>/g, "") || "",
      t.resolutionNote || "",
    ]);

    autoTable(doc, {
      startY: 32,
      head: [[
        "Ticket #", "Name", "Business", "Title", "Status",
        "Submitted on", "State", "Address", "Email", "Phone Number", "Description", "Resolution note"
      ]],
      body: tableData,
      styles: { fontSize: 6 },
      theme: "grid",
    });

    doc.save("monthly_ticket_report.pdf");
  };

  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredData.map((t) => ({
        TicketNumber: t.ticketNumber,
        Name: t.fullName,
        BusinessName: t.businessName, // ✅ Add this
        Title: t.title,
        Status: t.status,
        SubmissionDate: format(new Date(t._creationTime), "PPP"),
        State: t.state,
        Address: t.address,
        Email: t.email,
        Phone: t.phoneNumber,
        Description: t.description?.replace(/<[^>]+>/g, ""),
        ResolutionNote: t.resolutionNote || "",
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Monthly Report");
    XLSX.writeFile(workbook, "monthly_ticket_report.xlsx");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Generate Monthly Report</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will generate a full ticket report for the current month from the 1st to today.
          </p>
        </div>

        <DialogFooter className="mt-6 justify-between">
          {!isGenerated ? (
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Generate Report"}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={downloadPDF}>Download PDF</Button>
              <Button onClick={downloadExcel}>Download Excel</Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}