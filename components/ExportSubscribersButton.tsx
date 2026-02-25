// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ExportSubscribersButton({ 
  includeUnsubscribed = false 
}: { 
  includeUnsubscribed?: boolean 
}) {
  const subscribers = useQuery(api.newsletters.exportAllSubscribers, { includeUnsubscribed });
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = () => {
    if (!subscribers || subscribers.length === 0) {
      toast.error("No subscribers to export");
      return;
    }

    setIsExporting(true);
    
    try {
      // CSV Headers
      const headers = ["Email", "Name", "Organization", "Job Role", "Subscribed", "Subscribed At", "Unsubscribed At"];
      
      // Convert to CSV rows with proper escaping
      const csvRows = [
        headers.join(","),
        ...subscribers.map(sub => [
          `"${sub.email.replace(/"/g, '""')}"`,
          `"${(sub.name || "").replace(/"/g, '""')}"`,
          `"${(sub.organization || "").replace(/"/g, '""')}"`,
          `"${(sub.jobRole || "").replace(/"/g, '""')}"`,
          sub.isSubscribed,
          `"${sub.subscribedAt}"`,
          `"${sub.unsubscribedAt || ""}"`
        ].join(","))
      ];
      
      const csvContent = csvRows.join("\n");
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `newsletter_subscribers_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${subscribers.length.toLocaleString()} subscribers successfully!`);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export subscribers");
    } finally {
      setIsExporting(false);
    }
  };

  if (!subscribers) {
    return (
      <Button disabled className="flex items-center gap-2">
        <Download className="w-4 h-4" />
        Loading...
      </Button>
    );
  }

  return (
    <Button 
      onClick={exportToCSV} 
      disabled={isExporting || subscribers.length === 0}
      className="flex items-center gap-2"
    >
      <Download className="w-4 h-4" />
      {isExporting 
        ? "Exporting..." 
        : `Export All (${subscribers.length.toLocaleString()})`
      }
    </Button>
  );
}
