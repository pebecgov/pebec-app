// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Id } from "@/convex/_generated/dataModel";
import { format } from "date-fns";
export default function AdminViewLettersPage() {
  const [selectedRole, setSelectedRole] = useState<string | undefined>();
  const [startDate, setStartDate] = useState<string | undefined>();
  const [endDate, setEndDate] = useState<string | undefined>();
  const [selectedMda, setSelectedMda] = useState<string>("");
  const [selectedStaffStream, setSelectedStaffStream] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 20;
  const roleFilter = selectedRole && selectedRole !== "all" ? selectedRole as "user" | "admin" | "mda" | "staff" | "federal" | "deputies" | "magistrates" | "state_governor" | "president" | "vice_president" : undefined;
  const startTimestamp = startDate ? new Date(startDate).getTime() : undefined;
  const endTimestamp = endDate ? new Date(endDate).getTime() : undefined;
  const mdaNames = useQuery(api.letters.getAllMdaNames) || [];
  const staffStreams = useQuery(api.letters.getAllStaffStreams) || [];
  const states = useQuery(api.letters.getAllStates) || [];
  const letters = useQuery(api.letters.getAllSubmittedLetters, {
    role: roleFilter,
    mdaName: selectedRole === "mda" ? selectedMda || undefined : undefined,
    staffStream: selectedRole === "staff" ? selectedStaffStream || undefined : undefined,
    state: selectedRole === "reform_champion" || selectedRole === "state_governor" ? selectedState || undefined : undefined,
    startDate: startTimestamp,
    endDate: endTimestamp
  }) || [];
  const getFileUrl = useMutation(api.letters.getLetterFileUrl);
  const [fileUrls, setFileUrls] = useState<Record<string, {
    url: string;
    fileName: string;
  }>>({});
  const resetFilters = () => {
    setSelectedRole(undefined);
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedMda("");
    setSelectedStaffStream("");
    setSelectedState("");
    setCurrentPage(1);
  };
  useEffect(() => {
    const fetchFileUrls = async () => {
      const urls: Record<string, {
        url: string;
        fileName: string;
      }> = {};
      for (const letter of letters) {
        if (letter.letterUploadId && !fileUrls[letter._id]) {
          try {
            const response = await getFileUrl({
              storageId: letter.letterUploadId as Id<"_storage">
            });
            if (response) {
              urls[letter._id] = {
                url: response.url,
                fileName: response.fileName || `${letter.letterName || "Letter"}.pdf`
              };
            }
          } catch (error) {
            console.error(`Error fetching file for letter ${letter.letterName}:`, error);
          }
        }
      }
      if (Object.keys(urls).length > 0) {
        setFileUrls(prev => ({
          ...prev,
          ...urls
        }));
      }
    };
    if (letters.length > 0) {
      fetchFileUrls();
    }
  }, [letters, getFileUrl]);
  const totalPages = Math.ceil(letters.length / recordsPerPage);
  const sortedLetters = [...letters].sort((a, b) => {
    return sortOrder === "newest" ? b.letterDate - a.letterDate : a.letterDate - b.letterDate;
  });
  const paginatedLetters = sortedLetters.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);
  function formatRole(role: string): string {
    return role.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  }
  return <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-center mb-6">Submitted Letters</h1>

      {}
      <div className="flex flex-wrap gap-4 mb-6 p-6 bg-white border rounded-lg shadow">
        <div className="w-full md:w-1/4">
          <Select onValueChange={setSelectedRole}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter by Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="mda">MDA</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="deputies">Sherrif</SelectItem>
              <SelectItem value="magistrates">Magistrates</SelectItem>
              <SelectItem value="state_governor">State Governor</SelectItem>
              <SelectItem value="president">President</SelectItem>
              <SelectItem value="vice_president">Vice President</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedRole === "mda" && <div className="w-full md:w-1/4">
            <Select onValueChange={setSelectedMda} value={selectedMda}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select MDA" />
              </SelectTrigger>
              <SelectContent>
              {mdaNames.map(mda => <SelectItem key={mda ?? ""} value={mda ?? ""}>
    {mda}
  </SelectItem>)}

              </SelectContent>
            </Select>
          </div>}

        {selectedRole === "staff" && <div className="w-full md:w-1/4">
            <Select onValueChange={setSelectedStaffStream} value={selectedStaffStream}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Staff Stream" />
              </SelectTrigger>
              <SelectContent>
              {staffStreams.map(stream => <SelectItem key={stream ?? ""} value={stream ?? ""}>
    {stream}
  </SelectItem>)}

              </SelectContent>
            </Select>
          </div>}

        {(selectedRole === "reform_champion" || selectedRole === "state_governor") && <div className="w-full md:w-1/4">
            <Select onValueChange={setSelectedState} value={selectedState}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select State" />
              </SelectTrigger>
              <SelectContent>
              {states.map(state => <SelectItem key={state ?? ""} value={state ?? ""}>
    {state}
  </SelectItem>)}

              </SelectContent>
            </Select>
          </div>}

      <div className="flex flex-col gap-2 w-full md:w-1/2">
  <div className="flex gap-2">
    {}
    <Input type="date" value={startDate || ""} max={endDate || undefined} onChange={e => {
            const newStart = e.target.value;
            setStartDate(newStart);
            if (endDate && newStart > endDate) {
              setEndDate("");
            }
          }} />

    {}
    <Input type="date" value={endDate || ""} min={startDate || undefined} onChange={e => setEndDate(e.target.value)} />
  </div>
      </div>

        

        <div className="w-full md:w-auto">
          <Button className="bg-black text-white w-full" onClick={resetFilters}>
            Reset
          </Button>
        </div>
      </div>
      <div className="w-full md:w-1/4 mb-5">
  <Select value={sortOrder} onValueChange={val => setSortOrder(val as "newest" | "oldest")}>
    <SelectTrigger className="w-full">
      <SelectValue placeholder="Sort by" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="newest">Newest First</SelectItem>
      <SelectItem value="oldest">Oldest First</SelectItem>
    </SelectContent>
  </Select>
    </div>

      {}
      <div className="bg-white p-4 rounded-md shadow overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>MDA / Stream / State</TableHead>
              <TableHead>Letter Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLetters.length > 0 ? paginatedLetters.map(letter => <TableRow key={letter._id}>
                  <TableCell>{letter.userFullName}</TableCell>
                  <TableCell>{letter.userRole ? formatRole(letter.userRole) : "—"}</TableCell>
                  <TableCell>
                    {letter.mdaName || letter.staffStream || letter.state || "—"}
                  </TableCell>
                  <TableCell>{letter.letterName}</TableCell>
                  <TableCell>{format(new Date(letter.letterDate), "dd/MM/yyyy")}</TableCell>
                  <TableCell>
  {fileUrls[letter._id] ? <Button className="bg-blue-600 text-white" onClick={async () => {
                const fileMeta = fileUrls[letter._id];
                if (!fileMeta) return;
                try {
                  const res = await fetch(fileMeta.url);
                  const blob = await res.blob();
                  const blobUrl = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = blobUrl;
                  link.download = fileMeta.fileName;
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  URL.revokeObjectURL(blobUrl);
                } catch (err) {
                  console.error("Download failed", err);
                }
              }}>
      Download
    </Button> : <Button className="bg-gray-400 text-white" disabled>
      Loading...
    </Button>}
            </TableCell>

                </TableRow>) : <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500">
                  No letters found.
                </TableCell>
              </TableRow>}
          </TableBody>
        </Table>
      </div>

      {}
      {totalPages > 1 && <div className="flex justify-between items-center mt-6">
          <Button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
            Previous
          </Button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <Button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>
            Next
          </Button>
        </div>}
    </div>;
}