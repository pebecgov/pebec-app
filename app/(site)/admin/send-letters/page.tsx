"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Eye, Filter, RefreshCcw } from "lucide-react";
import { format } from "date-fns";
import SubmitLetterForm from "@/components/Letters/AdminLetters";

export default function ViewLettersPage() {
  const allLetters = useQuery(api.letters.getUserLetters) || [];
  const allUsers = useQuery(api.users.getUsers) || [];
  const getFileUrl = useMutation(api.letters.getLetterFileUrl);

  const [fileUrls, setFileUrls] = useState<{ [key: string]: string }>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    role: "",
    dateFrom: "",
    dateTo: "",
  });

  const itemsPerPage = 10;

  const userMap = Object.fromEntries(
    allUsers.map((user) => [
      user._id,
      `${user.firstName || ""} ${user.lastName || ""} (${user.role || "N/A"}${user.jobTitle ? `, ${user.jobTitle}` : ""})`.trim(),
    ])
  );

  const roleMap = Object.fromEntries(
    allUsers.map((user) => [user._id, user.role || "unknown"])
  );

  const filtered = allLetters.filter((l) => {
    const matchSearch = l.letterName.toLowerCase().includes(filters.search.toLowerCase());
    const matchStatus = filters.status
      ? (l.status ?? "sent") === filters.status
      : true;
      const matchRole = filters.role
      ? l.sentTo !== undefined && roleMap[l.sentTo] === filters.role
      : true;
        const matchDate =
      (!filters.dateFrom || new Date(l.letterDate) >= new Date(filters.dateFrom)) &&
      (!filters.dateTo || new Date(l.letterDate) <= new Date(filters.dateTo));

    return matchSearch && matchStatus && matchRole && matchDate;
  });

  const sorted = [...filtered].sort((a, b) => b.letterDate - a.letterDate);
  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    const fetchUrls = async () => {
      const urls: { [key: string]: string } = {};
      for (const letter of paginated) {
        if (letter.letterUploadId && !fileUrls[letter._id]) {
          const response = await getFileUrl({ storageId: letter.letterUploadId });
          if (response?.url) {
            urls[letter._id] = response.url;
          }
        }
      }
      if (Object.keys(urls).length > 0) {
        setFileUrls((prev) => ({ ...prev, ...urls }));
      }
    };
    fetchUrls();
  }, [paginated, fileUrls, getFileUrl]);
  

  const statusColors: Record<string, string> = {
    sent: "bg-gray-200 text-gray-700",
    acknowledged: "bg-blue-100 text-blue-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    resolved: "bg-green-100 text-green-700",
  };

  const roles = Array.from(new Set(allUsers.map((u) => u.role))).filter(Boolean);

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">📬 My Letters</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setFilters({ search: "", status: "", role: "", dateFrom: "", dateTo: "" })}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Reset Filters
          </Button>
          <Button onClick={() => setIsModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
            Send Letter
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Input
          placeholder="Search by letter name"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="border rounded-md p-2"
        >
          <option value="">Filter by Status</option>
          <option value="sent">Sent</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <select
          value={filters.role}
          onChange={(e) => setFilters({ ...filters, role: e.target.value })}
          className="border rounded-md p-2"
        >
          <option value="">Filter by Role</option>
          {roles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        <Input
  type="date"
  value={filters.dateFrom}
  min="2024-10-22" // Adjust as needed dynamically if required
  onChange={(e) => {
    const value = e.target.value;
    if (value >= "2024-10-22") {
      setFilters((prev) => ({ ...prev, dateFrom: value }));
    }
  }}
/>
<Input
  type="date"
  value={filters.dateTo}
  min={filters.dateFrom || "2024-10-22"}
  onChange={(e) => {
    const value = e.target.value;
    if (value >= filters.dateFrom) {
      setFilters((prev) => ({ ...prev, dateTo: value }));
    }
  }}
/>

      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl shadow">
        <Table className="min-w-full text-sm">
          <TableHeader className="bg-gray-100">
            <TableRow>
              <TableHead>Letter Name</TableHead>
              <TableHead>Date Sent</TableHead>
              <TableHead>Sent To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length > 0 ? (
              paginated.map((letter) => (
                <TableRow key={letter._id}>
                  <TableCell>{letter.letterName}</TableCell>
                  <TableCell>{format(new Date(letter.letterDate), "PPP")}</TableCell>
                  <TableCell>
                    {letter.sentTo && userMap[letter.sentTo] ? (
                      <span>{userMap[letter.sentTo]}</span>
                    ) : (
                      <span className="text-gray-400 italic">Not specified</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColors[letter.status ?? "sent"]}`}>
                      {letter.status?.replace("_", " ").toUpperCase() || "SENT"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {fileUrls[letter._id] ? (
                      <a href={fileUrls[letter._id]} target="_blank" rel="noopener noreferrer">
                       <Button
  size="icon"
  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full"
  title="Download Letter"
  onClick={async () => {
    const url = fileUrls[letter._id];
    if (!url) return;

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${letter.letterName || "Letter"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed", error);
    }
  }}
>
  <Eye className="w-4 h-4" />
</Button>

                      </a>
                    ) : (
                      <Button size="icon" className="bg-gray-300 text-white rounded-full" disabled>
                        ...
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
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
        <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
        <Button
          variant="outline"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>

      {/* Modal */}
      {isModalOpen && <SubmitLetterForm onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}
