// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
export default function AdminViewLettersPage() {
  const [selectedRole, setSelectedRole] = useState<string | undefined>(undefined);
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 20;
  const roleFilter: "user" | "admin" | "mda" | "staff" | "reform_champion" | "federal" | "deputies" | "magistrates" | "state_governor" | "president" | "vice_president" | undefined = selectedRole !== "all" ? selectedRole as any : undefined;
  const startTimestamp = startDate ? new Date(startDate).getTime() : undefined;
  const endTimestamp = endDate ? new Date(endDate).getTime() : undefined;
  const letters = useQuery(api.letters.getAllSubmittedLetters, {
    role: roleFilter,
    startDate: startTimestamp,
    endDate: endTimestamp
  }) || [];
  const getFileUrl = useMutation(api.letters.getLetterFileUrl);
  const [fileUrls, setFileUrls] = useState<{
    [key: string]: string;
  }>({});
  const resetFilters = () => {
    setSelectedRole(undefined);
    setStartDate(undefined);
    setEndDate(undefined);
    setCurrentPage(1);
  };
  useEffect(() => {
    const fetchFileUrls = async () => {
      const urls: {
        [key: string]: string;
      } = {};
      for (const letter of letters) {
        if (letter.letterUploadId) {
          try {
            const url = await getFileUrl({
              storageId: letter.letterUploadId as Id<"_storage">
            });
            if (url) urls[letter._id] = url;
          } catch (error) {
            console.error(`Error fetching file for ${letter.letterName}:`, error);
          }
        }
      }
      setFileUrls(urls);
    };
    if (letters.length > 0) fetchFileUrls();
  }, [letters, getFileUrl]);
  const totalPages = Math.ceil(letters.length / recordsPerPage);
  const paginatedLetters = letters.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);
  return <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-center mb-6">Submitted Letters</h1>

     {}
    <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-4 mb-6 p-6 bg-white border rounded-lg shadow-lg">

      {}
      <div className="w-full md:w-1/4">
  <Select onValueChange={value => setSelectedRole(value === "all" ? undefined : value)}>
    <SelectTrigger className="w-full border p-2 rounded-md">
      <SelectValue placeholder="Filter by Role" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Roles</SelectItem>
      <SelectItem value="user">User</SelectItem>
      <SelectItem value="admin">Admin</SelectItem>
      <SelectItem value="mda">MDA</SelectItem>
      <SelectItem value="staff">Staff</SelectItem>
      <SelectItem value="reform_champion">Reform Champions</SelectItem>
      <SelectItem value="federal">Federal</SelectItem>
      <SelectItem value="deputies">Deputies</SelectItem>
      <SelectItem value="magistrates">Magistrates</SelectItem>
      <SelectItem value="state_governor">State Governor</SelectItem>
      <SelectItem value="president">President</SelectItem>
      <SelectItem value="vice_president">Vice President</SelectItem>
    </SelectContent>
  </Select>
      </div>

      {}
      <div className="flex flex-row gap-4 w-full md:w-1/2">
  <div className="w-1/2">
    <label className="text-sm font-medium text-gray-600">Start Date</label>
    <Input type="date" className="p-3 border rounded-lg w-full" value={startDate || ""} onChange={e => setStartDate(e.target.value)} />
  </div>

  <div className="w-1/2">
    <label className="text-sm font-medium text-gray-600">End Date</label>
    <Input type="date" className="p-3 border rounded-lg w-full" value={endDate || ""} onChange={e => setEndDate(e.target.value)} />
  </div>
      </div>

      {}
      <div className="w-full md:w-auto flex justify-end">
  <Button onClick={resetFilters} className="w-full md:w-32 bg-black text-white">
    Reset
  </Button>
      </div>

    </div>

      {}
      <div className="bg-white shadow-md rounded-lg p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Letter Name</TableHead>
              <TableHead>Date Sent</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLetters.length > 0 ? paginatedLetters.map(letter => <TableRow key={letter._id}>
                  <TableCell>{letter.userFullName}</TableCell>
                  <TableCell>{letter.userRole}</TableCell>
                  <TableCell>{letter.letterName}</TableCell>
                  <TableCell>{format(new Date(letter.letterDate), "dd/MM/yyyy")}</TableCell>
                  <TableCell>
                    {fileUrls[letter._id] ? <a href={fileUrls[letter._id]} target="_blank" rel="noopener noreferrer">
                        <Button className="bg-blue-600 text-white px-4 py-2 rounded-md">View Letter</Button>
                      </a> : <Button className="bg-gray-400 text-white px-4 py-2 rounded-md" disabled>
                        Loading...
                      </Button>}
                  </TableCell>
                </TableRow>) : <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500">
                  No letters found.
                </TableCell>
              </TableRow>}
          </TableBody>
        </Table>
      </div>

      {}
      <div className="flex justify-between items-center mt-4">
        <Button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
          Previous
        </Button>
        <span>Page {currentPage} of {totalPages}</span>
        <Button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || letters.length === 0}>
          Next
        </Button>
      </div>
    </div>;
}