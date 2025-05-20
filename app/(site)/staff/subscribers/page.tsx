"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import * as XLSX from "xlsx";
import { BarChartIcon, UploadIcon } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useUser } from "@clerk/nextjs";

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
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; email: string | null }>({ open: false, email: null });
  const [unsubscribeDialog, setUnsubscribeDialog] = useState<{ open: boolean; email: string | null }>({ open: false, email: null });
  const [subscribeDialog, setSubscribeDialog] = useState<{ open: boolean; email: string | null }>({ open: false, email: null });

  const subscribers = useQuery(api.newsletters.getSubscribers, {
    page,
    status: statusFilter,
    fromDate,
    toDate,
    emailSearch,
  });

  const addSubscriber = useMutation(api.newsletters.addSubscriber);
  const batchAddSubscribers = useMutation(api.newsletters.batchAddSubscribers);
  const deleteSubscriber = useMutation(api.newsletters.deleteSubscriber);
  const unsubscribe = useMutation(api.newsletters.unsubscribeFromNewsletter);
  const resubscribe = useMutation(api.newsletters.subscribeToNewsletter);
  const [monthlyDialogOpen, setMonthlyDialogOpen] = useState(false);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const monthlyReport = useQuery(api.newsletters.getMonthlyReportData);
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [customStatus, setCustomStatus] = useState("all");
  const customReport = useQuery(
    api.newsletters.getCustomReportData,
    customFromDate && customToDate ? {
      fromDate: customFromDate,
      toDate: customToDate,
      status: customStatus,
    } : "skip"
  );
  const { user, isLoaded } = useUser(); // 👈 Clerk hook


  // ⛔ Block access if not communications staff
const role = user?.publicMetadata?.role;
const stream = user?.publicMetadata?.staffStream;

