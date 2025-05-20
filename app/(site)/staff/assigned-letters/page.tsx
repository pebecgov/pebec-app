"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

export default function StaffLettersPage() {
  const letters = useQuery(api.business_letters.getAllBusinessLetters, {}) || [];
  const users = useQuery(api.users.getUsers, {}) || [];
  const { user } = useUser();

  const updateStatus = useMutation(api.business_letters.updateLetterStatus);
  const getFileUrl = useMutation(api.business_letters.getFileUrl);

  const currentStaff = users.find((u) => u.clerkUserId === user?.id);
  const staffStream = currentStaff?.staffStream;

  const [filter, setFilter] = useState({ email: "", from: "", to: "" });
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [activeLetterFiles, setActiveLetterFiles] = useState<{
    main: Id<"_storage">;
    attachments: Id<"_storage">[];
  } | null>(null);

  const [confirmRevertDialog, setConfirmRevertDialog] = useState(false);
  const [selectedLetterId, setSelectedLetterId] = useState<Id<"business_letters"> | null>(null);
  const recordsPerPage = 20;
  const [currentPage, setCurrentPage] = useState(1);
  
  const [fileMap, setFileMap] = useState<Record<string, string>>({});

  const handleShowFiles = (letter: typeof letters[number]) => {
    setActiveLetterFiles({
      main: letter.letterFileId,
      attachments: letter.supportingFileIds || [],
    });
    setFileDialogOpen(true);
  };

  const statusOptions = {
    pending: ["acknowledged"],
    acknowledged: ["in_progress"],
    in_progress: ["resolved"],
    resolved: [],
  };

  
  const handleDateFilter = (type: "today" | "week" | "month") => {
    const now = new Date();
    let from: Date;
    let to: Date;
  
    switch (type) {
      case "today":
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
  
      case "week": {
        const day = now.getDay(); // Sunday = 0, Monday = 1
        const diffToMonday = day === 0 ? -6 : 1 - day;
        from = new Date(now);
        from.setDate(now.getDate() + diffToMonday);
        from.setHours(0, 0, 0, 0);
        to = new Date(); // current day
        to.setHours(23, 59, 59);
        break;
      }
  
      case "month":
  from = new Date(now.getFullYear(), now.getMonth(), 1); // 1st day of current month
  from.setHours(0, 0, 0, 0);

  to = new Date(); // today
  to.setHours(23, 59, 59, 999);
  break;

    }
  
    const formatDateLocal = (date: Date) => {
      return date.toLocaleDateString("en-CA"); // formats as YYYY-MM-DD
    };
    
    setFilter({
      ...filter,
      from: formatDateLocal(from),
      to: formatDateLocal(to),
    });
    
  };
  
  

  const fetchFileUrl = async (id: Id<"_storage">) => {
    if (fileMap[id]) return fileMap[id];
    const url = await getFileUrl({ storageId: id });
    if (url) setFileMap((prev) => ({ ...prev, [id]: url }));
    return url;
  };

  const filteredLetters = letters
  .filter((l) => l.assignedStream === staffStream)
  .filter((l) => {
    const search = filter.email.toLowerCase();
    const matchesSearch =
      search === "" ||
      l.email.toLowerCase().includes(search) ||
      l.contactName.toLowerCase().includes(search) ||
      l.companyName.toLowerCase().includes(search);

    const date = new Date(l.createdAt);
    const recordDateStr = new Date(l.createdAt).toISOString().split("T")[0];

    const matchesDate =
      (!filter.from || filter.from <= recordDateStr) &&
      (!filter.to || recordDateStr <= filter.to);
    

    return matchesSearch && matchesDate;
  })
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalPages = Math.ceil(filteredLetters.length / recordsPerPage);
  const paginatedLetters = filteredLetters.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );
  
  const handleStatusChange = async (letterId: Id<"business_letters">, newStatus: "acknowledged" | "in_progress" | "resolved") => {
    try {
      await updateStatus({ letterId, status: newStatus });
      toast.success(`Status updated to ${newStatus}.`);
    } catch (e) {
      toast.error("Error updating status.");
    }
  };
  

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2">
        📬 My Assigned Letters
      </h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6 flex-wrap">
        <Input
          placeholder="Search by email, company or contact"
          value={filter.email}
          onChange={(e) => setFilter({ ...filter, email: e.target.value })}
          className="w-full sm:w-64"
        />
        <div className="flex gap-2">
          <Input
            type="date"
            value={filter.from}
            onChange={(e) => setFilter({ ...filter, from: e.target.value })}
          />
          <Input
            type="date"
            value={filter.to}
            onChange={(e) => setFilter({ ...filter, to: e.target.value })}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => handleDateFilter("today")}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDateFilter("week")}>
            This Week
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDateFilter("month")}>
            Monthly
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500"
            onClick={() => setFilter({ email: "", from: "", to: "" })}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="w-full overflow-x-auto border rounded-md">
      <table className="min-w-full text-sm">
  <thead className="bg-gray-100 text-left">
    <tr>
      <th className="p-3">Title</th>
      <th className="p-3">Company</th>
      <th className="p-3">Email</th>
      <th className="p-3">Phone</th>
      <th className="p-3">Date</th>
      <th className="p-3">Files</th>
      <th className="p-3">Status</th>
      <th className="p-3">Action</th>
    </tr>
  </thead>

  <tbody>
    {paginatedLetters.map((letter) => {
      const statusFlow: Record<
      "pending" | "acknowledged" | "in_progress" | "resolved",
      "acknowledged" | "in_progress" | "resolved" | null
    > = {
      pending: "acknowledged",
      acknowledged: "in_progress",
      in_progress: "resolved",
      resolved: null,
    };
    

    const nextStatus = statusFlow[(letter.status || "pending") as keyof typeof statusFlow];

      return (
        <tr key={letter._id} className="border-t">
          <td className="p-3">{letter.title}</td>
          <td className="p-3">{letter.companyName}</td>
          <td className="p-3">{letter.email}</td>
          <td className="p-3">{letter.phone}</td>
          <td className="p-3">{format(new Date(letter.createdAt), "PPP")}</td>

          <td className="p-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleShowFiles(letter)}
            >
              📎 Show Files
            </Button>
          </td>

          <td className="p-3">
            <span
              className={`capitalize px-2 py-1 rounded text-xs font-medium ${
                letter.status === "resolved"
                  ? "bg-green-100 text-green-700"
                  : letter.status === "in_progress"
                  ? "bg-blue-100 text-blue-700"
                  : letter.status === "acknowledged"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-orange-100 text-orange-700"
              }`}
            >
              {letter.status || "pending"}
            </span>
          </td>

          <td className="p-3">
            {nextStatus ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange(letter._id, nextStatus)}
              >
                {letter.status === "pending" && "Mark as Acknowledged"}
                {letter.status === "acknowledged" && "Mark as In Progress"}
                {letter.status === "in_progress" && "Mark as Completed"}
              </Button>
            ) : (
              <span className="text-xs text-gray-400">No further action</span>
            )}
          </td>
        </tr>
      );
    })}
  </tbody>
