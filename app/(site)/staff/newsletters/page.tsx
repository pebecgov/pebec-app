// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { FaFileAlt } from "react-icons/fa";
import FileUploader from "@/components/file-uploader-comments";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
export default function AdminNewsletterDashboard() {
  const [page, setPage] = useState(0);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [open, setOpen] = useState(false);
  const {
    user,
    isLoaded
  } = useUser();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachmentId, setAttachmentId] = useState<Id<"_storage"> | undefined>();
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const createNewsletter = useMutation(api.newsletters.createNewsletter);
  const getFileUrl = useMutation(api.tickets.getStorageUrl);
  const newsletters = useQuery(api.newsletters.getNewsletters, {
    page,
    subjectFilter,
    fromDate,
    toDate
  });
  const [attachmentLinks, setAttachmentLinks] = useState<Record<string, string>>({});
  const role = user?.publicMetadata?.role;
  const stream = user?.publicMetadata?.staffStream;
  if (isLoaded && (role !== "staff" || stream !== "communications")) {
    return <p className="text-red-500 text-center mt-10">
        🚫 Unauthorized: Only Communications staff can access this page.
      </p>;
  }
  useEffect(() => {
    if (!newsletters?.newsletters) return;
    (async () => {
      const newLinks: Record<string, string> = {};
      for (const n of newsletters.newsletters) {
        if (n.attachmentId && !attachmentLinks[n.attachmentId]) {
          const url = await getFileUrl({
            storageId: n.attachmentId
          });
          if (url) newLinks[n.attachmentId] = url;
        }
      }
      setAttachmentLinks(prev => ({
        ...prev,
        ...newLinks
      }));
    })();
  }, [newsletters, getFileUrl]);
  useEffect(() => {
    if (attachmentId) {
      (async () => {
        const url = await getFileUrl({
          storageId: attachmentId
        });
        setAttachmentUrl(url);
      })();
    }
  }, [attachmentId, getFileUrl]);
  const handleCreate = async () => {
    if (!subject || !message) return toast.error("Subject and message are required.");
    await createNewsletter({
      subject,
      message,
      attachmentId
    });
    toast.success("Newsletter sent!");
    setOpen(false);
    setSubject("");
    setMessage("");
    setAttachmentId(undefined);
    setAttachmentUrl(null);
  };
  const handleFileUpload = (storageId: string) => {
    setAttachmentId(storageId as Id<"_storage">);
  };
  return <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">📰 Newsletter Manager</h1>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-6">
        {}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          <div className="space-y-1">
            <Label>Subject</Label>
            <Input placeholder="Search by subject" value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="w-52" />
          </div>
          <div className="space-y-1">
            <Label>From Date</Label>
            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-44" />
          </div>
          <div className="space-y-1">
            <Label>To Date</Label>
            <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-44" />
          </div>
        </div>

        {}
        <div className="flex gap-3">
          <Link href="/staff/subscribers">
            <Button variant="secondary">View Subscribers</Button>
          </Link>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Create Newsletter</Button>
            </DialogTrigger>
            <DialogContent className="space-y-4 max-w-xl">
              <DialogTitle>Create Newsletter</DialogTitle>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea value={message} onChange={e => setMessage(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Attachment (Optional)</Label>
                <FileUploader setFileId={handleFileUpload} />
                {attachmentUrl && <p className="text-xs text-muted-foreground">
                    Uploaded File:{" "}
                    <a href={attachmentUrl} target="_blank" className="text-blue-500 underline">
                      View
                    </a>
                  </p>}
              </div>
              <Button onClick={handleCreate}>Send Newsletter</Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {}
      <div className="overflow-auto border rounded-md shadow-sm bg-white">
        <table className="w-full text-sm table-auto">
          <thead className="bg-gray-100 text-gray-700 font-semibold">
            <tr>
              <th className="px-4 py-3 text-left">Subject</th>
              <th className="px-4 py-3 text-left">Date Sent</th>
              <th className="px-4 py-3 text-left">Attachment</th>
            </tr>
          </thead>
          <tbody>
          {newsletters?.newsletters && newsletters.newsletters.length > 0 ? newsletters.newsletters.map(n => <tr key={n._id} className="border-t hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-gray-800">{n.subject}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {format(new Date(n.createdAt), "PPpp")}
                  </td>
                  <td className="px-4 py-3">
                    {n.attachmentId && attachmentLinks[n.attachmentId] ? <a href={attachmentLinks[n.attachmentId]} target="_blank" className="text-blue-500 hover:underline flex items-center gap-1">
                        <FaFileAlt className="text-gray-500" /> View Document
                      </a> : <span className="text-gray-400">None</span>}
                  </td>
                </tr>) : <tr>
                <td colSpan={3} className="text-center py-6 text-gray-500">
                  No newsletters found.
                </td>
              </tr>}
          </tbody>
        </table>
      </div>

      {}
      <div className="flex justify-center items-center gap-4 mt-6">
        <Button onClick={() => setPage(p => Math.max(p - 1, 0))} disabled={page === 0}>
          Previous
        </Button>
        <span className="text-gray-600 text-sm">Page {page + 1}</span>
        <Button onClick={() => setPage(p => p + 1)} disabled={newsletters && newsletters.newsletters.length < 20}>
          Next
        </Button>
      </div>
    </div>;
}