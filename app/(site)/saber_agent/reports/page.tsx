"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const convexUser = useQuery(api.users.getUserByClerkId, 
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  const uploadReport = useMutation(api.reports.uploadReport);
  const generateUploadUrl = useMutation(api.reports.generateUploadUrl);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convexUser?._id) return;

    try {
      // Create report data
      const reportData = {
        agentName: user?.fullName || "",
        state: formData.state,
        numberOfReports: formData.numberOfReports,
      };

      // Generate PDF for storage
      const doc = new jsPDF();
      doc.text("Saber Agent Report", 20, 10);
      doc.text(`Agent Name: ${reportData.agentName}`, 20, 30);
      doc.text(`State: ${reportData.state}`, 20, 40);
      doc.text(`Number of Reports: ${reportData.numberOfReports}`, 20, 50);
      
      // Convert PDF to blob
      const pdfBlob = doc.output('blob');

      // Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Upload PDF
      const result = await fetch(uploadUrl, {
        method: "POST",
        body: pdfBlob
      });

      if (!result.ok) {
        throw new Error('Failed to upload file');
      }

      const fileId = await result.json();

      // Upload report
      await uploadReport({
        title: formData.title || `Saber Agent Report - ${formData.state}`,
        description: formData.description || `Report from ${reportData.agentName} for ${formData.state}`,
        fileId,
        fileSize: pdfBlob.size,
        publishedAt: Date.now(),
        uploadedBy: convexUser._id,
      });

      toast.success("Report submitted successfully");
      
      // Clear form after successful submission
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

  const downloadAsPDF = () => {
    const doc = new jsPDF();
    doc.text("Saber Agent Report", 20, 10);
    doc.text(`Agent Name: ${user?.fullName || ""}`, 20, 30);
    doc.text(`State: ${formData.state}`, 20, 40);
    doc.text(`Number of Reports: ${formData.numberOfReports}`, 20, 50);
    doc.save("saber-agent-report.pdf");
  };

  const downloadAsExcel = () => {
    const ws = XLSX.utils.json_to_sheet([{
      "Agent Name": user?.fullName || "",
      "State": formData.state,
      "Number of Reports": formData.numberOfReports,
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, "saber-agent-report.xlsx");
  };

  if (!user || !convexUser) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10">
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
              <Input
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Brief description of the report"
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

            <div className="flex gap-4">
              <Button type="submit">
                <Save className="w-4 h-4 mr-2" />
                Save Report
              </Button>
              <Button type="button" variant="outline" onClick={downloadAsPDF}>
                <FileDown className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button type="button" variant="outline" onClick={downloadAsExcel}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Download Excel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 