if (isLoaded && (role !== "staff" || stream !== "communications")) {
  return (
    <p className="text-red-500 text-center mt-10">
      🚫 Unauthorized: Only Communications staff can access this page.
    </p>
  );
}
  
  const generateMonthlyPDF = () => {
    if (!monthlyReport || !monthlyReport.length) {
      toast.error("No data to generate PDF.");
      return;
    }

    const subscribedCount = monthlyReport.filter((s) => s.isSubscribed).length;
    const unsubscribedCount = monthlyReport.length - subscribedCount;

    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "A4" });
    doc.setFontSize(18);
    doc.text("This Month's Subscribers", 40, 40);

    const table = autoTable(doc, {
      startY: 60,
      head: [["Email", "Status", "Date"]],
      body: monthlyReport.map((sub) => [
        sub.email,
        sub.isSubscribed ? "Subscribed" : "Unsubscribed",
        format(new Date(sub.subscribedAt), "PPpp"),
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
      margin: { top: 60 },
   didDrawPage: (data) => {
  const y = data.cursor?.y ?? 80; // fallback to 80 if cursor is somehow null
  doc.setFontSize(12);
  doc.text(`Total Subscribed: ${subscribedCount}`, 40, y + 20);
  doc.text(`Total Unsubscribed: ${unsubscribedCount}`, 40, y + 40);
}

    });

    doc.save("monthly_report.pdf");
  };

  const generatePDF = () => {
    if (!customReport || !customReport.length) {
      toast.error("No data to generate PDF.");
      return;
    }

    const subscribedCount = customReport.filter((s) => s.isSubscribed).length;
    const unsubscribedCount = customReport.length - subscribedCount;

    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "A4" });
    doc.setFontSize(18);
    doc.text("Custom Subscriber Report", 40, 40);

    autoTable(doc, {
      startY: 60,
      head: [["Email", "Status", "Subscribed At"]],
      body: customReport.map((sub) => [
        sub.email,
        sub.isSubscribed ? "Subscribed" : "Unsubscribed",
        format(new Date(sub.subscribedAt), "PPpp"),
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
      margin: { top: 60 },
      didDrawPage: (data) => {
        const y = data.cursor?.y ?? 80; // fallback to 80 if cursor is somehow null
        doc.setFontSize(12);
        doc.text(`Total Subscribed: ${subscribedCount}`, 40, y + 20);
        doc.text(`Total Unsubscribed: ${unsubscribedCount}`, 40, y + 40);
      }
    });

    doc.save("custom_report.pdf");
    setCustomDialogOpen(false);
  };

  
  const handleAdd = async () => {
    if (!newEmail) return;
    await addSubscriber({ email: newEmail });
    toast.success("✅ Subscriber added");
    setNewEmail("");
    setOpen(false);
  };

  const confirmDelete = (email: string) => {
    setDeleteDialog({ open: true, email });
  };

  const handleDelete = async () => {
    if (!deleteDialog.email) return;
    await deleteSubscriber({ email: deleteDialog.email });
    toast.success("🗑 Subscriber deleted");
    setDeleteDialog({ open: false, email: null });
  };

  const confirmUnsubscribe = (email: string) => {
    setUnsubscribeDialog({ open: true, email });
  };

  const handleUnsubscribe = async () => {
    if (!unsubscribeDialog.email) return;
    await unsubscribe({ email: unsubscribeDialog.email });
    toast.success("🔕 Subscriber unsubscribed");
    setUnsubscribeDialog({ open: false, email: null });
  };

  const confirmSubscribe = (email: string) => {
    setSubscribeDialog({ open: true, email });
  };

  const handleSubscribe = async () => {
    if (!subscribeDialog.email) return;
    await resubscribe({ email: subscribeDialog.email });
    toast.success("🔔 Subscriber re-subscribed");
    setSubscribeDialog({ open: false, email: null });
  };

  const handleExcelUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
      const emails = rows.flat().filter((email) => typeof email === "string");
      setEmailsToUpload(emails);
      setUploadDialogOpen(false);
      setConfirmUploadOpen(true);
    } catch (err) {
      toast.error("❌ Failed to parse file");
    }
  };

  const confirmUpload = async () => {
    try {
      setUploading(true);
      await batchAddSubscribers({ emails: emailsToUpload });
      toast.success("✅ Subscribers uploaded");
    } catch {
      toast.error("❌ Upload failed");
    } finally {
      setConfirmUploadOpen(false);
      setUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Subscribers</h1>
      <div className="flex gap-2">
      <Button onClick={generateMonthlyPDF}>
      <BarChartIcon className="w-4 h-4 mr-1" /> Monthly Report
          </Button>
          <Button onClick={() => setCustomDialogOpen(true)} variant="outline">
            <BarChartIcon className="w-4 h-4 mr-1" /> Custom Report
          </Button>
        </div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-2">
        <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} placeholder="From" />
        <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} placeholder="To" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="all">All</option>
            <option value="subscribed">Subscribed</option>
            <option value="unsubscribed">Unsubscribed</option>
          </select>
          <Input
            type="text"
            placeholder="Search by email"
            value={emailSearch}
            onChange={(e) => setEmailSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Add Email</Button>
            </DialogTrigger>
            <DialogContent className="space-y-4 max-w-md">
              <DialogTitle>Add a Subscriber</DialogTitle>
              <Label>Email</Label>
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              <Button onClick={handleAdd}>Add</Button>
            </DialogContent>
          </Dialog>

          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <UploadIcon className="w-4 h-4" /> Upload from CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="space-y-4 max-w-md">
              <DialogTitle>Upload Subscribers</DialogTitle>
              <p className="text-sm text-muted-foreground">Accepted formats: .xls, .xlsx</p>
              <Input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={confirmUploadOpen} onOpenChange={setConfirmUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Upload</DialogTitle>
          </DialogHeader>
          <p>You're about to upload {emailsToUpload.length} email(s) to the subscribers list.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmUploadOpen(false)}>Cancel</Button>
            <Button onClick={confirmUpload} disabled={uploading}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogTitle>Are you sure?</DialogTitle>
          <p>This action will permanently delete this subscriber.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, email: null })}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={unsubscribeDialog.open} onOpenChange={(open) => setUnsubscribeDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogTitle>Are you sure?</DialogTitle>
          <p>This will unsubscribe the user but keep them in the system.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnsubscribeDialog({ open: false, email: null })}>Cancel</Button>
            <Button onClick={handleUnsubscribe}>Unsubscribe</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={subscribeDialog.open} onOpenChange={(open) => setSubscribeDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogTitle>Are you sure?</DialogTitle>
          <p>This will re-subscribe the user to the newsletter.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubscribeDialog({ open: false, email: null })}>Cancel</Button>
            <Button onClick={handleSubscribe}>Subscribe</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="overflow-x-auto border rounded-md bg-white shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Subscribed At</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subscribers?.list.map((sub) => (
              <tr key={sub._id} className="border-t">
                <td className="px-4 py-2">{sub.email}</td>
                <td className="px-4 py-2">{sub.isSubscribed ? "Subscribed" : "Unsubscribed"}</td>
                <td className="px-4 py-2">{format(new Date(sub.subscribedAt), "PPpp")}</td>
                <td className="px-4 py-2 flex gap-2">
  <div className="flex gap-2">
    <Button
      variant={sub.isSubscribed ? "outline" : "secondary"}
      size="sm"
      className="min-w-[110px]"
      onClick={() =>
        sub.isSubscribed
          ? confirmUnsubscribe(sub.email)
          : confirmSubscribe(sub.email)
      }
    >
      {sub.isSubscribed ? "Unsubscribe" : "Subscribe"}
    </Button>
    <Button
      variant="destructive"
      size="sm"
      className="min-w-[110px]"
      onClick={() => confirmDelete(sub.email)}
    >
      Delete
    </Button>
  </div>
</td>

              </tr>
            )) || (
              <tr>
                <td colSpan={4} className="text-center text-gray-500 py-6">
                  No subscribers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-4">
        <Button onClick={() => setPage((p) => Math.max(p - 1, 0))} disabled={page === 0}>
          Previous
        </Button>
        <Button onClick={() => setPage((p) => p + 1)} disabled={subscribers && subscribers.list.length < 20}>
          Next
        </Button>
      </div>
      <Dialog open={monthlyDialogOpen} onOpenChange={setMonthlyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>This Month's Subscribers</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {monthlyReport?.map((s) => (
                  <tr key={s._id} className="border-t">
                    <td className="px-4 py-2">{s.email}</td>
                    <td className="px-4 py-2">{s.isSubscribed ? "Subscribed" : "Unsubscribed"}</td>
                    <td className="px-4 py-2">{format(new Date(s.subscribedAt), "PPpp")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="space-y-4 max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Custom Report</DialogTitle>
          </DialogHeader>
          <Input type="date" value={customFromDate} onChange={(e) => setCustomFromDate(e.target.value)} />
          <Input type="date" value={customToDate} onChange={(e) => setCustomToDate(e.target.value)} />
          <select
            value={customStatus}
            onChange={(e) => setCustomStatus(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="all">All</option>
            <option value="subscribed">Subscribed</option>
            <option value="unsubscribed">Unsubscribed</option>
          </select>
          <DialogFooter>
            <Button onClick={generatePDF}>Generate PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}