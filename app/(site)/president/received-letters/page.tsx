"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Eye, RefreshCcw } from "lucide-react";
import { format } from "date-fns";

export default function ReceivedLettersPage() {
  const allLetters = useQuery(api.letters.getLettersReceivedByUser) || [];
  const allUsers = useQuery(api.users.getUsers) || [];
  const getFileUrl = useMutation(api.letters.getLetterFileUrl);
  const updateStatus = useMutation(api.letters.updateLetterStatus);

  const [fileUrls, setFileUrls] = useState<{ [key: string]: string }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    search: "",
    role: "",
    sender: "",
    status: "",
    dateFrom: "",
    dateTo: "",
  });

  const itemsPerPage = 20;
  const userMap = Object.fromEntries(
    allUsers.map((user) => [
      user._id,
      `${user.firstName} ${user.lastName} (${user.role || "N/A"}${user.jobTitle ? `, ${user.jobTitle}` : ""})`,
    ])
  );
  
  const roleMap = Object.fromEntries(
    allUsers.map((user) => [user._id, user.role || "unknown"])
  );

  const filtered = allLetters.filter((l) => {
    const matchSearch = l.letterName.toLowerCase().includes(filters.search.toLowerCase());
  
    const letterStatus = l.status ?? "sent"; // normalize undefined to 'sent'
    const matchStatus = filters.status ? letterStatus === filters.status : true;
    
  
  
    const matchRole = filters.role ? roleMap[l.userId] === filters.role : true;
    const matchSender = filters.sender ? l.userId === filters.sender : true;
    const matchDate =
      (!filters.dateFrom || new Date(l.letterDate) >= new Date(filters.dateFrom)) &&
      (!filters.dateTo || new Date(l.letterDate) <= new Date(filters.dateTo));
  
    return matchSearch && matchStatus && matchRole && matchSender && matchDate;
  });
  

  const sorted = [...filtered].sort((a, b) => b.letterDate - a.letterDate);
  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Fetch file URLs once per letter
  useEffect(() => {
    const loadFiles = async () => {
      const result: { [key: string]: string } = {};
      for (const letter of paginated) {
        if (letter.letterUploadId && !fileUrls[letter._id]) {
          const url = await getFileUrl({ storageId: letter.letterUploadId });
          if (url) result[letter._id] = url;
        }
      }
      if (Object.keys(result).length > 0) {
        setFileUrls((prev) => ({ ...prev, ...result }));
      }
    };

    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginated]);

  const handleStatusChange = async (id: Id<"letters">, newStatus: "acknowledged" | "in_progress" | "resolved") => {
    await updateStatus({ letterId: id, status: newStatus });
  };

  const statusColors: Record<string, string> = {
    sent: "bg-yellow-100 text-yellow-700",
    acknowledged: "bg-blue-100 text-blue-700",
    in_progress: "bg-purple-100 text-purple-700",
    resolved: "bg-green-100 text-green-700",
  };

  const uniqueRoles = Array.from(new Set(allLetters.map((l) => roleMap[l.userId])));
  const sendersByRole = allUsers.filter((u) =>
    allLetters.some((l) => l.userId === u._id && roleMap[u._id] === filters.role)
  );

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📥 Received Letters</h1>
        <Button
          variant="outline"
          onClick={() =>
            setFilters({ search: "", role: "", sender: "", status: "", dateFrom: "", dateTo: "" })
          }
        >
          <RefreshCcw className="w-4 h-4 mr-2" />
          Reset Filters
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        <Input
          placeholder="Search letter..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="border rounded-md p-2"
        >
          <option value="">Status</option>
          <option value="sent">Awaiting Acknowledgment</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <select
          value={filters.role}
          onChange={(e) => {
            setFilters({ ...filters, role: e.target.value, sender: "" });
          }}
          className="border rounded-md p-2"
        >
          <option value="">Sender Role</option>
          {uniqueRoles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        {filters.role && (
          <select
            value={filters.sender}
            onChange={(e) => setFilters({ ...filters, sender: e.target.value })}
            className="border rounded-md p-2"
          >
            <option value="">Sender</option>
            {sendersByRole.map((u) => (
              <option key={u._id} value={u._id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </select>
        )}
        <Input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
        />
        <Input
          type="date"
          value={filters.dateTo}
          onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl shadow-md">
        <Table className="min-w-full text-sm">
          <TableHeader className="bg-gray-100">
            <TableRow>
              <TableHead>Letter Name</TableHead>
              <TableHead>Sent On</TableHead>
              <TableHead>From</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((letter) => (
              <TableRow key={letter._id}>
                <TableCell>{letter.letterName}</TableCell>
                <TableCell>{format(new Date(letter.letterDate), "PPP p")}</TableCell>
                <TableCell>
  <div className="flex flex-col max-w-[220px] overflow-x-auto whitespace-normal">
    {(() => {
      const sender = allUsers.find((u) => u._id === letter.userId);
      if (!sender) return <span className="text-gray-500 italic">Unknown</span>;

      return (
        <>
          <span className="font-medium text-gray-800">
            {sender.firstName} {sender.lastName}
          </span>
          <span
            className="text-xs text-gray-500"
            style={{ whiteSpace: "nowrap", overflowX: "auto" }}
          >
            {sender.role === "staff" ? `${sender.role} - ${sender.staffStream || "N/A"}` : sender.role}
            {sender.jobTitle ? `, ${sender.jobTitle}` : ""}
          </span>
        </>
      );
    })()}
  </div>
</TableCell>

                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      statusColors[letter.status ?? "sent"]
                    }`}
                  >
                    {letter.status?.replace("_", " ") || "Awaiting Acknowledgment"}
                  </span>
                </TableCell>
                <TableCell className="flex flex-col gap-2 md:flex-row justify-center items-center">
                  {fileUrls[letter._id] && (
                    <a href={fileUrls[letter._id]} target="_blank" rel="noreferrer">
                      <Button size="sm" className="bg-blue-600 text-white">
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </a>
                  )}
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={letter.status ?? "sent"}
                    onChange={(e) =>
                      handleStatusChange(letter._id, e.target.value as "acknowledged" | "in_progress" | "resolved")
                    }
                  >
                    <option value="sent" disabled>
                      Awaiting Acknowledgment
                    </option>
                    <option value="acknowledged">Acknowledged</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </TableCell>
              </TableRow>
            ))}
            {paginated.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500 py-6">
                  No letters found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex justify-center items-center gap-4 mt-6">
        <Button
          variant="outline"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <span className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
