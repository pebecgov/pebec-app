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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, FileBarChart2, FileText, Trash2, Pencil } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import classNames from "classnames";
import { formatRole } from "@/lib/formatters";
import Loader from "@/components/Loader";
import SubmittedReportsMdaMatrixDialog from "@/components/Admin/SubmittedReportsMdaMatrixDialog";
import {
  MONTHS_LONG,
  formatReportPeriodLabel,
  getSelectableReportYears,
  isBfaReportName,
  resolveReportPeriod,
} from "@/lib/reportPeriod";

export default function SubmittedReportsPage() {
  const {
    user
  } = useUser();
  const userRole = user?.publicMetadata?.role as string;
  const submittedReports = useQuery(api.internal_reports.getAllSubmittedReports);
  const reportTemplates = useQuery(api.internal_reports.getAvailableReportsforAdmin, {
    role: "all"
  }) ?? [];
  const deleteReport = useMutation(api.internal_reports.deleteSubmittedReport);
  const updateBfaReportPeriod = useMutation(api.internal_reports.updateBfaReportPeriod);
  const getFileUrl = useMutation(api.internal_reports.getStorageUrl);
  const [fileUrls, setFileUrls] = useState<Record<string, {
    url: string;
    fileName: string;
  }>>({});
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedMda, setSelectedMda] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [mdaSearchQuery, setMdaSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMdaMatrixDialog, setShowMdaMatrixDialog] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [showEditPeriodDialog, setShowEditPeriodDialog] = useState(false);
  const [editReportId, setEditReportId] = useState<Id<"submitted_reports"> | null>(null);
  const [editMonth, setEditMonth] = useState("January");
  const [editYear, setEditYear] = useState(String(new Date().getFullYear()));
  const [savingPeriod, setSavingPeriod] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const itemsPerPage = 20;
  useEffect(() => {
    const fetchFileUrls = async () => {
      if (submittedReports && submittedReports.length > 0) {
        try {
          const urls = await Promise.all(submittedReports.map(async report => {
            if (report.fileId) {
              const response = await getFileUrl({
                storageId: report.fileId
              });
              if (response) {
                const {
                  url,
                  fileName
                } = response;
                return {
                  storageId: report.fileId,
                  url,
                  fileName
                };
              }
            }
            return null;
          }));
          const urlMap = urls.filter(Boolean).reduce((acc, entry) => {
            if (entry) acc[entry.storageId] = {
              url: entry.url,
              fileName: entry.fileName
            };
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
  const uniqueMdaNames = Array.from(new Set(submittedReports?.map(r => r.mdaName).filter(Boolean) || []));
  const filteredReports = submittedReports?.filter(report => {
    const matchesRole = selectedRole === "all" || report.role === selectedRole;
    const matchesName = report.userName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMda = selectedMda === "all" || report.mdaName === selectedMda;
    const reportDate = new Date(report.submittedAt).toISOString().split("T")[0];
    const matchesStart = startDate ? reportDate >= startDate : true;
    const matchesEnd = endDate ? reportDate <= endDate : true;
    return matchesRole && matchesName && matchesMda && matchesStart && matchesEnd;
  }).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()) || [];
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const paginatedReports = filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const handleQuickFilter = (label: string, from: Date, to: Date = new Date()) => {
    setActiveQuickFilter(label);
    setStartDate(from.toISOString().split("T")[0]);
    setEndDate(to.toISOString().split("T")[0]);
  };
  const exportToPDF = report => {
    const template = reportTemplates.find(t => t._id === report.templateId);
    if (!template) {
      toast.error("Template not found.");
      return;
    }
    const columnCount = template.headers.length;
    const orientation = columnCount > 6 ? "landscape" : "portrait";
    const doc = new jsPDF({
      orientation,
      unit: "mm",
      format: "a4"
    });
    const title = `Report of - ${report.mdaName || "Unknown MDA"} (${report.userName || "Unknown User"})`;
    doc.setFontSize(14);
    doc.text(title, doc.internal.pageSize.width / 2, 15, {
      align: "center"
    });
    doc.setFontSize(10);
    doc.text(`Submitted On: ${new Date(report.submittedAt).toLocaleDateString()}`, 15, 25);
    const headers = template.headers.map(h => h.name);
    autoTable(doc, {
      startY: 35,
      head: [headers],
      body: report.data,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: "linebreak"
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontSize: 9
      },
      columnStyles: headers.reduce((acc, _, i) => {
        acc[i] = {
          cellWidth: "auto"
        };
        return acc;
      }, {}),
      theme: "striped",
      tableWidth: "auto"
    });
    doc.save(`submitted_report_${report.templateId}.pdf`);
  };
  const exportToExcel = report => {
    const template = reportTemplates.find(t => t._id === report.templateId);
    if (!template) return toast.error("Template not found.");
    const headers = template.headers.map(h => h.name);
    const data = [headers, ...report.data];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Submitted Report");
    XLSX.writeFile(workbook, `submitted_report_${report.templateId}.xlsx`);
  };
  const handleDeleteReport = async () => {
    if (!selectedReportId) return;
    await deleteReport({
      id: selectedReportId as Id<"submitted_reports">
    });
    toast.success("Report deleted");
    setShowDeleteDialog(false);
  };

  const openEditPeriodDialog = (report: {
    _id: Id<"submitted_reports">;
    reportName?: string;
    fileName?: string;
    submittedAt: number;
    reportPeriodMonth?: number;
    reportPeriodYear?: number;
  }) => {
    const period = resolveReportPeriod(report);
    setEditReportId(report._id);
    setEditMonth(period ? MONTHS_LONG[period.month] : MONTHS_LONG[new Date(report.submittedAt).getMonth()]);
    setEditYear(String(period?.year ?? new Date(report.submittedAt).getFullYear()));
    setShowEditPeriodDialog(true);
  };

  const handleSaveReportPeriod = async () => {
    if (!editReportId) return;
    const monthIndex = MONTHS_LONG.indexOf(editMonth);
    if (monthIndex < 0) {
      toast.error("Invalid month selected.");
      return;
    }
    setSavingPeriod(true);
    try {
      const result = await updateBfaReportPeriod({
        reportId: editReportId,
        reportPeriodMonth: monthIndex,
        reportPeriodYear: Number(editYear),
      });
      toast.success(`Reporting period updated to ${result.reportName}`);
      setShowEditPeriodDialog(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update reporting period.");
    } finally {
      setSavingPeriod(false);
    }
  };

  const getReportingPeriodLabel = (report: {
    reportName?: string;
    fileName?: string;
    submittedAt: number;
    reportPeriodMonth?: number;
    reportPeriodYear?: number;
  }) => {
    const period = resolveReportPeriod(report);
    if (period) return formatReportPeriodLabel(period.month, period.year);
    return "—";
  };
  const today = new Date().toISOString().split("T")[0];
  const firstDayOfWeek = new Date();
  firstDayOfWeek.setDate(firstDayOfWeek.getDate() - firstDayOfWeek.getDay());
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  const applyDateRange = (from: Date, to: Date = new Date()) => {
    setStartDate(from.toISOString().split("T")[0]);
    setEndDate(to.toISOString().split("T")[0]);
  };
  return <div className="p-6 bg-white rounded-lg shadow-sm max-w-7xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">📊 Submitted Reports</h2>

      {}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search User</label>
          <Input placeholder="e.g. John Doe" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
  <Input type="date" value={startDate} max={endDate || undefined} onChange={e => {
          const newStart = e.target.value;
          setStartDate(newStart);
          if (endDate && newStart > endDate) {
            setEndDate("");
          }
        }} />
      </div>

      <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
  <Input type="date" value={endDate} min={startDate || undefined} onChange={e => setEndDate(e.target.value)} />
      </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger><SelectValue placeholder="All Roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="reform_champion">MDA - Reform Champion</SelectItem>
              <SelectItem value="deputies">Sherrif</SelectItem>
              <SelectItem value="magistrates">Magistrates</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">MDA</label>
          <Select value={selectedMda} onValueChange={setSelectedMda}>
            <SelectTrigger><SelectValue placeholder="All MDAs" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {uniqueMdaNames.map(mda => <SelectItem key={mda} value={mda}>{mda}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {}
      <div className="flex flex-wrap gap-2 mb-4">
  <Button variant={activeQuickFilter === "today" ? "default" : "outline"} className={activeQuickFilter === "today" ? "bg-green-700 text-white" : ""} onClick={() => {
        applyDateRange(new Date(today));
        setActiveQuickFilter("today");
      }}>
    Today
  </Button>

  <Button variant={activeQuickFilter === "week" ? "default" : "outline"} className={activeQuickFilter === "week" ? "bg-green-700 text-white" : ""} onClick={() => {
        applyDateRange(firstDayOfWeek);
        setActiveQuickFilter("week");
      }}>
    This Week
  </Button>

  <Button variant={activeQuickFilter === "month" ? "default" : "outline"} className={activeQuickFilter === "month" ? "bg-green-700 text-white" : ""} onClick={() => {
        applyDateRange(firstDayOfMonth);
        setActiveQuickFilter("month");
      }}>
    This Month
  </Button>

  <Button variant="ghost" onClick={() => {
        setStartDate("");
        setEndDate("");
        setActiveQuickFilter(null);
      }} className="text-gray-800 hover:underline">
    Clear Date Filter
  </Button>

  <Button
    variant="outline"
    onClick={() => setShowMdaMatrixDialog(true)}
    className="bg-green-600 border-green-600 text-white hover:bg-green-700 hover:border-green-700"
    title="MDA submission status matrix by month"
  >
    MDA Matrix
  </Button>
    </div>



      {}
      {submittedReports === undefined ? (
        <div className="flex justify-center items-center py-12">
          <Loader />
        </div>
      ) : (
        <div className="overflow-x-auto w-full">
        <Table className="min-w-full table-auto">
        <TableHeader>
            <TableRow className="bg-gray-100 text-gray-600 text-sm uppercase tracking-wide">
            <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>MDA</TableHead>
                <TableHead>Report</TableHead>
                <TableHead>Reporting Period</TableHead>
                <TableHead>Submitted On</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedReports.map((r, i) => {
              const template = reportTemplates.find(t => t._id === r.templateId);
              return <TableRow key={i} className=" hover:bg-gray-50 border-b">
                <TableCell className="min-w-[180px] sm:min-w-[200px]">
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 w-full">
      <img src={r.userImageUrl || "/placeholder.png"} alt={r.userName} className="w-10 h-10 rounded-full object-cover" />
      <div className="text-center sm:text-left">
        <p className="text-sm font-semibold text-gray-800 leading-tight break-words">{r.userName}</p>
        <p className="text-xs text-gray-500">{formatRole(r.role)}</p>
      </div>
    </div>
                </TableCell>



                    <TableCell>{formatRole(r.role)}</TableCell>
                    <TableCell>{r.mdaName || "-"}</TableCell>
                    <TableCell>{r.reportName || template?.title || "—"}</TableCell>
                    <TableCell>{getReportingPeriodLabel(r)}</TableCell>
                    <TableCell>{new Date(r.submittedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
    <div className="flex gap-2 justify-center">
      {isBfaReportName(r.reportName) && userRole !== "vice_president" && userRole !== "president" && (
        <Button
          onClick={() => openEditPeriodDialog(r)}
          size="icon"
          className="bg-amber-600 hover:bg-amber-700 text-white"
          title="Edit reporting period"
        >
          <Pencil className="w-4 h-4" />
        </Button>
      )}
      {r.fileId && fileUrls[r.fileId] ? <Button size="icon" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={async () => {
                      const fileMeta = r.fileId ? fileUrls[r.fileId] : null;
                      if (!fileMeta) return;
                      try {
                        const response = await fetch(fileMeta.url);
                        const blob = await response.blob();
                        const blobUrl = window.URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = blobUrl;
                        link.download = fileMeta.fileName || "downloaded_file";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(blobUrl);
                      } catch (error) {
                        console.error("Download failed", error);
                        toast.error("Failed to download file");
                      }
                    }}>
          <Download className="w-4 h-4" />
        </Button> : <>
          <Button onClick={() => exportToPDF(r)} size="icon" className="bg-red-600 hover:bg-red-700 text-white" title="Export to PDF">
            <FileText className="w-4 h-4" />
          </Button>
          <Button onClick={() => exportToExcel(r)} size="icon" className="bg-green-600 text-white" title="Export to Excel">
            <FileBarChart2 className="w-4 h-4" />
          </Button>
        </>}

      {userRole !== "vice_president" && userRole !== "president" && <Button onClick={() => {
                      setSelectedReportId(r._id);
                      setShowDeleteDialog(true);
                    }} size="icon" className="bg-red-600 text-white" title="Delete">
          <Trash2 className="w-4 h-4" />
        </Button>}
    </div>
                    </TableCell>

                  </TableRow>;
            })}
            </TableBody>
          </Table>
        </div>
      )}

      {}
      <div className="flex items-center justify-center mt-4 gap-4">
        <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>◀</Button>
        <span>Page {currentPage} of {totalPages}</span>
        <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>▶</Button>
      </div>

      {}
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

      <Dialog open={showEditPeriodDialog} onOpenChange={setShowEditPeriodDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit BFA Reporting Period</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Change the month and year this BFA report covers. This does not change when the file was uploaded.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <Select value={editMonth} onValueChange={setEditMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS_LONG.map((month) => (
                    <SelectItem key={month} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <Select value={editYear} onValueChange={setEditYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {getSelectableReportYears().map((year) => (
                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditPeriodDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveReportPeriod} disabled={savingPeriod}>
              {savingPeriod ? "Saving..." : "Save Period"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SubmittedReportsMdaMatrixDialog
        open={showMdaMatrixDialog}
        onOpenChange={setShowMdaMatrixDialog}
        submittedReports={submittedReports}
      />
    </div>;
}