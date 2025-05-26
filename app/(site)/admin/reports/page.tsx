// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
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
import { format } from "date-fns";
export default function ReportsPage() {
  const {
    user
  } = useUser();
  const reports = useQuery(api.reports.getAllReports);
  const deleteReport = useMutation(api.reports.deleteReport);
  const getStorageUrl = (storageId: Id<"_storage">) => useQuery(api.reports.getStorageUrl, {
    storageId
  }) || "";
  const today = format(new Date(), "yyyy-MM-dd");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const startTimestamp = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : 0;
  const endTimestamp = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Date.now();
  const reportsByDateRange = useQuery(api.reports.getReportsByDateRange, startDate && endDate ? {
    startDate: startTimestamp,
    endDate: endTimestamp
  } : "skip");
  const [currentPage, setCurrentPage] = useState(1);
  const reportsPerPage = 10;
  if (!user || user?.publicMetadata?.role !== "admin") {
    return <p className="text-red-500 text-center mt-10">Unauthorized: Only admins can manage reports.</p>;
  }
  const handleDownload = (fileId: Id<"_storage">) => {
    const fileUrl = getStorageUrl(fileId);
    if (!fileUrl) {
      toast.error("Failed to fetch report URL.");
      return;
    }
    window.open(fileUrl, "_blank");
  };
  const handleDelete = async (reportId: Id<"reports">) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    try {
      await deleteReport({
        reportId
      });
      toast.success("Report deleted successfully.");
    } catch (error) {
      toast.error("Failed to delete report.");
    }
  };
  const reportsData = reportsByDateRange || reports || [];
  const filteredReports = reportsData.filter(report => report.title.toLowerCase().includes(searchQuery.toLowerCase()) || report.description.toLowerCase().includes(searchQuery.toLowerCase()));
  const indexOfLastReport = currentPage * reportsPerPage;
  const indexOfFirstReport = indexOfLastReport - reportsPerPage;
  const currentReports = filteredReports.slice(indexOfFirstReport, indexOfLastReport);
  return <div className="container mx-auto p-4 md:p-6">
      {}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h2 className="text-lg md:text-xl mb-2 font-semibold text-black">Uploaded Reports</h2>
        <button onClick={() => setShowUploadModal(true)} className="relative w-36 h-10 flex items-center justify-center border border-green-500 bg-green-500 rounded-lg group hover:bg-green-600 active:bg-green-700 overflow-hidden">
          <span className="absolute text-white inset-0 flex items-center justify-center transition-all duration-300 group-hover:translate-x-full group-hover:opacity-0">
            Upload
          </span>
          <span className="absolute right-0 h-full w-10 flex items-center justify-center transition-all duration-300 group-hover:w-full">
            <svg className="w-6 text-white" fill="none" height="24" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <line x1="12" x2="12" y1="5" y2="19"></line>
              <line x1="5" x2="19" y1="12" y2="12"></line>
            </svg>
          </span>
        </button>
      </div>

      {}
      <div className="flex flex-col md:flex-row gap-4 mb-4 items-end">
  {}
  <div className="w-full md:w-[280px]">
  <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
  <div className="relative">
    <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1011.65 6.65a7.5 7.5 0 004.35 10.35z" />
      </svg>
    </span>
    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search reports..." className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600" />
  </div>
      </div>


  {}
  <div className="w-full md:w-[200px]">
    <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
    <Input type="date" value={startDate} onChange={e => {
          setStartDate(e.target.value);
          if (endDate && new Date(e.target.value) > new Date(endDate)) {
            setEndDate("");
          }
        }} min={today} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 bg-white text-sm" />
  </div>

  {}
  <div className="w-full md:w-[200px]">
    <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate || today} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 bg-white text-sm" />
  </div>
    </div>
      {}
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
            {currentReports.map(report => <tr key={report._id} className="border-b border-gray-300">
                <td className="p-3">{report.title}</td>
                <td className="p-3">{report.description}</td>
                <td className="p-3">{report.fileSize.toFixed(2)}</td>
                <td className="p-3">{new Date(report.publishedAt).toLocaleDateString()}</td>
                <td className="p-3 flex gap-2">
                  <button onClick={() => handleDownload(report.fileId)} className="bg-white w-10 h-10 flex justify-center items-center rounded-lg hover:text-blue-600 hover:translate-y-1 hover:duration-300">
                    ⬇
                  </button>
                  <Button onClick={() => handleDelete(report._id)} className="bg-red-500 hover:bg-red-600">
                    Delete
                  </Button>
                </td>
              </tr>)}
          </tbody>
        </table>


        {}
      <div className="flex justify-center items-center gap-4 mt-4">
  <Button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="bg-gray-200 text-black hover:bg-gray-300">
    Previous
  </Button>

  <span className="text-sm text-gray-700">
    Page {currentPage} of {Math.ceil(filteredReports.length / reportsPerPage)}
  </span>

  <Button onClick={() => setCurrentPage(prev => prev < Math.ceil(filteredReports.length / reportsPerPage) ? prev + 1 : prev)} disabled={currentPage >= Math.ceil(filteredReports.length / reportsPerPage)} className="bg-gray-200 text-black hover:bg-gray-300">
    Next
  </Button>
      </div>


        {showUploadModal && <UploadReports onClose={() => setShowUploadModal(false)} />}
      </div>
    </div>;
}