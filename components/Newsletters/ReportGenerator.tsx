// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, ChangeEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import * as XLSX from "xlsx";
import { BarChartIcon, UploadIcon } from "lucide-react";
export default function SubscribersPage() {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [emailSearch, setEmailSearch] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [confirmUploadOpen, setConfirmUploadOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [emailsToUpload, setEmailsToUpload] = useState<string[]>([]);
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    email: null
  });
  const [unsubscribeDialog, setUnsubscribeDialog] = useState({
    open: false,
    email: null
  });
  const [subscribeDialog, setSubscribeDialog] = useState({
    open: false,
    email: null
  });
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [customStatus, setCustomStatus] = useState("all");
  const subscribers = useQuery(api.newsletters.getSubscribers, {
    page,
    status: statusFilter,
    fromDate,
    toDate,
    emailSearch
  });
  const monthlyReportSummary = useQuery(api.newsletters.getMonthlyReportSummary);
  const customReportSummary = useQuery(api.newsletters.getCustomReportSummary, customFromDate && customToDate ? {
    fromDate: customFromDate,
    toDate: customToDate,
    status: customStatus
  } : "skip");
  const addSubscriber = useMutation(api.newsletters.addSubscriber);
  const batchAddSubscribers = useMutation(api.newsletters.batchAddSubscribers);
  const deleteSubscriber = useMutation(api.newsletters.deleteSubscriber);
  const unsubscribe = useMutation(api.newsletters.unsubscribeFromNewsletter);
  const resubscribe = useMutation(api.newsletters.subscribeToNewsletter);
  const generateMonthlyPDF = () => {
    if (!monthlyReportSummary) {
      toast.error("No monthly report data available.");
      return;
    }
    
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Monthly Subscriber Report - ${monthlyReportSummary.month}`, 14, 16);
    
    doc.setFontSize(12);
    doc.text(`Total Subscribers: ${monthlyReportSummary.totalCount}`, 14, 40);
    doc.text(`Active Subscriptions: ${monthlyReportSummary.subscribedCount}`, 14, 55);
    doc.text(`Unsubscribed: ${monthlyReportSummary.unsubscribedCount}`, 14, 70);
    
    // Add a note about pagination
    doc.setFontSize(8);
    doc.text("Note: This is a summary report. For detailed subscriber lists, use the paginated view.", 14, 90);
    
    doc.save("monthly_report_summary.pdf");
  };
  const generateCustomPDF = () => {
    if (!customReportSummary) {
      toast.error("No data to generate PDF.");
      return;
    }
    
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Custom Subscriber Report", 14, 16);
    
    doc.setFontSize(12);
    doc.text(`Date Range: ${customReportSummary.dateRange}`, 14, 40);
    doc.text(`Total Subscribers: ${customReportSummary.totalCount}`, 14, 55);
    doc.text(`Active Subscriptions: ${customReportSummary.subscribedCount}`, 14, 70);
    doc.text(`Unsubscribed: ${customReportSummary.unsubscribedCount}`, 14, 85);
    
    // Add a note about pagination
    doc.setFontSize(8);
    doc.text("Note: This is a summary report. For detailed subscriber lists, use the paginated view.", 14, 105);
    
    doc.save("custom_report_summary.pdf");
    setCustomDialogOpen(false);
  };
  return <div className="p-6 max-w-screen-xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Subscribers</h1>
        <div className="flex gap-2">
          <Button onClick={generateMonthlyPDF}>
            <BarChartIcon className="w-4 h-4 mr-1" /> Monthly Report
          </Button>
          <Button onClick={() => setCustomDialogOpen(true)} variant="outline">
            <BarChartIcon className="w-4 h-4 mr-1" /> Custom Report
          </Button>
        </div>
      </div>

      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="space-y-4 max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Custom Report</DialogTitle>
          </DialogHeader>
          <Input type="date" value={customFromDate} onChange={e => setCustomFromDate(e.target.value)} />
          <Input type="date" value={customToDate} onChange={e => setCustomToDate(e.target.value)} />
          <select value={customStatus} onChange={e => setCustomStatus(e.target.value)} className="border rounded px-3 py-2">
            <option value="all">All</option>
            <option value="subscribed">Subscribed</option>
            <option value="unsubscribed">Unsubscribed</option>
          </select>
          <DialogFooter>
            <Button onClick={generateCustomPDF}>Generate PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}