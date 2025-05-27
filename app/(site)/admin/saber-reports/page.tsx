"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from "@/components/ui/select";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

interface SaberReport {
  _id: Id<"saber_reports">;
  _creationTime: number;
  userName: string;
  title: string;
  state: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: number;
  numberOfReports: string;
  comments?: string;
  fileUrl: string | null | undefined;
  fileId?: Id<"_storage">;
  updatedAt?: number;
}

const PAGE_SIZE = 10;

export default function AdminSaberReportsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState<SaberReport | null>(null);
  const [comments, setComments] = useState("");

  // Fetch all reports
  const allReports = useQuery(api.saber_reports.getAllReports) ?? [];
  
  // Update report status mutation
  const updateStatus = useMutation(api.saber_reports.updateReportStatus);

  // Apply filters
  const filteredReports = allReports.filter(report => {
    const matchesSearch = 
      report.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesState = selectedState === "all" || report.state === selectedState;
    const matchesStatus = selectedStatus === "all" || report.status === selectedStatus;
    
    const reportDate = new Date(report.submittedAt).toISOString().split("T")[0];
    const matchesStart = startDate ? reportDate >= startDate : true;
    const matchesEnd = endDate ? reportDate <= endDate : true;
    
    return matchesSearch && matchesState && matchesStatus && matchesStart && matchesEnd;
  }).sort((a, b) => b.submittedAt - a.submittedAt);

  const totalPages = Math.ceil(filteredReports.length / PAGE_SIZE);
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleStatusUpdate = async (status: "approved" | "rejected") => {
    if (!selectedReport) return;
    try {
      await updateStatus({
        reportId: selectedReport._id,
        status,
        comments: comments.trim() || undefined,
      });
      toast.success(`Report ${status} successfully`);
      setSelectedReport(null);
      setComments("");
    } catch (error) {
      toast.error(`Failed to ${status} report`);
    }
  };

  const downloadAsPDF = (report) => {
    const doc = new jsPDF();
    doc.text("Saber Agent Report", 20, 10);
    doc.text(`Agent: ${report.userName}`, 20, 30);
    doc.text(`State: ${report.state}`, 20, 40);
    doc.text(`Number of Reports: ${report.numberOfReports}`, 20, 50);
    doc.text(`Description: ${report.description}`, 20, 60);
    doc.text(`Status: ${report.status}`, 20, 70);
    if (report.comments) {
      doc.text(`Comments: ${report.comments}`, 20, 80);
    }
    doc.save(`saber-report-${report.title}.pdf`);
  };

  const downloadAsExcel = (report) => {
    const ws = XLSX.utils.json_to_sheet([{
      "Agent Name": report.userName,
      "Title": report.title,
      "State": report.state,
      "Number of Reports": report.numberOfReports,
      "Description": report.description,
      "Status": report.status,
      "Comments": report.comments || "",
      "Submitted On": new Date(report.submittedAt).toLocaleDateString(),
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `saber-report-${report.title}.xlsx`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Saber Agent Reports</h1>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <Input
                placeholder="Search by agent name or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {/* Add your states here */}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent Name</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted On</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReports.length > 0 ? (
                  paginatedReports.map((report) => (
                    <TableRow key={report._id}>
                      <TableCell>{report.userName}</TableCell>
                      <TableCell>{report.title}</TableCell>
                      <TableCell>{report.state}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          report.status === 'approved' ? 'bg-green-100 text-green-800' :
                          report.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell>{new Date(report.submittedAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {report.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => setSelectedReport(report)}
                            >
                              Review
                            </Button>
                          )}
                          {report.fileUrl ? (
                            <a
                              href={report.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              Download
                            </a>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadAsPDF(report)}
                              >
                                <FileDown className="w-4 h-4 mr-2" />
                                PDF
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadAsExcel(report)}
                              >
                                <FileSpreadsheet className="w-4 h-4 mr-2" />
                                Excel
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                      No reports found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredReports.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} to{" "}
          {Math.min(currentPage * PAGE_SIZE, filteredReports.length)} of {filteredReports.length} results
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Report</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Report Details</h3>
              <p>Agent: {selectedReport?.userName}</p>
              <p>Title: {selectedReport?.title}</p>
              <p>State: {selectedReport?.state}</p>
              <p>Description: {selectedReport?.description}</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Comments (optional)
              </label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add your comments here..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setSelectedReport(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleStatusUpdate("rejected")}
            >
              Reject
            </Button>
            <Button
              variant="default"
              onClick={() => handleStatusUpdate("approved")}
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}