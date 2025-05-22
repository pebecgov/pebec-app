// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Eye, RefreshCcw } from "lucide-react";
import { format } from "date-fns";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
export default function AssignLettersPage() {
  const {
    user
  } = useUser();
  const userStream = user?.publicMetadata?.stream;
  const userRole = user?.publicMetadata?.role;
  const allLetters = useQuery(api.letters.getLettersReceivedByUser) || [];
  const allUsers = useQuery(api.users.getUsers) || [];
  const getFileUrl = useMutation(api.letters.getLetterFileUrl);
  const updateStatus = useMutation(api.letters.updateLetterStatus);
  const assignLetterToAuditor = useMutation(api.letters.assignLetterToAuditor);
  const [selectedLetters, setSelectedLetters] = useState<Id<"letters">[]>([]);
  const [selectedAuditor, setSelectedAuditor] = useState<Id<"users"> | "">("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    role: "",
    sender: "",
    dateFrom: "",
    dateTo: ""
  });
  const itemsPerPage = 20;
  const roleMap = Object.fromEntries(allUsers.map(u => [u._id, u.role || "unknown"]));
  const userMap = Object.fromEntries(allUsers.map(u => [u._id, `${u.firstName} ${u.lastName}`]));
  const auditorStaff = allUsers.filter(u => u.role === "staff" && u.staffStream === "auditor");
  const filtered = allLetters.filter(l => {
    const matchSearch = l.letterName.toLowerCase().includes(filters.search.toLowerCase());
    const matchStatus = filters.status === "" ? true : l.status === filters.status;
    const matchRole = filters.role ? roleMap[l.userId] === filters.role : true;
    const matchSender = filters.sender ? l.userId === filters.sender : true;
    const matchDate = (!filters.dateFrom || new Date(l.letterDate) >= new Date(filters.dateFrom)) && (!filters.dateTo || new Date(l.letterDate) <= new Date(filters.dateTo));
    return matchSearch && matchStatus && matchRole && matchSender && matchDate;
  });
  const sorted = [...filtered].sort((a, b) => b.letterDate - a.letterDate);
  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  useEffect(() => {
    const fetchUrls = async () => {
      const missing = paginated.filter(l => !fileUrls[l._id]);
      const updates: Record<string, string> = {};
      for (const letter of missing) {
        if (letter.letterUploadId) {
          const url = await getFileUrl({
            storageId: letter.letterUploadId
          });
          if (url) updates[letter._id] = url;
        }
      }
      if (Object.keys(updates).length > 0) {
        setFileUrls(prev => ({
          ...prev,
          ...updates
        }));
      }
    };
    if (paginated.length > 0) {
      fetchUrls();
    }
  }, [paginated]);
  const handleAssign = async () => {
    try {
      await assignLetterToAuditor({
        letterIds: selectedLetters,
        auditorId: selectedAuditor as Id<"users">
      });
      toast.success("Letters assigned successfully!");
      setSelectedAuditor("");
      setSelectedLetters([]);
      setAssignDialogOpen(false);
    } catch (error) {
      toast.error("Failed to assign letters");
    }
  };
  const handleStatusChange = async (id: Id<"letters">, status: "acknowledged" | "in_progress" | "resolved") => {
    await updateStatus({
      letterId: id,
      status
    });
  };
  const statusColors: Record<string, string> = {
    sent: "bg-yellow-100 text-yellow-700",
    acknowledged: "bg-blue-100 text-blue-700",
    in_progress: "bg-purple-100 text-purple-700",
    resolved: "bg-green-100 text-green-700"
  };
  return <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between mb-6">
        <h1 className="text-xl font-semibold">Assign Letters to Auditors</h1>
        <Button variant="outline" onClick={() => setFilters({
        search: "",
        status: "",
        role: "",
        sender: "",
        dateFrom: "",
        dateTo: ""
      })}>
          <RefreshCcw className="w-4 h-4 mr-2" />
          Reset Filters
        </Button>
      </div>

     {}
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
  {}
  <Input placeholder="Search by name..." value={filters.search} onChange={e => setFilters({
        ...filters,
        search: e.target.value
      })} />

  {}
  <select value={filters.status} onChange={e => setFilters({
        ...filters,
        status: e.target.value
      })} className="border p-2 rounded">
    <option value="">All Status</option>
    <option value="sent">Sent</option>
    <option value="acknowledged">Acknowledged</option>
    <option value="in_progress">In Progress</option>
    <option value="resolved">Resolved</option>
  </select>

  {}
  <Input type="date" value={filters.dateFrom} onChange={e => setFilters({
        ...filters,
        dateFrom: e.target.value
      })} />

  {}
  <Input type="date" value={filters.dateTo} onChange={e => setFilters({
        ...filters,
        dateTo: e.target.value
      })} />

  {}
  <select value={filters.role} onChange={e => setFilters({
        ...filters,
        role: e.target.value,
        sender: ""
      })} className="border p-2 rounded">
    <option value="">All Roles</option>
    {Array.from(new Set(allUsers.map(u => u.role).filter(Boolean))).map(role => <option key={role} value={role}>
        {role}
      </option>)}
  </select>

  {}
  {filters.role && <select value={filters.sender} onChange={e => setFilters({
        ...filters,
        sender: e.target.value
      })} className="border p-2 rounded">
      <option value="">All Senders</option>
      {allUsers.filter(u => u.role === filters.role).map(u => <option key={u._id} value={u._id}>
            {u.firstName} {u.lastName}
          </option>)}
    </select>}
    </div>

      {}
      {selectedLetters.length > 0 && <div className="mb-4 text-right">
          <Button className="bg-green-600 text-white" onClick={() => setAssignDialogOpen(true)}>
            Assign Selected
          </Button>
        </div>}

      {}
      <div className="overflow-x-auto bg-white rounded-xl shadow-md">
  <Table className="min-w-[700px] w-full text-sm whitespace-nowrap">
    <TableHeader className="bg-gray-100">
      <TableRow>
        <TableHead>Select</TableHead>
        <TableHead>Letter Name</TableHead>
        <TableHead>Sent On</TableHead>
        <TableHead>From</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Assigned To</TableHead>
        <TableHead className="text-center">Actions</TableHead>
      </TableRow>
    </TableHeader>

    <TableBody>
      {paginated.map(letter => {
            const assignedToName = allUsers.find(u => u._id === (letter as any).assignedTo)?.firstName + " " + allUsers.find(u => u._id === (letter as any).assignedTo)?.lastName;
            return <TableRow key={letter._id}>
            <TableCell>
              <input type="checkbox" checked={selectedLetters.includes(letter._id)} onChange={e => setSelectedLetters(prev => e.target.checked ? [...prev, letter._id] : prev.filter(id => id !== letter._id))} />
            </TableCell>
            <TableCell className="max-w-[200px] truncate">{letter.letterName}</TableCell>
            <TableCell>{format(new Date(letter.letterDate), "PPP p")}</TableCell>
            <TableCell>
              {allUsers.find(u => u._id === letter.userId)?.firstName ?? "Unknown"}{" "}
              {allUsers.find(u => u._id === letter.userId)?.lastName ?? ""}
            </TableCell>
            <TableCell>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[letter.status ?? "sent"]}`}>
                {letter.status?.replace("_", " ") || "Sent"}
              </span>
            </TableCell>
            <TableCell>
              {assignedToName && assignedToName !== "undefined undefined" ? assignedToName : "-"}
            </TableCell>
            <TableCell>
              <div className="flex flex-col gap-2 md:flex-row justify-center items-center">
                {fileUrls[letter._id] && <a href={fileUrls[letter._id]} target="_blank" rel="noreferrer">
                    <Button size="sm" className="bg-blue-600 text-white">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </a>}

                {}
                {userRole === "staff" && userStream === "auditor" && <select className="border rounded px-2 py-1 text-sm mt-2" value={letter.status ?? "sent"} onChange={e => handleStatusChange(letter._id, e.target.value as "acknowledged" | "in_progress" | "resolved")}>
                    <option value="sent" disabled>
                      Awaiting Acknowledgment
                    </option>
                    <option value="acknowledged">Acknowledged</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>}
              </div>
            </TableCell>
          </TableRow>;
          })}

      {paginated.length === 0 && <TableRow>
          <TableCell colSpan={7} className="text-center text-gray-500 py-6">
            No letters found.
          </TableCell>
        </TableRow>}
    </TableBody>
  </Table>
    </div>



      {}
      <div className="flex justify-center items-center gap-4 mt-6">
        <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
          Previous
        </Button>
        <span className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </span>
        <Button variant="outline" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
          Next
        </Button>
      </div>

      {}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Auditor</DialogTitle>
          </DialogHeader>

          <select className="w-full border p-2 rounded" value={selectedAuditor} onChange={e => setSelectedAuditor(e.target.value as Id<"users">)}>
            <option value="">Select Auditor</option>
            {auditorStaff.map(staff => <option key={staff._id} value={staff._id}>
                {staff.firstName} {staff.lastName}
              </option>)}
          </select>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={!selectedAuditor}>
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}