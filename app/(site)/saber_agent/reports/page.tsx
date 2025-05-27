"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from "@/components/ui/table";
import { FileDown, FileSpreadsheet, Save } from "lucide-react";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { toast } from "sonner";

export default function SaberAgentReportPage() {
  const { user } = useUser();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    state: "",
    numberOfReports: "",
  });

  // Get user's submitted reports
  const myReports = useQuery(api.saber_reports.getMyReports) ?? [];
  
  // Mutations
  const submitReport = useMutation(api.saber_reports.submitReport);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Generate PDF for storage
      const doc = new jsPDF();
      doc.text("Saber Agent Report", 20, 10);
      doc.text(`Agent Name: ${user?.fullName || ""}`, 20, 30);
      doc.text(`State: ${formData.state}`, 20, 40);
      doc.text(`Number of Reports: ${formData.numberOfReports}`, 20, 50);
      doc.text(`Description: ${formData.description}`, 20, 60);
      
      // Convert PDF to blob
      const pdfBlob = doc.output('blob');

      // Get upload URL and upload PDF
   
   
      // Submit report
      await submitReport({
        title: formData.title,
        description: formData.description,
        state: formData.state,
        numberOfReports: formData.numberOfReports,
        fileSize: pdfBlob.size,
      });

      toast.success("Report submitted successfully");
      
      // Clear form
      setFormData({
        title: "",
        description: "",
        state: "",
        numberOfReports: "",
      });
    } catch (error) {
      toast.error("Failed to submit report");
      console.error("Error submitting report:", error);
    }
  };

  const downloadAsPDF = (report) => {
    const doc = new jsPDF();
    doc.text("Saber Agent Report", 20, 10);
    doc.text(`Agent Name: ${report.userName}`, 20, 30);
    doc.text(`State: ${report.state}`, 20, 40);
    doc.text(`Number of Reports: ${report.numberOfReports}`, 20, 50);
    doc.text(`Description: ${report.description}`, 20, 60);
    doc.save(`saber-report-${report.title}.pdf`);
  };

  const downloadAsExcel = (report) => {
    const ws = XLSX.utils.json_to_sheet([{
      "Title": report.title,
      "State": report.state,
      "Number of Reports": report.numberOfReports,
      "Description": report.description,
      "Status": report.status,
      "Submitted On": new Date(report.submittedAt).toLocaleDateString(),
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `saber-report-${report.title}.xlsx`);
  };

  return (
    <div className="container mx-auto py-10 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Submit Saber Agent Report</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Report Title</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Monthly Report - Lagos State"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Provide details about your report"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numberOfReports">Number of Reports</Label>
              <Input
                id="numberOfReports"
                name="numberOfReports"
                type="number"
                value={formData.numberOfReports}
                onChange={handleInputChange}
                required
              />
            </div>

            <Button type="submit">
              <Save className="w-4 h-4 mr-2" />
              Submit Report
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* My Submitted Reports */}
      <Card>
        <CardHeader>
          <CardTitle>My Submitted Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted On</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myReports.length > 0 ? (
                  myReports.map((report) => (
                    <TableRow key={report._id}>
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
                    <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                      No reports submitted yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
