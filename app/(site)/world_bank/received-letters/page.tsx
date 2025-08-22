// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Eye, RefreshCcw, FileText } from "lucide-react";
import { format } from "date-fns";
import { formatRoleAndWorkstream, formatRole } from "@/lib/formatters";
import LetterViewModal from "@/components/Letters/LetterViewModal";

export default function ReceivedLettersPage() {
  const allLetters = useQuery(api.letters.getLettersReceivedByUser) || [];
  const allUsers = useQuery(api.users.getUsers) || [];
  const getFileUrl = useMutation(api.letters.getLetterFileUrl);
  const updateStatus = useMutation(api.letters.updateLetterStatus);
  const [fileUrls, setFileUrls] = useState<{
    [key: string]: {
      url: string;
      fileName: string;
    };
  }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    search: "",
    role: "",
    sender: "",
    status: "",
    dateFrom: "",
    dateTo: ""
  });
  const [selectedLetter, setSelectedLetter] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const itemsPerPage = 20;
  const userMap = Object.fromEntries(allUsers.map(user => [user._id, `${user.firstName} ${user.lastName} (${user.role || "N/A"}${user.jobTitle ? `, ${user.jobTitle}` : ""})`]));
  const roleMap = Object.fromEntries(allUsers.map(user => [user._id, user.role || "unknown"]));
  const filtered = allLetters.filter(l => {
    const matchSearch = l.letterName.toLowerCase().includes(filters.search.toLowerCase());
    const letterStatus = l.status ?? "sent";
    const matchStatus = filters.status ? letterStatus === filters.status : true;
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
      const newUrls: {
        [key: string]: {
          url: string;
          fileName: string;
        };
      } = {};
      for (const letter of paginated) {
        if (letter.letterUploadId && !fileUrls[letter._id]) {
          const fileData = await getFileUrl({
            storageId: letter.letterUploadId
          });
          if (fileData) {
            newUrls[letter._id] = fileData;
          }
        }
      }
      if (Object.keys(newUrls).length > 0) {
        setFileUrls(prev => ({
          ...prev,
          ...newUrls
        }));
      }
    };
    fetchUrls();
  }, [paginated, getFileUrl]);

  const handleStatusChange = async (id: Id<"letters">, newStatus: "acknowledged" | "in_progress" | "resolved") => {
    await updateStatus({
      letterId: id,
      status: newStatus
    });
  };

  const statusColors: Record<string, string> = {
    sent: "bg-yellow-100 text-yellow-700",
    acknowledged: "bg-blue-100 text-blue-700",
    in_progress: "bg-purple-100 text-purple-700",
    resolved: "bg-green-100 text-green-700"
  };

  const uniqueRoles = Array.from(new Set(allLetters.map(l => roleMap[l.userId])));
  const uniqueSenders = Array.from(new Set(allLetters.map(l => l.userId)));

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">📥 Received Letters</h1>
        <Button 
          variant="outline" 
          onClick={() => setFilters({
            search: "",
            role: "",
            sender: "",
            status: "",
            dateFrom: "",
            dateTo: ""
          })}
        >
          <RefreshCcw className="w-4 h-4 mr-2" />
          Reset Filters
        </Button>
      </div>

      {allLetters.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No letters received</h3>
          <p className="mt-1 text-sm text-gray-500">You haven't received any letters yet.</p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <Input 
              placeholder="Search letters..." 
              value={filters.search} 
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
            <select 
              className="border border-gray-300 rounded-md px-3 py-2"
              value={filters.role} 
              onChange={e => setFilters(prev => ({ ...prev, role: e.target.value }))}
            >
              <option value="">All Roles</option>
              {uniqueRoles.map(role => (
                <option key={role} value={role}>{formatRole(role)}</option>
              ))}
            </select>
            <select 
              className="border border-gray-300 rounded-md px-3 py-2"
              value={filters.sender} 
              onChange={e => setFilters(prev => ({ ...prev, sender: e.target.value }))}
            >
              <option value="">All Senders</option>
              {uniqueSenders.map(senderId => (
                <option key={senderId} value={senderId}>{userMap[senderId]}</option>
              ))}
            </select>
            <select 
              className="border border-gray-300 rounded-md px-3 py-2"
              value={filters.status} 
              onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">All Status</option>
              <option value="sent">Sent</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
            <Input 
              type="date" 
              value={filters.dateFrom} 
              onChange={e => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            />
            <Input 
              type="date" 
              value={filters.dateTo} 
              onChange={e => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            />
          </div>

          {/* Letters Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Letter Name</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((letter) => (
                  <TableRow key={letter._id}>
                    <TableCell className="font-medium">{letter.letterName}</TableCell>
                    <TableCell>{userMap[letter.userId]}</TableCell>
                    <TableCell>{formatRole(roleMap[letter.userId])}</TableCell>
                    <TableCell>
                      <select
                        className={`px-2 py-1 rounded-full text-xs font-medium border-0 ${statusColors[letter.status || "sent"]}`}
                        value={letter.status || "sent"}
                        onChange={(e) => handleStatusChange(letter._id, e.target.value as any)}
                      >
                        <option value="sent">Sent</option>
                        <option value="acknowledged">Acknowledged</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </TableCell>
                    <TableCell>{format(new Date(letter.letterDate), "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedLetter(letter);
                            setIsViewModalOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {letter.letterUploadId && fileUrls[letter._id] && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(fileUrls[letter._id].url, "_blank")}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 py-2 text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Letter View Modal */}
      {isViewModalOpen && selectedLetter && (
        <LetterViewModal
          letter={selectedLetter}
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedLetter(null);
          }}
          fileUrl={fileUrls[selectedLetter._id]?.url}
          fileName={fileUrls[selectedLetter._id]?.fileName}
        />
      )}
    </div>
  );
}
