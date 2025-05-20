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
import autoTable, { UserOptions } from "jspdf-autotable"; // ✅ Import UserOptions

import { toast } from "sonner";
import UploadReports from "@/components/UploadInternalReports";
import { Id } from "@/convex/_generated/dataModel";

export default function ReportsPage() {
  const { user } = useUser();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false); // ✅ Modal state

  const getFileUrl = useMutation(api.internal_reports.getStorageUrl);
  const [fileUrls, setFileUrls] = useState<Record<string, { url: string; fileName: string }>>({});
  const [isReportGeneratorOpen, setIsReportGeneratorOpen] = useState(false);

  // ✅ Fetch Convex User ID
  const convexUser = useQuery(api.users.getUserByClerkId, user?.id ? { clerkUserId: user.id } : "skip");
  const convexUserId = convexUser?._id;



  
  // ✅ Fetch Available Report Templates
  const availableReports = useQuery(
    api.internal_reports.getAvailableReports,
    convexUser?.role ? { role: convexUser.role } : "skip"
  ) ?? [];

  // ✅ Fetch Submitted Reports
  const submittedReports = useQuery(
    api.internal_reports.getSubmittedReports,
    convexUserId ? { submittedBy: convexUserId } : "skip"
  ) ?? [];



  useEffect(() => {
    const fetchFileUrls = async () => {
      if (submittedReports.length > 0) {
        try {
          const urls = await Promise.all(
            submittedReports.map(async (report) => {
              if (report.fileId) {
                const response = await getFileUrl({ storageId: report.fileId });
                if (response) {
                  return { storageId: report.fileId, url: response.url, fileName: response.fileName };
                }
              }
              return null;
            })
          );
  
          const urlMap = urls
            .filter((entry): entry is { storageId: Id<"_storage">; url: string; fileName: string } => entry !== null)
            .reduce((acc, entry) => {
              acc[entry.storageId] = { url: entry.url, fileName: entry.fileName };
              return acc;
            }, {} as Record<string, { url: string; fileName: string }>);
  
          setFileUrls(urlMap);
        } catch (error) {
          console.error("❌ Failed to fetch file URLs:", error);
        }
      }
    };
  
    fetchFileUrls();
  }, [submittedReports, getFileUrl]);



  const submittedReportsWithTitles = submittedReports
  .map((report) => {
    const template = availableReports.find((t) => t._id === report.templateId);
    return {
      ...report,
      title: report.reportName ?? report.fileName ?? (template ? template.title : "Unknown Report"),
      headers: template ? template.headers.map((header) => header.name) : [],
    };
  })
  .sort((a, b) => b.submittedAt - a.submittedAt); // ✅ Sort: Newest to Oldest
  
  
  // ✅ Apply Filters
  const filteredReports = submittedReportsWithTitles.filter((report) => {
    const matchesSearch = searchTerm
      ? report.title.toLowerCase().includes(searchTerm.toLowerCase())
      : true;

    const matchesStartDate = startDate ? new Date(report.submittedAt) >= new Date(startDate) : true;
    const matchesEndDate = endDate ? new Date(report.submittedAt) <= new Date(endDate + "T23:59:59.999Z") : true;

    return matchesSearch && matchesStartDate && matchesEndDate;
  });
  

   // ✅ Pagination Setup
   const [currentPage, setCurrentPage] = useState(1);
   const itemsPerPage = 20;
   const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
   const paginatedReports = filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
 

 
   
   const exportToPDF = (report, convexUser) => {
     const firstName = convexUser?.firstName || "";
     const lastName = convexUser?.lastName || "";
     const fullName = `${firstName} ${lastName}`.trim() || "Unknown User";
     const mdaName = convexUser?.mdaName || "Unknown MDA";
   
     const columnCount = report.headers.length;
     const orientation = columnCount > 4 ? "landscape" : "portrait";
   
     const doc = new jsPDF({
       orientation,
       unit: "mm",
       format: "a4",
     });
   
     doc.setFontSize(16);
     doc.text(`Report of - ${mdaName} (${fullName})`, doc.internal.pageSize.width / 2, 15, {
       align: "center",
     });
   
     doc.setFontSize(11);
     doc.text(`Submitted On: ${new Date(report.submittedAt).toLocaleDateString()}`, 14, 25);
   
     autoTable(doc, {
       startY: 35,
       head: [report.headers],
       body: report.data,
       styles: {
         fontSize: 8,
         cellPadding: 2,
         overflow: "linebreak",
       },
       headStyles: {
         fillColor: [41, 128, 185],
         textColor: [255, 255, 255],
         fontSize: 9,
       },
       columnStyles: report.headers.reduce((acc, _, i) => {
         acc[i] = { cellWidth: "wrap" };
         return acc;
       }, {}),
       theme: "striped",
       tableWidth: "auto",
     });
   
     doc.save("submitted_report.pdf");
   };
   
  // ✅ Export to Excel
  const exportToExcel = (report) => {
    const worksheet = XLSX.utils.aoa_to_sheet([report.headers, ...report.data]); // ✅ Include column headers
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Submitted Report");
    XLSX.writeFile(workbook, `submitted_report.xlsx`);
  };



  return (
    <div className="p-4 md:p-6 bg-white rounded-lg shadow-md">
      {/* 📌 Available Reports */}
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">📋 Available Reports</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableReports.length > 0 ? (
          availableReports.map((template) => (
            <div key={template._id} className="p-3 border rounded-md shadow-sm bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold">{template.title}</h3>
                <p className="text-xs text-gray-600">{template.description}</p>
              </div>
              <Button size="sm" onClick={() => router.push(`/reform_champion/reports/fill/${template._id}`)}>
                📝 Fill
              </Button>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-sm">No reports available for your role.</p>
        )}
      </div>
  
      {/* 📤 Search Bar & Upload Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mt-6 gap-4">
    
      
        <div className="flex-1 relative">
        <div className="flex gap-4 mt-5 mb-5">
  <Button
    className="bg-green-600 text-white"
    onClick={() => setIsUploadModalOpen(true)}
  >
    📤 Upload Report
  </Button>

  <Button
    className="bg-blue-600 text-white"
    onClick={() => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const endOfToday = new Date().setHours(23, 59, 59, 999);

      const monthlyFiltered = submittedReportsWithTitles.filter((r) => {
        const ts = new Date(r.submittedAt).getTime();
        return ts >= startOfMonth && ts <= endOfToday;
      });

      if (monthlyFiltered.length === 0) {
        toast.info("No reports submitted this month.");
        return;
      }

      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(18);
      doc.text(" Monthly Submitted Reports Summary", 14, 20);
      doc.setFontSize(10);
      doc.text(
        `From: ${new Date(startOfMonth).toLocaleDateString()} To: ${new Date(endOfToday).toLocaleDateString()}`,
        14,
        28
      );

      const tableData = monthlyFiltered.map((report, index) => [
        index + 1,
        report.title,
        new Date(report.submittedAt).toLocaleDateString(),
      ]);

      autoTable(doc, {
        startY: 35,
        head: [["#", "Report Name", "Submitted On"]],
        body: tableData,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        theme: "striped",
      });

      doc.save("monthly_report.pdf");
    }}
  >
    📥 Download Monthly Report
  </Button>
</div>


          <Input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-80 p-2.5 text-sm border rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />

         
        </div>
       
      </div>
  
      {/* 📅 Date Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-1">From</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40 p-2.5 text-sm border rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-1">To</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40 p-2.5 text-sm border rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
          
        </div>
        
      </div>

      {startDate && endDate && filteredReports.length > 0 && (
  <div className="mt-4 flex justify-end">
    <Button
      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow transition"
      onClick={() => {
        const doc = new jsPDF({ orientation: "landscape" });
        doc.setFontSize(18);
        doc.text("📋 Exported Report View", 14, 20);
        doc.setFontSize(10);
        doc.text(
          `Date Range: ${new Date(startDate).toLocaleDateString()} - ${new Date(
            endDate
          ).toLocaleDateString()}`,
          14,
          28
        );

        const tableData = filteredReports.map((report, index) => [
          index + 1,
          report.title,
          new Date(report.submittedAt).toLocaleDateString(),
        ]);

        autoTable(doc, {
          startY: 35,
          head: [["#", "Report Name", "Submitted On"]],
          body: tableData,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          theme: "striped",
        });

        doc.save("report_view.pdf");
      }}
    >
      📤 Export Report View (PDF)
    </Button>
  </div>
)}


        
        
        
      
      {/* 📌 Reports Table */}
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
            {paginatedReports.length > 0 ? (
              paginatedReports.map((report, index) => (
                <TableRow key={index}>
                  <TableCell className="py-2 px-4">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                  <TableCell className="py-2 px-4">{report.title}</TableCell>
                  <TableCell className="py-2 px-4">{new Date(report.submittedAt).toLocaleDateString()}</TableCell>
                  <TableCell className="flex gap-2">
  {report.fileId && fileUrls[report.fileId] ? (
    <Button
  className="bg-blue-600 text-white px-2"
  onClick={async () => {
    if (!report.fileId) {
      toast.error("No file available.");
      return;
    }

    const fileMeta = fileUrls[report.fileId];
    if (!fileMeta) {
      toast.error("File URL is not loaded yet.");
      return;
    }

    try {
      const response = await fetch(fileMeta.url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileMeta.fileName || "downloaded_file"; // ✅ Real filename
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("❌ Download failed:", error);
      toast.error("Failed to download the file.");
    }
  }}
>
  📥 Download
</Button>



 
  ) : (
    <>
<Button
  className="bg-red-600 text-white px-3 py-1 flex items-center gap-1"
  onClick={() => exportToPDF(report, convexUser)} // ✅ pass convexUser here
>
  📄 <span className="text-xs font-semibold">PDF</span>
</Button>


  <Button
    className="bg-green-600 text-white px-3 py-1 flex items-center gap-1"
    onClick={() => exportToExcel(report)}
  >
    📊 <span className="text-xs font-semibold">EXCEL</span>
  </Button>

    </>
  )}
 
</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-3 text-gray-500">
                  No submitted reports found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
  
      {/* 📌 Pagination */}
      <div className="flex justify-center items-center mt-4 gap-2">
        <Button 
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} 
          disabled={currentPage === 1} 
          className="px-2 py-1 bg-gray-600 text-white disabled:opacity-50"
        >
          ◀
        </Button>
        <span className="text-gray-700">{currentPage} / {totalPages}</span>
        <Button 
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} 
          disabled={currentPage === totalPages} 
          className="px-2 py-1 bg-gray-600 text-white disabled:opacity-50"
        >
          ▶
        </Button>
      </div>
  
      {/* 📌 Upload Report Modal */}
      {isUploadModalOpen && (
        <UploadReports
          onClose={() => setIsUploadModalOpen(false)}
          onUploadComplete={() => {
            toast.success("Report uploaded successfully!");
            setIsUploadModalOpen(false);
          }}
        />
      )}


    </div>
  );
}  