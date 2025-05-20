"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import UploadReports from "@/components/Reports/page";
import { Input } from "@/components/ui/input";
import { Id } from "@/convex/_generated/dataModel";

export default function ReportsPage() {
  const { user } = useUser();
  const reports = useQuery(api.reports.getAllReports);
  const deleteReport = useMutation(api.reports.deleteReport);
  const getStorageUrl = (storageId: Id<"_storage">) =>
    useQuery(api.reports.getStorageUrl, { storageId }) || "";
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // ✅ Convert dates to timestamps
  const startTimestamp = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : 0;
  const endTimestamp = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Date.now();

  // ✅ Fetch reports by date range
  const reportsByDateRange = useQuery(
    api.reports.getReportsByDateRange,
    startDate && endDate ? { startDate: startTimestamp, endDate: endTimestamp } : "skip"
  );

  const [currentPage, setCurrentPage] = useState(1);
  const reportsPerPage = 5;

  if (!user || user?.publicMetadata?.role !== "admin") {
    return <p className="text-red-500 text-center mt-10">Unauthorized: Only admins can manage reports.</p>;
  }

  // ✅ Handle file download
  const handleDownload = (fileId: Id<"_storage">) => {
    const fileUrl = getStorageUrl(fileId);
    if (!fileUrl) {
      toast.error("Failed to fetch report URL.");
      return;
    }
    window.open(fileUrl, "_blank");
  };
  
  

  // ✅ Handle file deletion
  const handleDelete = async (reportId: Id<"reports">) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    try {
      await deleteReport({ reportId });
      toast.success("Report deleted successfully.");
    } catch (error) {
      toast.error("Failed to delete report.");
    }
  };

  // ✅ Ensure data is always an array
  const reportsData = reportsByDateRange || reports || [];

  // ✅ Filtering logic (Search & Date Range)
  const filteredReports = reportsData.filter((report) =>
    report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ✅ Pagination logic
  const indexOfLastReport = currentPage * reportsPerPage;
  const indexOfFirstReport = indexOfLastReport - reportsPerPage;
  const currentReports = filteredReports.slice(indexOfFirstReport, indexOfLastReport);

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Header and Upload Button */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h2 className="text-lg md:text-xl mb-2 font-semibold text-black">Uploaded Reports</h2>
        <button
          onClick={() => setShowUploadModal(true)}
          className="relative w-36 h-10 flex items-center justify-center border border-green-500 bg-green-500 rounded-lg group hover:bg-green-600 active:bg-green-700 overflow-hidden"
        >
          <span className="absolute text-white inset-0 flex items-center justify-center transition-all duration-300 group-hover:translate-x-full group-hover:opacity-0">
            Upload
          </span>
          <span className="absolute right-0 h-full w-10 flex items-center justify-center transition-all duration-300 group-hover:w-full">
            <svg
              className="w-6 text-white"
              fill="none"
              height="24"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <line x1="12" x2="12" y1="5" y2="19"></line>
              <line x1="5" x2="19" y1="12" y2="12"></line>
            </svg>
          </span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="relative p-4 w-[40px] h-[40px] hover:w-[250px] bg-green-700 rounded-full flex items-center transition-all duration-300">
          <input
            type="text"
            placeholder="Search for reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="outline-none bg-transparent text-white font-normal w-full pl-10"
          />
        </div>
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-2 border rounded-md w-full md:w-1/4" />
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="p-2 border rounded-md w-full md:w-1/4" />
      </div>

      {/* Table View */}
      <div className="overflow-x-auto bg-white p-6 rounded-lg shadow-lg">
        <table className="w-full text-black">
          <thead>
            <tr className="border-b border-gray-300 text-left">
              <th className="p-3">Title</th>
              <th className="p-3">Description</th>
              <th className="p-3">Size (MB)</th>
              <th className="p-3">Date</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentReports.map((report) => (
              <tr key={report._id} className="border-b border-gray-300">
                <td className="p-3">{report.title}</td>
                <td className="p-3">{report.description}</td>
                <td className="p-3">{report.fileSize.toFixed(2)}</td>
                <td className="p-3">{new Date(report.publishedAt).toLocaleDateString()}</td>
                <td className="p-3 flex gap-2">
                  <button
                    onClick={() => handleDownload(report.fileId)}
                    className="bg-white w-10 h-10 flex justify-center items-center rounded-lg hover:text-blue-600 hover:translate-y-1 hover:duration-300"
                  >
                    ⬇
                  </button>
                  <Button onClick={() => handleDelete(report._id)} className="bg-red-500 hover:bg-red-600">
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {showUploadModal && <UploadReports onClose={() => setShowUploadModal(false)} />}
      </div>
    </div>
  );
}