</table>

        {totalPages > 1 && (
  <div className="flex justify-center items-center gap-4 mt-6">
    <Button
      size="sm"
      variant="outline"
      disabled={currentPage === 1}
      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
    >
      ← Previous
    </Button>

    <span className="text-sm text-gray-600">
      Page {currentPage} of {totalPages}
    </span>

    <Button
      size="sm"
      variant="outline"
      disabled={currentPage === totalPages}
      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
    >
      Next →
    </Button>
  </div>
)}

      </div>

      {/* File Dialog */}
      <Dialog open={fileDialogOpen} onOpenChange={setFileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attached Files</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Button
              variant="link"
              className="text-blue-600 p-0"
              onClick={async () => {
                if (!activeLetterFiles?.main) return;
                const url = await fetchFileUrl(activeLetterFiles.main);
                if (url) window.open(url, "_blank");
              }}
            >
              📄 Main Letter
            </Button>
            {activeLetterFiles?.attachments.map((fileId, index) => (
              <Button
                key={fileId}
                variant="link"
                className="text-blue-600 p-0 block text-left text-sm"
                onClick={async () => {
                  const url = await fetchFileUrl(fileId);
                  if (url) window.open(url, "_blank");
                }}
              >
                📎 Attachment {index + 1}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setFileDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revert Status Confirmation */}
      <Dialog open={confirmRevertDialog} onOpenChange={setConfirmRevertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Status?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            This letter is already marked as completed. Are you sure you want to mark it back as in progress?
          </p>
     <DialogFooter>
  <Button variant="outline" onClick={() => setConfirmRevertDialog(false)}>
    Cancel
  </Button>

  <Button
    variant="destructive"
    onClick={() => {
      if (selectedLetterId) {
        handleStatusChange(selectedLetterId, "in_progress");  // Correct status here
        setConfirmRevertDialog(false);
      }
    }}
  >
    Yes, Revert to In Progress
  </Button>
</DialogFooter>

        </DialogContent>
      </Dialog>
    </div>
  );
}
