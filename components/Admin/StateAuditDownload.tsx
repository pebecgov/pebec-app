"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  year?: number;
};

export default function StateAuditDownload({ year = 2026 }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Fetch audit data (only when needed)
  const auditData = useQuery(
    api.stateAudit.generateStateScoringAudit,
    { year }
  );

  const downloadCSV = async () => {
    if (!auditData) {
      toast.error("Audit data not ready yet");
      return;
    }

    setIsGenerating(true);
    
    try {
      // Generate CSV content
      const csvRows: string[] = [];
      
      // Header
      csvRows.push([
        "State",
        "Indicator",
        "Indicator Name", 
        "Sub-Indicator",
        "Sub-Indicator Name",
        "Max Points",
        "Current Score",
        "Current Value",
        "Status"
      ].join(","));
      
      // Data rows
      auditData.auditRows.forEach(row => {
        csvRows.push([
          `"${row.state}"`,
          `"${row.indicator}"`,
          `"${row.indicatorName}"`,
          `"${row.subIndicator}"`,
          `"${row.subIndicatorName}"`,
          row.maxPoints.toString(),
          row.currentScore.toString(),
          `"${row.currentValue}"`,
          `"${row.completionStatus}"`
        ].join(","));
      });
      
      // Add summary section
      csvRows.push(""); // Empty row
      csvRows.push("SUMMARY BY STATE");
      csvRows.push([
        "State",
        "Total Sub-Indicators",
        "Scored Sub-Indicators", 
        "Missing Sub-Indicators",
        "Completion Rate (%)",
        "Current Points",
        "Max Possible Points"
      ].join(","));
      
      auditData.summaryByState.forEach(summary => {
        csvRows.push([
          `"${summary.state}"`,
          summary.totalSubIndicators.toString(),
          summary.scoredSubIndicators.toString(),
          summary.missingSubIndicators.toString(),
          summary.completionRate.toString(),
          summary.currentPoints.toString(),
          summary.totalPossiblePoints.toString()
        ].join(","));
      });
      
      // Add indicator summary
      csvRows.push(""); // Empty row
      csvRows.push("SUMMARY BY INDICATOR");
      csvRows.push([
        "Indicator",
        "Indicator Name",
        "States with Complete Scoring",
        "States with Missing Scoring",
        "Completion Rate (%)"
      ].join(","));
      
      auditData.summaryByIndicator.forEach(summary => {
        csvRows.push([
          `"${summary.indicator}"`,
          `"${summary.indicatorName}"`, 
          summary.scoredStates.toString(),
          summary.missingStates.toString(),
          summary.completionRate.toString()
        ].join(","));
      });
      
      // Create and download file
      const csvContent = csvRows.join("\\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `state-scoring-audit-${year}-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      toast.success(`Downloaded audit report for ${year}`);
    } catch (error) {
      console.error("Error generating CSV:", error);
      toast.error("Failed to generate audit report");
    } finally {
      setIsGenerating(false);
    }
  };

  const isReady = !!auditData;
  const completionRate = auditData?.overallCompletionRate ?? 0;
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            State Scoring Audit Report
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Download comprehensive audit of scoring progress for {year}
          </p>
        </div>
      </div>
      
      {isReady && (
        <div className="bg-gray-50 rounded-md p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-700">Overall Progress</div>
              <div className="text-2xl font-bold text-blue-600">{completionRate}%</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Total States</div>
              <div className="text-lg font-semibold">{auditData.totalStates}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Total Indicators</div>
              <div className="text-lg font-semibold">{auditData.totalIndicators}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Generated</div>
              <div className="text-sm text-gray-600">
                {new Date(auditData.generatedAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-3">
        <Button
          onClick={downloadCSV}
          disabled={!isReady || isGenerating}
          className="flex items-center gap-2"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {isGenerating ? "Generating..." : "Download CSV Report"}
        </Button>
        
        {!isReady && (
          <span className="text-sm text-gray-500">Loading audit data...</span>
        )}
      </div>
      
      <div className="mt-4 text-xs text-gray-500">
        <p><strong>Report includes:</strong></p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Detailed scoring status for each state and sub-indicator</li>
          <li>Summary by state showing completion rates and current points</li>
          <li>Summary by indicator showing which ones need more attention</li>
          <li>Overall progress metrics for tracking</li>
        </ul>
      </div>
    </div>
  );
}