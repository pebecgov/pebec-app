"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

/**
 * ScoringReportGenerator Component
 * 
 * A reusable component that generates PDF and Excel reports for scoring data.
 * Supports four report types:
 * - performance-overview: Yearly performance data with 1st/2nd half scores
 * - top-performers: Top 10 performing MDAs
 * - bottom-performers: Bottom 10 performing MDAs
 * - all-mdas: Complete list of all MDAs with current scores and status
 * 
 * Features:
 * - PDF generation with formatted tables
 * - Excel generation with structured data
 * - Loading states and error handling
 * - Empty data handling
 * - Responsive design
 */

interface ScoringReportGeneratorProps {
  reportType: 'performance-overview' | 'top-performers' | 'bottom-performers' | 'all-mdas';
  data: any[];
  year: number;
  title: string;
}

export default function ScoringReportGenerator({ 
  reportType, 
  data, 
  year, 
  title 
}: ScoringReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm"
      });

      // Add header
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(`${title} - ${year}`, 14, 20);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

      // Check if data is empty
      if (!data || data.length === 0) {
        doc.setFontSize(14);
        doc.text("No data available for this report.", 14, 50);
        const fileName = `${title.replace(/\s+/g, '_')}_${year}.pdf`;
        doc.save(fileName);
        return;
      }

      // Prepare table data based on report type
      let headers: string[] = [];
      let tableData: any[][] = [];

      if (reportType === 'performance-overview') {
        headers = ["MDA Name", "1st Half", "2nd Half", "Year Average", "Grade", "Status"];
        tableData = data.map((mdaData) => {
          const firstHalf = mdaData.periods?.find((p: any) => p.period.includes('1st Half'))?.score || 0;
          const secondHalf = mdaData.periods?.find((p: any) => p.period.includes('2nd Half'))?.score || 0;
          const yearlyAverage = mdaData.yearlyAverage;
          
          return [
            mdaData.mdaName,
            firstHalf > 0 ? `${firstHalf.toFixed(1)}%` : 'Not Scored',
            secondHalf > 0 ? `${secondHalf.toFixed(1)}%` : 'Not Scored',
            yearlyAverage > 0 ? `${yearlyAverage.toFixed(1)}%` : 'N/A',
            yearlyAverage > 0 ? getGrade(yearlyAverage) : '-',
            yearlyAverage > 0 ? (yearlyAverage >= 70 ? 'Meeting Standards' : 'Below Standards') : '-'
          ];
        });
      } else if (reportType === 'top-performers' || reportType === 'bottom-performers') {
        headers = ["Rank", "MDA Name", "Score", "Grade", "Status"];
        tableData = data.map((mda, index) => [
          `#${mda.rank || index + 1}`,
          mda.name,
          `${mda.score.toFixed(1)}%`,
          getGrade(mda.score),
          mda.isActive ? 'Active' : 'Inactive'
        ]);
      } else if (reportType === 'all-mdas') {
        headers = ["MDA Name", "Current Score", "Grade", "Status", "Last Scored", "Data Source", "Platform Status"];
        tableData = data.map((mda, index) => [
          mda.mdaName,
          `${(mda.currentScore || 0).toFixed(1)}%`,
          getGrade(mda.currentScore || 0),
          (mda.currentScore || 0) >= 70 ? 'Meeting Standards' : 'Below Standards',
          mda.lastScoredAt ? new Date(mda.lastScoredAt).toLocaleDateString() : 'Never',
          mda.isActiveOnPlatform ? 'Live Data' : 'Manual Only',
          mda.isActiveOnPlatform ? 'Active' : 'Inactive'
        ]);
      }

      // Add table to PDF
      autoTable(doc, {
        startY: 35,
        head: [headers],
        body: tableData,
        styles: {
          fontSize: 8,
          cellPadding: 3,
          overflow: "linebreak"
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: "bold"
        },
        theme: "striped",
        tableWidth: "auto"
      });

      // Save the PDF
      const fileName = `${title.replace(/\s+/g, '_')}_${year}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateExcel = async () => {
    setIsGenerating(true);
    try {
      // Check if data is empty
      if (!data || data.length === 0) {
        // Create empty worksheet with message
        const worksheet = XLSX.utils.aoa_to_sheet([["No data available for this report."]]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, title);
        const fileName = `${title.replace(/\s+/g, '_')}_${year}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        return;
      }

      let worksheetData: any[] = [];

      if (reportType === 'performance-overview') {
        worksheetData = data.map((mdaData) => {
          const firstHalf = mdaData.periods?.find((p: any) => p.period.includes('1st Half'))?.score || 0;
          const secondHalf = mdaData.periods?.find((p: any) => p.period.includes('2nd Half'))?.score || 0;
          const yearlyAverage = mdaData.yearlyAverage;
          
          return {
            "MDA Name": mdaData.mdaName,
            "1st Half": firstHalf > 0 ? `${firstHalf.toFixed(1)}%` : 'Not Scored',
            "2nd Half": secondHalf > 0 ? `${secondHalf.toFixed(1)}%` : 'Not Scored',
            "Year Average": yearlyAverage > 0 ? `${yearlyAverage.toFixed(1)}%` : 'N/A',
            "Grade": yearlyAverage > 0 ? getGrade(yearlyAverage) : '-',
            "Status": yearlyAverage > 0 ? (yearlyAverage >= 70 ? 'Meeting Standards' : 'Below Standards') : '-'
          };
        });
      } else if (reportType === 'top-performers' || reportType === 'bottom-performers') {
        worksheetData = data.map((mda, index) => ({
          "Rank": mda.rank || index + 1,
          "MDA Name": mda.name,
          "Score": `${mda.score.toFixed(1)}%`,
          "Grade": getGrade(mda.score),
          "Status": mda.isActive ? 'Active' : 'Inactive'
        }));
      } else if (reportType === 'all-mdas') {
        worksheetData = data.map((mda, index) => ({
          "MDA Name": mda.mdaName,
          "Current Score": `${(mda.currentScore || 0).toFixed(1)}%`,
          "Grade": getGrade(mda.currentScore || 0),
          "Status": (mda.currentScore || 0) >= 70 ? 'Meeting Standards' : 'Below Standards',
          "Last Scored": mda.lastScoredAt ? new Date(mda.lastScoredAt).toLocaleDateString() : 'Never',
          "Data Source": mda.isActiveOnPlatform ? 'Live Data' : 'Manual Only',
          "Platform Status": mda.isActiveOnPlatform ? 'Active' : 'Inactive'
        }));
      }

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, title);
      
      const fileName = `${title.replace(/\s+/g, '_')}_${year}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error("Error generating Excel:", error);
      alert("Error generating Excel file. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const getGrade = (score: number): string => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={generatePDF}
        disabled={isGenerating}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        {isGenerating ? "Generating..." : "PDF"}
      </Button>
      <Button
        onClick={generateExcel}
        disabled={isGenerating}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
        {isGenerating ? "Generating..." : "Excel"}
      </Button>
    </div>
  );
}
