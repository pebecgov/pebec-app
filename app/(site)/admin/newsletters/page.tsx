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
export default function AdminNewsletterDashboard() {
  const [page, setPage] = useState(0);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [open, setOpen] = useState(false);
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
  useEffect(() => {
    const fetchAttachmentUrl = async () => {
      if (attachmentId) {
        const url = await getFileUrl({
          storageId: attachmentId
        });
        setAttachmentUrl(url);
      }
    };
    fetchAttachmentUrl();
  }, [attachmentId, getFileUrl]);
  const handleCreate = async () => {
    if (!subject || !message) {
      toast.error("Subject and message are required.");
      return;
    }
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
  useEffect(() => {
    const fetchUrls = async () => {
      if (!newsletters?.newsletters) return;
      const newLinks: Record<string, string> = {};
      for (const newsletter of newsletters.newsletters) {
        const id = newsletter.attachmentId;
        if (id && !attachmentLinks[id]) {
          const url = await getFileUrl({
            storageId: id
          });
          if (url) {
            newLinks[id] = url;
          }
        }
      }
      setAttachmentLinks(prev => ({
        ...prev,
        ...newLinks
      }));
    };
    fetchUrls();
  }, [newsletters, getFileUrl]);
  return <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Input placeholder="Search by subject" value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="w-full sm:w-48" />
          <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full sm:w-40" />
          <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full sm:w-40" />
        </div>
        <div className="flex gap-2 flex-wrap">
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
                    Uploaded File: {""}
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
      <div className="overflow-x-auto border rounded-md">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2">Subject</th>
              <th className="px-4 py-2">Date Sent</th>
              <th className="px-4 py-2">Attachment</th>
            </tr>
          </thead>
          <tbody>
            {newsletters?.newsletters.map(n => <tr key={n._id} className="border-t">
                <td className="px-4 py-2 font-medium">{n.subject}</td>
                <td className="px-4 py-2">
                  {format(new Date(n.createdAt), "PPpp")}
                </td>
                <td className="px-4 py-2">
                  {n.attachmentId ? <ul className="list-disc pl-4">
                      <li>
                      {n.attachmentId && attachmentLinks[n.attachmentId] ? <a href={attachmentLinks[n.attachmentId]} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
    <FaFileAlt className="text-gray-500" /> View Document
  </a> : <span className="text-gray-400">None</span>}


                      </li>
                    </ul> : <span className="text-gray-400">None</span>}
                </td>
              </tr>) || <tr>
                <td colSpan={3} className="text-center py-4 text-gray-500">
                  No newsletters found.
                </td>
              </tr>}
          </tbody>
        </table>
      </div>

      {}
      <div className="flex justify-center gap-4">
        <Button onClick={() => setPage(p => Math.max(p - 1, 0))} disabled={page === 0}>
          Previous
        </Button>
        <Button onClick={() => setPage(p => p + 1)} disabled={newsletters && newsletters.newsletters.length < 20}>
          Next
        </Button>
      </div>
    </div>;
}