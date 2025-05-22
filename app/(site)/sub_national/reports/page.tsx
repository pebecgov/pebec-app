// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import autoTable, { UserOptions } from "jspdf-autotable";
import { toast } from "sonner";
import UploadReports from "@/components/UploadInternalReports";
export default function ReportsPage() {
  const {
    user
  } = useUser();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const getFileUrl = useMutation(api.internal_reports.getStorageUrl);
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  const convexUser = useQuery(api.users.getUserByClerkId, user?.id ? {
    clerkUserId: user.id
  } : "skip");
  const convexUserId = convexUser?._id;
  const availableReports = useQuery(api.internal_reports.getAvailableReports, convexUser?.role ? {
    role: convexUser.role
  } : "skip") ?? [];
  const submittedReports = useQuery(api.internal_reports.getSubmittedReports, convexUserId ? {
    submittedBy: convexUserId
  } : "skip") ?? [];
  useEffect(() => {
    const fetchFileUrls = async () => {
      if (submittedReports.length > 0) {
        try {
          const urls = await Promise.all(submittedReports.map(async report => {
            if (report.fileId) {
              const url = await getFileUrl({
                storageId: report.fileId
              });
              return {
                fileId: report.fileId,
                url: url ?? ""
              };
            }
            return null;
          }));
          const urlMap = urls.filter(entry => entry !== null).reduce((acc, entry) => {
            if (entry) acc[entry.fileId] = entry.url ?? "";
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
  const submittedReportsWithTitles = submittedReports.map(report => {
    const template = availableReports.find(t => t._id === report.templateId);
    return {
      ...report,
      title: report.reportName ?? report.fileName ?? (template ? template.title : "Unknown Report"),
      headers: template ? template.headers.map(header => header.name) : []
    };
  });
  const filteredReports = submittedReportsWithTitles.filter(report => {
    const matchesSearch = searchTerm ? report.title.toLowerCase().includes(searchTerm.toLowerCase()) : true;
    const matchesStartDate = startDate ? new Date(report.submittedAt) >= new Date(startDate) : true;
    const matchesEndDate = endDate ? new Date(report.submittedAt) <= new Date(endDate + "T23:59:59.999Z") : true;
    return matchesSearch && matchesStartDate && matchesEndDate;
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const paginatedReports = filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const exportToPDF = report => {
    if (!user?.fullName) {
      toast.error("User information missing.");
      return;
    }
    const columnCount = report.headers.length;
    const orientation = columnCount > 4 ? "landscape" : "portrait";
    const doc = new jsPDF({
      orientation,
      unit: "mm",
      format: "a4"
    });
    doc.setFontSize(18);
    doc.text(`Report of (${user.fullName})`, doc.internal.pageSize.width / 2, 15, {
      align: "center"
    });
    doc.setFontSize(12);
    doc.text(`Submitted On: ${new Date(report.submittedAt).toLocaleDateString()}`, 15, 25);
    const columnStyles: UserOptions["columnStyles"] = report.headers.reduce((styles, _, index) => ({
      ...styles,
      [index]: {
        cellWidth: "auto"
      }
    }), {});
    autoTable(doc, {
      startY: 35,
      head: [report.headers],
      body: report.data,
      theme: "striped",
      styles: {
        fontSize: 10,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontSize: 12
      },
      columnStyles
    });
    doc.save(`submitted_report.pdf`);
  };
  const exportToExcel = report => {
    const worksheet = XLSX.utils.aoa_to_sheet([report.headers, ...report.data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Submitted Report");
    XLSX.writeFile(workbook, `submitted_report.xlsx`);
  };
  return <div className="p-4 md:p-6 bg-white rounded-lg shadow-md">
      {}
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">📋 Available Reports</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableReports.length > 0 ? availableReports.map(template => <div key={template._id} className="p-3 border rounded-md shadow-sm bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold">{template.title}</h3>
                <p className="text-xs text-gray-600">{template.description}</p>
              </div>
              <Button size="sm" onClick={() => router.push(`/mda/reports/fill/${template._id}`)}>
                📝 Fill
              </Button>
            </div>) : <p className="text-gray-500 text-sm">No reports available for your role.</p>}
      </div>
  
      {}
      <div className="flex flex-col md:flex-row md:items-center justify-between mt-6 gap-4">
    
      
        <div className="flex-1 relative">
        <Button className="bg-green-600 mt-5 mb-5 text-white" onClick={() => setIsUploadModalOpen(true)}>
          📤 Upload Report
        </Button>
          <Input type="text" placeholder="Search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-80 p-2.5 text-sm border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
         
        </div>
       
      </div>
  
      {}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-1">From</label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40 p-2.5 text-sm border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
        </div>
        
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-1">To</label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40 p-2.5 text-sm border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
          
        </div>
        
      </div>

        
        
        
      
      {}
      <div className="overflow-x-auto mt-4">
        <Table className="min-w-full bg-white border rounded-lg shadow">
          <TableHeader>
            <TableRow className="bg-gray-100">
              <TableHead className="py-2 px-4">#</TableHead>
              <TableHead className="py-2 px-4">Report Name</TableHead>
              <TableHead className="py-2 px-4">Submitted On</TableHead>
              <TableHead className="py-2 px-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedReports.length > 0 ? paginatedReports.map((report, index) => <TableRow key={index}>
                  <TableCell className="py-2 px-4">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                  <TableCell className="py-2 px-4">{report.title}</TableCell>
                  <TableCell className="py-2 px-4">{new Date(report.submittedAt).toLocaleDateString()}</TableCell>
                  <TableCell className="py-2 px-4 flex gap-2">
                    {report.fileId ? <a href={fileUrls[report.fileId]} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        📥 Download
                      </a> : <>
                        <Button size="sm" className="bg-gray-600 text-white" onClick={() => exportToPDF(report)}>📄 PDF</Button>
                        <Button size="sm" className="bg-green-600 text-white" onClick={() => exportToExcel(report)}>📊 Excel</Button>
                      </>}
                  </TableCell>
                </TableRow>) : <TableRow>
                <TableCell colSpan={4} className="text-center py-3 text-gray-500">
                  No submitted reports found.
                </TableCell>
              </TableRow>}
          </TableBody>
        </Table>
      </div>
  
      {}
      <div className="flex justify-center items-center mt-4 gap-2">
        <Button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-2 py-1 bg-gray-600 text-white disabled:opacity-50">
          ◀
        </Button>
        <span className="text-gray-700">{currentPage} / {totalPages}</span>
        <Button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-2 py-1 bg-gray-600 text-white disabled:opacity-50">
          ▶
        </Button>
      </div>
  
      {}
      {isUploadModalOpen && <UploadReports onClose={() => setIsUploadModalOpen(false)} onUploadComplete={() => {
      toast.success("Report uploaded successfully!");
      setIsUploadModalOpen(false);
    }} />}
    </div>;
}