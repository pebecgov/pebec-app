// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
export default function SubmittedReportsPage() {
  const {
    user
  } = useUser();
  const submittedReports = useQuery(api.internal_reports.getAllSubmittedReports) ?? [];
  const reportTemplates = useQuery(api.internal_reports.getAvailableReportsforAdmin, {
    role: "all"
  }) ?? [];
  const deleteReport = useMutation(api.internal_reports.deleteSubmittedReport);
  const getFileUrl = useMutation(api.internal_reports.getStorageUrl);
  const [fileUrls, setFileUrls] = useState<Record<string, {
    url: string;
    fileName: string;
  }>>({});
  const [selectedRole, setSelectedRole] = useState<"all" | "admin" | "user" | "mda" | "staff" | "sub_national" | "federal" | "deputies" | "magistrates" | "state_governor" | "president" | "vice_president">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  useEffect(() => {
    const fetchFileUrls = async () => {
      if (submittedReports.length > 0) {
        try {
          const urls = await Promise.all(submittedReports.map(async report => {
            if (report.fileId) {
              const response = await getFileUrl({
                storageId: report.fileId
              });
              if (response) {
                return {
                  storageId: report.fileId,
                  url: response.url,
                  fileName: response.fileName
                };
              }
            }
            return null;
          }));
          const urlMap = urls.filter((entry): entry is {
            storageId: Id<"_storage">;
            url: string;
            fileName: string;
          } => entry !== null).reduce((acc, entry) => {
            acc[entry.storageId] = {
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
  const filteredReports = submittedReports.filter(report => {
    const matchesRole = selectedRole === "all" || report.role === selectedRole;
    const matchesName = report.userName?.toLowerCase().includes(searchQuery.toLowerCase());
    const reportDate = new Date(report.submittedAt).toISOString().split("T")[0];
    const matchesStartDate = startDate ? reportDate >= startDate : true;
    const matchesEndDate = endDate ? reportDate <= endDate : true;
    return matchesRole && matchesName && matchesStartDate && matchesEndDate;
  });
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const paginatedReports = filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const exportToPDF = report => {
    const template = reportTemplates.find(t => t._id === report.templateId);
    if (!template) return toast.error("Template not found.");
    const doc = new jsPDF(report.data?.[0]?.length > 6 ? "landscape" : "portrait");
    doc.setFontSize(18);
    doc.text(`Report of (${report.userName})`, doc.internal.pageSize.width / 2, 15, {
      align: "center"
    });
    doc.setFontSize(12);
    doc.text(`Submitted On: ${new Date(report.submittedAt).toLocaleDateString()}`, 15, 25);
    autoTable(doc, {
      startY: 35,
      head: [template.headers.map(h => h.name)],
      body: report.data,
      theme: "striped",
      styles: {
        fontSize: 10,
        cellPadding: 4
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontSize: 12
      }
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
  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm("Are you sure you want to delete this report? This action cannot be undone.")) return;
    try {
      await deleteReport({
        id: reportId as Id<"submitted_reports">
      });
      toast.success("Report deleted successfully.");
    } catch (error) {
      console.error("❌ Failed to delete report:", error);
      toast.error("Failed to delete report.");
    }
  };
  return <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-lg font-semibold">📄 Submitted Reports</h2>

      {}
      <div className="flex flex-col md:flex-row gap-4 my-4">
      <Input placeholder="🔍 Search by user name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full md:w-80" />
        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full md:w-40" />
        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full md:w-40" />
        <Select onValueChange={val => setSelectedRole(val as any)} value={selectedRole}>
        <SelectTrigger className="w-full md:w-1/5">
        <SelectValue placeholder="Filter by Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="mda">MDA</SelectItem>
            <SelectItem value="sub_national">Sub-National</SelectItem>
            <SelectItem value="deputies">Sherrif</SelectItem>
            <SelectItem value="federal">Federal</SelectItem>
            <SelectItem value="magistrates">Magistrates</SelectItem>



          </SelectContent>
        </Select>
      </div>

      {}
      <div className="overflow-x-auto">
      <Table className="min-w-full">
  <TableHeader>
    <TableRow className="bg-gray-200">
      <TableHead>Name</TableHead>
      <TableHead>Role</TableHead>
      <TableHead>Report Name</TableHead>
      <TableHead>Submitted On</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {paginatedReports.length > 0 ? paginatedReports.map((report, index) => {
            const template = reportTemplates.find(t => t._id === report.templateId);
            return <TableRow key={index}>
            <TableCell>{report.userName}</TableCell>
            <TableCell>{report.role.toUpperCase()}</TableCell>
            <TableCell>{report.reportName || template?.title || "Unknown Report"}</TableCell>
            <TableCell>{new Date(report.submittedAt).toLocaleDateString()}</TableCell>
            <TableCell className="flex gap-2">
  {report.fileId && fileUrls[report.fileId] ? <Button className="bg-blue-600 text-white px-2" onClick={() => {
                  if (!report.fileId) {
                    toast.error("No file available.");
                    return;
                  }
                  const fileMeta = fileUrls[report.fileId];
                  if (!fileMeta) {
                    toast.error("File URL is not loaded yet.");
                    return;
                  }
                  const link = document.createElement("a");
                  link.href = fileMeta.url;
                  link.download = fileMeta.fileName || "downloaded_file";
                  link.target = "_blank";
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}>
  📥 Download
                </Button> : <>
      <Button className="bg-gray-600 text-white px-2" onClick={() => exportToPDF(report)}>📄</Button>
      <Button className="bg-green-600 text-white px-2" onClick={() => exportToExcel(report)}>📊</Button>
    </>}
  <Button className="bg-red-600 text-white px-2" onClick={() => handleDeleteReport(report._id)}>
    <Trash2 className="w-4 h-4" />
  </Button>
              </TableCell>


          </TableRow>;
          }) : <TableRow>
        <TableCell colSpan={5} className="text-center text-gray-500">No submitted reports found.</TableCell>
      </TableRow>}
  </TableBody>
      </Table>

      {}
      {}
      <div className="flex justify-center items-center mt-4 gap-2">
  <Button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="bg-gray-800 text-white px-2 py-1 rounded disabled:opacity-50">
    ◀
  </Button>

  <span className="text-gray-600 text-sm">{currentPage} / {totalPages}</span>

  <Button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="bg-gray-800 text-white px-2 py-1 rounded disabled:opacity-50">
    ▶
  </Button>
      </div>

      </div>
    </div>;
}