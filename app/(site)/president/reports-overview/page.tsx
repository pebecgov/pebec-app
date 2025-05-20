"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  Table, TableHeader, TableBody, TableRow, TableCell, TableHead
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, FileBarChart2, FileText, Trash2 } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import classNames from "classnames";

export default function SubmittedReportsPage() {
  const { user } = useUser();
  const userRole = user?.publicMetadata?.role as string;

  const submittedReports = useQuery(api.internal_reports.getAllSubmittedReports) ?? [];
  const reportTemplates = useQuery(api.internal_reports.getAvailableReportsforAdmin, { role: "all" }) ?? [];
  const deleteReport = useMutation(api.internal_reports.deleteSubmittedReport);
  const getFileUrl = useMutation(api.internal_reports.getStorageUrl);

  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedMda, setSelectedMda] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [mdaSearchQuery, setMdaSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const allUsers = useQuery(api.users.getAllUsers) ?? [];

  const itemsPerPage = 20;

  const getUserImage = (userName: string) => {
    const user = allUsers.find(u => u.fullName === userName);
    return user?.imageUrl ;
  };

  useEffect(() => {
    const fetchFileUrls = async () => {
      if (submittedReports.length > 0) {
        try {
          const urls = await Promise.all(
            submittedReports.map(async (report) => {
              if (report.fileId) {
                const url = await getFileUrl({ storageId: report.fileId });
                return { fileId: report.fileId, url: url ?? "" };
              }
              return null;
            })
          );

          const urlMap = urls.filter(Boolean).reduce((acc, entry) => {
            if (entry) acc[entry.fileId] = entry.url;
            return acc;
          }, {} as Record<string, string>);

          setFileUrls(urlMap);
        } catch (error) {
          console.error("❌ Failed to fetch file URLs:", error);
        }
      }
    };
    fetchFileUrls();
  }, [submittedReports, getFileUrl]);

  const uniqueMdaNames = Array.from(new Set(submittedReports.map((r) => r.mdaName).filter(Boolean)));

  const filteredReports = submittedReports.filter((report) => {
    const matchesRole = selectedRole === "all" || report.role === selectedRole;
    const matchesName = report.userName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMda = selectedMda === "all" || report.mdaName === selectedMda;
    const reportDate = new Date(report.submittedAt).toISOString().split("T")[0];
    const matchesStart = startDate ? reportDate >= startDate : true;
    const matchesEnd = endDate ? reportDate <= endDate : true;
    return matchesRole && matchesName && matchesMda && matchesStart && matchesEnd;
  });

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * itemsPerPage, currentPage * itemsPerPage
  );


  
