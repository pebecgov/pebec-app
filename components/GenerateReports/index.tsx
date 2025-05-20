"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Download, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Label } from "@radix-ui/react-label";
import { FaFileExcel, FaFilePdf } from "react-icons/fa";

export default function MDAReports() {
  const mdas = useQuery(api.users.getMDAs) || [];
  const [selectedMDAIds, setSelectedMDAIds] = useState<Id<"mdas">[]>([]);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [reportData, setReportData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchedReportData = useQuery(
    api.tickets.getMDAReports,
    fromDate && toDate && selectedMDAIds.length > 0
      ? {
          fromDate: new Date(fromDate).getTime(),
          toDate: new Date(toDate).getTime(),
          mdaIds: selectedMDAIds,
        }
      : "skip"
  );

  const userIds = fetchedReportData ? [...new Set(fetchedReportData.map(ticket => ticket.createdBy))] : [];
  const users = useQuery(api.users.getUsersByIds, userIds.length > 0 ? { userIds } : "skip");

  useEffect(() => {
    if (fetchedReportData && users) {
      const enrichedData = fetchedReportData.map((ticket, index) => {
        const user = users.find(u => u._id === ticket.createdBy);
        return {
          number: index + 1,
          ticketNumber: ticket.ticketNumber,
          status: ticket.status,
          fullName: ticket.fullName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
          incidentDate: new Date(ticket.incidentDate).toLocaleDateString(),
          state: ticket.state || user?.state || "N/A",
          address: ticket.address || user?.address || "N/A",
          resolutionNote: ticket.resolutionNote || "N/A",
          phoneNumber: ticket.phoneNumber || user?.phoneNumber || "N/A",
          email: ticket.email || user?.email || "N/A",
          businessName: user?.businessName || "N/A",
          assignedMDAName: ticket.assignedMDAName || "Unassigned",
        };
      });
      setReportData(enrichedData);
    }
  }, [fetchedReportData, users]);


  // ✅ Function to handle selecting MDAs
const handleMDASelection = (value: string) => {
    setSelectedMDAIds(prev =>
      prev.includes(value as Id<"mdas">)
        ? prev.filter(id => id !== (value as Id<"mdas">))
        : [...prev, value as Id<"mdas">]
    );
  };

  
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.text("MDA Tickets Report", 14, 10);

    autoTable(doc, {
      startY: 20,
      head: [
        [
          "No.",
          "Ticket Number",
          "Status",
          "Full Name",
          "Incident Date",
          "State",
          "Address",
          "Resolution Note",
          "Phone Number",
          "Email Address",
          "Business Name",
          "Assigned MDA",
        ],
      ],
      body: reportData.map(ticket => [
        ticket.number,
        ticket.ticketNumber,
        ticket.status,
        ticket.fullName,
        ticket.incidentDate,
        ticket.state,
        ticket.address,
        ticket.resolutionNote,
        ticket.phoneNumber,
        ticket.email,
        ticket.businessName,
        ticket.assignedMDAName,
      ]),
    });

    doc.save("MDA_Ticket_Report.pdf");
  };

  const handleExportExcel = () => {
    const headers = [
      "No.",
      "Ticket Number",
      "Status",
      "Full Name",
      "Incident Date",
      "State",
      "Address",
      "Resolution Note",
      "Phone Number",
      "Email Address",
      "Business Name",
      "Assigned MDA",
    ];

    const data = reportData.map(ticket => [
      ticket.number,
      ticket.ticketNumber,
      ticket.status,
      ticket.fullName,
      ticket.incidentDate,
      ticket.state,
      ticket.address,
      ticket.resolutionNote,
      ticket.phoneNumber,
      ticket.email,
      ticket.businessName,
      ticket.assignedMDAName,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "MDA Reports");
    XLSX.writeFile(workbook, "MDA_Ticket_Report.xlsx");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8">
      <h1 className="text-2xl font-bold mb-4">Generate MDA Ticket Reports</h1>

      <div className="flex flex-wrap gap-4 mb-4">
        <Button className="flex items-center gap-2" onClick={handleExportPDF}>
          <FaFilePdf className="w-5 h-5" />
          Export to PDF
        </Button>
        <Button className="flex items-center gap-2" onClick={handleExportExcel}>
          <FaFileExcel className="w-5 h-5" />
          Export to Excel
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 mb-6 p-6 bg-white border rounded-lg shadow-lg">
        <Label>From</Label>
        <Input type="date" className="border rounded-lg md:w-1/4" value={fromDate} onChange={e => setFromDate(e.target.value)} placeholder="From Date" />
        <Label>To</Label>
        <Input type="date" className="border rounded-lg md:w-1/4" value={toDate} onChange={e => setToDate(e.target.value)} placeholder="To Date" />
        <Select onValueChange={handleMDASelection}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose MDAs" />
          </SelectTrigger>
          <SelectContent>
            {mdas.map(mda => (
              <SelectItem key={mda._id} value={mda._id}>
                {mda.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {reportData.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>Ticket Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Incident Date</TableHead>
                <TableHead>Assigned MDA</TableHead>
                <TableHead>Resolution</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(ticket => (
                <TableRow key={ticket.ticketNumber}>
                  <TableCell>{ticket.number}</TableCell>
                  <TableCell>{ticket.ticketNumber}</TableCell>
                  <TableCell>{ticket.status}</TableCell>
                  <TableCell>{ticket.fullName}</TableCell>
                  <TableCell>{ticket.incidentDate}</TableCell>
                  <TableCell>{ticket.assignedMDAName}</TableCell>
                  <TableCell>{ticket.resolutionNote}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
