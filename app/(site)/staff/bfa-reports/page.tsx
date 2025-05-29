// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, FileBarChart2, FileText } from "lucide-react";
const NIGERIAN_STATES = ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"];
export default function BFAReportsPage() {
  const {
    user
  } = useUser();
  if (!user || user?.publicMetadata?.role !== "staff") {
    return <p className="text-red-500 text-center mt-10">Unauthorized: Only staff can view these reports.</p>;
  }
  const submittedReports = useQuery(api.internal_reports.getSubmittedReportsWithState) ?? [];
  const reportTemplates = useQuery(api.internal_reports.getAvailableReportsforAdmin, {
    role: "all"
  }) ?? [];
  const getFileUrl = useMutation(api.internal_reports.getStorageUrl);
  const [fileUrls, setFileUrls] = useState<{
    [key: string]: {
      url: string;
      fileName: string;
    };
  }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedState, setSelectedState] = useState("all");
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [selectedMda, setSelectedMda] = useState("all");
  const allowedStreams = ["regulatory", "innovation", "communications", "sub_national"];
  const userRole = user?.publicMetadata?.role as string | undefined;
  const userStream = user?.publicMetadata?.staffStream as string | undefined;
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  monthStart.setHours(0, 0, 0, 0);
  const uniqueMdas = Array.from(new Set(submittedReports.map(r => r.mdaName).filter(Boolean)));
  if (userRole !== "staff" || !userStream || !allowedStreams.includes(userStream)) {
    return <p className="text-red-500 text-center mt-10">
        Unauthorized: You do not have access to this page.
      </p>;
  }
  useEffect(() => {
    const fetchFileUrls = async () => {
      if (submittedReports.length > 0) {
        try {
          const urls = await Promise.all(submittedReports.map(async report => {
            if (report.fileId) {
              const url = await getFileUrl({
                storageId: report.fileId
              });
              const result = await getFileUrl({
                storageId: report.fileId
              });
              if (result && typeof result === "object" && result.url) {
                return {
                  fileId: report.fileId,
                  url: result.url,
                  fileName: result.fileName || `BFA_Report_${report.userName?.replace(/\s+/g, "_") || "unknown"}_${new Date(report.submittedAt).toISOString().split("T")[0]}.pdf`
                };
              }
            }
            return null;
          }));
          const urlMap = urls.reduce((acc, entry) => {
            if (entry) {
              acc[entry.fileId] = {
                url: entry.url,
                fileName: entry.fileName
              };
            }
            return acc;
          }, {} as Record<string, {
            url: string;
            fileName: string;
          }>);
          setFileUrls(urlMap);
        } catch (error) {
          console.error("❌ Failed to fetch file URLs:", error);
        }
      }
    };
    fetchFileUrls();
  }, [submittedReports, getFileUrl]);
  const filteredReports = submittedReports.filter(r => {
    const template = reportTemplates.find(t => t._id === r.templateId);
    return r.reportName === "BFA Report" || template?.title === "BFA Report";
  }).filter(report => {
    const reportDate = new Date(report.submittedAt).toISOString().split("T")[0];
    const matchesStart = startDate ? reportDate >= startDate : true;
    const matchesEnd = endDate ? reportDate <= endDate : true;
    const matchesName = (report.userName ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesState = selectedState === "all" || report.state === selectedState;
    const matchesMda = selectedMda === "all" || report.mdaName === selectedMda;
    return matchesName && matchesStart && matchesEnd && matchesState && matchesMda;
  }).sort((a, b) => b.submittedAt - a.submittedAt);
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const paginatedReports = filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const applyDateRange = (from: Date, to: Date = new Date()) => {
    setStartDate(from.toISOString().split("T")[0]);
    setEndDate(to.toISOString().split("T")[0]);
  };
  const exportToPDF = report => {
    const template = reportTemplates.find(t => t._id === report.templateId);
    if (!template) return toast.error("Template not found.");
    const doc = new jsPDF(report.data?.[0]?.length > 6 ? "landscape" : "portrait");
    doc.text(`Report of ${report.mdaName ?? "Unknown"} (${report.userName ?? "Unknown"})`, doc.internal.pageSize.width / 2, 15, {
      align: "center"
    });
    doc.text(`Submitted On: ${new Date(report.submittedAt).toLocaleDateString()}`, 15, 25);
    autoTable(doc, {
      startY: 35,
      head: [template.headers.map(h => h.name)],
      body: report.data,
      theme: "striped"
    });
    doc.save(`bfa_report_${report.templateId}.pdf`);
  };
  const exportToExcel = report => {
    const template = reportTemplates.find(t => t._id === report.templateId);
    if (!template) return toast.error("Template not found.");
    const headers = template.headers.map(h => h.name);
    const data = [headers, ...report.data];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BFA Report");
    XLSX.writeFile(workbook, `bfa_report_${report.templateId}.xlsx`);
  };
  return <div className="p-6 bg-white rounded-lg shadow-sm max-w-7xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">📄 BFA Reports</h2>

      {}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search User</label>
          <Input placeholder="e.g. John Doe" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <Select value={selectedState} onValueChange={setSelectedState}>
            <SelectTrigger><SelectValue placeholder="All States" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {NIGERIAN_STATES.map(state => <SelectItem key={state} value={state}>{state}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">MDA</label>
  <Select value={selectedMda} onValueChange={setSelectedMda}>
    <SelectTrigger><SelectValue placeholder="All MDAs" /></SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All</SelectItem>
      {uniqueMdas.map(mda => <SelectItem key={mda} value={mda}>{mda}</SelectItem>)}
    </SelectContent>
  </Select>
      </div>

      </div>

      {}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button variant={activeQuickFilter === "today" ? "default" : "outline"} onClick={() => {
        applyDateRange(today);
        setActiveQuickFilter("today");
      }}>Today</Button>

        <Button variant={activeQuickFilter === "week" ? "default" : "outline"} onClick={() => {
        applyDateRange(weekStart);
        setActiveQuickFilter("week");
      }}>This Week</Button>

      {}


        <Button variant="ghost" onClick={() => {
        setStartDate("");
        setEndDate("");
        setActiveQuickFilter(null);
      }}>Clear Date Filter</Button>
      </div>

      {}
      <div className="overflow-x-auto w-full">
        <Table className="min-w-full table-auto">
          <TableHeader>
            <TableRow className="bg-gray-100 text-gray-600 text-sm uppercase tracking-wide">
              <TableHead>Name</TableHead>
              <TableHead>MDA</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Report</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedReports.length > 0 ? paginatedReports.map((report, i) => <TableRow key={i} className="hover:bg-gray-50 border-b">
                <TableCell>{report.userName ?? "Unknown"}</TableCell>
                <TableCell>{report.mdaName ?? "Unknown"}</TableCell>
                <TableCell>{report.state ?? "Unknown"}</TableCell>
                <TableCell>{report.reportName ?? "BFA Report"}</TableCell>
                <TableCell>{new Date(report.submittedAt).toLocaleDateString()}</TableCell>
        <TableCell>
  <div className="flex items-center justify-center space-x-2">
    {report.fileId && !report.templateId && fileUrls[report.fileId] ? <a href={fileUrls[report.fileId].url} download={fileUrls[report.fileId].fileName || "report.pdf"} target="_blank" rel="noopener noreferrer">
        <Button size="sm" variant="ghost" className="p-1.5 text-blue-600 hover:bg-blue-100">
          <Download className="w-4 h-4" />
        </Button>
      </a> : <>
        <Button onClick={() => exportToPDF(report)} size="sm" variant="ghost" className="p-1.5 text-red-600 hover:bg-red-100">
          <FileText className="w-4 h-4" />
        </Button>
        <Button onClick={() => exportToExcel(report)} size="sm" variant="ghost" className="p-1.5 text-green-600 hover:bg-green-100">
          <FileBarChart2 className="w-4 h-4" />
        </Button>
      </>}
  </div>
            </TableCell>




              </TableRow>) : <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500 py-6">
                  No BFA reports found.
                </TableCell>
              </TableRow>}
          </TableBody>
        </Table>
      </div>

      {}
      <div className="flex items-center justify-center mt-4 gap-4">
        <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>◀</Button>
        <span>Page {currentPage} of {totalPages}</span>
        <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>▶</Button>
      </div>
    </div>;
}