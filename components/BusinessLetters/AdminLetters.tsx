// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@clerk/nextjs";
export default function BusinessLettersAdmin() {
  const [refreshKey, setRefreshKey] = useState(0);
  const {
    toast
  } = useToast();
  const {
    user
  } = useUser();
  const userRole = user?.publicMetadata?.role;
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const letters = useQuery(api.business_letters.getAllBusinessLetters, {
    refreshKey
  }) || [];
  const users = useQuery(api.users.getUsers) || [];
  const deleteLetter = useMutation(api.business_letters.deleteBusinessLetter);
  const getFileUrl = useMutation(api.business_letters.getFileUrl);
  const assignLettersToStaff = useMutation(api.business_letters.assignLettersToStaff);
  const [selectedLetterIds, setSelectedLetterIds] = useState<Id<"business_letters">[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedStream, setSelectedStream] = useState("");
  const [selectedLetter, setSelectedLetter] = useState<Id<"business_letters"> | null>(null);
  const [fileMap, setFileMap] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState({
    email: "",
    from: "",
    to: ""
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [assigning, setAssigning] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [assignEntireStream, setAssignEntireStream] = useState(false);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [activeLetterFiles, setActiveLetterFiles] = useState<{
    main: Id<"_storage">;
    attachments: Id<"_storage">[];
  } | null>(null);
  const convex = useConvex();
  const [selectedStaffIds, setSelectedStaffIds] = useState<Id<"users">[]>([]);
  const recordsPerPage = 20;
  const staffStreams = useMemo(() => {
    const streams = new Set<string>();
    users.forEach(user => {
      if (user.role === "staff" && user.staffStream) {
        streams.add(user.staffStream);
      }
    });
    ["regulatory", "innovation", "judiciary", "communications", "investments", "receptionist", "account", "auditor"].forEach(stream => streams.add(stream));
    return Array.from(streams);
  }, [users]);
  const handleShowFiles = (letter: typeof letters[number]) => {
    setActiveLetterFiles({
      main: letter.letterFileId,
      attachments: letter.supportingFileIds || []
    });
    setFileDialogOpen(true);
  };
  const filteredLetters = letters.filter(l => {
    const search = filter.email.toLowerCase();
    const matchesSearch = search === "" || l.email.toLowerCase().includes(search) || l.contactName.toLowerCase().includes(search) || l.companyName.toLowerCase().includes(search);
    const date = new Date(l.createdAt);
    const matchesDate = (!filter.from || new Date(filter.from) <= date) && (!filter.to || date <= new Date(`${filter.to}T23:59:59`));
    return matchesSearch && matchesDate;
  }).sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
  });
  const paginatedLetters = filteredLetters.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);
  const totalPages = Math.ceil(filteredLetters.length / recordsPerPage);
  const handleDelete = async () => {
    if (selectedLetter) {
      await deleteLetter({
        letterId: selectedLetter
      });
      toast({
        title: "Deleted Successfully",
        description: `The letter has been successfully deleted.`
      });
      setDeleteDialogOpen(false);
    }
  };
  const fetchFileUrl = async (id: Id<"_storage">) => {
    if (fileMap[id]) return fileMap[id];
    const url = await getFileUrl({
      storageId: id
    });
    if (url) setFileMap(prev => ({
      ...prev,
      [id]: url
    }));
    return url;
  };
  const toggleSelection = (id: Id<"business_letters">) => {
    setSelectedLetterIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const handleAssignConfirm = async () => {
    const streamStaff = users.filter(u => u.role === "staff" && u.staffStream === selectedStream);
    const selectedStaff = streamStaff.filter(staff => selectedStaffIds.includes(staff._id));
    if (selectedStaff.length === 0) {
      toast({
        title: "No staff selected",
        description: "Please select at least one staff member for this stream.",
        variant: "destructive"
      });
      return;
    }
    try {
      setAssigning(true);
      await assignLettersToStaff({
        letterIds: selectedLetterIds,
        stream: selectedStream,
        staffIds: assignEntireStream ? streamStaff.map(s => s._id) : selectedStaff.map(s => s._id),
        staffNames: assignEntireStream ? streamStaff.map(s => `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim()) : selectedStaff.map(s => `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim())
      });
      toast({
        title: "Assigned",
        description: `${selectedLetterIds.length} letter(s) assigned to ${selectedStream}.`
      });
      setRefreshKey(prev => prev + 1);
      setSelectedLetterIds([]);
      setAssignDialogOpen(false);
      setSelectedStaffIds([]);
      setSelectedStream("");
    } catch (error) {
      console.error("Assignment error:", error);
      toast({
        title: "Error",
        description: "Failed to assign letters.",
        variant: "destructive"
      });
    } finally {
      setAssigning(false);
    }
  };
  const toLocalDateString = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const adjusted = new Date(date.getTime() - offset * 60000);
    return adjusted.toISOString().split("T")[0];
  };
  const handleDateFilter = (label: "today" | "week" | "month") => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const to = new Date(now);
    let from: Date;
    switch (label) {
      case "today":
        from = new Date(now);
        break;
      case "week":
        {
          const day = now.getDay();
          const diffToMonday = day === 0 ? 6 : day - 1;
          from = new Date(now);
          from.setDate(now.getDate() - diffToMonday);
          break;
        }
      case "month":
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        from = new Date(now);
    }
    setFilter({
      ...filter,
      from: toLocalDateString(from),
      to: toLocalDateString(to)
    });
    setActiveQuickFilter(label);
  };
  const openAssignDialog = () => {
    if (selectedLetterIds.length === 0) return;
    const selectedLetters = letters.filter(letter => selectedLetterIds.includes(letter._id));
    const commonStream = selectedLetters.every(l => l.assignedStream === selectedLetters[0].assignedStream) ? selectedLetters[0].assignedStream : "";
    const preSelectedUsers = users.filter(user => selectedLetters.some(l => l.assignedTo && (Array.isArray(l.assignedTo) ? l.assignedTo.includes(user._id) : l.assignedTo === user._id) && user.staffStream === commonStream)).map(u => u._id);
    setSelectedStream(commonStream || "");
    setSelectedStaffIds(preSelectedUsers);
    setAssignEntireStream(false);
    setAssignDialogOpen(true);
  };
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);
  return <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2">
        📄 Incoming Letters from Users
      </h1>

      {}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6 flex-wrap">
  <Input placeholder="Search by email, company or contact" value={filter.email} onChange={e => setFilter({
        ...filter,
        email: e.target.value
      })} className="w-full sm:w-64" />

  <div className="flex gap-2 w-full sm:w-auto items-end">
    <Input type="date" value={filter.from} max={filter.to || undefined} onChange={e => {
          const newFrom = e.target.value;
          setFilter(prev => ({
            ...prev,
            from: newFrom,
            to: prev.to && newFrom > prev.to ? "" : prev.to
          }));
        }} className="w-[135px]" />
    <Input type="date" value={filter.to} min={filter.from || undefined} onChange={e => setFilter(prev => ({
          ...prev,
          to: e.target.value
        }))} className="w-[135px]" />
  </div>

  <div className="flex gap-2 flex-wrap">
  <Button variant={activeQuickFilter === "today" ? "default" : "outline"} className={activeQuickFilter === "today" ? "bg-green-700 text-white" : ""} size="sm" onClick={() => handleDateFilter("today")}>
    Today
  </Button>

  <Button variant={activeQuickFilter === "week" ? "default" : "outline"} className={activeQuickFilter === "week" ? "bg-green-700 text-white" : ""} size="sm" onClick={() => handleDateFilter("week")}>
    This Week
  </Button>

  <Button variant={activeQuickFilter === "month" ? "default" : "outline"} className={activeQuickFilter === "month" ? "bg-green-700 text-white" : ""} size="sm" onClick={() => handleDateFilter("month")}>
    This Month
  </Button>

  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => {
          setFilter({
            email: "",
            from: "",
            to: ""
          });
          setActiveQuickFilter(null);
        }}>
    Clear Filters
  </Button>
      </div>

    </div>


      {}
      {selectedLetterIds.length > 0 && <div className="flex justify-end mb-4">
    <Button onClick={openAssignDialog}>
      {letters.some(l => selectedLetterIds.includes(l._id) && (l.assignedStream || l.assignedTo?.length)) ? "Reassign Selected" : "Assign Selected"}
    </Button>
  </div>}

    <div className="flex justify-end mb-4">
  <div className="flex items-center gap-2">
    <span className="text-sm text-gray-600">Sort by:</span>
    <select value={sortOrder} onChange={e => setSortOrder(e.target.value as "newest" | "oldest")} className="border rounded px-2 py-1 text-sm">
      <option value="newest">Newest to Oldest</option>
      <option value="oldest">Oldest to Newest</option>
    </select>
  </div>
    </div>



      {}
    {}
    <div className="w-full overflow-x-auto border rounded-md">
    <div className="w-full overflow-x-auto border rounded-md">
  <table className="min-w-[1000px] text-sm whitespace-nowrap">
    <thead className="bg-gray-100 text-left">
      <tr>
        <th className="p-3"></th>
        <th className="p-3">Title</th>
        <th className="p-3">Company</th>
        <th className="p-3">Email</th>
        <th className="p-3">Phone</th>
        <th className="p-3">Date</th>
        <th className="p-3">Files</th>
        <th className="p-3">Assigned To</th>
        <th className="p-3">Status</th>
        <th className="p-3">Actions</th>
      </tr>
    </thead>

    <tbody>
      {paginatedLetters.map(letter => <tr key={letter._id} className="border-t">
          <td className="p-3">
            <input type="checkbox" checked={selectedLetterIds.includes(letter._id)} onChange={() => toggleSelection(letter._id)} />
          </td>
          <td className="p-3">{letter.title}</td>
          <td className="p-3">{letter.companyName}</td>
          <td className="p-3">{letter.email}</td>
          <td className="p-3">{letter.phone}</td>
          <td className="p-3">{format(new Date(letter.createdAt), "PPP")}</td>
          <td className="p-3">
            <Button variant="outline" size="sm" onClick={() => handleShowFiles(letter)}>
              📎 Show Files
            </Button>
          </td>
          <td className="p-3">
            {letter.assignedStream ? <span className="capitalize">{letter.assignedStream}</span> : <span className="italic text-gray-400">not assigned</span>}
          </td>
          <td className="p-3">
            <span className={`capitalize px-2 py-1 rounded text-xs font-medium ${letter.status === "resolved" ? "bg-green-100 text-green-700" : letter.status === "in_progress" ? "bg-blue-100 text-blue-700" : letter.status === "acknowledged" ? "bg-purple-100 text-purple-700" : letter.status === "pending" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"}`}>
              {letter.status === "pending" && "Waiting for Ack"}
              {letter.status === "acknowledged" && "Acknowledged"}
              {letter.status === "in_progress" && "In Progress"}
              {letter.status === "resolved" && "Resolved"}
              {!letter.status && !letter.assignedTo && "Not Assigned"}
            </span>
          </td>
          <td className="p-3">
  {userRole === "admin" && <Button variant="destructive" onClick={() => {
                  setSelectedLetter(letter._id);
                  setDeleteDialogOpen(true);
                }}>
      Delete
    </Button>}
              </td>


        </tr>)}
    </tbody>
  </table>
      </div>

      </div>


      {}
      {totalPages > 1 && <div className="flex justify-center gap-4 mt-6">
          <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>
            ← Previous
          </Button>
          <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
          <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>
            Next →
          </Button>
        </div>}

      {}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Workstream</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
  {}
  <select value={selectedStream} onChange={e => {
            setSelectedStream(e.target.value);
            setAssignEntireStream(false);
            setSelectedStaffIds([]);
          }} className="w-full border rounded px-3 py-2">
  <option value="">Select Stream</option>
  {staffStreams.map(stream => <option key={stream} value={stream}>{stream}</option>)}
          </select>

  <div className="flex items-center gap-2 mt-2">
  <input type="checkbox" id="assignAll" checked={assignEntireStream} onChange={() => setAssignEntireStream(!assignEntireStream)} />
  <label htmlFor="assignAll" className="text-sm text-gray-700">
    Assign entire stream
  </label>
          </div>


  {}
  {selectedStream && !assignEntireStream && <div className="border rounded p-3 max-h-60 overflow-y-auto">
    <p className="text-sm font-medium mb-2 text-gray-700">
      Select Staff in "{selectedStream}"
    </p>
    {users.filter(u => u.role === "staff" && u.staffStream === selectedStream).map(staff => <label key={staff._id} className="flex items-center space-x-2 mb-2">
          <input type="checkbox" checked={selectedStaffIds.includes(staff._id)} onChange={e => {
                if (e.target.checked) {
                  setSelectedStaffIds(prev => [...prev, staff._id]);
                } else {
                  setSelectedStaffIds(prev => prev.filter(id => id !== staff._id));
                }
              }} />
          <span>{`${staff.firstName ?? ""} ${staff.lastName ?? ""}`}</span>
        </label>)}
    {users.filter(u => u.role === "staff" && u.staffStream === selectedStream).length === 0 && <p className="text-sm text-gray-500 italic">No staff in this stream.</p>}
  </div>}

        </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignConfirm} disabled={assigning || !selectedStream}>
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
          </DialogHeader>
          <p>This will permanently delete the letter.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Yes, Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={fileDialogOpen} onOpenChange={setFileDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Attached Files</DialogTitle>
    </DialogHeader>
    <div className="space-y-2">
    <Button variant="link" className="text-blue-600 p-0" onClick={async () => {
            if (!activeLetterFiles?.main) return;
            const url = await fetchFileUrl(activeLetterFiles.main);
            if (!url) {
              toast({
                title: "Error",
                description: "Failed to fetch main letter URL.",
                variant: "destructive"
              });
              return;
            }
            try {
              const response = await fetch(url);
              const blob = await response.blob();
              const blobUrl = window.URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = blobUrl;
              link.download = "Main_Letter.pdf";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(blobUrl);
              toast({
                title: "Download Successful",
                description: "Main letter downloaded successfully."
              });
            } catch (error) {
              console.error("Failed to download main letter:", error);
              toast({
                title: "Error",
                description: "Failed to download the main letter.",
                variant: "destructive"
              });
            }
          }}>
  📄 Main Letter
          </Button>


      {activeLetterFiles?.attachments.map((fileId, index) => <Button key={fileId} variant="link" className="text-blue-600 p-0 block text-left text-sm" onClick={async () => {
            const url = await fetchFileUrl(fileId);
            if (!url) {
              toast({
                title: "Error",
                description: `Failed to fetch attachment ${index + 1} URL.`,
                variant: "destructive"
              });
              return;
            }
            try {
              const response = await fetch(url);
              const blob = await response.blob();
              const blobUrl = window.URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = blobUrl;
              link.download = `Attachment_${index + 1}.pdf`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(blobUrl);
              toast({
                title: "Download Successful",
                description: `Attachment ${index + 1} downloaded successfully.`
              });
            } catch (error) {
              console.error("Failed to download attachment:", error);
              toast({
                title: "Error",
                description: `Failed to download Attachment ${index + 1}.`,
                variant: "destructive"
              });
            }
          }}>
     📎 Attachment {index + 1}
   </Button>)}
    </div>
    <DialogFooter>
      <Button onClick={() => setFileDialogOpen(false)}>Close</Button>
    </DialogFooter>
  </DialogContent>
    </Dialog>

    </div>;
}