const handleQuickFilter = (label: string, from: Date, to: Date = new Date()) => {
  setActiveQuickFilter(label);
  setStartDate(from.toISOString().split("T")[0]);
  setEndDate(to.toISOString().split("T")[0]);
};

  const exportToPDF = (report) => {
    const template = reportTemplates.find((t) => t._id === report.templateId);
    if (!template) return toast.error("Template not found.");
    const doc = new jsPDF(report.data?.[0]?.length > 6 ? "landscape" : "portrait");
    doc.text(`Report of (${report.userName})`, doc.internal.pageSize.width / 2, 15, { align: "center" });
    doc.text(`Submitted On: ${new Date(report.submittedAt).toLocaleDateString()}`, 15, 25);
    autoTable(doc, {
      startY: 35,
      head: [template.headers.map((h) => h.name)],
      body: report.data,
      theme: "striped"
    });
    doc.save(`submitted_report_${report.templateId}.pdf`);
  };

  const exportToExcel = (report) => {
    const template = reportTemplates.find((t) => t._id === report.templateId);
    if (!template) return toast.error("Template not found.");
    const headers = template.headers.map((h) => h.name);
    const data = [headers, ...report.data];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Submitted Report");
    XLSX.writeFile(workbook, `submitted_report_${report.templateId}.xlsx`);
  };

  const handleDeleteReport = async () => {
    if (!selectedReportId) return;
    await deleteReport({ id: selectedReportId as Id<"submitted_reports"> });
    toast.success("Report deleted");
    setShowDeleteDialog(false);
  };

  // 📌 Quick Date Filters
  const today = new Date().toISOString().split("T")[0];
  const firstDayOfWeek = new Date();
  firstDayOfWeek.setDate(firstDayOfWeek.getDate() - firstDayOfWeek.getDay());
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);

  const applyDateRange = (from: Date, to: Date = new Date()) => {
    setStartDate(from.toISOString().split("T")[0]);
    setEndDate(to.toISOString().split("T")[0]);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm max-w-7xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">📊 Submitted Reports</h2>

      {/* 🔍 Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search User</label>
          <Input placeholder="e.g. John Doe" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger><SelectValue placeholder="All Roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="mda">MDA</SelectItem>
              <SelectItem value="sub_national">Sub-National</SelectItem>
              <SelectItem value="federal">Federal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">MDA</label>
          <Select value={selectedMda} onValueChange={setSelectedMda}>
            <SelectTrigger><SelectValue placeholder="All MDAs" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {uniqueMdaNames.map((mda) => (
                <SelectItem key={mda} value={mda}>{mda}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ⚡ Quick Date Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
  <Button
    variant={activeQuickFilter === "today" ? "default" : "outline"}
    className={activeQuickFilter === "today" ? "bg-green-700 text-white" : ""}
    onClick={() => {
      applyDateRange(new Date(today));
      setActiveQuickFilter("today");
    }}
  >
    Today
  </Button>

  <Button
    variant={activeQuickFilter === "week" ? "default" : "outline"}
    className={activeQuickFilter === "week" ? "bg-green-700 text-white" : ""}
    onClick={() => {
      applyDateRange(firstDayOfWeek);
      setActiveQuickFilter("week");
    }}
  >
    This Week
  </Button>

  <Button
    variant={activeQuickFilter === "month" ? "default" : "outline"}
    className={activeQuickFilter === "month" ? "bg-green-700 text-white" : ""}
    onClick={() => {
      applyDateRange(firstDayOfMonth);
      setActiveQuickFilter("month");
    }}
  >
    This Month
  </Button>

  <Button
    variant="ghost"
    onClick={() => {
      setStartDate("");
      setEndDate("");
      setActiveQuickFilter(null);
    }}
    className="text-gray-800 hover:underline"
  >
    Clear Date Filter
  </Button>
</div>



      {/* 📋 Table */}
      <div className="overflow-x-auto w-full">
      <Table className="min-w-full table-auto">
      <TableHeader>
          <TableRow className="bg-gray-100 text-gray-600 text-sm uppercase tracking-wide">
          <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>MDA</TableHead>
              <TableHead>Report</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedReports.length > 0 ? paginatedReports.map((r, i) => {
              const template = reportTemplates.find(t => t._id === r.templateId);
              return (
                <TableRow key={i} className=" hover:bg-gray-50 border-b">
<TableCell className="min-w-[180px] sm:min-w-[200px]">
  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 w-full">
    <img
      src={getUserImage(r.userName) || "/placeholder.png"}
      alt={r.userName}
      className="w-10 h-10 rounded-full object-cover"
    />
    <div className="text-center sm:text-left">
      <p className="text-sm font-semibold text-gray-800 leading-tight break-words">{r.userName}</p>
      <p className="text-xs text-gray-500">{r.role}</p>
    </div>
  </div>
</TableCell>



                  <TableCell>{r.role}</TableCell>
                  <TableCell>{r.mdaName || "-"}</TableCell>
                  <TableCell>{r.reportName || template?.title || "—"}</TableCell>
                  <TableCell>{new Date(r.submittedAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2 justify-center">
                      {r.fileId ? (
                        <a href={fileUrls[r.fileId]} target="_blank" rel="noopener noreferrer">
                          <Button size="icon" className="bg-blue-600 hover:bg-blue-700 text-white"><Download className="w-4 h-4" /></Button>
                        </a>
                      ) : (
                        <>
<Button
  onClick={() => exportToPDF(r)}
  size="icon"
  className="bg-red-600 hover:bg-red-700 text-white"
  title="Export to PDF"
>
  <FileText className="w-4 h-4" />
</Button>
                          <Button onClick={() => exportToExcel(r)} size="icon" className="bg-green-600 text-white"><FileBarChart2 className="w-4 h-4" /></Button>
                        </>
                      )}
                      {userRole !== "vice_president" && userRole !== "president" && (
                        <Button onClick={() => { setSelectedReportId(r._id); setShowDeleteDialog(true); }} size="icon" className="bg-red-600 text-white"><Trash2 className="w-4 h-4" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            }) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500 py-6">
                  No submitted reports found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center mt-4 gap-4">
        <Button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>◀</Button>
        <span>Page {currentPage} of {totalPages}</span>
        <Button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>▶</Button>
      </div>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Report</DialogTitle></DialogHeader>
          <p>This action cannot be undone. Are you sure?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteReport}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
