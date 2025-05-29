"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import { FileDown, FileSpreadsheet, Save } from "lucide-react";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import Type1DataForm from "@/components/Type1DataForm";
interface FormData {
  reportType: "type1" | "type2" | "type3";
 
  question2?: string[]; // Assuming array based on v.array(v.string())
  question3?: string;
  question4?: string;
  question5?: string[];
  question6?: string;
  question7?: string[];
  question8?: string[];
  question9?: string[];
  question10?: string[];
  question11?: string[];
  // --- Fields for type2 ---
  announceInvestment?: string[];
  dateOfAnnouncement?: string;
  media_platform?: string;
  // --- Fields for type3 ---
  noim?: string[];
  lri?: string[];
  sectors?: string[];
  elibility?: string[];
  description?: string[];
  duration?: string[];
  aaia?: string[];
  noiri2022?: string[];
  noiri2023?: string[];
  noiri2024?: string[];
}

export default function SaberAgentReportPage() {


  // Get user's submitted reports
  const myReports = useQuery(api.saber_reports.getMyReports) ?? [];


 


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
    const ws = XLSX.utils.json_to_sheet([
      {
        Title: report.title,
        State: report.state,
        "Number of Reports": report.numberOfReports,
        Description: report.description,
        Status: report.status,
        "Submitted On": new Date(report.submittedAt).toLocaleDateString(),
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `saber-report-${report.title}.xlsx`);
  };

  return (
    <div className="container mx-auto py-10 space-y-8">
      <Type1DataForm/>
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
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            report.status === "approved"
                              ? "bg-green-100 text-green-800"
                              : report.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {report.status.charAt(0).toUpperCase() +
                            report.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(report.submittedAt).toLocaleDateString()}
                      </TableCell>
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
                    <TableCell
                      colSpan={5}
                      className="text-center py-4 text-gray-500"
                    >
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
